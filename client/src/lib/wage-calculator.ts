/**
 * Calculate wages based on Korean labor law
 * This is a placeholder module that would be expanded with actual Korean labor law rules
 */

/**
 * Calculate the standard wage
 */
export function calculateStandardWage(hourlyRate: number, hours: number): number {
  return hourlyRate * hours;
}

/**
 * Calculate overtime wage (1.5x of regular rate)
 */
export function calculateOvertimeWage(hourlyRate: number, overtimeHours: number): number {
  return hourlyRate * overtimeHours * 1.5;
}

/**
 * Calculate night shift wage (1.5x of regular rate)
 * Night shift is typically defined as work between 10 PM and 6 AM
 */
export function calculateNightShiftWage(hourlyRate: number, nightHours: number): number {
  return hourlyRate * nightHours * 1.5;
}

/**
 * Calculate holiday wage (1.5x of regular rate)
 */
export function calculateHolidayWage(hourlyRate: number, holidayHours: number): number {
  return hourlyRate * holidayHours * 1.5;
}

/**
 * Check if a date is a legal holiday in Korea
 */
import { HolidayKR } from 'holidays-kr';

export function isKoreanHoliday(date: Date): boolean {
  const holidayKR = new HolidayKR();
  return holidayKR.isHoliday(date);
}

/**
 * Calculate total wage for a worker
 * @param hourlyRate - Worker's hourly rate in KRW
 * @param workHours - Record of days and hours worked
 * @param workDates - Dates corresponding to workHours (for holiday check)
 */
export function calculateTotalWage(
  hourlyRate: number,
  workHours: Record<string, number>,
  workDates: Date[]
): number {
  let totalWage = 0;
  
  // In a real app, this would implement Korean labor law rules
  // For now, simply calculate based on hours * rate
  Object.values(workHours).forEach(hours => {
    totalWage += hourlyRate * hours;
  });
  
  return totalWage;
}
