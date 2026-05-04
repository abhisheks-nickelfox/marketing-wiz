import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface ProcessingSessionAttributes {
  id: string;
  transcript_id: string;
  firm_id: string;
  prompt_id: string;
  text_notes: string | null;
  ai_raw_output: Record<string, unknown> | null;
  created_by: string;
  created_at: string;
}

export interface ProcessingSessionCreationAttributes extends Optional<ProcessingSessionAttributes,
  'id' | 'text_notes' | 'ai_raw_output' | 'created_at'
> {}

class ProcessingSession extends Model<ProcessingSessionAttributes, ProcessingSessionCreationAttributes>
  implements ProcessingSessionAttributes {
  declare id: string;
  declare transcript_id: string;
  declare firm_id: string;
  declare prompt_id: string;
  declare text_notes: string | null;
  declare ai_raw_output: Record<string, unknown> | null;
  declare created_by: string;
  declare created_at: string;
}

ProcessingSession.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    transcript_id: { type: DataTypes.UUID, allowNull: false },
    firm_id: { type: DataTypes.UUID, allowNull: false },
    prompt_id: { type: DataTypes.UUID, allowNull: false },
    text_notes: { type: DataTypes.TEXT, allowNull: true },
    ai_raw_output: { type: DataTypes.JSONB, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: false },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'processing_sessions',
    timestamps: false,
  },
);

export default ProcessingSession;
