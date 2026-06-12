import { Proficiency, SkillCategory } from '../types/enums';

export interface ResourceSkill {
  id: number;
  resourceId: number;
  skillId: number;
  proficiencyLevel: Proficiency;
}

export interface ResourceSkillView extends ResourceSkill {
  skillName: string;
  category: SkillCategory;
}
