import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface TicketAttributes {
  id: string;
  session_id: string | null;
  firm_id: string;
  assignee_id: string | null;
  project_id: string | null;
  task_type_id: string | null;
  parent_task_id: string | null;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  change_note: string;
  estimated_hours: number | null;
  ai_generated: boolean;
  edited: boolean;
  archived: boolean;
  deadline: string | null;
  regeneration_count: number;
  last_regenerated_at: string | null;
  revision_count: number;
  created_at: string;
  updated_at: string;
}

export interface TicketCreationAttributes extends Optional<TicketAttributes,
  'id' | 'session_id' | 'assignee_id' | 'project_id' | 'task_type_id' |
  'parent_task_id' | 'description' | 'change_note' | 'estimated_hours' |
  'ai_generated' | 'edited' | 'archived' | 'deadline' | 'regeneration_count' |
  'last_regenerated_at' | 'revision_count' | 'created_at' | 'updated_at'
> {}

class Ticket extends Model<TicketAttributes, TicketCreationAttributes>
  implements TicketAttributes {
  declare id: string;
  declare session_id: string | null;
  declare firm_id: string;
  declare assignee_id: string | null;
  declare project_id: string | null;
  declare task_type_id: string | null;
  declare parent_task_id: string | null;
  declare title: string;
  declare description: string;
  declare type: string;
  declare priority: string;
  declare status: string;
  declare change_note: string;
  declare estimated_hours: number | null;
  declare ai_generated: boolean;
  declare edited: boolean;
  declare archived: boolean;
  declare deadline: string | null;
  declare regeneration_count: number;
  declare last_regenerated_at: string | null;
  declare revision_count: number;
  declare created_at: string;
  declare updated_at: string;
}

Ticket.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    session_id: { type: DataTypes.UUID, allowNull: true },
    firm_id: { type: DataTypes.UUID, allowNull: false },
    assignee_id: { type: DataTypes.UUID, allowNull: true },
    project_id: { type: DataTypes.UUID, allowNull: true },
    task_type_id: { type: DataTypes.UUID, allowNull: true },
    parent_task_id: { type: DataTypes.UUID, allowNull: true },
    title: { type: DataTypes.TEXT, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    type: { type: DataTypes.TEXT, allowNull: false },
    priority: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'normal' },
    status: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'to_do' },
    change_note: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    estimated_hours: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    ai_generated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    edited: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    archived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    deadline: { type: DataTypes.DATEONLY, allowNull: true },
    regeneration_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    last_regenerated_at: { type: DataTypes.DATE, allowNull: true },
    revision_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'tickets',
    timestamps: false,
  },
);

export default Ticket;
