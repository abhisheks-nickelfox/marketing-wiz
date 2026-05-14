import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export interface MessageReactionAttributes {
  message_id: string;
  user_id: string;
  emoji: string;
}

// No optional fields — all three columns form the composite PK and are required.
class MessageReaction extends Model<MessageReactionAttributes>
  implements MessageReactionAttributes {
  declare message_id: string;
  declare user_id: string;
  declare emoji: string;
}

MessageReaction.init(
  {
    message_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    emoji: {
      type: DataTypes.TEXT,
      allowNull: false,
      primaryKey: true,
    },
  },
  {
    sequelize,
    tableName: 'message_reactions',
    timestamps: false,
  },
);

export default MessageReaction;
