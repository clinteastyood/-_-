import { useState } from "react";
import UploadForm from "@/components/UploadForm";
import UploadHistory from "@/components/UploadHistory";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useQuery } from "@tanstack/react-query";
import { Project } from "@shared/schema";

interface UploadPageProps {
  setActiveTab: (tab: 'upload' | 'results') => void;
}

export default function UploadPage({ setActiveTab }: UploadPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // 프로젝트 목록 조회
  const { data: projects, isLoading: isProjectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  return (
    <>
      <div id="upload-page" className="space-y-8">
        <UploadForm 
          setIsLoading={setIsLoading} 
          setActiveTab={setActiveTab}
        />
        
        <UploadHistory 
          projects={projects || []} 
          isLoading={isProjectsLoading} 
          setActiveTab={setActiveTab}
        />
      </div>
      
      {isLoading && <LoadingOverlay />}
    </>
  );
}
