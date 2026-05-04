import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface NotificationAttributes {
  id: string;
  user_id: string;
  ticket_id: string | null;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface NotificationCreationAttributes extends Optional<NotificationAttributes,
  'id' | 'ticket_id' | 'title' | 'read' | 'created_at'
> {}

class Notification extends Model<NotificationAttributes, NotificationCreationAttributes>
  implements NotificationAttributes {
  declare id: string;
  declare user_id: string;
  declare ticket_id: string | null;
  declare title: string;
  declare message: string;
  declare read: boolean;
  declare created_at: string;
}

Notification.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: { type: DataTypes.UUID, allowNull: false },
    ticket_id: { type: DataTypes.UUID, allowNull: true },
    title: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
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
  },
  {
    sequelize,
    tableName: 'notifications',
    timestamps: false,
  },
);

export default Notification;
