import { useState } from "react";
import { formatCurrency, maskSSN } from "@/lib/calculationUtils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Download, Printer, InfoIcon } from "lucide-react";
import { calculateDailyWorkType, WorkType } from "@/lib/wage-calculator";

interface DailyWageBreakdownTableProps {
  project: {
    id: number;
    name: string;
    formattedMonth: string;
    fileName: string;
    uploadedAt: string;
    month: string;
  };
  days: number[];
  workers: {
    id: number;
    name: string;
    ssn: string;
    wageType: string;
    wageAmount: number;
    dailyHours: Record<string, number>;
    calculation: {
      totalHours: number;
      baseWage: number;
      overtimePay: number;
      nightPay: number;
      weeklyHolidayPay: number;
      totalWage: number;
      holidayPay: number;
      holidayOvertimePay: number;
      publicHolidayPay: number;
    };
  }[];
}

// 근무 유형에 따른 표시 텍스트 매핑
const workTypeDisplayMap: Record<WorkType, string> = {
  [WorkType.REGULAR]: "기본",
  [WorkType.OVERTIME]: "연장",
  [WorkType.HOLIDAY]: "휴일",
  [WorkType.HOLIDAY_OVERTIME]: "휴일연장",
  [WorkType.WEEKLY_HOLIDAY]: "주휴",
  [WorkType.PUBLIC_HOLIDAY]: "공휴일",
  [WorkType.ABSENT]: "결근",
  [WorkType.RAIN_OFF]: "우천",
  [WorkType.REGULAR_OFF]: "정휴"
};

// 일일 근무 유형과 시간을 표시용 텍스트로 변환
function formatDailyWork(date: Date, hours: number, wageAmount: number, weeklyHolidayPay: number): string {
  if (hours <= 0) return "-";
  
  // 기본적인 근무 유형 계산
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
  
  const dailyWork = calculateDailyWorkType(date, hours, weeklyWork);
  
  // 주휴수당이 있고 일요일이면 주휴 표시 추가
  let result = "";
  
  // 일요일 && 주휴수당 존재 시 "주휴 8.0" 표시
  if (date.getDay() === 0 && weeklyHolidayPay > 0) {
    const weeklyHolidayHours = Math.round((weeklyHolidayPay / wageAmount) * 10) / 10; // 소수점 한 자리까지
    result += `주휴 ${weeklyHolidayHours}`;
    
    // 일요일 근무시간이 있으면 "+" 표시 후 근무시간 추가
    if (hours > 0) {
      result += " + ";
    }
  }
  
  // 일반 근무 유형에 따른 표시
  if (dailyWork.type === WorkType.REGULAR) {
    // 기본 근무가 8시간 이하면 "기본 X.X" 표시
    if (hours <= 8) {
      result += `${workTypeDisplayMap[dailyWork.type]} ${hours.toFixed(1)}`;
    } 
    // 기본 근무 8시간 초과면 "기본 8.0 + 연장 X.X" 표시
    else {
      const regularHours = 8;
      const overtimeHours = hours - regularHours;
      result += `${workTypeDisplayMap[WorkType.REGULAR]} ${regularHours.toFixed(1)} + ${workTypeDisplayMap[WorkType.OVERTIME]} ${overtimeHours.toFixed(1)}`;
    }
  } 
  // 공휴일 근무
  else if (dailyWork.type === WorkType.PUBLIC_HOLIDAY) {
    result += `${workTypeDisplayMap[dailyWork.type]} 8.0`;
  }
  // 휴일 근무가 8시간 이하면 "휴일 X.X" 표시
  else if (dailyWork.type === WorkType.HOLIDAY && hours <= 8) {
    result += `${workTypeDisplayMap[dailyWork.type]} ${hours.toFixed(1)}`;
  }
  // 휴일 근무가 8시간 초과면 "휴일 8.0 + 휴일연장 X.X" 표시
  else if (dailyWork.type === WorkType.HOLIDAY_OVERTIME || (dailyWork.type === WorkType.HOLIDAY && hours > 8)) {
    const regularHoliday = Math.min(8, hours);
    const overtimeHoliday = Math.max(0, hours - 8);
    result += `${workTypeDisplayMap[WorkType.HOLIDAY]} ${regularHoliday.toFixed(1)}`;
    if (overtimeHoliday > 0) {
      result += ` + ${workTypeDisplayMap[WorkType.HOLIDAY_OVERTIME]} ${overtimeHoliday.toFixed(1)}`;
    }
  }
  // 연장 근무
  else if (dailyWork.type === WorkType.OVERTIME) {
    if (dailyWork.regularHours && dailyWork.overtimeHours) {
      result += `${workTypeDisplayMap[WorkType.REGULAR]} ${dailyWork.regularHours.toFixed(1)} + ${workTypeDisplayMap[WorkType.OVERTIME]} ${dailyWork.overtimeHours.toFixed(1)}`;
    } else {
      result += `${workTypeDisplayMap[dailyWork.type]} ${hours.toFixed(1)}`;
    }
  }
  // 그 외 유형
  else {
    result += `${workTypeDisplayMap[dailyWork.type]} ${hours.toFixed(1)}`;
  }
  
  return result;
}

