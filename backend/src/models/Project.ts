import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface ProjectAttributes {
  id: string;
  firm_id: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived';
  workflow_status: 'todo' | 'in_progress' | 'in_review' | 'approved' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface ProjectCreationAttributes extends Optional<ProjectAttributes,
  'id' | 'description' | 'status' | 'workflow_status' | 'created_at' | 'updated_at'
> {}

class Project extends Model<ProjectAttributes, ProjectCreationAttributes>
  implements ProjectAttributes {
  declare id: string;
  declare firm_id: string;
  declare name: string;
  declare description: string | null;
  declare status: 'active' | 'archived';
  declare workflow_status: 'todo' | 'in_progress' | 'in_review' | 'approved' | 'completed';
  declare created_at: string;
  declare updated_at: string;
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
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'active',
    },
    workflow_status: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'todo',
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
    tableName: 'projects',
    timestamps: false,
  },
);

export default Project;
