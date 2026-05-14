import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface MessageAttributes {
  id: string;
  scope: 'firm' | 'project' | 'task';
  scope_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageCreationAttributes extends Optional<MessageAttributes,
  'id' | 'parent_id' | 'deleted_at' | 'created_at' | 'updated_at'
> {}

class Message extends Model<MessageAttributes, MessageCreationAttributes>
  implements MessageAttributes {
  declare id: string;
  declare scope: 'firm' | 'project' | 'task';
  declare scope_id: string;
  declare user_id: string;
  declare parent_id: string | null;
  declare body: string;
  declare deleted_at: string | null;
  declare created_at: string;
  declare updated_at: string;
}

Message.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    scope: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    scope_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    parent_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: 'messages',
    timestamps: false,
  },
);

export default Message;
