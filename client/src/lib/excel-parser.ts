import { read, utils, write } from 'xlsx';
import { ProjectWithWorkers, Worker, WorkHour, InsertWorker, InsertWorkHour, WorkStatus } from '@shared/schema';
import { formatCurrency } from './utils';
import { calculateTotalWage } from './wage-calculator';

/**
 * Parse an Excel file and extract worker data
 * Expected format:
 * - Row 1: Headers (Name, SSN, Wage Type, Wage Amount, Day1, Day2, ..., Day31)
 * - Row 2+: Worker data
 */
export async function parseExcelFile(file: File): Promise<{
  workers: InsertWorker[],
  workHours: InsertWorkHour[]
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });

        // Assume first sheet contains the data
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = utils.sheet_to_json<any>(worksheet, { header: 1 });

        // Skip header row and process data
        const workers: InsertWorker[] = [];
        const workHours: InsertWorkHour[] = [];

        // Skip header row (jsonData[0])
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];

          // Skip empty rows
          if (!row || row.length === 0 || !row[0]) continue;

          // Extract worker info (first 4 columns)
          const worker: InsertWorker = {
            projectId: 0, // This will be set when project is created
            name: row[0],
            ssn: row[1],
            wageType: row[2]?.toLowerCase() === '시급' ? 'hourly' : 'daily',
            wageAmount: Number(row[3] || 0),
          };

          // Add worker
          workers.push(worker);

          // Process work hours (days 1-31, columns 4-34)
          // In the Excel, we expect days to start at index 4 (zero-based, so column E)
          const workHoursData: Record<string, number> = {};

          for (let day = 1; day <= 31; day++) {
            const value = row[3 + day];
            if(value === undefined) continue;
            const rawStatus = value.toString().trim();
            let status;
            let isHoliday = false;
            let isWageless = false;

            switch (rawStatus) {
              case '휴무':
                status = WorkStatus.DAYOFF;
                isWageless = true;
                break;
              case '결근':
                status = WorkStatus.ABSENCE;
                break;
              case '정휴':
                status = WorkStatus.REGULAR_HOLIDAY;
                isWageless = true;
                break;
              case '공휴일':
                status = WorkStatus.PUBLIC_HOLIDAY;
                isHoliday = true;
                break;
              case '우천':
                status = WorkStatus.RAINY_DAY;
                isWageless = true;
                break;
              default:
                status = rawStatus;
            }

            const hours = Number(value || 0);
            if (hours > 0 || status !== '0') { //check if hours >0 or status is not 0
              const dayStr = day.toString();
              workHoursData[dayStr] = { status };
              workHours.push({
                workerId: 0, // Will be set later
                projectId: 0, // Will be set later
                day: day,
                hours: hours,
                status,
                isHoliday,
                isWageless
              });
            }
          }
        }

        resolve({ workers, workHours });
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        reject(new Error('엑셀 파일 형식이 올바르지 않습니다. 템플릿을 확인해주세요.'));
      }
    };

    reader.onerror = (error) => {
      reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generate and download an Excel file from calculation results
 */
export async function downloadExcel(project: ProjectWithWorkers): Promise<void> {
  // Create a new workbook
  const wb = utils.book_new();

  // Get days in the month
  const daysInMonth = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

  // Create header row with days
  const headers = [
    '근로자명',
    '주민번호',
    '급여 유형',
    '시급/일급',
    ...daysInMonth.map(day => `${day}일`),
    '총 급여'
  ];

  // Create data rows
  const data = project.workers.map(worker => {
    const row: any[] = [
      worker.name,
      worker.ssn,
      worker.wageType === 'hourly' ? '시급' : '일급',
      `${formatCurrency(worker.wageAmount)}원`,
    ];

    // Add work hours for each day
    daysInMonth.forEach(day => {
      row.push(worker.workHours[day] || 0);
    });

    // Add total wage
    row.push(`${formatCurrency(worker.totalWage)}원`);

    return row;
  });

  // Create worksheet with headers and data
  const ws = utils.aoa_to_sheet([headers, ...data]);

  // Add worksheet to workbook
  utils.book_append_sheet(wb, ws, '급여 계산 결과');

  // Generate Excel file and trigger download
  const fileName = `${project.name}_${project.month}_급여계산.xlsx`;

  // Convert to Blob and download
  const blob = new Blob([write(wb, { bookType: 'xlsx', type: 'array' })], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}