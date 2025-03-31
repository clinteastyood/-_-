import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Project } from "@shared/schema";

export default function UploadHistory() {
  const [, setLocation] = useLocation();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const handleViewResults = (projectId: number) => {
    setLocation(`/results/${projectId}`);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-4">업로드 기록</h3>
      
      <div className="table-container">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-medium uppercase tracking-wider">프로젝트</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-medium uppercase tracking-wider">월</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-medium uppercase tracking-wider">파일명</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-medium uppercase tracking-wider">업로드 날짜</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-medium uppercase tracking-wider">상태</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-medium uppercase tracking-wider">작업</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  데이터를 불러오는 중...
                </td>
              </tr>
            ) : projects && projects.length > 0 ? (
              projects.map((project) => (
                <tr key={project.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{project.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{project.month}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{project.fileName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {format(new Date(project.uploadDate), 'yyyy-MM-dd HH:mm', { locale: ko })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {project.status === 'completed' ? '완료' : project.status === 'processing' ? '처리중' : '오류'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary hover:text-primary-dark">
                    <button 
                      className="font-medium"
                      onClick={() => handleViewResults(project.id)}
                    >
                      결과 보기
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  업로드된 파일이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
