export interface AllocateDto {
  employeeId: number;
  projectId: number;
  utilisationPercent: number;
  fromDate: string;
  toDate: string;
}

export interface AllocationResponseDto {
  id: number;
  employeeId: number;
  employeeName: string;
  projectId: number;
  projectName: string;
  utilisationPercent: number;
  fromDate: Date;
  toDate: Date;
}

export interface AllocationValidationDto {
  employeeName: string;
  currentTotal: number;
  newTotal: number;
  isValid: boolean;
}
