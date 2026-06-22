import { AllocationRepository } from '../repositories/AllocationRepository';
import { DAYS_IN_WEEK } from '../constants';
import { addDays } from './dateUtils';

export async function hasActiveAllocationDuringWeek(
  allocationRepository: AllocationRepository,
  resourceId: number,
  weekStart: Date,
): Promise<boolean> {
  const weekEnd = addDays(weekStart, DAYS_IN_WEEK - 1);
  const utilisation = await allocationRepository.sumUtilisationInPeriod(
    resourceId,
    weekStart,
    weekEnd,
  );
  return utilisation > 0;
}
