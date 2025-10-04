import { DataTypes } from 'sequelize';
import sequelize from './sequelize.js';

const TenantUsuario = sequelize.define('tenant_usuario', {
  tenant_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'tenant',
      key: 'tenant_id'
    }
  },
  usuario_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'usuario',
      key: 'usuario_id'
    }
  },
  rol: {
    type: DataTypes.ENUM('admin', 'recepcionista', 'huesped', 'gerente'),
    allowNull: false
  }
}, {
  tableName: 'tenant_usuario',
  timestamps: false
});

export default TenantUsuario;
