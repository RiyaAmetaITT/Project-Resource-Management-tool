import { SkillCategory, Proficiency } from '../types/enums';

export interface EmployeeSkill {
  id: number;
  employeeId: number;
  skillName: string;
  category: SkillCategory;
  proficiencyLevel: Proficiency;
}
