import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { UploadFileData } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useUpload() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const uploadMutation = useMutation({
    mutationFn: async (data: UploadFileData) => {
      setIsLoading(true);
      
      const formData = new FormData();
      formData.append('projectName', data.projectName);
      formData.append('projectMonth', data.projectMonth);
      formData.append('file', data.file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '파일 업로드 중 오류가 발생했습니다.');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      toast({
        title: '업로드 성공',
        description: '파일이 성공적으로 업로드되었습니다.',
      });
      
      return data.projectId;
    },
    onError: (error: Error) => {
      toast({
        title: '업로드 실패',
        description: error.message,
        variant: 'destructive',
      });
      
      return null;
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });
  
  return {
    uploadFile: uploadMutation.mutateAsync,
    isLoading: isLoading || uploadMutation.isPending,
  };
}
