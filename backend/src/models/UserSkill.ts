import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface UserSkillAttributes {
  user_id: string;
  skill_id: string;
  experience: string | null;
  created_at: string;
}

export interface UserSkillCreationAttributes extends Optional<UserSkillAttributes,
  'experience' | 'created_at'
> {}

class UserSkill extends Model<UserSkillAttributes, UserSkillCreationAttributes>
  implements UserSkillAttributes {
  declare user_id: string;
  declare skill_id: string;
  declare experience: string | null;
  declare created_at: string;
}

UserSkill.init(
  {
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    skill_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    experience: { type: DataTypes.TEXT, allowNull: true },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'user_skills',
    timestamps: false,
  },
);

export default UserSkill;
