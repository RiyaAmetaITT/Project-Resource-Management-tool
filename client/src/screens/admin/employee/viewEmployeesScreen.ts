import { adminApi } from '../../../apiClient/adminApi';
import { printHeader, printTable, printError, printDivider, printInfo } from '../../../utils/consoleUi';
import { promptText, selectFromMenu } from '../../../utils/inputHelpers';
import { EmployeeSummary } from '../../../types/admin';
import { EmployeeStatus } from '../../../types/enums';

export async function viewEmployeesScreen(): Promise<void> {
  let statusFilter: string | null = null;
  let departmentFilter: string | null = null;

  let allEmployees: EmployeeSummary[];
  try {
    allEmployees = await adminApi.getAllEmployees();
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to load employees.');
    return;
  }

  while (true) {
    printHeader('ALL EMPLOYEES');
    console.log();

    const employees = applyEmployeeFilters(allEmployees, statusFilter, departmentFilter);

    if (employees.length === 0) {
      printInfo('No employees match the current filters.');
    } else {
      printTable(
        ['ID', 'Name', 'Department', 'Status'],
        employees.map((e) => [e.id, e.name, e.department, e.status]),
      );
    }

    printDivider();
    const allocated = employees.filter((e) => e.status === EmployeeStatus.ALLOCATED).length;
    const bench = employees.filter((e) => e.status === EmployeeStatus.BENCH).length;
    console.log(`  Total: ${employees.length}   |   Allocated: ${allocated}   |   Bench: ${bench}`);

    if (statusFilter || departmentFilter) {
      const parts: string[] = [];
      if (statusFilter) parts.push(`Status: ${statusFilter}`);
      if (departmentFilter) parts.push(`Department: ${departmentFilter}`);
      console.log(`  Filters: ${parts.join('  |  ')}`);
    }

    console.log('\n  [F] Filter by Status / Department     [B] Back\n');

    const action = (await promptText('Enter option:')).toUpperCase();
    if (action === 'B') return;

    if (action === 'F') {
      const updated = await promptEmployeeFilters(allEmployees, statusFilter, departmentFilter);
      statusFilter = updated.statusFilter;
      departmentFilter = updated.departmentFilter;
      continue;
    }

    printError('Invalid option. Enter F to filter or B to go back.');
  }
}

function applyEmployeeFilters(
  employees: EmployeeSummary[],
  statusFilter: string | null,
  departmentFilter: string | null,
): EmployeeSummary[] {
  return employees.filter((e) => {
    if (statusFilter && e.status !== statusFilter) return false;
    if (departmentFilter && e.department !== departmentFilter) return false;
    return true;
  });
}

async function promptEmployeeFilters(
  allEmployees: EmployeeSummary[],
  currentStatus: string | null,
  currentDepartment: string | null,
): Promise<{ statusFilter: string | null; departmentFilter: string | null }> {
  const choice = await selectFromMenu('Filter by:', [
    'Status',
    'Department',
    'Clear all filters',
    'Cancel',
  ]);

  if (choice === 'Cancel') {
    return { statusFilter: currentStatus, departmentFilter: currentDepartment };
  }

  if (choice === 'Clear all filters') {
    return { statusFilter: null, departmentFilter: null };
  }

  if (choice === 'Status') {
    const status = await selectFromMenu('Select status:', [
      'All',
      EmployeeStatus.BENCH,
      EmployeeStatus.ALLOCATED,
    ]);
    return {
      statusFilter: status === 'All' ? null : status,
      departmentFilter: currentDepartment,
    };
  }

  const departments = [...new Set(allEmployees.map((e) => e.department).filter(Boolean))].sort();
  const department = await selectFromMenu('Select department:', ['All', ...departments]);
  return {
    statusFilter: currentStatus,
    departmentFilter: department === 'All' ? null : department,
  };
}
