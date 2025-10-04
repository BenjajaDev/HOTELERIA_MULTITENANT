import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const Pago = sequelize.define('pago', {
  pago_id: {
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
  reserva_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'reserva',
      key: 'reserva_id'
    }
  },
  monto: {
    type: DataTypes.INTEGER
  },
  metodo: {
    type: DataTypes.ENUM('tarjeta', 'efectivo', 'transferencia')
  },
  fecha: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  estado: {
    type: DataTypes.ENUM('pagado', 'pendiente'),
    defaultValue: 'pendiente'
  }
}, {
  tableName: 'pago',
  timestamps: false
});

export default Pago;
