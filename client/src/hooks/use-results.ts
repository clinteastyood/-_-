import { useQuery } from '@tanstack/react-query';
import { ProjectWithWorkers } from '@shared/schema';

export function useResults(projectId?: number) {
  const { data: projectsData, isLoading: isProjectsLoading } = useQuery<ProjectWithWorkers[]>({
    queryKey: ['/api/projects-with-workers'],
  });
  
  const { data: projectData, isLoading: isProjectLoading } = useQuery<ProjectWithWorkers>({
    queryKey: [projectId ? `/api/projects/${projectId}` : null],
    enabled: !!projectId,
  });
  
  // Get the project data - either the specific project or the latest one
  const project = projectId ? 
    projectData : 
    projectsData && projectsData.length > 0 ? 
      // Find the most recent project
      projectsData.reduce((latest, p) => {
        return new Date(p.uploadDate) > new Date(latest.uploadDate) ? p : latest;
      }, projectsData[0]) : 
      undefined;
  
  return {
    project,
    isLoading: isProjectsLoading || isProjectLoading,
    hasProjects: (projectsData?.length ?? 0) > 0,
  };
}
