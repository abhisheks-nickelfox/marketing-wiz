import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface ProjectAttributes {
  id:              string;
  firm_id:         string;
  name:            string;
  description:     string | null;
  status:          'active' | 'archived';
  workflow_status: 'todo' | 'in_progress' | 'in_review' | 'approved' | 'completed';
  start_date:      string | null;
  end_date:        string | null;
  priority:        'high' | 'medium' | 'low';
  share_token:     string | null;
  created_at:      string;
  updated_at:      string;
}

export interface ProjectCreationAttributes extends Optional<ProjectAttributes,
  'id' | 'description' | 'status' | 'workflow_status' | 'start_date' | 'end_date' | 'priority' | 'share_token' | 'created_at' | 'updated_at'
> {}

class Project extends Model<ProjectAttributes, ProjectCreationAttributes>
  implements ProjectAttributes {
  declare id:              string;
  declare firm_id:         string;
  declare name:            string;
  declare description:     string | null;
  declare status:          'active' | 'archived';
  declare workflow_status: 'todo' | 'in_progress' | 'in_review' | 'approved' | 'completed';
  declare start_date:      string | null;
  declare end_date:        string | null;
  declare priority:        'high' | 'medium' | 'low';
  declare share_token:     string | null;
  declare created_at:      string;
  declare updated_at:      string;
}

Project.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    firm_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.TEXT, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type:         DataTypes.TEXT,
      allowNull:    false,
      defaultValue: 'active',
    },
    workflow_status: {
      type:         DataTypes.TEXT,
      allowNull:    false,
      defaultValue: 'todo',
    },
    start_date: { type: DataTypes.DATEONLY, allowNull: true },
    end_date:   { type: DataTypes.DATEONLY, allowNull: true },
    priority: {
      type:         DataTypes.TEXT,
      allowNull:    false,
      defaultValue: 'medium',
    },
    share_token: { type: DataTypes.TEXT, allowNull: true, unique: true },
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
    tableName: 'projects',
    timestamps: false,
  },
);

export default Project;
