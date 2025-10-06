import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const Reembolso = sequelize.define('reembolso', {
  reembolso_id: {
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
  pago_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'pago',
      key: 'pago_id'
    }
  },
  monto: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  metodo: {
    type: DataTypes.ENUM('tarjeta', 'efectivo', 'transferencia'),
    allowNull: true
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'procesado', 'no_aplica'),
    defaultValue: 'procesado'
  },
  motivo: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  detalle: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  creado_en: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'reembolso',
  timestamps: false
});

export default Reembolso;
