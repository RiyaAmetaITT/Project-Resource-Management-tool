import { adminApi } from '../../../apiClient/adminApi';
import { printHeader, printTable, printSuccess, printError, printDivider } from '../../../utils/consoleUi';
import { selectFromMenu, promptNumber, promptText } from '../../../utils/inputHelpers';
import { SkillCategory, Proficiency } from '../../../types/enums';

const CATEGORY_CHOICES = Object.values(SkillCategory) as string[];
const PROFICIENCY_CHOICES = Object.values(Proficiency) as string[];

const MENU_OPTIONS = ['Add Skill', 'Update Proficiency Level', 'Remove Skill', 'Back'];

export async function manageSkillsScreen(): Promise<void> {
  printHeader('MANAGE SKILLS');
  console.log();

  try {
    const employeeId = await promptNumber('Enter Employee ID:', 1, 99999);
    const employee = await adminApi.getEmployeeById(employeeId);
    const skills = await adminApi.getEmployeeSkills(employeeId);

    console.log(`\n  ── ${employee.name} ─────────────────────────────────`);
    console.log('  Current Skills:');

    if (skills.length > 0) {
      printTable(['#', 'Skill', 'Proficiency'], skills.map((s, i) => [i + 1, s.skillName, s.proficiencyLevel]));
    } else {
      console.log('  No skills assigned.\n');
    }

    printDivider();
    const action = await selectFromMenu('Select action:', MENU_OPTIONS);

    switch (action) {
      case 'Add Skill':            await addSkill(employeeId); break;
      case 'Update Proficiency Level': await updateProficiency(skills); break;
      case 'Remove Skill':         await removeSkill(skills); break;
      case 'Back':                 return;
    }
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to manage skills.');
  }

  return manageSkillsScreen();
}

async function addSkill(employeeId: number): Promise<void> {
  const skillName = await promptText('Skill Name:');
  const category = await selectFromMenu('Category:', CATEGORY_CHOICES) as SkillCategory;
  const proficiencyLevel = await selectFromMenu('Proficiency Level:', PROFICIENCY_CHOICES) as Proficiency;

  await adminApi.addSkill(employeeId, { skillName, category, proficiencyLevel });
  printSuccess('Skill added.');
}

async function updateProficiency(skills: Array<{ id: number; skillName: string }>): Promise<void> {
  if (skills.length === 0) { printError('No skills to update.'); return; }

  const skillNames = skills.map((s) => s.skillName);
  const selected = await selectFromMenu('Select skill to update:', skillNames);
  const skill = skills.find((s) => s.skillName === selected)!;
  const proficiencyLevel = await selectFromMenu('New Proficiency Level:', PROFICIENCY_CHOICES) as Proficiency;

  await adminApi.updateSkill(skill.id, { proficiencyLevel });
  printSuccess('Proficiency updated.');
}

async function removeSkill(skills: Array<{ id: number; skillName: string }>): Promise<void> {
  if (skills.length === 0) { printError('No skills to remove.'); return; }

  const skillNames = skills.map((s) => s.skillName);
  const selected = await selectFromMenu('Select skill to remove:', skillNames);
  const skill = skills.find((s) => s.skillName === selected)!;

  await adminApi.removeSkill(skill.id);
  printSuccess('Skill removed.');
}
