import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export interface NotificationAttributes {
  id: string;
  user_id: string;
  ticket_id: string | null;
  actor_id: string | null;
  message_id: string | null;
  type: string;
  title: string | null;
  message: string;
  read: boolean;
  created_at: string;
  updated_at: string | null;
  scope: string;
  scope_id: string | null;
}

export interface NotificationCreationAttributes extends Optional<NotificationAttributes,
  'id' | 'ticket_id' | 'actor_id' | 'message_id' | 'type' | 'title' | 'read' | 'created_at' | 'updated_at' | 'scope' | 'scope_id'
> {}

class Notification extends Model<NotificationAttributes, NotificationCreationAttributes>
  implements NotificationAttributes {
  declare id: string;
  declare user_id: string;
  declare ticket_id: string | null;
  declare actor_id: string | null;
  declare message_id: string | null;
  declare type: string;
  declare title: string | null;
  declare message: string;
  declare read: boolean;
  declare created_at: string;
  declare updated_at: string | null;
  declare scope: string;
  declare scope_id: string | null;
}

Notification.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id:   { type: DataTypes.UUID, allowNull: false },
    ticket_id: { type: DataTypes.UUID, allowNull: true },
    actor_id:  { type: DataTypes.UUID, allowNull: true },
    type: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'general' },
    title: { type: DataTypes.TEXT, allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: false },
    read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    scope:      { type: DataTypes.TEXT, allowNull: false, defaultValue: 'task' },
    scope_id:   { type: DataTypes.UUID, allowNull: true },
    message_id: { type: DataTypes.UUID, allowNull: true },
  },
  {
    sequelize,
    tableName: 'notifications',
    timestamps: false,
  },
);

Notification.belongsTo(User, { foreignKey: 'actor_id', as: 'actor' });

export default Notification;
