import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface TaskAssigneeAttributes {
  task_id:  string;
  user_id:  string;
  added_at: string;
}

export interface TaskAssigneeCreationAttributes extends Optional<TaskAssigneeAttributes, 'added_at'> {}

class TaskAssignee extends Model<TaskAssigneeAttributes, TaskAssigneeCreationAttributes>
  implements TaskAssigneeAttributes {
  declare task_id:  string;
  declare user_id:  string;
  declare added_at: string;
}

TaskAssignee.init(
  {
    task_id: {
      type:       DataTypes.UUID,
      allowNull:  false,
      primaryKey: true,
    },
    user_id: {
      type:       DataTypes.UUID,
      allowNull:  false,
      primaryKey: true,
    },
    added_at: {
      type:         DataTypes.DATE,
      allowNull:    false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName:  'task_assignees',
    timestamps: false,
  },
);

export default TaskAssignee;
