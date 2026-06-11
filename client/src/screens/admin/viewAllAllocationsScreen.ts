import { adminApi } from '../../apiClient/adminApi';
import { printHeader, printTable, printError, printDivider, printInfo } from '../../utils/consoleUi';
import { promptText, selectFromMenu } from '../../utils/inputHelpers';

interface AllocationRow {
  employeeName: string;
  projectName: string;
  utilisationPercent: number;
  fromDate: string;
  toDate: string;
}

/** Screen 3.3 — View All Allocations (Admin) */
export async function viewAllAllocationsScreen(): Promise<void> {
  let employeeFilter: string | null = null;
  let projectFilter: string | null = null;

  let activeAllocations: AllocationRow[];
  try {
    const allocations = await adminApi.getAllAllocations() as AllocationRow[];
    activeAllocations = allocations.filter((a) => isActiveAllocation(a.toDate));
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to load allocations.');
    return;
  }

  while (true) {
    printHeader('ALL ALLOCATIONS');
    console.log();

    const allocations = applyAllocationFilters(activeAllocations, employeeFilter, projectFilter);

    if (allocations.length === 0) {
      printInfo('No active allocations match the current filters.');
    } else {
      printTable(
        ['Employee', 'Project', '%', 'From', 'To'],
        allocations.map((a) => [
          a.employeeName,
          a.projectName,
          `${a.utilisationPercent}%`,
          formatDisplayDate(a.fromDate),
          formatDisplayDate(a.toDate),
        ]),
      );
    }

    printDivider();
    console.log(`  Total Active Allocations: ${allocations.length}`);

    if (employeeFilter || projectFilter) {
      const parts: string[] = [];
      if (employeeFilter) parts.push(`Employee: ${employeeFilter}`);
      if (projectFilter) parts.push(`Project: ${projectFilter}`);
      console.log(`  Filters: ${parts.join('  |  ')}`);
    }

    console.log('\n  [F] Filter by Employee / Project     [B] Back\n');

    const action = (await promptText('Enter option:')).toUpperCase();
    if (action === 'B') return;

    if (action === 'F') {
      const updated = await promptAllocationFilters(activeAllocations, employeeFilter, projectFilter);
      employeeFilter = updated.employeeFilter;
      projectFilter = updated.projectFilter;
      continue;
    }

    printError('Invalid option. Enter F to filter or B to go back.');
  }
}

function isActiveAllocation(toDate: string): boolean {
  const end = new Date(toDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return end >= today;
}

function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB');
}

function applyAllocationFilters(
  allocations: AllocationRow[],
  employeeFilter: string | null,
  projectFilter: string | null,
): AllocationRow[] {
  return allocations.filter((a) => {
    if (employeeFilter && a.employeeName !== employeeFilter) return false;
    if (projectFilter && a.projectName !== projectFilter) return false;
    return true;
  });
}

async function promptAllocationFilters(
  allAllocations: AllocationRow[],
  currentEmployee: string | null,
  currentProject: string | null,
): Promise<{ employeeFilter: string | null; projectFilter: string | null }> {
  const choice = await selectFromMenu('Filter by:', [
    'Employee',
    'Project',
    'Clear all filters',
    'Cancel',
  ]);

  if (choice === 'Cancel') {
    return { employeeFilter: currentEmployee, projectFilter: currentProject };
  }

  if (choice === 'Clear all filters') {
    return { employeeFilter: null, projectFilter: null };
  }

  if (choice === 'Employee') {
    const employees = [...new Set(allAllocations.map((a) => a.employeeName))].sort();
    const employee = await selectFromMenu('Select employee:', ['All', ...employees]);
    return {
      employeeFilter: employee === 'All' ? null : employee,
      projectFilter: currentProject,
    };
  }

  const projects = [...new Set(allAllocations.map((a) => a.projectName))].sort();
  const project = await selectFromMenu('Select project:', ['All', ...projects]);
  return {
    employeeFilter: currentEmployee,
    projectFilter: project === 'All' ? null : project,
  };
}
