import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface ProjectMemberAttributes {
  project_id: string;
  user_id: string;
  added_at: string;
}

export interface ProjectMemberCreationAttributes extends Optional<ProjectMemberAttributes,
  'added_at'
> {}

class ProjectMember extends Model<ProjectMemberAttributes, ProjectMemberCreationAttributes>
  implements ProjectMemberAttributes {
  declare project_id: string;
  declare user_id: string;
  declare added_at: string;
}

ProjectMember.init(
  {
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    added_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'project_members',
    timestamps: false,
  },
);

export default ProjectMember;
