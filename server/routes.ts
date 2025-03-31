import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import {
  insertProjectSchema,
  insertWorkerSchema,
  insertWorkHourSchema,
  insertCalculationResultSchema,
} from "@shared/schema";
import { ValidationError, fromZodError } from "zod-validation-error";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  
  // Get all projects
  app.get("/api/projects", async (_req: Request, res: Response) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  });
  
  // Get project with workers and calculations
  app.get("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "유효하지 않은 프로젝트 ID입니다." });
      }
      
      const project = await storage.getProjectWithWorkers(projectId);
      if (!project) {
        return res.status(404).json({ message: "프로젝트를 찾을 수 없습니다." });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  });
  
  // Get all projects with workers and calculations
  app.get("/api/projects-with-workers", async (_req: Request, res: Response) => {
    try {
      const projects = await storage.getAllProjectsWithWorkers();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects with workers:", error);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  });
  
  // Upload Excel file and process data
  app.post("/api/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      // Validate request body
      if (!req.file) {
        return res.status(400).json({ message: "파일이 업로드되지 않았습니다." });
      }
      
      const { projectName, projectMonth } = req.body;
      if (!projectName || !projectMonth) {
        return res.status(400).json({ 
          message: "프로젝트 이름과 월을 입력해주세요." 
        });
      }
      
      // Validate project data
      try {
        const projectData = insertProjectSchema.parse({
          name: projectName,
          month: projectMonth,
          fileName: req.file.originalname,
          uploadDate: new Date(),
          status: "completed",
        });
        
        // Create project
        const project = await storage.createProject(projectData);
        
        // Process Excel file (in a real app, this would parse the Excel file)
        // For now, we'll simulate this by creating some mock data
        
        // Example worker data (in a real app, this would come from the Excel file)
        // This is just for demonstration of the API structure
        const workerData = {
          name: "테스트 사용자",
          ssn: "000000-0000000",
          wageType: "hourly",
          wageAmount: 9620,
          projectId: project.id,
        };
        
        // Create worker
        const worker = await storage.createWorker(workerData);
        
        // Create work hours for the worker (again, this would come from Excel)
        const currentDate = new Date(projectMonth);
        const year = currentDate.getFullYear();
        const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
        
        // Add work hours for each day
        for (let day = 1; day <= 31; day++) {
          const dayStr = day.toString().padStart(2, "0");
          const dateStr = `${year}-${month}-${dayStr}`;
          
          // Skip weekends (in a real app, this logic would be based on Excel data)
          const date = new Date(dateStr);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          
          if (!isWeekend) {
            await storage.createWorkHour({
              workerId: worker.id,
              projectId: project.id,
              date: dateStr,
              hours: 8, // Standard 8-hour workday
            });
          }
        }
        
        // Calculate total wage
        const totalHours = 8 * 22; // Assuming 22 working days
        const totalWage = totalHours * workerData.wageAmount;
        
        // Save calculation result
        await storage.createCalculationResult({
          workerId: worker.id,
          projectId: project.id,
          totalWage,
          totalHours,
        });
        
        res.status(201).json({
          message: "파일이 성공적으로 업로드되고 처리되었습니다.",
          projectId: project.id,
        });
      } catch (error) {
        if (error instanceof Error) {
          const validationError = fromZodError(error as any);
          return res.status(400).json({ message: validationError.message });
        }
        throw error;
      }
    } catch (error) {
      console.error("Error processing upload:", error);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  });
  
  const httpServer = createServer(app);
  
  return httpServer;
}
