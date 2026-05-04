import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface OrgSettingsAttributes {
  id: string;
  logo_url: string | null;
  updated_at: string;
}

export interface OrgSettingsCreationAttributes extends Optional<OrgSettingsAttributes,
  'id' | 'logo_url' | 'updated_at'
> {}

class OrgSettings extends Model<OrgSettingsAttributes, OrgSettingsCreationAttributes>
  implements OrgSettingsAttributes {
  declare id: string;
  declare logo_url: string | null;
  declare updated_at: string;
}

OrgSettings.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    logo_url: { type: DataTypes.TEXT, allowNull: true },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'org_settings',
    timestamps: false,
  },
);

export default OrgSettings;
