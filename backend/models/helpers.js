import { TenantUsuario, Hotel, Sucursal, RecepcionistaSucursal } from "./index.js";

/**
 * Obtener el rol de un usuario en un tenant
 */
export async function fetchMembership({ tenant, usuario }) {
  if (!tenant || !usuario) return null;
  
  const membership = await TenantUsuario.findOne({
    where: {
      tenant_id: tenant,
      usuario_id: usuario
    },
    attributes: ['rol']
  });
  
  return membership ? membership.toJSON() : null;
}

/**
 * Verificar que un hotel pertenece a un tenant
 */
export async function ensureHotelBelongs({ hotel, tenant }) {
  if (!hotel || !tenant) return null;
  
  const hotelRecord = await Hotel.findOne({
    where: {
      hotel_id: hotel,
      tenant_id: tenant
    },
    attributes: ['hotel_id', 'tenant_id']
  });
  
  return hotelRecord ? hotelRecord.toJSON() : null;
}

/**
 * Verificar que una sucursal pertenece a un hotel y tenant
 */
export async function ensureSucursalBelongs({ sucursalId, hotelId, tenantId }) {
  if (!sucursalId || !hotelId || !tenantId) return null;
  
  const sucursal = await Sucursal.findOne({
    where: {
      sucursal_id: sucursalId,
      hotel_id: hotelId,
      tenant_id: tenantId
    },
    attributes: ['sucursal_id', 'hotel_id', 'tenant_id']
  });
  
  return sucursal ? sucursal.toJSON() : null;
}

/**
 * Obtener la asignación de un recepcionista a una sucursal
 */
export async function fetchRecepcionistaSucursal({ usuarioId, tenantId, hotelId }) {
  if (!usuarioId || !tenantId) return null;
  
  const where = {
    usuario_id: usuarioId,
    tenant_id: tenantId
  };
  
  if (hotelId) {
    where.hotel_id = hotelId;
  }
  
  const recepcionista = await RecepcionistaSucursal.findOne({
    where,
    attributes: ['sucursal_id', 'hotel_id', 'tenant_id']
  });
  
  return recepcionista ? recepcionista.toJSON() : null;
}
