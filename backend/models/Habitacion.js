import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const Habitacion = sequelize.define('habitacion', {
  habitacion_id: {
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
    references: {
      model: 'sucursal',
      key: 'sucursal_id'
    }
  },
  numero: {
    type: DataTypes.INTEGER
  },
  tipo: {
    type: DataTypes.ENUM('simple', 'doble', 'suite')
  },
  precio_noche: {
    type: DataTypes.INTEGER
  },
  estado: {
    type: DataTypes.ENUM('disponible', 'ocupada', 'limpieza'),
    defaultValue: 'disponible'
  }
}, {
  tableName: 'habitacion',
  timestamps: false
});

export default Habitacion;
