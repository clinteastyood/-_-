import { useLocation } from "wouter";
import { Project } from "@shared/schema";
import { formatDate } from "@/lib/calculationUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface UploadHistoryProps {
  projects: Project[];
  isLoading: boolean;
  setActiveTab: (tab: 'upload' | 'results') => void;
}

export default function UploadHistory({ projects, isLoading, setActiveTab }: UploadHistoryProps) {
  const [, setLocation] = useLocation();
  
  // 결과 보기 버튼 클릭 핸들러
  const handleViewResults = (projectId: number) => {
    setActiveTab("results");
    setLocation(`/results/${projectId}`);
  };
  
  // 월 형식 변환 (YYYY-MM -> YYYY년 MM월)
  const formatMonth = (month: string) => {
    return month.replace(/^(\d{4})-(\d{2})$/, "$1년 $2월");
  };
  
  return (
    <Card className="bg-white shadow rounded-lg overflow-hidden">
      <CardHeader className="px-6 py-5 border-b border-neutral-100">
        <h2 className="text-lg font-medium text-neutral-500">업로드 기록</h2>
      </CardHeader>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-neutral-50">
            <TableRow>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                프로젝트명
              </TableHead>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                근무 월
              </TableHead>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                파일명
              </TableHead>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                업로드 날짜
              </TableHead>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                상태
              </TableHead>
              <TableHead className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody className="bg-white divide-y divide-neutral-100">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-right">
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="px-6 py-4 text-center text-sm text-neutral-400">
                  업로드된 데이터가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                    {project.name}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                    {formatMonth(project.month)}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                    {project.fileName}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-neutral-400">
                    {formatDate(project.uploadedAt)}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      완료
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      variant="link"
                      className="text-primary hover:text-primary-dark"
                      onClick={() => handleViewResults(project.id)}
                    >
                      결과 보기
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="bg-white px-6 py-4 border-t border-neutral-100">
        <div className="flex justify-between flex-col sm:flex-row sm:items-center">
          <div className="text-sm text-neutral-400">
            총 <span className="font-medium">{projects.length}</span>개의 기록
          </div>
          {/* 페이지네이션은 필요할 때 구현 */}
        </div>
      </div>
    </Card>
  );
}
