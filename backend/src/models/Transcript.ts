import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface TranscriptAttributes {
  id: string;
  fireflies_id: string;
  title: string;
  call_date: string;
  duration_sec: number;
  participants: string[];
  raw_transcript: string;
  firm_id: string | null;
  archived: boolean;
  fetched_at: string | null;
  source: string | null;
  created_at: string;
}

export interface TranscriptCreationAttributes extends Optional<TranscriptAttributes,
  'id' | 'duration_sec' | 'participants' | 'firm_id' | 'archived' |
  'fetched_at' | 'source' | 'created_at'
> {}

class Transcript extends Model<TranscriptAttributes, TranscriptCreationAttributes>
  implements TranscriptAttributes {
  declare id: string;
  declare fireflies_id: string;
  declare title: string;
  declare call_date: string;
  declare duration_sec: number;
  declare participants: string[];
  declare raw_transcript: string;
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
    fireflies_id: { type: DataTypes.TEXT, allowNull: false, unique: true },
    title: { type: DataTypes.TEXT, allowNull: false },
    call_date: { type: DataTypes.DATE, allowNull: false },
    duration_sec: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    participants: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
    },
    raw_transcript: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
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
