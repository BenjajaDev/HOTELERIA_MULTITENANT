import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const Tenant = sequelize.define('tenant', {
  tenant_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  nombre: {
    type: DataTypes.STRING(80),
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'tenant',
  timestamps: false
});

export default Tenant;
