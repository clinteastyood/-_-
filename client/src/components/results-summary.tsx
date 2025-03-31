import { ProjectWithWorkers } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";

interface ResultsSummaryProps {
  project: ProjectWithWorkers;
}

export default function ResultsSummary({ project }: ResultsSummaryProps) {
  const { summary } = project;
  
  return (
    <div className="mt-6">
      <h3 className="text-lg font-bold mb-3">계산 요약</h3>
      <div className="bg-gray-50 p-4 rounded-md">
        <ul className="space-y-2">
          <li className="flex justify-between">
            <span className="text-neutral-medium">총 근로자 수:</span>
            <span className="font-medium">{summary.totalEmployees}명</span>
          </li>
          <li className="flex justify-between">
            <span className="text-neutral-medium">총 근로 시간:</span>
            <span className="font-medium">{summary.totalHours}시간</span>
          </li>
          <li className="flex justify-between">
            <span className="text-neutral-medium">총 급여:</span>
            <span className="font-medium">{formatCurrency(summary.totalWages)}원</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
