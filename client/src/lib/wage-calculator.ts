
import { HolidayKR } from 'holidays-kr';

// 근무 유형 정의
export enum WorkType {
  REGULAR = '기본근무',
  OVERTIME = '연장근무',
  HOLIDAY = '휴일근무',
  HOLIDAY_OVERTIME = '휴일연장근무',
  WEEKLY_HOLIDAY = '주휴',
  ABSENT = '결근',
  PUBLIC_HOLIDAY = '공휴일',
  RAIN_OFF = '우천',
  REGULAR_OFF = '정휴'
}

interface DailyWork {
  type: WorkType;
  hours: number;
}

// 주간 근무 시간 계산을 위한 인터페이스
interface WeeklyWork {
  regularHours: number;
  weekendRegularHours: number;
  overtimeHours: number;
  holidayHours: number;
  holidayOvertimeHours: number;
  absenceDays: number;
}

/**
 * 해당 날짜가 공휴일인지 확인
 */
export function isPublicHoliday(date: Date): boolean {
  const holidayKR = new HolidayKR();
  return holidayKR.isHoliday(date);
}

/**
 * 일일 근무 유형과 시간 계산
 */
export function calculateDailyWorkType(
  date: Date,
  hours: number,
  weeklyWork: WeeklyWork
): DailyWork {
  const dayOfWeek = date.getDay();
  
  // 공휴일 체크
  if (isPublicHoliday(date)) {
    return { type: WorkType.PUBLIC_HOLIDAY, hours: 8 };
  }

  // 결근, 우천, 정휴는 외부에서 설정된 값을 사용해야 함
  
  // 일요일(주휴일) 근무
  if (dayOfWeek === 0) {
    if (hours > 8) {
      return {
        type: WorkType.HOLIDAY_OVERTIME,
        hours: hours
      };
    }
    return {
      type: WorkType.HOLIDAY,
      hours: hours
    };
  }

  // 평일(월-금) 근무
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    if (hours > 8) {
      return {
        type: WorkType.OVERTIME,
        hours: hours
      };
    }
    return {
      type: WorkType.REGULAR,
      hours: hours
    };
  }

  // 토요일 근무
  if (dayOfWeek === 6) {
    const totalWeekRegularHours = weeklyWork.regularHours + hours;
    if (totalWeekRegularHours <= 40) {
      return {
        type: WorkType.REGULAR,
        hours: hours
      };
    }
    return {
      type: WorkType.OVERTIME,
      hours: hours
    };
  }

  return { type: WorkType.REGULAR, hours: 0 };
}

/**
 * 주휴시간 계산
 */
export function calculateWeeklyHolidayHours(weeklyWork: WeeklyWork): number {
  if (weeklyWork.absenceDays > 0) {
    return 0;
  }

  const totalRegularHours = weeklyWork.regularHours + weeklyWork.weekendRegularHours;
  if (totalRegularHours >= 40) {
    return 8;
  }

  return Math.min(Math.floor(totalRegularHours / 8) * 8, 40);
}

/**
 * 급여 계산
 */
export function calculateWage(
  hourlyRate: number,
  workType: WorkType,
  hours: number
): number {
  switch (workType) {
    case WorkType.REGULAR:
      return hourlyRate * hours;
    case WorkType.OVERTIME:
      return hourlyRate * hours * 1.5;
    case WorkType.HOLIDAY:
      return hourlyRate * hours * 1.5;
    case WorkType.HOLIDAY_OVERTIME:
      return hourlyRate * hours * 2;
    case WorkType.WEEKLY_HOLIDAY:
      return hourlyRate * hours;
    case WorkType.PUBLIC_HOLIDAY:
      return hourlyRate * 8; // 공휴일은 8시간 기준
    case WorkType.RAIN:
    case WorkType.DAYOFF:
    case WorkType.REGULAR_OFF:
      return 0; // 우천, 휴무, 정휴는 무급
    default:
      return 0;
  }
}

/**
 * 총 급여 계산
 */
export function calculateTotalWage(
  hourlyRate: number,
  workHours: Record<string, number>,
  workDates: Date[]
): number {
  let totalWage = 0;
  let weeklyWork: WeeklyWork = {
    regularHours: 0,
    weekendRegularHours: 0,
    overtimeHours: 0,
    holidayHours: 0,
    holidayOvertimeHours: 0,
    absenceDays: 0
  };

  workDates.forEach((date, index) => {
    const hours = workHours[date.getDate().toString()] || 0;
    const dailyWork = calculateDailyWorkType(date, hours, weeklyWork);
    
    // 주간 근무 시간 누적
    if (dailyWork.type === WorkType.REGULAR) {
      if (date.getDay() === 6) {
        weeklyWork.weekendRegularHours += dailyWork.hours;
      } else {
        weeklyWork.regularHours += dailyWork.hours;
      }
    }
    
    // 급여 계산
    totalWage += calculateWage(hourlyRate, dailyWork.type, dailyWork.hours);
    
    // 주 단위로 주휴시간 계산 및 초기화
    if (date.getDay() === 0 || index === workDates.length - 1) {
      const weeklyHolidayHours = calculateWeeklyHolidayHours(weeklyWork);
      totalWage += calculateWage(hourlyRate, WorkType.WEEKLY_HOLIDAY, weeklyHolidayHours);
      
      // 다음 주를 위한 초기화
      weeklyWork = {
        regularHours: 0,
        weekendRegularHours: 0,
        overtimeHours: 0,
        holidayHours: 0,
        holidayOvertimeHours: 0,
        absenceDays: 0
      };
    }
  });

  return totalWage;
}
