import { pgTable, text, serial, integer, boolean, jsonb, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Worker schema
export const workers = pgTable("workers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ssn: text("ssn").notNull(),
  wageType: text("wage_type").notNull(), // "hourly" or "daily"
  wageAmount: integer("wage_amount").notNull(), // In KRW
  projectId: integer("project_id").notNull(),
});

// Project schema
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  month: text("month").notNull(), // Format: YYYY-MM
  fileName: text("file_name").notNull(),
  uploadDate: timestamp("upload_date").notNull().defaultNow(),
  status: text("status").notNull().default("completed"), // "completed", "processing", "error"
});

// Work hours schema
export const workHours = pgTable("work_hours", {
  id: serial("id").primaryKey(),
  workerId: integer("worker_id").notNull(),
  projectId: integer("project_id").notNull(),
  date: text("date").notNull(), // Format: YYYY-MM-DD
  hours: integer("hours").notNull(), // In hours or 1 for daily wage
});

// Calculation results schema
export const calculationResults = pgTable("calculation_results", {
  id: serial("id").primaryKey(),
  workerId: integer("worker_id").notNull(),
  projectId: integer("project_id").notNull(),
  totalWage: integer("total_wage").notNull(), // In KRW
  totalHours: integer("total_hours").notNull(),
});

// Insert schemas
export const insertWorkerSchema = createInsertSchema(workers).omit({ id: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true });
export const insertWorkHourSchema = createInsertSchema(workHours).omit({ id: true });
export const insertCalculationResultSchema = createInsertSchema(calculationResults).omit({ id: true });

// Insert types
export type InsertWorker = z.infer<typeof insertWorkerSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertWorkHour = z.infer<typeof insertWorkHourSchema>;
export type InsertCalculationResult = z.infer<typeof insertCalculationResultSchema>;

// Select types
export type Worker = typeof workers.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type WorkHour = typeof workHours.$inferSelect;
export type CalculationResult = typeof calculationResults.$inferSelect;

// Extended types for frontend use
export type WorkerWithHours = Worker & {
  workHours: Record<string, number>; // day: hours
  totalWage: number;
};

export type ProjectWithWorkers = Project & {
  workers: WorkerWithHours[];
  summary: {
    totalEmployees: number;
    totalHours: number;
    totalWages: number;
  };
};

// Upload file schema
export const uploadFileSchema = z.object({
  projectName: z.string().min(1, { message: "프로젝트 이름을 입력해주세요." }),
  projectMonth: z.string().regex(/^\d{4}-\d{2}$/, { message: "올바른 형식의 월을 입력해주세요 (YYYY-MM)." }),
  file: z.instanceof(File, { message: "파일을 업로드해주세요." })
});

export type UploadFileData = z.infer<typeof uploadFileSchema>;
