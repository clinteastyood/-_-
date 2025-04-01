import { 
  Project, InsertProject, Worker, InsertWorker, 
  WorkRecord, InsertWorkRecord, Calculation, InsertCalculation,
  projects, workers, workRecords, calculations
} from "@shared/schema";

// 저장소 인터페이스 정의
export interface IStorage {
  // 프로젝트 관련
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;

  // 근로자 관련
  getWorkers(projectId: number): Promise<Worker[]>;
  getWorker(id: number): Promise<Worker | undefined>;
  createWorker(worker: InsertWorker): Promise<Worker>;

  // 근무 기록 관련
  getWorkRecords(workerId: number): Promise<WorkRecord[]>;
  getWorkRecordsByProject(projectId: number): Promise<Record<number, WorkRecord[]>>;
  createWorkRecord(record: InsertWorkRecord): Promise<WorkRecord>;

  // 계산 결과 관련
  getCalculation(workerId: number): Promise<Calculation | undefined>;
  getCalculationsByProject(projectId: number): Promise<Record<number, Calculation>>;
  createCalculation(calculation: {
    workerId: number;
    totalHours: number;
    baseWage: number;
    overtimePay: number;
    holidayPay: number;
    holidayOvertimePay: number;
    publicHolidayPay: number;
    weeklyHolidayPay: number;
    totalWage: number;
  }): Promise<Calculation>;

  // 프로젝트 전체 데이터 조회 (근로자, 근무 기록, 계산 결과 포함)
  getProjectFullData(projectId: number): Promise<{ 
    project: Project, 
    workers: (Worker & { 
      workRecords: WorkRecord[], 
      calculation: Calculation 
    })[] 
  } | undefined>;
}

// In-memory 저장소 구현
export class MemStorage implements IStorage {
  private projects: Map<number, Project>;
  private workers: Map<number, Worker>;
  private workRecords: Map<number, WorkRecord>;
  private calculations: Map<number, Calculation>;

  private projectCurrentId: number;
  private workerCurrentId: number;
  private recordCurrentId: number;
  private calculationCurrentId: number;

  constructor() {
    this.projects = new Map();
    this.workers = new Map();
    this.workRecords = new Map();
    this.calculations = new Map();

    this.projectCurrentId = 1;
    this.workerCurrentId = 1;
    this.recordCurrentId = 1;
    this.calculationCurrentId = 1;
  }

  // 프로젝트 관련
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values()).sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = this.projectCurrentId++;
    const newProject: Project = { 
      ...project, 
      id,
      uploadedAt: new Date()
    };
    this.projects.set(id, newProject);
    return newProject;
  }

  // 근로자 관련
  async getWorkers(projectId: number): Promise<Worker[]> {
    return Array.from(this.workers.values())
      .filter(worker => worker.projectId === projectId);
  }

  async getWorker(id: number): Promise<Worker | undefined> {
    return this.workers.get(id);
  }

  async createWorker(worker: InsertWorker): Promise<Worker> {
    const id = this.workerCurrentId++;
    const newWorker: Worker = { ...worker, id };
    this.workers.set(id, newWorker);
    return newWorker;
  }

  // 근무 기록 관련
  async getWorkRecords(workerId: number): Promise<WorkRecord[]> {
    return Array.from(this.workRecords.values())
      .filter(record => record.workerId === workerId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async getWorkRecordsByProject(projectId: number): Promise<Record<number, WorkRecord[]>> {
    const projectWorkers = await this.getWorkers(projectId);
    const result: Record<number, WorkRecord[]> = {};

    for (const worker of projectWorkers) {
      result[worker.id] = await this.getWorkRecords(worker.id);
    }

    return result;
  }

  async createWorkRecord(record: InsertWorkRecord): Promise<WorkRecord> {
    const id = this.recordCurrentId++;
    const newRecord: WorkRecord = { ...record, id };
    this.workRecords.set(id, newRecord);
    return newRecord;
  }

  // 계산 결과 관련
  async getCalculation(workerId: number): Promise<Calculation | undefined> {
    return Array.from(this.calculations.values())
      .find(calc => calc.workerId === workerId);
  }

  async getCalculationsByProject(projectId: number): Promise<Record<number, Calculation>> {
    const projectWorkers = await this.getWorkers(projectId);
    const result: Record<number, Calculation> = {};

    for (const worker of projectWorkers) {
      const calculation = await this.getCalculation(worker.id);
      if (calculation) {
        result[worker.id] = calculation;
      }
    }

    return result;
  }

  async createCalculation(calculation: {
    workerId: number;
    totalHours: number;
    baseWage: number;
    overtimePay: number;
    holidayPay: number;
    holidayOvertimePay: number;
    publicHolidayPay: number;
    weeklyHolidayPay: number;
    totalWage: number;
    regularHours?: number;
    weekendRegularHours?: number;
  }): Promise<Calculation> {
    const id = this.calculationCurrentId++;
    const newCalculation: Calculation = { ...calculation, id };
    this.calculations.set(id, newCalculation);
    return newCalculation;
  }

  // 프로젝트 전체 데이터 조회
  async getProjectFullData(projectId: number): Promise<{ 
    project: Project, 
    workers: (Worker & { 
      workRecords: WorkRecord[], 
      calculation: Calculation 
    })[] 
  } | undefined> {
    const project = await this.getProject(projectId);

    if (!project) {
      return undefined;
    }

    const projectWorkers = await this.getWorkers(projectId);
    const workersWithData: (Worker & { 
      workRecords: WorkRecord[], 
      calculation: Calculation 
    })[] = [];

    for (const worker of projectWorkers) {
      const workRecords = await this.getWorkRecords(worker.id);
      const calculation = await this.getCalculation(worker.id);

      if (calculation) {
        workersWithData.push({
          ...worker,
          workRecords,
          calculation
        });
      }
    }

    return {
      project,
      workers: workersWithData
    };
  }
}

export const storage = new MemStorage();