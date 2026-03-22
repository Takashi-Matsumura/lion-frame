export interface ImportCheckupRow {
  [key: string]: string | undefined;
}

export interface MatchedRecord {
  employeeDbId: string;
  employeeId: string;
  employeeName: string;
  bookingMethod?: string;
  facility?: string;
  checkupType?: string;
  preferredDates?: string[];
  confirmedDate?: string;
  status: "PENDING" | "BOOKED";
  isExisting: boolean;
  rawData: Record<string, unknown>;
}

export interface ImportPreview {
  matched: MatchedRecord[];
  unmatched: { row: number; submitter: string; reason: string }[];
  duplicates: { row: number; employeeId: string; name: string }[];
  total: number;
}

export interface ColumnMapping {
  employee?: string;      // EMPLOYEE_PICKERカラム名
  bookingMethod?: string; // 予約方法
  facility?: string;      // 医療機関
  checkupType?: string;   // 健診種別
  preferredDates?: string; // 候補日 (DATE_SLOTS)
}
