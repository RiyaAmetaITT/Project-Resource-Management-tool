import { printHeader, printMenu, printDivider } from '../../../utils/consoleUi';
import { selectFromMenu } from '../../../utils/inputHelpers';
import { createProjectScreen } from './createProjectScreen';
import { viewProjectsScreen } from './viewProjectsScreen';
import { updateProjectScreen } from './updateProjectScreen';
import { manageMilestonesScreen } from './manageMilestonesScreen';

const MENU_OPTIONS = ['Create Project', 'View All Projects', 'Update Project Details', 'Manage Milestones', 'Back'];

export async function manageProjectsMenu(): Promise<void> {
  printHeader('MANAGE PROJECTS');
  console.log();
  printMenu(MENU_OPTIONS);
  printDivider();

  const choice = await selectFromMenu(MENU_OPTIONS, { showList: false });

  switch (choice) {
    case 'Create Project':        await createProjectScreen(); break;
    case 'View All Projects':     await viewProjectsScreen(); break;
    case 'Update Project Details':await updateProjectScreen(); break;
    case 'Manage Milestones':     await manageMilestonesScreen(); break;
    case 'Back':                  return;
  }

  return manageProjectsMenu();
}
