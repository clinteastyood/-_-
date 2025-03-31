// 금액을 한글 화폐 표기 방식으로 포맷팅하는 함수
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    currencyDisplay: 'symbol',
    maximumFractionDigits: 0
  }).format(amount);
};

// 주민등록번호 마스킹 처리 함수
export const maskSSN = (ssn: string): string => {
  if (!ssn) return '';
  
  // 주민등록번호 형식 확인 (XXXXXX-XXXXXXX)
  const parts = ssn.split('-');
  
  if (parts.length === 2) {
    // 뒷자리는 첫 자리만 표시하고 나머지는 *로 대체
    return `${parts[0]}-${parts[1].substring(0, 1)}******`;
  } else {
    // 형식이 맞지 않을 경우 원본에서 7자리 이후는 *로 대체
    return `${ssn.substring(0, 7)}******`;
  }
};

// 날짜 포맷팅 함수
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// YYYY-MM 형식의 문자열에서 년, 월 추출 함수
export const extractYearMonth = (yearMonth: string): { year: number; month: number } => {
  const [year, month] = yearMonth.split('-').map(Number);
  return { year, month };
};

// 월의 일 수 계산 함수
export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};
