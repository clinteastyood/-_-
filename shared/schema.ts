import { pgTable, text, serial, integer, boolean, date, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// 프로젝트 테이블
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  fileName: text("file_name").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

// 근로자 테이블
export const workers = pgTable("workers", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  name: text("name").notNull(),
  ssn: text("ssn").notNull(), // 주민등록번호 (마스킹 처리)
  wageType: text("wage_type").notNull(), // 시급 또는 일급
  wageAmount: integer("wage_amount").notNull(), // 시급 또는 일급 금액
});

// 근무 기록 테이블
export const WorkStatus = {
  WORK: '근무',
  RAIN: '우천',
  REGULAR_HOLIDAY: '정휴',
  ABSENCE: '결근',
  PUBLIC_HOLIDAY: '공휴일'
} as const;

export type WorkStatusType = typeof WorkStatus[keyof typeof WorkStatus];

export const workRecords = pgTable("work_records", {
  id: serial("id").primaryKey(),
  workerId: integer("worker_id").notNull().references(() => workers.id),
  date: date("date").notNull(),
  hours: integer("hours"), // Optional now since some statuses don't have hours
  status: text("status").notNull().$type<WorkStatusType>(), // Work status
});

// 계산 결과 테이블
export const calculations = pgTable("calculations", {
  id: serial("id").primaryKey(),
  workerId: integer("worker_id").notNull().references(() => workers.id),
  totalHours: integer("total_hours").notNull(),
  baseWage: integer("base_wage").notNull(),
  overtimePay: integer("overtime_pay").notNull(),
  nightPay: integer("night_pay").notNull(),
  weeklyHolidayPay: integer("weekly_holiday_pay").notNull(),
  totalWage: integer("total_wage").notNull(),
});

// 프로젝트 삽입 스키마
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  uploadedAt: true,
});

// 근로자 삽입 스키마
export const insertWorkerSchema = createInsertSchema(workers).omit({
  id: true,
});

// 근무 기록 삽입 스키마
export const insertWorkRecordSchema = createInsertSchema(workRecords).omit({
  id: true,
});

// 계산 결과 삽입 스키마
export const insertCalculationSchema = createInsertSchema(calculations).omit({
  id: true,
});

// 엑셀 업로드 스키마 - 프로젝트 정보와 파일
export const excelUploadSchema = z.object({
  projectName: z.string().min(1, "프로젝트명은 필수 입력항목입니다."),
  workMonth: z.string().regex(/^\d{4}-\d{2}$/, "올바른 형식의 년월(YYYY-MM)을 입력해주세요."),
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertWorker = z.infer<typeof insertWorkerSchema>;
export type InsertWorkRecord = z.infer<typeof insertWorkRecordSchema>;
export type InsertCalculation = z.infer<typeof insertCalculationSchema>;
export type ExcelUpload = z.infer<typeof excelUploadSchema>;

export type Project = typeof projects.$inferSelect;
export type Worker = typeof workers.$inferSelect;
export type WorkRecord = typeof workRecords.$inferSelect;
export type Calculation = typeof calculations.$inferSelect;

// 프론트엔드에 표시될 결과 타입 (조인된 데이터)
export type WorkerWithCalculation = Worker & {
  calculation: Calculation;
  dailyHours: Record<string, number>; // 날짜별 근무시간
};

export type ProjectWithWorkers = Project & {
  workers: WorkerWithCalculation[];
};
