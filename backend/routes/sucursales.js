import express from "express";
import { Sucursal, Hotel, Tenant, Habitacion, RecepcionistaSucursal, TenantUsuario, Usuario } from "../models/index.js";

const router = express.Router();

// Helper para verificar permisos de tenant
async function ensureTenantPermission({ usuarioId }, tenantId, allowedRoles = ["admin", "gerente"]) {
  if (!usuarioId) {
    return null;
  }

  const membership = await TenantUsuario.findOne({
    where: {
      usuario_id: usuarioId,
      tenant_id: tenantId
    }
  });

  if (!membership) {
    const err = new Error("No autorizado para gestionar esta sucursal");
    err.status = 403;
    throw err;
  }

  const rol = membership.rol;
  if (!allowedRoles.includes(rol)) {
    const err = new Error("El rol no tiene permisos para esta acción");
    err.status = 403;
    throw err;
  }

  return rol;
}

// GET /api/sucursales - Obtener sucursales con filtros opcionales
router.get("/", async (req, res) => {
  const { hotelId, tenantId } = req.query;
  
  try {
    const where = {};
    if (hotelId) where.hotel_id = hotelId;
    if (tenantId) where.tenant_id = tenantId;

    const sucursales = await Sucursal.findAll({
      where,
      include: [
        {
          model: Hotel,
          as: 'hotel',
          attributes: ['hotel_id', 'nombre']
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['tenant_id', 'nombre']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Agregar conteos
    const sucursalesWithStats = await Promise.all(sucursales.map(async (sucursal) => {
      const recepcionistaCount = await RecepcionistaSucursal.count({
        where: { sucursal_id: sucursal.sucursal_id }
      });

      const habitacionCount = await Habitacion.count({
        where: { sucursal_id: sucursal.sucursal_id }
      });

      return {
        ...sucursal.toJSON(),
        hotel_nombre: sucursal.hotel?.nombre,
        tenant_nombre: sucursal.tenant?.nombre,
        total_recepcionistas: recepcionistaCount,
        total_habitaciones: habitacionCount
      };
    }));

    res.json(sucursalesWithStats);
  } catch (err) {
    console.error("Error al obtener sucursales:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sucursales/:id - Obtener una sucursal específica
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    const sucursal = await Sucursal.findByPk(id, {
      include: [
        {
          model: Hotel,
          as: 'hotel',
          attributes: ['hotel_id', 'nombre']
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['tenant_id', 'nombre']
        }
      ]
    });

    if (!sucursal) {
      return res.status(404).json({ error: "Sucursal no encontrada" });
    }

    const recepcionistaCount = await RecepcionistaSucursal.count({
      where: { sucursal_id: id }
    });

    const habitacionCount = await Habitacion.count({
      where: { sucursal_id: id }
    });

    const sucursalWithStats = {
      ...sucursal.toJSON(),
      hotel_nombre: sucursal.hotel?.nombre,
      tenant_nombre: sucursal.tenant?.nombre,
      total_recepcionistas: recepcionistaCount,
      total_habitaciones: habitacionCount
    };

    res.json(sucursalWithStats);
  } catch (err) {
    console.error("Error al obtener sucursal:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sucursales - Crear una nueva sucursal
router.post("/", async (req, res) => {
  const {
    hotel_id: hotelIdSnake,
    hotelId: hotelIdCamel,
    nombre,
    direccion,
    telefono,
    email,
  } = req.body;

  const hotelId = hotelIdCamel || hotelIdSnake;

  if (!hotelId) {
    return res.status(400).json({ error: "Debe indicar el hotel" });
  }

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "El nombre de la sucursal es obligatorio" });
  }

  try {
    // Verificar que el hotel existe
    const hotel = await Hotel.findByPk(hotelId);

    if (!hotel) {
      return res.status(404).json({ error: "Hotel no encontrado" });
    }

    // Verificar permisos
    try {
      await ensureTenantPermission(
        {
          usuarioId: req.body.usuarioId || req.body.usuario_id || null,
        },
        hotel.tenant_id
      );
    } catch (err) {
      return res.status(err.status || 500).json({ error: err.message });
    }

    // Crear sucursal
    const sucursal = await Sucursal.create({
      tenant_id: hotel.tenant_id,
      hotel_id: hotel.hotel_id,
      nombre: nombre.trim(),
      direccion: direccion || null,
      telefono: telefono || null,
      email: email || null
    });

    // Obtener sucursal completa con relaciones
    const created = await Sucursal.findByPk(sucursal.sucursal_id, {
      include: [
        {
          model: Hotel,
          as: 'hotel',
          attributes: ['hotel_id', 'nombre']
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['tenant_id', 'nombre']
        }
      ]
    });

    const response = {
      ...created.toJSON(),
      hotel_nombre: created.hotel?.nombre,
      tenant_nombre: created.tenant?.nombre,
      total_recepcionistas: 0,
      total_habitaciones: 0
    };

    res.status(201).json(response);
  } catch (err) {
    console.error("Error al crear sucursal:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sucursales/:id - Actualizar una sucursal
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    hotel_id: hotelIdSnake,
    hotelId: hotelIdCamel,
    nombre,
    direccion,
    telefono,
    email,
  } = req.body;

  try {
    // Buscar sucursal actual
    const sucursal = await Sucursal.findByPk(id);

    if (!sucursal) {
      return res.status(404).json({ error: "Sucursal no encontrada" });
    }

    // Verificar permisos
    try {
      await ensureTenantPermission(
        {
          usuarioId: req.body.usuarioId || req.body.usuario_id || null,
        },
        sucursal.tenant_id
      );
    } catch (err) {
      return res.status(err.status || 500).json({ error: err.message });
    }

    // Preparar actualizaciones
    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (direccion !== undefined) updates.direccion = direccion;
    if (telefono !== undefined) updates.telefono = telefono;
    if (email !== undefined) updates.email = email;

    // Si se cambia el hotel
    const providedHotelId = hotelIdCamel || hotelIdSnake;
    if (providedHotelId && providedHotelId !== sucursal.hotel_id) {
      const hotel = await Hotel.findByPk(providedHotelId);

      if (!hotel) {
        return res.status(404).json({ error: "Hotel no encontrado" });
      }

      try {
        await ensureTenantPermission(
          {
            usuarioId: req.body.usuarioId || req.body.usuario_id || null,
          },
          hotel.tenant_id
        );
      } catch (err) {
        return res.status(err.status || 500).json({ error: err.message });
      }

      updates.hotel_id = hotel.hotel_id;
      updates.tenant_id = hotel.tenant_id;
    }

    // Si no hay cambios, devolver la sucursal sin modificar
    if (Object.keys(updates).length === 0) {
      const unchanged = await Sucursal.findByPk(id, {
        include: [
          { model: Hotel, as: 'hotel', attributes: ['hotel_id', 'nombre'] },
          { model: Tenant, as: 'tenant', attributes: ['tenant_id', 'nombre'] }
        ]
      });

      return res.json({
        ...unchanged.toJSON(),
        hotel_nombre: unchanged.hotel?.nombre,
        tenant_nombre: unchanged.tenant?.nombre
      });
    }

    // Actualizar sucursal
    await sucursal.update(updates);

    // Obtener sucursal actualizada
    const updated = await Sucursal.findByPk(id, {
      include: [
        { model: Hotel, as: 'hotel', attributes: ['hotel_id', 'nombre'] },
        { model: Tenant, as: 'tenant', attributes: ['tenant_id', 'nombre'] }
      ]
    });

    const recepcionistaCount = await RecepcionistaSucursal.count({
      where: { sucursal_id: id }
    });

    const habitacionCount = await Habitacion.count({
      where: { sucursal_id: id }
    });

    const response = {
      ...updated.toJSON(),
      hotel_nombre: updated.hotel?.nombre,
      tenant_nombre: updated.tenant?.nombre,
      total_recepcionistas: recepcionistaCount,
      total_habitaciones: habitacionCount
    };

    res.json(response);
  } catch (err) {
    console.error("Error al actualizar sucursal:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sucursales/:id - Eliminar una sucursal
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Buscar sucursal
    const sucursal = await Sucursal.findByPk(id, {
      include: [
        { model: Tenant, as: 'tenant', attributes: ['tenant_id'] }
      ]
    });

    if (!sucursal) {
      return res.status(404).json({ error: "Sucursal no encontrada" });
    }

    // Verificar permisos
    try {
      await ensureTenantPermission(
        {
          usuarioId: req.body.usuarioId || req.body.usuario_id || null,
        },
        sucursal.tenant_id
      );
    } catch (err) {
      return res.status(err.status || 500).json({ error: err.message });
    }

    // Verificar que no tenga recepcionistas asignados
    const recepcionistaCount = await RecepcionistaSucursal.count({
      where: { sucursal_id: id }
    });

    if (recepcionistaCount > 0) {
      return res.status(400).json({
        error: "No se puede eliminar la sucursal porque tiene recepcionistas asignados",
      });
    }

    // Eliminar sucursal
    await sucursal.destroy();

    res.status(204).send();
  } catch (err) {
    console.error("Error al eliminar sucursal:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
