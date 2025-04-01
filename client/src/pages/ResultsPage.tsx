import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ProjectWithWorkers } from "@shared/schema";
import ResultsTable from "@/components/ResultsTable";
import DailyWageBreakdownTable from "@/components/DailyWageBreakdownTable";
import ComprehensiveWageTable from "@/components/ComprehensiveWageTable";
import LoadingOverlay from "@/components/LoadingOverlay";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ResultsPageProps {
  projectId?: string;
}

export default function ResultsPage({ projectId }: ResultsPageProps) {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("comprehensive");
  
  // 프로젝트 ID가 없으면 최신 프로젝트 목록을 불러와서 첫 번째 프로젝트로 리다이렉트
  const { data: projects } = useQuery<{ id: number }[]>({
    queryKey: ["/api/projects"],
    enabled: !projectId,
  });
  
  // 프로젝트 ID가 없고 프로젝트 목록이 있으면 첫 번째 프로젝트로 이동
  useEffect(() => {
    if (!projectId && projects && projects.length > 0) {
      setLocation(`/results/${projects[0].id}`);
    }
  }, [projectId, projects, setLocation]);
  
  // 프로젝트 상세 데이터 조회
  const { data: projectData, isLoading } = useQuery<{
    project: { id: number; name: string; month: string; fileName: string; uploadedAt: string };
    daysInMonth: number;
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
  }>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });
  
  if (isLoading) {
    return <LoadingOverlay />;
  }
  
  if (!projectId) {
    return (
      <Card className="bg-white shadow rounded-lg overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <h1 className="text-2xl font-bold text-gray-900">프로젝트를 선택해주세요</h1>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            급여 계산 결과를 확인할 프로젝트를 선택해주세요.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  if (!projectData) {
    return (
      <Card className="bg-white shadow rounded-lg overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">프로젝트를 찾을 수 없습니다</h1>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            요청하신 프로젝트를 찾을 수 없습니다. 다른 프로젝트를 선택해주세요.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const { project, daysInMonth, workers } = projectData;
  
  // 날짜 배열 생성
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  // 년월 표시 형식 변환 (YYYY-MM -> YYYY년 MM월)
  const formattedMonth = project.month.replace(
    /^(\d{4})-(\d{2})$/, 
    "$1년 $2월"
  );
  
  return (
    <div id="results-page">
      <Tabs defaultValue="comprehensive" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center mb-4">
          <TabsList>
            <TabsTrigger value="comprehensive" className="text-sm">종합 내역</TabsTrigger>
            <TabsTrigger value="summary" className="text-sm">급여 요약</TabsTrigger>
            <TabsTrigger value="daily" className="text-sm">일별 상세</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="comprehensive">
          <ComprehensiveWageTable
            project={{
              ...project,
              formattedMonth
            }}
            days={days}
            workers={workers}
          />
        </TabsContent>
        
        <TabsContent value="summary">
          <ResultsTable 
            project={{
              ...project,
              formattedMonth
            }}
            days={days}
            workers={workers}
          />
        </TabsContent>
        
        <TabsContent value="daily">
          <DailyWageBreakdownTable
            project={{
              ...project,
              formattedMonth
            }}
            days={days}
            workers={workers}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
