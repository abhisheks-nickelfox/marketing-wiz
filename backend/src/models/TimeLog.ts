import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface TimeLogAttributes {
  id: string;
  ticket_id: string;
  user_id: string;
  hours: number;
  comment: string;
  log_type: string;
  revision_cycle: number;
  created_at: string;
  updated_at: string;
}

export interface TimeLogCreationAttributes extends Optional<TimeLogAttributes,
  'id' | 'comment' | 'revision_cycle' | 'created_at' | 'updated_at'
> {}

class TimeLog extends Model<TimeLogAttributes, TimeLogCreationAttributes>
  implements TimeLogAttributes {
  declare id: string;
  declare ticket_id: string;
  declare user_id: string;
  declare hours: number;
  declare comment: string;
  declare log_type: string;
  declare revision_cycle: number;
  declare created_at: string;
  declare updated_at: string;
}

TimeLog.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    ticket_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: false },
    hours: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    comment: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    log_type: { type: DataTypes.TEXT, allowNull: false },
    revision_cycle: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    tableName: 'time_logs',
    timestamps: false,
  },
);

export default TimeLog;
