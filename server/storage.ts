import {
  Worker, InsertWorker, Project, InsertProject, WorkHour, InsertWorkHour,
  CalculationResult, InsertCalculationResult, WorkerWithHours, ProjectWithWorkers
} from "@shared/schema";

export interface IStorage {
  // Worker operations
  getWorker(id: number): Promise<Worker | undefined>;
  createWorker(worker: InsertWorker): Promise<Worker>;
  getWorkersByProjectId(projectId: number): Promise<Worker[]>;
  
  // Project operations
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  getAllProjects(): Promise<Project[]>;
  
  // Work hours operations
  createWorkHour(workHour: InsertWorkHour): Promise<WorkHour>;
  getWorkHoursByWorkerId(workerId: number): Promise<WorkHour[]>;
  getWorkHoursByProjectId(projectId: number): Promise<WorkHour[]>;
  
  // Calculation results operations
  createCalculationResult(result: InsertCalculationResult): Promise<CalculationResult>;
  getCalculationResultByWorkerId(workerId: number): Promise<CalculationResult | undefined>;
  getCalculationResultsByProjectId(projectId: number): Promise<CalculationResult[]>;
  
  // Combined operations
  getProjectWithWorkers(projectId: number): Promise<ProjectWithWorkers | undefined>;
  getAllProjectsWithWorkers(): Promise<ProjectWithWorkers[]>;
}

export class MemStorage implements IStorage {
  private workers: Map<number, Worker>;
  private projects: Map<number, Project>;
  private workHours: Map<number, WorkHour>;
  private calculationResults: Map<number, CalculationResult>;
  
  private workerId: number = 1;
  private projectId: number = 1;
  private workHourId: number = 1;
  private calculationResultId: number = 1;
  
  constructor() {
    this.workers = new Map();
    this.projects = new Map();
    this.workHours = new Map();
    this.calculationResults = new Map();
  }
  
  // Worker operations
  async getWorker(id: number): Promise<Worker | undefined> {
    return this.workers.get(id);
  }
  
  async createWorker(worker: InsertWorker): Promise<Worker> {
    const id = this.workerId++;
    const newWorker = { ...worker, id };
    this.workers.set(id, newWorker);
    return newWorker;
  }
  
  async getWorkersByProjectId(projectId: number): Promise<Worker[]> {
    return Array.from(this.workers.values()).filter(
      worker => worker.projectId === projectId
    );
  }
  
  // Project operations
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }
  
  async createProject(project: InsertProject): Promise<Project> {
    const id = this.projectId++;
    const newProject = { ...project, id };
    this.projects.set(id, newProject);
    return newProject;
  }
  
  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }
  
  // Work hours operations
  async createWorkHour(workHour: InsertWorkHour): Promise<WorkHour> {
    const id = this.workHourId++;
    const newWorkHour = { ...workHour, id };
    this.workHours.set(id, newWorkHour);
    return newWorkHour;
  }
  
  async getWorkHoursByWorkerId(workerId: number): Promise<WorkHour[]> {
    return Array.from(this.workHours.values()).filter(
      workHour => workHour.workerId === workerId
    );
  }
  
  async getWorkHoursByProjectId(projectId: number): Promise<WorkHour[]> {
    return Array.from(this.workHours.values()).filter(
      workHour => workHour.projectId === projectId
    );
  }
  
  // Calculation results operations
  async createCalculationResult(result: InsertCalculationResult): Promise<CalculationResult> {
    const id = this.calculationResultId++;
    const newResult = { ...result, id };
    this.calculationResults.set(id, newResult);
    return newResult;
  }
  
  async getCalculationResultByWorkerId(workerId: number): Promise<CalculationResult | undefined> {
    return Array.from(this.calculationResults.values()).find(
      result => result.workerId === workerId
    );
  }
  
  async getCalculationResultsByProjectId(projectId: number): Promise<CalculationResult[]> {
    return Array.from(this.calculationResults.values()).filter(
      result => result.projectId === projectId
    );
  }
  
  // Combined operations
  async getProjectWithWorkers(projectId: number): Promise<ProjectWithWorkers | undefined> {
    const project = await this.getProject(projectId);
    if (!project) return undefined;
    
    const workers = await this.getWorkersByProjectId(projectId);
    const workersWithHours: WorkerWithHours[] = [];
    
    let totalWages = 0;
    let totalHours = 0;
    
    for (const worker of workers) {
      const workHours = await this.getWorkHoursByWorkerId(worker.id);
      const calculationResult = await this.getCalculationResultByWorkerId(worker.id);
      
      // Create a map of day -> hours
      const workHoursMap: Record<string, number> = {};
      
      for (const wh of workHours) {
        // Extract the day from date (YYYY-MM-DD)
        const day = wh.date.split('-')[2];
        workHoursMap[day] = wh.hours;
      }
      
      const totalWage = calculationResult ? calculationResult.totalWage : 0;
      totalWages += totalWage;
      
      const workerTotalHours = calculationResult ? calculationResult.totalHours : 0;
      totalHours += workerTotalHours;
      
      workersWithHours.push({
        ...worker,
        workHours: workHoursMap,
        totalWage,
      });
    }
    
    return {
      ...project,
      workers: workersWithHours,
      summary: {
        totalEmployees: workers.length,
        totalHours,
        totalWages,
      }
    };
  }
  
  async getAllProjectsWithWorkers(): Promise<ProjectWithWorkers[]> {
    const projects = await this.getAllProjects();
    const result: ProjectWithWorkers[] = [];
    
    for (const project of projects) {
      const projectWithWorkers = await this.getProjectWithWorkers(project.id);
      if (projectWithWorkers) {
        result.push(projectWithWorkers);
      }
    }
    
    return result;
  }
}

export const storage = new MemStorage();
