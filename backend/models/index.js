import sequelize from './sequelize.js';
import Tenant from './Tenant.js';
import Usuario from './Usuario.js';
import TenantUsuario from './TenantUsuario.js';
import Hotel from './Hotel.js';
import Sucursal from './Sucursal.js';
import RecepcionistaSucursal from './RecepcionistaSucursal.js';
import Habitacion from './Habitacion.js';
import Huesped from './Huesped.js';
import Reserva from './Reserva.js';
import Pago from './Pago.js';
import DetallePago from './DetallePago.js';
import Reembolso from './Reembolso.js';

// ===================================
// RELACIONES ENTRE MODELOS
// ===================================

// Tenant ↔ Usuario (many-to-many a través de TenantUsuario)
Tenant.belongsToMany(Usuario, {
  through: TenantUsuario,
  foreignKey: 'tenant_id',
  otherKey: 'usuario_id',
  as: 'usuarios'
});

Usuario.belongsToMany(Tenant, {
  through: TenantUsuario,
  foreignKey: 'usuario_id',
  otherKey: 'tenant_id',
  as: 'tenants'
});

// TenantUsuario ↔ Tenant y Usuario (acceso directo)
TenantUsuario.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
TenantUsuario.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// Usuario y Tenant ↔ TenantUsuario (one-to-many)
Usuario.hasMany(TenantUsuario, { foreignKey: 'usuario_id', as: 'tenant_usuarios' });
Tenant.hasMany(TenantUsuario, { foreignKey: 'tenant_id', as: 'tenant_usuarios' });

// Tenant ↔ Hotel (one-to-many)
Tenant.hasMany(Hotel, { foreignKey: 'tenant_id', as: 'hoteles' });
Hotel.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// Hotel ↔ Sucursal (one-to-many)
Hotel.hasMany(Sucursal, { foreignKey: 'hotel_id', as: 'sucursales' });
Sucursal.belongsTo(Hotel, { foreignKey: 'hotel_id', as: 'hotel' });

// Tenant ↔ Sucursal (one-to-many)
Tenant.hasMany(Sucursal, { foreignKey: 'tenant_id', as: 'sucursales' });
Sucursal.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// RecepcionistaSucursal ↔ relaciones
RecepcionistaSucursal.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
RecepcionistaSucursal.belongsTo(Hotel, { foreignKey: 'hotel_id', as: 'hotel' });
RecepcionistaSucursal.belongsTo(Sucursal, { foreignKey: 'sucursal_id', as: 'sucursal' });
RecepcionistaSucursal.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

Usuario.hasMany(RecepcionistaSucursal, { foreignKey: 'usuario_id', as: 'asignaciones_recepcion' });
Sucursal.hasMany(RecepcionistaSucursal, { foreignKey: 'sucursal_id', as: 'recepcionistas' });

// Habitacion ↔ relaciones
Habitacion.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Habitacion.belongsTo(Hotel, { foreignKey: 'hotel_id', as: 'hotel' });
Habitacion.belongsTo(Sucursal, { foreignKey: 'sucursal_id', as: 'sucursal' });

Tenant.hasMany(Habitacion, { foreignKey: 'tenant_id', as: 'habitaciones' });
Hotel.hasMany(Habitacion, { foreignKey: 'hotel_id', as: 'habitaciones' });
Sucursal.hasMany(Habitacion, { foreignKey: 'sucursal_id', as: 'habitaciones' });

// Huesped ↔ relaciones
Huesped.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Huesped.belongsTo(Sucursal, { foreignKey: 'sucursal_id', as: 'sucursal' });

Tenant.hasMany(Huesped, { foreignKey: 'tenant_id', as: 'huespedes' });
Sucursal.hasMany(Huesped, { foreignKey: 'sucursal_id', as: 'huespedes' });

// Reserva ↔ relaciones
Reserva.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Reserva.belongsTo(Habitacion, { foreignKey: 'habitacion_id', as: 'habitacion' });
Reserva.belongsTo(Huesped, { foreignKey: 'huesped_id', as: 'huesped' });

Tenant.hasMany(Reserva, { foreignKey: 'tenant_id', as: 'reservas' });
Habitacion.hasMany(Reserva, { foreignKey: 'habitacion_id', as: 'reservas' });
Huesped.hasMany(Reserva, { foreignKey: 'huesped_id', as: 'reservas' });

// Pago ↔ relaciones
Pago.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Pago.belongsTo(Reserva, { foreignKey: 'reserva_id', as: 'reserva' });

Tenant.hasMany(Pago, { foreignKey: 'tenant_id', as: 'pagos' });
Reserva.hasMany(Pago, { foreignKey: 'reserva_id', as: 'pagos' });

// DetallePago ↔ Pago (one-to-one)
DetallePago.belongsTo(Pago, { foreignKey: 'pago_id', as: 'pago' });
Pago.hasOne(DetallePago, { foreignKey: 'pago_id', as: 'detalle' });

// Reembolso ↔ relaciones
Reembolso.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Reembolso.belongsTo(Reserva, { foreignKey: 'reserva_id', as: 'reserva' });
Reembolso.belongsTo(Pago, { foreignKey: 'pago_id', as: 'pago' });

Tenant.hasMany(Reembolso, { foreignKey: 'tenant_id', as: 'reembolsos' });
Reserva.hasMany(Reembolso, { foreignKey: 'reserva_id', as: 'reembolsos' });
Pago.hasMany(Reembolso, { foreignKey: 'pago_id', as: 'reembolsos' });

// ===================================
// EXPORTAR MODELOS Y SEQUELIZE
// ===================================

const db = {
  sequelize,
  Tenant,
  Usuario,
  TenantUsuario,
  Hotel,
  Sucursal,
  RecepcionistaSucursal,
  Habitacion,
  Huesped,
  Reserva,
  Pago,
  DetallePago,
  Reembolso
};

export default db;
export {
  sequelize,
  Tenant,
  Usuario,
  TenantUsuario,
  Hotel,
  Sucursal,
  RecepcionistaSucursal,
  Habitacion,
  Huesped,
  Reserva,
  Pago,
  DetallePago,
  Reembolso
};
