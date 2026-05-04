import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface SkillAttributes {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  color: string | null;
  created_at: string;
}

export interface SkillCreationAttributes extends Optional<SkillAttributes,
  'id' | 'category' | 'description' | 'color' | 'created_at'
> {}

class Skill extends Model<SkillAttributes, SkillCreationAttributes>
  implements SkillAttributes {
  declare id: string;
  declare name: string;
  declare category: string | null;
  declare description: string | null;
  declare color: string | null;
  declare created_at: string;
}

Skill.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: { type: DataTypes.TEXT, allowNull: false, unique: true },
    category: { type: DataTypes.TEXT, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    color: { type: DataTypes.TEXT, allowNull: true },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'skills',
    timestamps: false,
  },
);

export default Skill;
