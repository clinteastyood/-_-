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
import * as XLSX from "xlsx";

interface ResultsTableProps {
  project: {
    id: number;
    name: string;
    formattedMonth: string;
    fileName: string;
    uploadedAt: string;
    month: string; // Added month property
  };
  days: number[];
  workers: {
    id: number;
    name: string;
    ssn: string;
    wageType: string;
    wageAmount: number;
    dailyHours: Record<string, number | string>;
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

export default function ResultsTable({
  project,
  days,
  workers,
}: ResultsTableProps) {
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
          const workData = worker.dailyHours[day.toString()]; // Corrected line
          row[`${day}일`] = workData ? (workData.hours || workData.status) : "-";
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
        columnWidths.push({ wch: 8 }); // Adjusted width
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
              급여 계산 결과
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
                className="px-3 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap"
              >
                시급/일급
              </th>

              {/* 일자별 컬럼 */}
              {days.map((day) => {
                const [year, month] = project.month.split("-");
                const date = new Date(parseInt(year), parseInt(month) - 1, day);
                const dayOfWeek = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(date);
                return (
                  <th
                    key={day}
                    scope="col"
                    className="px-3 py-3 text-center text-xs font-medium text-neutral-400 tracking-wider w-16 whitespace-nowrap"
                  >
                    {`${parseInt(month)}월 ${day}일 (${dayOfWeek})`}
                  </th>
                );
              })}

              <th
                scope="col"
                className="px-3 py-3 text-center text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap"
              >
                총 근무시간
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-center text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap"
              >
                기본급
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-center text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap"
              >
                주휴수당
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-center text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap"
              >
                연장수당
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-center text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap"
              >
                휴일수당
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-center text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap"
              >
                휴일연장수당
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-center text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap"
              >
                공휴일수당
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-center text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap bg-primary bg-opacity-10 border-l border-r border-primary-light"
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

                {/* 일자별 근무시간 */}
                {days.map((day) => {
                  const workData = worker.dailyHours[day.toString()];
                  return (
                    <td
                      key={day}
                      className="px-3 py-4 text-sm text-neutral-500 text-center whitespace-nowrap"
                    >
                      {workData ?? "-"}
                    </td>
                  );
                })}

                <td className="px-3 py-4 text-sm text-neutral-500 whitespace-nowrap text-right">
                  {worker.calculation.totalHours || 0}
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
          <li> 
            한주는 월~일요일까지. 주 소정근로기간은 월~금요일이며, 토요일은 무급휴무일, 일요일은 주휴일입니다.
          </li>
          <li>
            • 기본근로: 법정 근로시간은 하루 8시간, 한주 최대 40시간. 단, 소정근로기간동안 40시간 누계하지 않을시, 토요일 근무시간도 누계될 때 까지 기본근로시간으로 포함. 
          </li>
          <li>
            • 연장근로: 1일 8시간 초과, 혹은 1주 총합의 40시간 초과 시 임금의 50% 가산하여 계산합니다. 한주 최대 12시간까지만 연장근로로 인식 입니다 (주 52시간제)
          </li>
          <li>
            • 휴일근로: 주휴일 혹은 공휴일에 근로한 경우 통상임금의 50% 가산하여 계산합니다.
          </li>
          <li>
            • 휴일연장근로: 주휴일 혹은 공휴일에 8시간 초과 근로한 경우 초과한 만큼의 근로시간은 통상임금의 100% 가산하여 계산합니다.
          </li>
          <li>
            • 주휴수당: 1주일 동안 소정근로기간 즉 월~금 (공휴일, 우천, 휴무, 정휴 제외)을 모두 개근하고, 기본근로시간이 주 15시간 이상일 경우 기본근로시간만큼 주휴수당이 지급된다.
          </li>
          <li>
            *** 해당 주에 하루라도 결근시 미지급 하며, 해당 주에 기본근로시간이 0일 때에도 미지급 한다 (예: 월~금 공휴일). 
          </li>
        </ul>
      </div>
    </Card>
  );
}