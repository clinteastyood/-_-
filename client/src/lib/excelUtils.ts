import * as XLSX from "xlsx";

// 엑셀 파일에서 데이터를 읽어오는 함수
export const readExcelFile = (file: File): Promise<Record<string, any>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("파일을 읽을 수 없습니다."));
          return;
        }
        
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // 엑셀 데이터를 JSON으로 변환
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData as Record<string, any>[]);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsBinaryString(file);
  });
};

// 엑셀 데이터 유효성 검사 함수
export const validateExcelData = (data: Record<string, any>[]): { isValid: boolean; error?: string } => {
  if (data.length === 0) {
    return { 
      isValid: false, 
      error: "엑셀 파일에 데이터가 없습니다." 
    };
  }
  
  // 필수 컬럼 확인
  const firstRow = data[0];
  const requiredColumns = ["이름", "주민번호", "임금유형", "임금액"];
  
  for (const column of requiredColumns) {
    if (!(column in firstRow)) {
      return { 
        isValid: false, 
        error: `엑셀 파일에 '${column}' 컬럼이 없습니다.` 
      };
    }
  }
  
  // 날짜 컬럼 확인
  const dateColumns = Object.keys(firstRow).filter(key => /^\d+일$/.test(key));
  
  if (dateColumns.length === 0) {
    return { 
      isValid: false, 
      error: "엑셀 파일에 날짜 컬럼이 없습니다." 
    };
  }
  
  return { isValid: true };
};
