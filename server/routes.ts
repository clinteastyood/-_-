import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertProjectSchema, insertWorkerSchema, 
  insertWorkRecordSchema, insertCalculationSchema 
} from "@shared/schema";
import multer from "multer";
import * as XLSX from "xlsx";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { 
  calculateDailyWorkType, 
  calculateWeeklyHolidayHours, 
  calculateWage,
  isPublicHoliday,
  WorkType
} from "../client/src/lib/wage-calculator";

// 파일 업로드를 위한 멀터 설정
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "application/vnd.ms-excel", 
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("지원되지 않는 파일 형식입니다. Excel 파일(.xlsx, .xls)만 업로드 가능합니다."));
    }
  },
});

// Helper function to get week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Helper function to group work records by week
function groupWorkRecordsByWeek(workRecords: any[]): Record<string, any[]> {
  const weeklyRecords: Record<string, any[]> = {};
  
  for (const record of workRecords) {
    const date = new Date(record.date);
    const yearNum = date.getFullYear();
    const weekNum = getWeekNumber(date);
    const weekKey = `${yearNum}-${weekNum}`;
    
    if (!weeklyRecords[weekKey]) {
      weeklyRecords[weekKey] = [];
    }
    
    weeklyRecords[weekKey].push(record);
  }
  
  return weeklyRecords;
}

