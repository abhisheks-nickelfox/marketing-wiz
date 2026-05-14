import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface TaskAttachmentAttributes {
  id: string;
  task_id: string;
  uploaded_by: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_url: string;
  created_at: string;
}

export interface TaskAttachmentCreationAttributes
  extends Optional<TaskAttachmentAttributes, 'id' | 'created_at'> {}

class TaskAttachment
  extends Model<TaskAttachmentAttributes, TaskAttachmentCreationAttributes>
  implements TaskAttachmentAttributes
{
  declare id: string;
  declare task_id: string;
  declare uploaded_by: string;
  declare file_name: string;
  declare file_size: number;
  declare mime_type: string;
  declare storage_url: string;
  declare created_at: string;
}

TaskAttachment.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    task_id: { type: DataTypes.UUID, allowNull: false },
    uploaded_by: { type: DataTypes.UUID, allowNull: false },
    file_name: { type: DataTypes.TEXT, allowNull: false },
    file_size: { type: DataTypes.INTEGER, allowNull: false },
    mime_type: { type: DataTypes.TEXT, allowNull: false },
    storage_url: { type: DataTypes.TEXT, allowNull: false },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'task_attachments',
    timestamps: false,
  },
);

export default TaskAttachment;
