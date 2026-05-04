// Re-export all models from a single entry point.
// Import this file (or individual model files) in service layers.

export { default as User } from './User';
export { default as Firm } from './Firm';
export { default as Prompt } from './Prompt';
export { default as Transcript } from './Transcript';
export { default as ProcessingSession } from './ProcessingSession';
export { default as Ticket } from './Ticket';
export { default as TimeLog } from './TimeLog';
export { default as Notification } from './Notification';
export { default as Skill } from './Skill';
export { default as UserSkill } from './UserSkill';
export { default as Project } from './Project';
export { default as ProjectMember } from './ProjectMember';
export { default as OrgSettings } from './OrgSettings';

// ── Associations ─────────────────────────────────────────────────────────────
// Define once here so models can be imported in any order without circular-ref issues.

import User from './User';
import Skill from './Skill';
import UserSkill from './UserSkill';
import Project from './Project';
import Firm from './Firm';
import ProjectMember from './ProjectMember';

// user_skills join: UserSkill belongs to User and Skill
UserSkill.belongsTo(Skill, { foreignKey: 'skill_id', as: 'skill' });
UserSkill.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Skill.hasMany(UserSkill, { foreignKey: 'skill_id', as: 'user_skills' });
User.hasMany(UserSkill, { foreignKey: 'user_id', as: 'user_skills' });

// project_members join
ProjectMember.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
ProjectMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Project.hasMany(ProjectMember, { foreignKey: 'project_id', as: 'project_members' });
User.hasMany(ProjectMember, { foreignKey: 'user_id', as: 'project_memberships' });

// firm → projects
Project.belongsTo(Firm, { foreignKey: 'firm_id', as: 'firm' });
Firm.hasMany(Project, { foreignKey: 'firm_id', as: 'projects' });
