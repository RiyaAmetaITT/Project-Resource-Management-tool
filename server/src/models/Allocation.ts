export interface Allocation {
  id: number;
  resourceId: number;
  projectId: number;
  utilisationPercent: number;
  fromDate: Date;
  toDate: Date;
  createdAt: Date;
}
