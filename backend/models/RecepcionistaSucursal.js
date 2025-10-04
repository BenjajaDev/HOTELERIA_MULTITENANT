import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const RecepcionistaSucursal = sequelize.define('recepcionista_sucursal', {
  recepcionista_sucursal_id: {
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
  hotel_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'hotel',
      key: 'hotel_id'
    }
  },
  sucursal_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'sucursal',
      key: 'sucursal_id'
    }
  },
  usuario_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'usuario',
      key: 'usuario_id'
    }
  },
  telefono: {
    type: DataTypes.STRING(20)
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'recepcionista_sucursal',
  timestamps: false
});

export default RecepcionistaSucursal;
