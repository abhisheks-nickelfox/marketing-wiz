import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface PromptAttributes {
  id: string;
  name: string;
  type: 'pm' | 'campaigns' | 'content' | 'custom';
  system_prompt: string | null;
  content: string | null;
  firm_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromptCreationAttributes extends Optional<PromptAttributes,
  'id' | 'content' | 'firm_id' | 'is_active' | 'created_at' | 'updated_at'
> {}

class Prompt extends Model<PromptAttributes, PromptCreationAttributes>
  implements PromptAttributes {
  declare id: string;
  declare name: string;
  declare type: 'pm' | 'campaigns' | 'content' | 'custom';
  declare system_prompt: string | null;
  declare content: string | null;
  declare firm_id: string | null;
  declare is_active: boolean;
  declare created_at: string;
  declare updated_at: string;
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
    system_prompt: { type: DataTypes.TEXT, allowNull: true },
    content: { type: DataTypes.TEXT, allowNull: true },
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
    updated_at: {
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
