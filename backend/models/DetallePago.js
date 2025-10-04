import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const DetallePago = sequelize.define('detalle_pago', {
  detalle_pago_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  pago_id: {
    type: DataTypes.UUID,
    unique: true,
    allowNull: false,
    references: {
      model: 'pago',
      key: 'pago_id'
    }
  },
  descripcion: {
    type: DataTypes.TEXT
  },
  fecha_pago: {
    type: DataTypes.DATE
  },
  hora_confirmacion: {
    type: DataTypes.DATE
  },
  referencia_transaccion: {
    type: DataTypes.STRING(255)
  },
  comprobante_url: {
    type: DataTypes.STRING(255)
  }
}, {
  tableName: 'detalle_pago',
  timestamps: false
});

export default DetallePago;
