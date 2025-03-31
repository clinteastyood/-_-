import { ChangeEvent, DragEvent, useState, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
}

export default function FileUpload({ onFileSelect }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      onFileSelect(selectedFile);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      onFileSelect(droppedFile);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setFile(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="mb-6">
      <label htmlFor="file-upload" className="block text-sm font-medium text-neutral-dark mb-2">엑셀 파일 업로드</label>
      
      <div 
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition ${dragActive ? 'border-primary' : 'border-gray-300'}`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          id="file-upload" 
          ref={fileInputRef}
          className="hidden" 
          accept=".xlsx,.xls" 
          onChange={handleFileChange}
        />
        
        <div className="flex flex-col items-center justify-center">
          <svg className="mx-auto h-12 w-12 text-neutral-light" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4h-8m-12 0H8m0 0v-8m12 4h8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="mt-2 block text-sm font-medium text-neutral-dark">
            파일을 클릭하거나 드래그하여 업로드하세요
          </span>
          <span className="mt-1 block text-xs text-neutral-medium">
            엑셀 파일(.xlsx, .xls)만 지원됩니다
          </span>
        </div>
      </div>
      
      {file && (
        <div className="mt-2">
          <div className="flex items-center">
            <span className="flex-1 text-sm font-medium">{file.name}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-neutral-medium hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                removeFile();
              }}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">파일 제거</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
