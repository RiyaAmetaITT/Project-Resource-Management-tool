export interface IRepository<T> {
  findById(id: number): Promise<T | null>;
  save(entity: Partial<T>): Promise<T>;
  delete(id: number): Promise<void>;
  findAll(): Promise<T[]>;
}
