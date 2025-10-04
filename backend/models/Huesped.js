import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const Huesped = sequelize.define('huesped', {
  huesped_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'tenant',
      key: 'tenant_id'
    }
  },
  sucursal_id: {
    type: DataTypes.UUID,
    references: {
      model: 'sucursal',
      key: 'sucursal_id'
    }
  },
  nombre_completo: {
    type: DataTypes.STRING(255)
  },
  email: {
    type: DataTypes.STRING(200)
  },
  telefono: {
    type: DataTypes.STRING(12)
  },
  documento: {
    type: DataTypes.TEXT
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'huesped',
  timestamps: false
});

export default Huesped;
