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
export { default as TaskAssignee } from './TaskAssignee';
export { default as Message } from './Message';
export { default as MessageReaction } from './MessageReaction';
export { default as MessageRead } from './MessageRead';
export { default as MessageScopeParticipant } from './MessageScopeParticipant';
export { default as TaskAttachment } from './TaskAttachment';
export { default as TimeEntry } from './TimeEntry';

// ── Associations ─────────────────────────────────────────────────────────────
// Define once here so models can be imported in any order without circular-ref issues.

import User from './User';
import Skill from './Skill';
import UserSkill from './UserSkill';
import Project from './Project';
import Firm from './Firm';
import ProjectMember from './ProjectMember';
import TaskAssignee from './TaskAssignee';
import Ticket from './Ticket';
import Message from './Message';
import MessageReaction from './MessageReaction';
import MessageRead from './MessageRead';

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

// task_assignees join
TaskAssignee.belongsTo(Ticket, { foreignKey: 'task_id', as: 'task' });
TaskAssignee.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Ticket.hasMany(TaskAssignee, { foreignKey: 'task_id', as: 'task_assignees' });
User.hasMany(TaskAssignee, { foreignKey: 'user_id', as: 'task_assignments' });

// messages: author join, reactions join
Message.belongsTo(User, { foreignKey: 'user_id', as: 'author' });
User.hasMany(Message, { foreignKey: 'user_id', as: 'messages' });
MessageReaction.belongsTo(Message, { foreignKey: 'message_id', as: 'message' });
Message.hasMany(MessageReaction, { foreignKey: 'message_id', as: 'reactions' });
MessageReaction.belongsTo(User, { foreignKey: 'user_id', as: 'reactor' });
User.hasMany(MessageReaction, { foreignKey: 'user_id', as: 'message_reactions' });

// message_reads: read receipts
MessageRead.belongsTo(Message, { foreignKey: 'message_id', as: 'message' });
Message.hasMany(MessageRead, { foreignKey: 'message_id', as: 'reads' });
MessageRead.belongsTo(User, { foreignKey: 'user_id', as: 'reader' });
User.hasMany(MessageRead, { foreignKey: 'user_id', as: 'message_reads' });