export default function DailyWageBreakdownTable({
  project,
  days,
  workers,
}: DailyWageBreakdownTableProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  // 엑셀 다운로드 함수
  const handleDownloadExcel = () => {
    // Excel 다운로드 기능 추가
    alert("급여 상세 내역 엑셀 다운로드 기능은 준비 중입니다.");
  };

  // 인쇄 함수
  const handlePrint = () => {
    window.print();
  };

  return (
    <Card className="bg-white shadow rounded-lg overflow-hidden mt-4">
      <CardHeader className="px-6 py-5 border-b border-neutral-100">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h2 className="text-lg font-medium text-neutral-500">
              일일 급여 상세 내역
            </h2>
            <p className="mt-1 text-sm text-neutral-400">
              {project.name} - {project.formattedMonth}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 space-y-2 sm:space-y-0 sm:space-x-2 flex flex-col sm:flex-row">
            <Button
              variant="outline"
              className="inline-flex items-center"
              onClick={handleDownloadExcel}
              disabled={isDownloading}
            >
              <Download className="mr-2 h-4 w-4" />
              엑셀 다운로드
            </Button>
            <Button
              variant="outline"
              className="inline-flex items-center"
              onClick={handlePrint}
            >
              <Printer className="mr-2 h-4 w-4" />
              인쇄
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-100">
          <thead className="bg-neutral-50">
            <tr>
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap sticky left-0 bg-neutral-50 z-10 border-r border-neutral-100"
              >
                이름
              </th>

              {/* 일자별 컬럼 */}
              {days.map((day) => {
                const [year, month] = project.month.split("-");
                const date = new Date(parseInt(year), parseInt(month) - 1, day);
                const dayOfWeek = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(date);
                // 일요일이면 클래스 추가
                const isSunday = date.getDay() === 0;
                return (
                  <th
                    key={day}
                    scope="col"
                    className={`px-3 py-3 text-center text-xs font-medium text-neutral-400 tracking-wider w-16 whitespace-nowrap ${
                      isSunday ? 'bg-red-50' : ''
                    }`}
                  >
                    {`${parseInt(month)}월 ${day}일 (${dayOfWeek})`}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-100">
            {workers.map((worker) => (
              <tr key={worker.id}>
                <td className="px-3 py-4 text-sm text-neutral-500 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-neutral-100">
                  {worker.name}
                </td>

                {/* 일자별 근무 유형과 시간 */}
                {days.map((day) => {
                  const [year, month] = project.month.split("-");
                  const date = new Date(parseInt(year), parseInt(month) - 1, day);
                  const isSunday = date.getDay() === 0;
                  const hours = worker.dailyHours[day.toString()] || 0;
                  
                  // 주휴수당 계산 (모든 일요일에 균등 분배로 가정)
                  let sundayWeeklyHolidayPay = 0;
                  if (isSunday) {
                    // 일요일의 총 개수 계산
                    const sundays = days.filter(d => {
                      const sunDate = new Date(parseInt(year), parseInt(month) - 1, d);
                      return sunDate.getDay() === 0;
                    }).length;
                    
                    // 주휴수당을 일요일 개수로 나눔
                    sundayWeeklyHolidayPay = worker.calculation.weeklyHolidayPay / sundays;
                  }
                  
                  const formattedWork = formatDailyWork(
                    date, 
                    Number(hours), 
                    worker.wageAmount,
                    isSunday ? sundayWeeklyHolidayPay : 0
                  );
                  
                  return (
                    <td
                      key={day}
                      className={`px-3 py-4 text-sm text-neutral-500 text-center ${
                        isSunday ? 'bg-red-50' : ''
                      }`}
                    >
                      <div className="w-32">{formattedWork}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-100">
        <h3 className="text-sm font-medium text-neutral-500">상세 내역 표기 규칙</h3>
        <ul className="mt-2 text-xs text-neutral-400 space-y-1">
          <li>• 기본: 기본근로시간 (월~금 8시간 이내 혹은 토요일 기본근로시간)</li>
          <li>• 연장: 연장근로시간 (하루 8시간 초과 혹은 주 40시간 초과)</li>
          <li>• 휴일: 휴일근로시간 (일요일 혹은 공휴일 8시간 이내)</li>
          <li>• 휴일연장: 휴일 8시간 초과 근무시간</li>
          <li>• 주휴: 주휴수당 (주간 기본근로시간 15시간 이상 시 지급)</li>
          <li>• 공휴일: 공휴일 수당</li>
        </ul>
      </div>
    </Card>
  );
}