import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface PromptAttributes {
  id: string;
  name: string;
  type: 'pm' | 'campaigns' | 'content';
  system_prompt: string;
  firm_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PromptCreationAttributes extends Optional<PromptAttributes,
  'id' | 'firm_id' | 'is_active' | 'created_at'
> {}

class Prompt extends Model<PromptAttributes, PromptCreationAttributes>
  implements PromptAttributes {
  declare id: string;
  declare name: string;
  declare type: 'pm' | 'campaigns' | 'content';
  declare system_prompt: string;
  declare firm_id: string | null;
  declare is_active: boolean;
  declare created_at: string;
}

Prompt.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: { type: DataTypes.TEXT, allowNull: false },
    type: { type: DataTypes.TEXT, allowNull: false },
    system_prompt: { type: DataTypes.TEXT, allowNull: false },
    firm_id: { type: DataTypes.UUID, allowNull: true },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'prompts',
    timestamps: false,
  },
);

export default Prompt;
