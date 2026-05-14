import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface UserAttributes {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  email: string;
  password_hash: string | null;
  role: 'admin' | 'member' | 'project_manager';
  member_role: string | null;
  status: 'Active' | 'invited' | 'Disabled';
  permissions: string[];
  invite_nonce: string | null;
  rate_amount: number | null;
  rate_frequency: 'Hourly' | 'Daily' | 'Weekly' | 'Monthly' | null;
  created_at: string;
  updated_at: string | null;
}

// Fields that have DB-level defaults and need not be supplied on create
export interface UserCreationAttributes extends Optional<UserAttributes,
  'id' | 'first_name' | 'last_name' | 'phone_number' | 'avatar_url' | 'password_hash' |
  'member_role' | 'invite_nonce' | 'rate_amount' | 'rate_frequency' | 'created_at' | 'updated_at'
> {}

class User extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes {
  declare id: string;
  declare name: string;
  declare first_name: string | null;
  declare last_name: string | null;
  declare phone_number: string | null;
  declare avatar_url: string | null;
  declare email: string;
  declare password_hash: string | null;
  declare role: 'admin' | 'member' | 'project_manager';
  declare member_role: string | null;
  declare status: 'Active' | 'invited' | 'Disabled';
  declare permissions: string[];
  declare invite_nonce: string | null;
  declare rate_amount: number | null;
  declare rate_frequency: 'Hourly' | 'Daily' | 'Weekly' | 'Monthly' | null;
  declare created_at: string;
  declare updated_at: string | null;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: { type: DataTypes.TEXT, allowNull: false },
    first_name: { type: DataTypes.TEXT, allowNull: true },
    last_name: { type: DataTypes.TEXT, allowNull: true },
    phone_number: { type: DataTypes.TEXT, allowNull: true },
    avatar_url: { type: DataTypes.TEXT, allowNull: true },
    email: { type: DataTypes.TEXT, allowNull: false, unique: true },
    password_hash: { type: DataTypes.TEXT, allowNull: true },
    role: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'member',
    },
    member_role: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'Active',
    },
    // PostgreSQL TEXT[] stored as ARRAY — Sequelize handles serialisation
    permissions: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
    },
    invite_nonce: { type: DataTypes.TEXT, allowNull: true },
    rate_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    rate_frequency: { type: DataTypes.TEXT, allowNull: true },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: false,
  },
);

export default User;
