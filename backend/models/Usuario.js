import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const Usuario = sequelize.define('usuario', {
  usuario_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(200),
    allowNull: false,
    unique: true
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  nombre: {
    type: DataTypes.STRING(255)
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'usuario',
  timestamps: false
});

export default Usuario;
