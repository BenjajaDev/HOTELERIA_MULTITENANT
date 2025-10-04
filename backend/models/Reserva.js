import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const Reserva = sequelize.define('reserva', {
  reserva_id: {
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
  habitacion_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'habitacion',
      key: 'habitacion_id'
    }
  },
  huesped_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'huesped',
      key: 'huesped_id'
    }
  },
  fecha_inicio: {
    type: DataTypes.DATEONLY
  },
  fecha_fin: {
    type: DataTypes.DATEONLY
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'confirmada', 'cancelada'),
    defaultValue: 'pendiente'
  },
  total: {
    type: DataTypes.INTEGER
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'reserva',
  timestamps: false
});

export default Reserva;
