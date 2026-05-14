import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export interface MessageReadAttributes {
  message_id: string;
  user_id:    string;
  read_at?:   string;
}

class MessageRead extends Model<MessageReadAttributes> implements MessageReadAttributes {
  declare message_id: string;
  declare user_id:    string;
  declare read_at:    string;
}

MessageRead.init(
  {
    message_id: {
      type:       DataTypes.UUID,
      allowNull:  false,
      primaryKey: true,
    },
    user_id: {
      type:       DataTypes.UUID,
      allowNull:  false,
      primaryKey: true,
    },
    read_at: {
      type:         DataTypes.DATE,
      allowNull:    false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName:  'message_reads',
    timestamps: false,
  },
);

export default MessageRead;
