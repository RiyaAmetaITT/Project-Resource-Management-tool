export interface Allocation {
  id: number;
  employeeId: number;
  projectId: number;
  utilisationPercent: number;
  fromDate: Date;
  toDate: Date;
  createdAt: Date;
}
