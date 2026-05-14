import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface FirmAttributes {
  id: string;
  name: string;
  location: string | null;
  address: string | null;
  website: string | null;
  logo_url: string | null;
  description: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_role: string | null;
  contact_phone: string | null;
  account_manager_id: string | null;
  default_prompt_id: string | null;
  created_at: string;
}

export interface FirmCreationAttributes extends Optional<FirmAttributes,
  'id' | 'location' | 'address' | 'website' | 'logo_url' | 'description' |
  'contact_name' | 'contact_email' | 'contact_role' | 'contact_phone' |
  'account_manager_id' | 'default_prompt_id' | 'created_at'
> {}

class Firm extends Model<FirmAttributes, FirmCreationAttributes>
  implements FirmAttributes {
  declare id: string;
  declare name: string;
  declare location: string | null;
  declare address: string | null;
  declare website: string | null;
  declare logo_url: string | null;
  declare description: string | null;
  declare contact_name: string | null;
  declare contact_email: string | null;
  declare contact_role: string | null;
  declare contact_phone: string | null;
  declare account_manager_id: string | null;
  declare default_prompt_id: string | null;
  declare created_at: string;
}

Firm.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: { type: DataTypes.TEXT, allowNull: false, unique: true },
    location: { type: DataTypes.TEXT, allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    website: { type: DataTypes.TEXT, allowNull: true },
    logo_url: { type: DataTypes.TEXT, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    contact_name: { type: DataTypes.TEXT, allowNull: true },
    contact_email: { type: DataTypes.TEXT, allowNull: true },
    contact_role: { type: DataTypes.TEXT, allowNull: true },
    contact_phone: { type: DataTypes.TEXT, allowNull: true },
    account_manager_id: { type: DataTypes.UUID, allowNull: true },
    default_prompt_id: { type: DataTypes.UUID, allowNull: true },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'firms',
    timestamps: false,
  },
);

export default Firm;
