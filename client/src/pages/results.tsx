import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ProjectWithWorkers } from "@shared/schema";
import { useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import ResultsTable from "@/components/results-table";
import ResultsSummary from "@/components/results-summary";
import { downloadExcel } from "@/lib/excel-parser";
import LoadingOverlay from "@/components/loading-overlay";

export default function ResultsPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [isExporting, setIsExporting] = useState(false);
  
  // Get project ID from URL or redirect to upload page if invalid
  const projectId = params.id === 'latest' ? 
    undefined : 
    (!params.id || isNaN(Number(params.id))) ? 
      null : 
      Number(params.id);
      
  if (projectId === null) {
    navigate('/');
    return null;
  }
  
  const { data: projectsData, isLoading: isProjectsLoading } = useQuery<ProjectWithWorkers[]>({
    queryKey: ['/api/projects-with-workers'],
  });
  
  const { data: projectData, isLoading: isProjectLoading } = useQuery<ProjectWithWorkers>({
    queryKey: [projectId ? `/api/projects/${projectId}` : null],
    enabled: !!projectId,
  });
  
  // If "latest" is specified, find the most recent project
  const project = projectId ? 
    projectData : 
    projectsData && projectsData.length > 0 ? 
      projectsData.reduce((latest, p) => {
        return new Date(p.uploadDate) > new Date(latest.uploadDate) ? p : latest;
      }, projectsData[0]) : 
      undefined;
  
  const isLoading = isProjectsLoading || isProjectLoading || isExporting;
  
  const handleExportExcel = async () => {
    if (!project) return;
    
    setIsExporting(true);
    try {
      await downloadExcel(project);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    } finally {
      setIsExporting(false);
    }
  };
  
  const handlePrint = () => {
    window.print();
  };
  
  if (isLoading && !isExporting) {
    return <LoadingOverlay />;
  }
  
  if (!project) {
    return (
      <div className="py-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold">데이터를 찾을 수 없습니다</h2>
          <p className="mt-4">프로젝트 데이터가 없거나 로딩 중입니다. 데이터를 업로드해주세요.</p>
          <Button className="mt-4" onClick={() => navigate('/')}>
            업로드 페이지로 이동
          </Button>
        </div>
      </div>
    );
  }
  
  // Format the month for display (YYYY-MM to YYYY년 MM월)
  const [year, month] = project.month.split('-');
  const formattedMonth = `${year}년 ${month}월`;
  
  return (
    <div className="py-6">
      {isExporting && <LoadingOverlay />}
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">급여 계산 결과</h2>
            <div className="flex items-center mt-2">
              <span className="text-neutral-medium mr-2">프로젝트:</span>
              <span className="font-medium">{project.name}</span>
              <span className="mx-2 text-neutral-light">|</span>
              <span className="text-neutral-medium mr-2">월:</span>
              <span className="font-medium">{formattedMonth}</span>
            </div>
          </div>
          
          <div className="mt-4 md:mt-0 flex space-x-2">
            <Button
              variant="outline"
              onClick={handleExportExcel}
              className="flex items-center"
              disabled={isExporting}
            >
              <Download className="h-5 w-5 mr-1" />
              엑셀 내보내기
            </Button>
            
            <Button
              variant="outline"
              onClick={handlePrint}
              className="flex items-center"
            >
              <Printer className="h-5 w-5 mr-1" />
              인쇄
            </Button>
          </div>
        </div>
        
        <ResultsTable project={project} />
        <ResultsSummary project={project} />
      </div>
    </div>
  );
}
