/**
 * Generic repository interface — Repository Pattern (SOLID: DIP).
 * All concrete repositories implement this interface, making them
 * interchangeable and independently testable.
 */
export interface IRepository<T> {
  findById(id: number): Promise<T | null>;
  save(entity: Partial<T>): Promise<T>;
  delete(id: number): Promise<void>;
  findAll(): Promise<T[]>;
}
