import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const Hotel = sequelize.define('hotel', {
  hotel_id: {
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
  nombre: {
    type: DataTypes.STRING(80)
  },
  direccion: {
    type: DataTypes.STRING(140)
  },
  telefono: {
    type: DataTypes.STRING(12)
  },
  email: {
    type: DataTypes.STRING(200)
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'hotel',
  timestamps: false
});

export default Hotel;
