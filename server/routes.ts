import type { Express, Request, Response } from "express";
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
        
        // 급여 계산
        // 기본 계산 - 실제로는 더 복잡한 한국 노동법 규정 적용 필요
        const { wageType, wageAmount } = worker;
        let baseWage = 0;
        let overtimePay = 0;
        let nightPay = 0;
        let weeklyHolidayPay = 0;
        
        if (wageType === "시급") {
          // 시급 계산
          const standardHours = 40; // 주 40시간 기준
          
          baseWage = wageAmount * totalHours;
          
          // 간단한 초과근무수당 계산 - 주 40시간 초과는 50% 할증
          if (totalHours > standardHours) {
            const overtimeHours = totalHours - standardHours;
            overtimePay = Math.round(overtimeHours * wageAmount * 0.5);
          }
          
          // 주휴수당 - 주 15시간 이상 근무 시 1일 임금 (간단한 계산)
          if (totalHours >= 15) {
            weeklyHolidayPay = wageAmount * 8; // 1일 8시간 기준
          }
          
          // 야간수당은 0으로 설정 (데이터에 야간근무 정보가 없음)
          nightPay = 0;
        } else if (wageType === "일급") {
          // 일급 계산
          baseWage = wageAmount * daysWorked;
          
          // 주휴수당 - 주 5일 이상 근무 시 1일 임금
          if (daysWorked >= 5) {
            weeklyHolidayPay = wageAmount;
          }
          
          // 기본적으로 일급은 초과수당이 포함되어 있다고 가정
          overtimePay = 0;
          
          // 야간수당 - 임의 설정 (실제로는 야간근무 여부에 따라 계산)
          nightPay = 0;
        }
        
        // 총 급여
        const totalWage = baseWage + overtimePay + nightPay + weeklyHolidayPay;
        
        // 계산 결과 저장
        await storage.createCalculation({
          workerId: worker.id,
          totalHours,
          baseWage,
          overtimePay,
          nightPay,
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
