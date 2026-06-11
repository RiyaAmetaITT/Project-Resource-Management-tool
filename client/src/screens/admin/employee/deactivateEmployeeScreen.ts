import { adminApi } from '../../../apiClient/adminApi';
import { printHeader, printSuccess, printError, printWarning } from '../../../utils/consoleUi';
import { promptNumber, confirm } from '../../../utils/inputHelpers';

/** Screen 3.1.2 — Deactivate Employee */
export async function deactivateEmployeeScreen(): Promise<void> {
  printHeader('DEACTIVATE EMPLOYEE');
  console.log();

  try {
    const id = await promptNumber('Enter Employee ID:', 1, 99999);
    const preview = await adminApi.getEmployeeDeactivatePreview(id) as {
      employee: { name: string; department: string; status: string; totalUtilisation: number };
      activeAllocations: Array<{
        projectName: string; utilisationPercent: number; toDate: string;
      }>;
    };

    console.log(`\n  ── ${preview.employee.name} ─────────────────────────────────`);
    console.log(`  Department : ${preview.employee.department}`);
    console.log(`  Status     : ${preview.employee.status} (${preview.employee.totalUtilisation}%)\n`);

    if (preview.activeAllocations.length > 0) {
      printWarning(`This employee has ${preview.activeAllocations.length} active allocation(s).`);
      console.log('  Ending their employment will remove them from:');
      for (const a of preview.activeAllocations) {
        const endDate = new Date(a.toDate).toLocaleDateString('en-GB');
        console.log(`    - ${a.projectName}  (${a.utilisationPercent}%,  ends ${endDate})`);
      }
      console.log();
    }

    const confirmed = await confirm(`Are you sure you want to deactivate ${preview.employee.name}?`);
    if (!confirmed) {
      console.log('  Cancelled.\n');
      return;
    }

    await adminApi.deactivateEmployee(id);
    printSuccess('Employee deactivated. ✓');
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to deactivate employee.');
  }
}
