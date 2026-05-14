import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface TranscriptAttributes {
  id: string;
  fireflies_id: string | null;
  title: string;
  call_date: string | null;
  duration_sec: number | null;
  participants: string[] | null;
  raw_transcript: string | null;
  firm_id: string | null;
  archived: boolean;
  fetched_at: string | null;
  source: string | null;
  created_at: string;
}

export interface TranscriptCreationAttributes extends Optional<TranscriptAttributes,
  'id' | 'call_date' | 'duration_sec' | 'participants' | 'raw_transcript' |
  'firm_id' | 'archived' | 'fetched_at' | 'source' | 'created_at'
> {}

class Transcript extends Model<TranscriptAttributes, TranscriptCreationAttributes>
  implements TranscriptAttributes {
  declare id: string;
  declare fireflies_id: string | null;
  declare title: string;
  declare call_date: string | null;
  declare duration_sec: number | null;
  declare participants: string[] | null;
  declare raw_transcript: string | null;
  declare firm_id: string | null;
  declare archived: boolean;
  declare fetched_at: string | null;
  declare source: string | null;
  declare created_at: string;
}

Transcript.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    // allowNull: true — manual transcripts have no Fireflies ID; unique constraint
    // still prevents two Fireflies syncs from creating duplicate rows.
    fireflies_id: { type: DataTypes.TEXT, allowNull: true, unique: true },
    title: { type: DataTypes.TEXT, allowNull: false },
    call_date: { type: DataTypes.DATE, allowNull: true },
    duration_sec: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    participants: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
    raw_transcript: { type: DataTypes.TEXT, allowNull: true, defaultValue: '' },
    firm_id: { type: DataTypes.UUID, allowNull: true },
    archived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    fetched_at: { type: DataTypes.DATE, allowNull: true },
    source: { type: DataTypes.TEXT, allowNull: true },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'transcripts',
    timestamps: false,
  },
);

export default Transcript;
