import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MessageScopeParticipantAttributes {
  scope:     string;
  scope_id:  string;
  user_id:   string;
  joined_at: string;
}

interface MessageScopeParticipantCreationAttributes
  extends Optional<MessageScopeParticipantAttributes, 'joined_at'> {}

class MessageScopeParticipant
  extends Model<MessageScopeParticipantAttributes, MessageScopeParticipantCreationAttributes>
  implements MessageScopeParticipantAttributes {
  declare scope:     string;
  declare scope_id:  string;
  declare user_id:   string;
  declare joined_at: string;
}

MessageScopeParticipant.init(
  {
    scope: {
      type:       DataTypes.TEXT,
      allowNull:  false,
      primaryKey: true,
    },
    scope_id: {
      type:       DataTypes.UUID,
      allowNull:  false,
      primaryKey: true,
    },
    user_id: {
      type:       DataTypes.UUID,
      allowNull:  false,
      primaryKey: true,
    },
    joined_at: {
      type:         DataTypes.DATE,
      allowNull:    false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName:  'message_scope_participants',
    timestamps: false,
  },
);

export default MessageScopeParticipant;
