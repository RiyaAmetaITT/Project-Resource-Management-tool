import { SkillCategory, Proficiency } from '../types/enums';

export interface AddSkillDto {
  skillName: string;
  category: SkillCategory;
  proficiencyLevel: Proficiency;
}

export interface UpdateSkillDto {
  proficiencyLevel: Proficiency;
}

export interface SkillResponseDto {
  id: number;
  employeeId: number;
  skillName: string;
  category: SkillCategory;
  proficiencyLevel: Proficiency;
}
