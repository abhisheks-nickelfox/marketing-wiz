import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface TimeEntryAttributes {
  id:               string;
  task_id:          string | null;
  project_id:       string | null;
  user_id:          string;
  started_at:       Date | string;
  ended_at:         Date | string | null;
  duration_seconds: number | null;
  description:      string | null;
  is_billable:      boolean;
  is_running:       boolean;
  created_at:       Date | string;
  updated_at:       Date | string;
}

export interface TimeEntryCreationAttributes extends Optional<TimeEntryAttributes,
  'id' | 'task_id' | 'project_id' | 'ended_at' | 'duration_seconds' | 'description' | 'is_billable' | 'is_running' | 'created_at' | 'updated_at'
> {}

class TimeEntry extends Model<TimeEntryAttributes, TimeEntryCreationAttributes>
  implements TimeEntryAttributes {
  declare id:               string;
  declare task_id:          string | null;
  declare project_id:       string | null;
  declare user_id:          string;
  declare started_at:       Date | string;
  declare ended_at:         Date | string | null;
  declare duration_seconds: number | null;
  declare description:      string | null;
  declare is_billable:      boolean;
  declare is_running:       boolean;
  declare created_at:       Date | string;
  declare updated_at:       Date | string;
}

TimeEntry.init(
  {
    id: {
      type:         DataTypes.UUID,
      primaryKey:   true,
      defaultValue: DataTypes.UUIDV4,
    },
    task_id: {
      type:      DataTypes.UUID,
      allowNull: true,
    },
    project_id: {
      type:      DataTypes.UUID,
      allowNull: true,
    },
    user_id: {
      type:      DataTypes.UUID,
      allowNull: false,
    },
    started_at: {
      type:      DataTypes.DATE,
      allowNull: false,
    },
    ended_at: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    duration_seconds: {
      type:      DataTypes.INTEGER,
      allowNull: true,
    },
    description: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    is_billable: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
    is_running: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
    created_at: {
      type:         DataTypes.DATE,
      allowNull:    false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type:         DataTypes.DATE,
      allowNull:    false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName:  'time_entries',
    timestamps: false,
  },
);

export default TimeEntry;
