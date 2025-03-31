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

// 템플릿 엑셀 파일 생성 및 다운로드 함수
export const downloadExcelTemplate = (month: string = ""): void => {
  try {
    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    
    // 헤더 생성
    const headers = ["이름", "주민번호", "임금유형", "임금액"];
    
    // 현재 월이나 지정된 월의 일수에 맞게 날짜 컬럼 추가
    let year = new Date().getFullYear();
    let monthNum = new Date().getMonth() + 1; // 0-based 이므로 +1
    
    // 사용자가 지정한 월이 있으면 사용
    if (month) {
      const parts = month.split("-");
      if (parts.length === 2) {
        year = parseInt(parts[0]);
        monthNum = parseInt(parts[1]);
      }
    }
    
    // 해당 월의 일수 계산
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    
    // 날짜 컬럼 추가
    for (let day = 1; day <= daysInMonth; day++) {
      headers.push(`${day}일`);
    }
    
    // 예시 데이터 타입 정의
    interface WorkerData {
      이름: string;
      주민번호: string;
      임금유형: string;
      임금액: number;
      [key: string]: string | number; // 날짜별 근무시간을 위한 인덱스 시그니처
    }
    
    // 예시 데이터
    const sampleData: WorkerData[] = [
      {
        "이름": "홍길동",
        "주민번호": "901201-1******",
        "임금유형": "시급",
        "임금액": 9620,
      },
      {
        "이름": "김철수",
        "주민번호": "880505-1******",
        "임금유형": "일급",
        "임금액": 80000,
      }
    ];
    
    // 샘플 데이터에 날짜별 근무시간 추가 (비어있는 상태로)
    sampleData.forEach(row => {
      for (let day = 1; day <= daysInMonth; day++) {
        row[`${day}일`] = 0; // 기본값 0시간
      }
      
      // 간단한 예시 데이터 (첫 번째 행만)
      if (row["이름"] === "홍길동") {
        row["1일"] = 8;
        row["2일"] = 8;
        row["3일"] = 8;
        row["4일"] = 8;
        row["5일"] = 8;
      }
    });
    
    // 워크시트 생성
    const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    
    // 열 너비 설정
    const columnWidths = [
      { wch: 10 },  // 이름
      { wch: 15 },  // 주민번호
      { wch: 8 },   // 임금유형
      { wch: 10 },  // 임금액
    ];
    
    // 날짜 열 너비 설정
    for (let i = 0; i < daysInMonth; i++) {
      columnWidths.push({ wch: 5 });
    }
    
    worksheet["!cols"] = columnWidths;
    
    // 워크북에 워크시트 추가
    XLSX.utils.book_append_sheet(workbook, worksheet, "근무시간");
    
    // 파일 다운로드
    XLSX.writeFile(workbook, `근무시간_템플릿_${year}-${monthNum.toString().padStart(2, '0')}.xlsx`);
  } catch (error) {
    console.error("템플릿 생성 중 오류 발생:", error);
  }
};