// Helper function to process weekly records and calculate weekly work stats
function processWeeklyRecords(weekRecords: any[]): {
  regularHours: number;
  weekendRegularHours: number;
  overtimeHours: number;
  holidayHours: number;
  holidayOvertimeHours: number;
  absenceDays: number;
  publicHolidayDays: number;
  rainDays: number;
  regularOffDays: number;
  dayoffDays: number;
  weekdayBasicWorkDays: number;
} {
  const weeklyWork = {
    regularHours: 0,
    weekendRegularHours: 0,
    overtimeHours: 0,
    holidayHours: 0,
    holidayOvertimeHours: 0,
    absenceDays: 0,
    publicHolidayDays: 0,
    rainDays: 0,
    regularOffDays: 0,
    dayoffDays: 0,
    weekdayBasicWorkDays: 0
  };
  
  for (const record of weekRecords) {
    const date = new Date(record.date);
    const dayOfWeek = date.getDay();
    const hours = record.hours || 0;
    
    if (hours <= 0) {
      continue; // Skip days with no hours
    }
    
    // Count workdays (Monday-Friday)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      weeklyWork.weekdayBasicWorkDays++;
      
      if (hours <= 8) {
        weeklyWork.regularHours += hours;
      } else {
        weeklyWork.regularHours += 8;
        weeklyWork.overtimeHours += (hours - 8);
      }
    } 
    // Saturday
    else if (dayOfWeek === 6) {
      const remainingRegularHours = Math.max(0, 40 - weeklyWork.regularHours);
      if (remainingRegularHours > 0) {
        const regularHours = Math.min(remainingRegularHours, hours);
        weeklyWork.weekendRegularHours += regularHours;
        if (hours > regularHours) {
          weeklyWork.overtimeHours += (hours - regularHours);
        }
      } else {
        weeklyWork.overtimeHours += hours;
      }
    } 
    // Sunday or Public Holiday
    else if (dayOfWeek === 0 || isPublicHoliday(date)) {
      if (hours <= 8) {
        weeklyWork.holidayHours += hours;
      } else {
        weeklyWork.holidayHours += 8;
        weeklyWork.holidayOvertimeHours += (hours - 8);
      }
    }
  }
  
  return weeklyWork;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // API 라우트 등록
  // 모든 프로젝트 조회
  app.get("/api/projects", async (_req: Request, res: Response) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "프로젝트 목록을 조회하는 중 오류가 발생했습니다." });
    }
  });

  // 특정 프로젝트 상세 조회
  app.get("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const projectData = await storage.getProjectFullData(projectId);
      
      if (!projectData) {
        return res.status(404).json({ message: "프로젝트를 찾을 수 없습니다." });
      }
      
      // 응답 데이터 구성
      const { project, workers } = projectData;
      
      // 월의 일수 계산을 위한 헬퍼 함수
      const getDaysInMonth = (yearMonth: string) => {
        const [year, month] = yearMonth.split("-").map(Number);
        return new Date(year, month, 0).getDate();
      };
      
      // 월의 일수
      const daysInMonth = getDaysInMonth(project.month);
      
      // 근로자별 일자별 근무시간 데이터 구성
      const formattedWorkers = workers.map(worker => {
        const dailyHours: Record<string, number> = {};
        
        // 일자별 근무시간 초기화
        for (let day = 1; day <= daysInMonth; day++) {
          dailyHours[day.toString()] = 0;
        }
        
        // 근무기록에서 일자별 근무시간 설정
        worker.workRecords.forEach(record => {
          const day = new Date(record.date).getDate();
          dailyHours[day.toString()] = record.hours;
        });
        
        // 결과 객체 구성
        return {
          id: worker.id,
          name: worker.name,
          ssn: worker.ssn,
          wageType: worker.wageType,
          wageAmount: worker.wageAmount,
          dailyHours,
          calculation: worker.calculation
        };
      });
      
      res.json({
        project: {
          id: project.id,
          name: project.name,
          month: project.month,
          fileName: project.fileName,
          uploadedAt: project.uploadedAt
        },
        daysInMonth,
        workers: formattedWorkers
      });
    } catch (error) {
      res.status(500).json({ message: "프로젝트 데이터를 조회하는 중 오류가 발생했습니다." });
    }
  });

  // 엑셀 파일 업로드 및 처리
  app.post("/api/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "업로드된 파일이 없습니다." });
      }
      
      // 프로젝트 정보 검증
      const projectData = {
        projectName: req.body.projectName,
        workMonth: req.body.workMonth
      };
      
      try {
        z.object({
          projectName: z.string().min(1, "프로젝트명은 필수 입력항목입니다."),
          workMonth: z.string().regex(/^\d{4}-\d{2}$/, "올바른 형식의 년월(YYYY-MM)을 입력해주세요."),
        }).parse(projectData);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: fromZodError(error).message });
        }
        return res.status(400).json({ message: "잘못된 입력 데이터입니다." });
      }
      
      // 엑셀 파일 처리
      const workbook = XLSX.read(req.file.buffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      if (data.length === 0) {
        return res.status(400).json({ message: "엑셀 파일에 데이터가 없습니다." });
      }
      
      // 필수 컬럼 확인
      const firstRow = data[0] as Record<string, any>;
      const requiredColumns = ["이름", "주민번호", "임금유형", "임금액"];
      
      for (const column of requiredColumns) {
        if (!(column in firstRow)) {
          return res.status(400).json({ message: `엑셀 파일에 '${column}' 컬럼이 없습니다.` });
        }
      }
      
      // 날짜 컬럼 확인 (최소 1개 이상 존재해야 함)
      const dateColumns = Object.keys(firstRow).filter(key => /^\d+일$/.test(key));
      
      if (dateColumns.length === 0) {
        return res.status(400).json({ message: "엑셀 파일에 날짜 컬럼이 없습니다." });
      }
      
      // 프로젝트 생성
      const project = await storage.createProject({
        name: projectData.projectName,
        month: projectData.workMonth,
        fileName: req.file.originalname,
      });
      
      // 데이터 처리 및 저장
      const [year, month] = projectData.workMonth.split("-").map(Number);
      
      for (const row of data) {
        const typedRow = row as Record<string, any>;
        
        // 근로자 정보 추출
        const worker = await storage.createWorker({
          projectId: project.id,
          name: typedRow["이름"],
          ssn: typedRow["주민번호"],
          wageType: typedRow["임금유형"],
          wageAmount: parseInt(typedRow["임금액"].toString().replace(/[^\d]/g, "")),
        });
        
        // 근무 기록 추출 및 저장
        let totalHours = 0;
        let daysWorked = 0;
        
        for (const key of dateColumns) {
          const day = parseInt(key.replace("일", ""));
          const hours = typedRow[key] ? parseInt(typedRow[key]) : 0;
          
          if (hours > 0) {
            daysWorked++;
            totalHours += hours;
            
            const date = new Date(year, month - 1, day);
            
            await storage.createWorkRecord({
              workerId: worker.id,
              date,
              hours,
            });
          }
        }
        
        // Group work records by week
        const workRecords = await storage.getWorkRecords(worker.id);
        const weeklyWorkRecords = groupWorkRecordsByWeek(workRecords);
        
        let totalWage = 0;
        let baseWage = 0;
        let overtimePay = 0;
        let holidayPay = 0;
        let holidayOvertimePay = 0;
        let publicHolidayPay = 0;
        let weeklyHolidayPay = 0;
        
        // Calculate wages for each week
        for (const weekRecords of Object.values(weeklyWorkRecords)) {
          const weeklyWork = processWeeklyRecords(weekRecords);
          const weeklyHolidayHours = calculateWeeklyHolidayHours(weeklyWork, worker.wageAmount);
          
          // Add weekly holiday pay
          weeklyHolidayPay += weeklyHolidayHours * worker.wageAmount;
          
          // Process each day's work
          for (const record of weekRecords) {
            const dailyWork = calculateDailyWorkType(new Date(record.date), record.hours, weeklyWork);
            const wage = calculateWage(worker.wageAmount, dailyWork.type, dailyWork.hours);
            
            // Accumulate different types of wages
            switch (dailyWork.type) {
              case WorkType.REGULAR:
                baseWage += wage;
                break;
              case WorkType.OVERTIME:
                overtimePay += wage;
                break;
              case WorkType.HOLIDAY:
                holidayPay += wage;
                break;
              case WorkType.HOLIDAY_OVERTIME:
                holidayOvertimePay += wage;
                break;
              case WorkType.PUBLIC_HOLIDAY:
                publicHolidayPay += wage;
                break;
            }
          }
        }
        
        // Calculate total wage
        totalWage = baseWage + overtimePay + holidayPay + holidayOvertimePay + publicHolidayPay + weeklyHolidayPay;
        
        // 계산 결과 저장
        await storage.createCalculation({
          workerId: worker.id,
          totalHours,
          baseWage,
          overtimePay,
          holidayPay,
          holidayOvertimePay,
          publicHolidayPay,
          weeklyHolidayPay,
          totalWage,
        });
      }
      
      res.status(201).json({
        success: true,
        projectId: project.id,
        message: "엑셀 파일이 성공적으로 처리되었습니다."
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "파일 업로드 중 오류가 발생했습니다.";
      res.status(500).json({ message: errorMessage });
    }
  });

  return httpServer;
}
