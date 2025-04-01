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
import * as XLSX from "xlsx";

interface ComprehensiveWageTableProps {
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

export default function ComprehensiveWageTable({
  project,
  days,
  workers,
}: ComprehensiveWageTableProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  // 엑셀 다운로드 함수
  const handleDownloadExcel = () => {
    setIsDownloading(true);

    try {
      // 테이블 데이터 준비
      const tableData = workers.map((worker) => {
        const row: Record<string, any> = {
          이름: worker.name,
          주민번호: maskSSN(worker.ssn),
          임금유형: worker.wageType,
          "시급/일급": worker.wageAmount,
        };

        // 일자별 근무시간 추가
        days.forEach((day) => {
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
          
          row[`${day}일`] = formattedWork;
        });

        // 계산 결과 추가
        row["총 근무시간"] = worker.calculation.totalHours;
        row["기본급"] = worker.calculation.baseWage;
        row["주휴수당"] = worker.calculation.weeklyHolidayPay;
        row["연장수당"] = worker.calculation.overtimePay;
        row["휴일수당"] = worker.calculation.holidayPay;
        row["휴일연장수당"] = worker.calculation.holidayOvertimePay;
        row["공휴일수당"] = worker.calculation.publicHolidayPay;
        row["최종 급여"] = worker.calculation.totalWage;

        return row;
      });

      // 워크북 생성
      const worksheet = XLSX.utils.json_to_sheet(tableData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "급여계산결과");

      // 열 너비 설정
      const columnWidths = [
        { wch: 10 }, // 이름
        { wch: 15 }, // 주민번호
        { wch: 8 }, // 임금유형
        { wch: 10 }, // 시급/일급
      ];

      // 일자별 열 너비
      days.forEach(() => {
        columnWidths.push({ wch: 15 }); // 더 넓은 폭으로 조정
      });

      // 계산 결과 열 너비
      columnWidths.push(
        { wch: 10 }, // 총 근무시간
        { wch: 12 }, // 기본급
        { wch: 12 }, // 주휴수당
        { wch: 12 }, // 연장수당
        { wch: 12 }, // 휴일수당
        { wch: 12 }, // 휴일연장수당
        { wch: 12 }, // 공휴일수당
        { wch: 12 }, // 최종 급여
      );

      worksheet["!cols"] = columnWidths;

      // 파일 다운로드
      XLSX.writeFile(
        workbook,
        `${project.name}_${project.formattedMonth}_급여계산결과.xlsx`,
      );
    } catch (error) {
      console.error("Excel 다운로드 에러:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  // 인쇄 함수
  const handlePrint = () => {
    window.print();
  };

  return (
    <Card className="bg-white shadow rounded-lg overflow-hidden">
      <CardHeader className="px-6 py-5 border-b border-neutral-100">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h2 className="text-lg font-medium text-neutral-500">
              급여 계산 결과 - 종합 내역
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
              {/* 기본 정보 */}
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap sticky left-0 bg-neutral-50 z-10 border-r border-neutral-100"
              >
                이름
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap"
              >
                주민번호
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap"
              >
                임금 유형
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap"
              >
                시급/일급
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
                    className={`px-3 py-3 text-center text-xs font-medium text-neutral-400 tracking-wider whitespace-nowrap ${
                      isSunday ? 'bg-red-50' : ''
                    }`}
                  >
                    {`${parseInt(month)}월 ${day}일 (${dayOfWeek})`}
                  </th>
                );
              })}
              
              {/* 총합 및 급여 항목 컬럼 */}
              <th
                scope="col"
                className="px-3 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap bg-neutral-100"
              >
                총 근무시간
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap"
              >
                기본급
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap"
              >
                주휴수당
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap"
              >
                연장수당
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap"
              >
                휴일수당
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap"
              >
                휴일연장수당
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap"
              >
                공휴일수당
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap bg-primary bg-opacity-10 border-l border-r border-primary-light"
              >
                최종 급여
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-100">
            {workers.map((worker) => (
              <tr key={worker.id}>
                <td className="px-3 py-4 text-sm text-neutral-500 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-neutral-100">
                  {worker.name}
                </td>
                <td className="px-3 py-4 text-sm text-neutral-500 whitespace-nowrap">
                  {maskSSN(worker.ssn)}
                </td>
                <td className="px-3 py-4 text-sm text-neutral-500 whitespace-nowrap">
                  {worker.wageType}
                </td>
                <td className="px-3 py-4 text-sm text-neutral-500 whitespace-nowrap text-right">
                  {formatCurrency(worker.wageAmount)}
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
                      <div className="w-32 mx-auto">{formattedWork}</div>
                    </td>
                  );
                })}

