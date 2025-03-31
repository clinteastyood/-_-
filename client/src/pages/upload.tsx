import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { uploadFileSchema, UploadFileData } from '@shared/schema';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import FileUpload from '@/components/file-upload';
import UploadHistory from '@/components/upload-history';

interface UploadPageProps {
  setLoading: (loading: boolean) => void;
}

export default function UploadPage({ setLoading }: UploadPageProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const form = useForm<UploadFileData>({
    resolver: zodResolver(uploadFileSchema),
    defaultValues: {
      projectName: '',
      projectMonth: '',
    },
  });
  
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest('POST', '/api/upload', undefined, formData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: '업로드 성공',
        description: '파일이 성공적으로 업로드되었습니다.',
      });
      if (data.projectId) {
        navigate(`/results/${data.projectId}`);
      }
    },
    onError: (error) => {
      toast({
        title: '업로드 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });
  
  const onSubmit = async (data: UploadFileData) => {
    if (!data.file) {
      toast({
        title: '파일 필요',
        description: '업로드할 파일을 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    
    const formData = new FormData();
    formData.append('projectName', data.projectName);
    formData.append('projectMonth', data.projectMonth);
    formData.append('file', data.file);
    
    try {
      await uploadMutation.mutateAsync(formData);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFileSelect = (file: File | null) => {
    form.setValue('file', file || undefined, {
      shouldValidate: true,
    });
  };
  
  return (
    <div className="py-6">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">엑셀 데이터 업로드</h2>
        <p className="mb-4 text-neutral-medium">근로 시간을 임금으로 변환하기 위한 엑셀 파일을 업로드하세요. 파일은 지정된 템플릿 형식이어야 합니다.</p>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="projectName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>프로젝트 이름</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="프로젝트 이름 입력"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="projectMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>급여 계산 월</FormLabel>
                    <FormControl>
                      <Input
                        type="month"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FileUpload onFileSelect={handleFileSelect} />
            
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!form.formState.isValid || uploadMutation.isPending}
              >
                업로드 및 계산하기
              </Button>
            </div>
          </form>
        </Form>
      </div>
      
      <UploadHistory />
    </div>
  );
}
