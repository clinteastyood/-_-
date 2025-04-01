// Holiday library removed - using a simplified approach

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

// 주간 근무 시간 계산을 위한 인터페이스 // 
interface WeeklyWork {
  regularHours: number; // 월~금 기본근무시간
  weekendRegularHours: number; // 토요일 기본근무시간
  overtimeHours: number; // 연장근무시간
  holidayHours: number; // 휴일근무시간 (일요일 혹은 공휴일))
  holidayOvertimeHours: number; //휴일의 연장근무시간
  absenceDays: number; // 결근일 수 
  publicHolidayDays: number; // 공휴일 수
  rainDays: number; // 우천 수
  regularOffDays: number; // 정휴 수
  dayoffDays: number; // 휴무 수
  weekdayBasicWorkDays: number; // 월~금 중 실제 근무한 날 수
}

/**
 * 해당 날짜가 공휴일인지 확인
 */
export function isPublicHoliday(date: Date): boolean {
  // Since HolidayKR library is not cooperating, we'll implement a simple check
  // for Sundays (which are considered holidays in Korea)
  return date.getDay() === 0;
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
    const regularHours = Math.min(8, hours); // 하루 최대 8시간까지 기본근로
    const overtimeHours = Math.max(0, hours - 8); // 8시간 초과분은 연장근로

    return {
      type: overtimeHours > 0 ? WorkType.OVERTIME : WorkType.REGULAR,
      hours: hours
    };
  }

  // 토요일 근무
  if (dayOfWeek === 6) {
    const weekRegularHours = weeklyWork.regularHours;
    const remainingRegularHours = Math.max(0, 40 - weekRegularHours);
    
    // 월~금 근로시간이 40시간 미만인 경우, 토요일 근무시간을 기본근로에 포함
    if (remainingRegularHours > 0) {
      const regularHours = Math.min(remainingRegularHours, hours);
      const overtimeHours = Math.max(0, hours - regularHours);
      
      return {
        type: overtimeHours > 0 ? WorkType.OVERTIME : WorkType.REGULAR,
        hours: hours
      };
    }
    
    // 이미 40시간을 채웠다면 모든 시간은 연장근로
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
export function calculateWeeklyHolidayHours(weeklyWork: WeeklyWork, hourlyRate: number): number {
  // 1. 결근이 있는 경우 미지급
  if (weeklyWork.absenceDays > 0) {
    return 0;
  }

  // 2. 월~금이 모두 공휴일/우천/정휴/휴무인 경우 미지급
  const nonWorkingDays = weeklyWork.publicHolidayDays + weeklyWork.rainDays + 
                        weeklyWork.regularOffDays + weeklyWork.dayoffDays;
  if (nonWorkingDays >= 5) {
    return 0;
  }

  // 3. 소정근로일(월~금 중 공휴일/우천/정휴/휴무 제외한 날) 개근 체크
  const requiredWorkDays = 5 - nonWorkingDays;
  if (weeklyWork.weekdayBasicWorkDays < requiredWorkDays) {
    return 0;
  }

  // 4. 기본근무시간 계산 (월~금 + 필요시 토요일)
  const totalBasicHours = Math.min(40, weeklyWork.regularHours + weeklyWork.weekendRegularHours);
  
  // 5. 주 15시간 이상 체크
  if (totalBasicHours < 15) {
    return 0;
  }

  // 6. 주휴수당 계산: (총 기본근무시간/40) * 8 * 시급
  const weeklyHolidayHours = (totalBasicHours / 40) * 8;
  return Math.min(weeklyHolidayHours, 8); // 최대 8시간으로 제한
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
    default:
      return 0;
  }
}

/**
 * 근무 기록을 주차별로 그룹화
 */
export function groupWorkRecordsByWeek(workRecords: Array<{ date: Date, hours: number }>) {
  const recordsByWeek: Record<string, Array<{ date: Date, hours: number }>> = {};

  workRecords.forEach(record => {
    const date = new Date(record.date);
    // Get the ISO week number (1-53) to group by week
    const weekNumber = getWeekNumber(date);
    const weekKey = `${date.getFullYear()}-${weekNumber}`;
    
    if (!recordsByWeek[weekKey]) {
      recordsByWeek[weekKey] = [];
    }
    
    recordsByWeek[weekKey].push({
      date: date,
      hours: record.hours
    });
  });

  return recordsByWeek;
}

/**
 * Get the ISO week number for a date
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * 주간 근무 기록 처리 및 주간 근무 유형 분류
 */
export function processWeeklyRecords(records: Array<{ date: Date, hours: number }>): WeeklyWork {
  const weeklyWork: WeeklyWork = {
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

  // 요일별 기록 처리
  records.forEach(record => {
    const date = new Date(record.date);
    const dayOfWeek = date.getDay();
    const hours = record.hours;

    // 공휴일 체크
    if (isPublicHoliday(date)) {
      weeklyWork.publicHolidayDays++;
      return;
    }

    // 근무시간이 0인 경우는 휴무로 처리
    if (hours === 0) {
      weeklyWork.dayoffDays++;
      return;
    }

    // 일요일 근무
    if (dayOfWeek === 0) {
      if (hours > 8) {
        weeklyWork.holidayOvertimeHours += hours;
      } else {
        weeklyWork.holidayHours += hours;
      }
      return;
    }

    // 평일(월-금) 근무
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      weeklyWork.weekdayBasicWorkDays++;
      const regularHours = Math.min(8, hours);
      const overtimeHours = Math.max(0, hours - 8);
      
      weeklyWork.regularHours += regularHours;
      weeklyWork.overtimeHours += overtimeHours;
      return;
    }

    // 토요일 근무
    if (dayOfWeek === 6) {
      const remainingRegularHours = Math.max(0, 40 - weeklyWork.regularHours);
      
      if (remainingRegularHours > 0) {
        const regularHours = Math.min(remainingRegularHours, hours);
        const overtimeHours = Math.max(0, hours - regularHours);
        
        weeklyWork.weekendRegularHours += regularHours;
        weeklyWork.overtimeHours += overtimeHours;
      } else {
        weeklyWork.overtimeHours += hours;
      }
    }
  });

  return weeklyWork;
}