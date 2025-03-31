import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { excelUploadSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { readExcelFile, validateExcelData } from "@/lib/excelUtils";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface UploadFormProps {
  setIsLoading: (isLoading: boolean) => void;
  setActiveTab: (tab: 'upload' | 'results') => void;
}

export default function UploadForm({ setIsLoading, setActiveTab }: UploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // 폼 설정
  const form = useForm({
    resolver: zodResolver(excelUploadSchema),
    defaultValues: {
      projectName: "",
      workMonth: new Date().toISOString().substring(0, 7), // 현재 년월(YYYY-MM) 기본값 설정
    },
  });
  
  // 파일 업로드 처리 뮤테이션
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("POST", "/api/upload", undefined);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "파일 업로드에 실패했습니다.");
      }
      return response.json();
    },
  });
  
  // 파일 선택 핸들러
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setSelectedFile(null);
      return;
    }
    
    const file = files[0];
    
    // 파일 형식 검사
    const allowedTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream", // .xlsx 파일이 때때로 이 MIME 타입으로 감지됨
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "지원되지 않는 파일 형식",
        description: "Excel 파일(.xlsx, .xls)만 업로드 가능합니다.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }
    
    try {
      // 엑셀 파일 데이터 유효성 검사
      const data = await readExcelFile(file);
      const validation = validateExcelData(data);
      
      if (!validation.isValid) {
        toast({
          title: "파일 형식 오류",
          description: validation.error,
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }
      
      setSelectedFile(file);
    } catch (error) {
      toast({
        title: "파일 읽기 오류",
        description: "엑셀 파일을 읽는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      e.target.value = "";
    }
  };
  
  // 파일 제거 핸들러
  const handleRemoveFile = () => {
    setSelectedFile(null);
    // 파일 입력 필드 초기화
    const fileInput = document.getElementById("file-upload") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };
  
  // 폼 제출 핸들러
  const onSubmit = async (values: { projectName: string; workMonth: string }) => {
    if (!selectedFile) {
      toast({
        title: "파일이 없습니다",
        description: "업로드할 엑셀 파일을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    // FormData 생성
    const formData = new FormData();
    formData.append("projectName", values.projectName);
    formData.append("workMonth", values.workMonth);
    formData.append("file", selectedFile);
    
    try {
      setIsLoading(true);
      
      // 파일 업로드 API 호출
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "파일 업로드에 실패했습니다.");
      }
      
      // 성공 처리
      toast({
        title: "업로드 성공",
        description: "엑셀 파일이 성공적으로 처리되었습니다.",
      });
      
      // 폼 초기화
      form.reset();
      setSelectedFile(null);
      
      // 결과 페이지로 이동
      setActiveTab("results");
      setLocation(`/results/${data.projectId}`);
    } catch (error) {
      toast({
        title: "오류 발생",
        description: error instanceof Error ? error.message : "처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="bg-white shadow rounded-lg overflow-hidden">
      <CardHeader className="px-6 py-5 border-b border-neutral-100">
        <h2 className="text-lg font-medium text-neutral-500">근무 시간 데이터 업로드</h2>
        <p className="mt-1 text-sm text-neutral-400">
          근무 시간이 기록된 엑셀 파일을 업로드하면 한국 노동법에 맞게 급여를 계산합니다.
        </p>
      </CardHeader>

      <CardContent className="px-6 py-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="projectName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-sm font-medium text-neutral-500">프로젝트명</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="프로젝트명을 입력하세요" 
                        className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-neutral-200 rounded-md p-2"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="workMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-sm font-medium text-neutral-500">근무 월</FormLabel>
                    <FormControl>
                      <Input 
                        type="month" 
                        className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-neutral-200 rounded-md p-2"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-500">엑셀 파일 업로드</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-100 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-neutral-300" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-neutral-400">
                    <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                      <span>파일 선택</span>
                      <input 
                        id="file-upload" 
                        name="file-upload" 
                        type="file" 
                        accept=".xlsx, .xls" 
                        className="sr-only"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">또는 여기로 파일을 끌어다 놓으세요</p>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Excel 파일만 허용됩니다 (.xlsx, .xls)
                  </p>
                </div>
              </div>
            </div>

            {selectedFile && (
              <div id="file-info">
                <div className="rounded-md bg-blue-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div className="ml-3 flex-1 md:flex md:justify-between">
                      <p className="text-sm text-primary">{selectedFile.name}</p>
                      <p className="mt-3 text-sm md:mt-0 md:ml-6">
                        <button 
                          type="button" 
                          id="remove-file" 
                          className="whitespace-nowrap font-medium text-primary hover:text-primary-dark"
                          onClick={handleRemoveFile}
                        >
                          삭제
                        </button>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="mr-3"
                onClick={() => form.reset()}
              >
                취소
              </Button>
              <Button 
                type="submit"
                disabled={form.formState.isSubmitting}
              >
                업로드 및 계산하기
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