                {/* 총합 및 급여 항목 데이터 */}
                <td className="px-3 py-4 text-sm text-neutral-500 whitespace-nowrap text-right bg-neutral-100">
                  {worker.calculation.totalHours.toFixed(1)}시간
                </td>
                <td className="px-3 py-4 text-sm text-neutral-500 whitespace-nowrap text-right">
                  {formatCurrency(worker.calculation.baseWage || 0)}
                </td>
                <td className="px-3 py-4 text-sm text-neutral-500 whitespace-nowrap text-right">
                  {formatCurrency(worker.calculation.weeklyHolidayPay || 0)}
                </td>
                <td className="px-3 py-4 text-sm text-neutral-500 whitespace-nowrap text-right">
                  {formatCurrency(worker.calculation.overtimePay || 0)}
                </td>
                <td className="px-3 py-4 text-sm text-neutral-500 whitespace-nowrap text-right">
                  {formatCurrency(worker.calculation.holidayPay || 0)}
                </td>
                <td className="px-3 py-4 text-sm text-neutral-500 whitespace-nowrap text-right">
                  {formatCurrency(worker.calculation.holidayOvertimePay || 0)}
                </td>
                <td className="px-3 py-4 text-sm text-neutral-500 whitespace-nowrap text-right">
                  {formatCurrency(worker.calculation.publicHolidayPay || 0)}
                </td>
                <td className="px-3 py-4 text-sm font-medium text-neutral-700 whitespace-nowrap text-right bg-primary bg-opacity-5 border-l border-r border-primary-light">
                  {formatCurrency(worker.calculation.totalWage || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-100">
        <h3 className="text-sm font-medium text-neutral-500">급여 계산 규칙</h3>
        <ul className="mt-2 text-xs text-neutral-400 space-y-1">
          <li>• 기본: 기본근로시간 (월~금 8시간 이내 혹은 토요일 기본근로시간)</li>
          <li>• 연장: 연장근로시간 (하루 8시간 초과 혹은 주 40시간 초과)</li>
          <li>• 휴일: 휴일근로시간 (일요일 혹은 공휴일 8시간 이내)</li>
          <li>• 휴일연장: 휴일 8시간 초과 근무시간</li>
          <li>• 주휴: 주휴수당 (주간 기본근로시간 15시간 이상 시 지급)</li>
          <li>• 공휴일: 공휴일 수당</li>
          <li>• 한주는 월~일요일까지. 주 소정근로기간은 월~금요일이며, 토요일은 무급휴무일, 일요일은 주휴일입니다.</li>
          <li>• 기본근로: 법정 근로시간은 하루 8시간, 한주 최대 40시간. 단, 소정근로기간동안 40시간 누계하지 않을시, 토요일 근무시간도 누계될 때 까지 기본근로시간으로 포함.</li>
          <li>• 연장근로: 1일 8시간 초과, 혹은 1주 총합의 40시간 초과 시 임금의 50% 가산하여 계산합니다. 한주 최대 12시간까지만 연장근로로 인식 입니다 (주 52시간제)</li>
          <li>• 휴일근로: 주휴일 혹은 공휴일에 근로한 경우 통상임금의 50% 가산하여 계산합니다.</li>
          <li>• 휴일연장근로: 주휴일 혹은 공휴일에 8시간 초과 근로한 경우 초과한 만큼의 근로시간은 통상임금의 100% 가산하여 계산합니다.</li>
          <li>• 주휴수당: 1주일 동안 소정근로기간 즉 월~금 (공휴일, 우천, 휴무, 정휴 제외)을 모두 개근하고, 기본근로시간이 주 15시간 이상일 경우 기본근로시간만큼 주휴수당이 지급된다.</li>
        </ul>
      </div>
    </Card>
  );
}