import { ProjectWithWorkers } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";

interface ResultsTableProps {
  project: ProjectWithWorkers;
}

export default function ResultsTable({ project }: ResultsTableProps) {
  // Create array of days in month
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);
  
  // Get year and month from project.month (format: YYYY-MM)
  const [year, month] = project.month.split('-');
  
  return (
    <div className="table-container">
      <table className="min-w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-neutral-dark" rowSpan={2}>근로자명</th>
            <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-neutral-dark" rowSpan={2}>주민번호</th>
            <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-neutral-dark" rowSpan={2}>급여 유형</th>
            <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-neutral-dark" rowSpan={2}>시급/일급</th>
            <th 
              className="border border-gray-200 px-4 py-2 text-center text-sm font-medium text-neutral-dark" 
              colSpan={31}
            >
              일별 근로 시간 ({month}월)
            </th>
            <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-neutral-dark" rowSpan={2}>총 급여</th>
          </tr>
          <tr className="bg-gray-50">
            {daysInMonth.map(day => (
              <th key={day} className="border border-gray-200 px-2 py-1 text-center text-xs font-medium text-neutral-dark">{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {project.workers.map((worker) => {
            // Get the correct wage label
            const wageLabel = worker.wageType === 'hourly' ? '시급' : '일급';
            const formattedWage = formatCurrency(worker.wageAmount);
            
            // Function to check if a day is a weekend
            const isWeekend = (day: number) => {
              const date = new Date(`${year}-${month}-${day.toString().padStart(2, '0')}`);
              return date.getDay() === 0 || date.getDay() === 6; // 0 is Sunday, 6 is Saturday
            };
            
            return (
              <tr key={worker.id}>
                <td className="border border-gray-200 px-4 py-2 text-sm">{worker.name}</td>
                <td className="border border-gray-200 px-4 py-2 text-sm">{worker.ssn}</td>
                <td className="border border-gray-200 px-4 py-2 text-sm">{wageLabel}</td>
                <td className="border border-gray-200 px-4 py-2 text-sm">{formattedWage}원</td>
                
                {/* Days 1-31 */}
                {daysInMonth.map((day) => {
                  const dayStr = day.toString();
                  const hours = worker.workHours[dayStr] || 0;
                  const isWeekendDay = isWeekend(day);
                  
                  return (
                    <td 
                      key={day} 
                      className={`border border-gray-200 px-2 py-2 text-center text-xs ${isWeekendDay ? 'bg-gray-100' : ''}`}
                    >
                      {hours}
                    </td>
                  );
                })}
                
                <td className="border border-gray-200 px-4 py-2 text-sm font-medium">
                  {formatCurrency(worker.totalWage)}원
                </td>
              </tr>
            );
          })}
          
          {project.workers.length === 0 && (
            <tr>
              <td colSpan={37} className="border border-gray-200 px-4 py-3 text-center text-sm text-gray-500">
                근로자 데이터가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
