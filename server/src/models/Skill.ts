import { SkillCategory } from '../types/enums';

export interface Skill {
  id: number;
  skillName: string;
  category: SkillCategory;
}
