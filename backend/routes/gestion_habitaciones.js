import express from "express";
import { Habitacion, Hotel, Sucursal, Reserva, Tenant } from "../models/index.js";
import { fetchMembership, ensureHotelBelongs, ensureSucursalBelongs, fetchRecepcionistaSucursal } from "../models/helpers.js";
import { Op } from "sequelize";

const router = express.Router();

const ESTADOS = ["disponible", "ocupada", "limpieza"];
const TIPOS = ["simple", "doble", "suite"];

// GET /api/habitaciones/del-usuario - Habitaciones del usuario logueado
router.get("/del-usuario", async (req, res) => {
  const {
    tenantId,
    tenant_id: tenantIdSnake,
    usuarioId,
    usuario_id: usuarioIdSnake,
    hotelId,
    hotel_id: hotelIdSnake,
    sucursalId,
    sucursal_id: sucursalIdSnake,
  } = req.query;

  const tenant = tenantId || tenantIdSnake;
  const usuario = usuarioId || usuarioIdSnake;
  const hotel = hotelId || hotelIdSnake;
  const sucursal = sucursalId || sucursalIdSnake || null;

  if (!tenant || !usuario || !hotel) {
    return res.status(400).json({ error: "Se requieren tenantId, usuarioId y hotelId" });
  }

  try {
    const membership = await fetchMembership({ tenant, usuario });

    if (!membership) {
      return res.status(403).json({ error: "El usuario no pertenece al tenant indicado" });
    }

    const { rol } = membership;
    if (!["recepcionista", "admin", "gerente"].includes(rol)) {
      return res.status(403).json({ error: "Rol sin permisos para gestionar habitaciones" });
    }

    const hotelRow = await ensureHotelBelongs({ tenant, hotel });

    if (!hotelRow) {
      return res.status(404).json({ error: "Hotel no encontrado para el tenant" });
    }

    let sucursalRow = null;

    if (sucursal) {
      sucursalRow = await ensureSucursalBelongs({
        sucursalId: sucursal,
        hotelId: hotelRow.hotel_id,
        tenantId: tenant,
      });

      if (!sucursalRow) {
        return res.status(404).json({ error: "Sucursal no encontrada para el hotel" });
      }
    } else if (rol === "recepcionista") {
      sucursalRow = await fetchRecepcionistaSucursal({
        usuarioId: usuario,
        tenantId: tenant,
        hotelId: hotelRow.hotel_id,
      });

      if (!sucursalRow) {
        return res.status(403).json({ error: "El recepcionista no tiene una sucursal asignada" });
      }
    }

    const where = {
      hotel_id: hotelRow.hotel_id,
      tenant_id: tenant
    };

    if (sucursalRow) {
      where.sucursal_id = sucursalRow.sucursal_id;
    }

    const habitaciones = await Habitacion.findAll({
      where,
      order: [['numero', 'ASC']]
    });

    res.json(habitaciones);
  } catch (err) {
    console.error("Error al listar habitaciones:", err);
    res.status(500).json({ error: "Error al obtener habitaciones" });
  }
});

router.get("/:hotelId", async (req, res) => {
  const { hotelId } = req.params;
  const { fecha_inicio, fecha_fin, sucursalId, sucursal_id: sucursalIdSnake } = req.query;

  if (!hotelId) {
    return res.status(400).json({ error: "Se requiere hotelId" });
  }

  const sucursalFilter = sucursalId || sucursalIdSnake || null;

  try {
    const where = {
      hotel_id: hotelId,
      estado: 'disponible'
    };

    if (sucursalFilter) {
      where.sucursal_id = sucursalFilter;
    }

    let habitaciones;

    if (fecha_inicio && fecha_fin) {
      // Buscar habitaciones que NO tengan reservas activas en el rango de fechas
      habitaciones = await Habitacion.findAll({
        where,
        include: [{
          model: Reserva,
          as: 'reservas',
          required: false,
          where: {
            estado: { [Op.ne]: 'cancelada' },
            [Op.not]: {
              [Op.or]: [
                { fecha_fin: { [Op.lte]: fecha_inicio } },
                { fecha_inicio: { [Op.gte]: fecha_fin } }
              ]
            }
          }
        }],
        order: [['numero', 'ASC']]
      });

      // Filtrar solo las que NO tienen reservas conflictivas
      habitaciones = habitaciones.filter(h => !h.reservas || h.reservas.length === 0);
      
      // Limpiar el campo reservas antes de enviar
      habitaciones = habitaciones.map(h => {
        const plain = h.get({ plain: true });
        delete plain.reservas;
        return plain;
      });
    } else {
      habitaciones = await Habitacion.findAll({
        where,
        order: [['numero', 'ASC']]
      });
    }

    res.json(habitaciones);
  } catch (err) {
    console.error("Error al listar habitaciones disponibles:", err);
    res.status(500).json({ error: "Error al obtener habitaciones disponibles" });
  }
});

router.post("/", async (req, res) => {
  const {
    tenantId,
    tenant_id: tenantIdSnake,
    usuarioId,
    usuario_id: usuarioIdSnake,
    hotelId,
    hotel_id: hotelIdSnake,
    sucursalId,
    sucursal_id: sucursalIdSnake,
    numero,
    tipo,
    precio_noche,
    precioNoche,
    estado,
  } = req.body;

  const tenant = tenantId || tenantIdSnake;
  const usuario = usuarioId || usuarioIdSnake;
  const hotel = hotelId || hotelIdSnake;
  const sucursal = sucursalId || sucursalIdSnake || null;

  if (!tenant || !usuario || !hotel) {
    return res.status(400).json({ error: "Se requieren tenantId, usuarioId y hotelId" });
  }

  const numeroVal = Number(numero);
  if (!Number.isInteger(numeroVal) || numeroVal <= 0) {
    return res.status(400).json({ error: "Número de habitación inválido" });
  }

  const tipoVal = typeof tipo === "string" ? tipo.toLowerCase().trim() : null;
  if (!tipoVal || !TIPOS.includes(tipoVal)) {
    return res.status(400).json({ error: "Tipo de habitación inválido" });
  }

  const precioEntrada =
    typeof precio_noche !== "undefined" ? precio_noche : precioNoche;
  const precioVal = Number(precioEntrada);
  if (Number.isNaN(precioVal) || precioVal < 0) {
    return res.status(400).json({ error: "Precio de noche inválido" });
  }

  const estadoEntrada =
    typeof estado === "string" ? estado.toLowerCase().trim() : null;
  const estadoVal = estadoEntrada || "disponible";
  if (estadoEntrada && !ESTADOS.includes(estadoVal)) {
    return res.status(400).json({ error: "Estado de habitación inválido" });
  }

  try {
    const membership = await fetchMembership({ tenant, usuario });

    if (!membership) {
      return res.status(403).json({ error: "El usuario no pertenece al tenant indicado" });
    }

    if (!["recepcionista", "admin", "gerente"].includes(membership.rol)) {
      return res.status(403).json({ error: "Rol sin permisos para crear habitaciones" });
    }

    const hotelRow = await ensureHotelBelongs({ tenant, hotel });
    if (!hotelRow) {
      return res.status(404).json({ error: "Hotel no encontrado para el tenant" });
    }

    let sucursalToUse = null;
    if (sucursal) {
      const sucursalRow = await ensureSucursalBelongs({
        sucursalId: sucursal,
        hotelId: hotelRow.hotel_id,
        tenantId: tenant,
      });

      if (!sucursalRow) {
        return res.status(400).json({ error: "La sucursal indicada no pertenece al hotel" });
      }

      sucursalToUse = sucursalRow.sucursal_id;
    } else if (membership.rol === "recepcionista") {
      const sucursalRow = await fetchRecepcionistaSucursal({
        usuarioId: usuario,
        tenantId: tenant,
        hotelId: hotelRow.hotel_id,
      });

      if (!sucursalRow) {
        return res.status(403).json({ error: "El recepcionista no tiene una sucursal asignada" });
      }

      sucursalToUse = sucursalRow.sucursal_id;
    }

    const nuevaHabitacion = await Habitacion.create({
      tenant_id: tenant,
      hotel_id: hotel,
      sucursal_id: sucursalToUse,
      numero: numeroVal,
      tipo: tipoVal,
      precio_noche: precioVal,
      estado: estadoVal || "disponible"
    });

    res.status(201).json(nuevaHabitacion);
  } catch (err) {
    console.error("Error al crear habitación:", err);
    res.status(500).json({ error: "Error al crear habitación" });
  }
});

// 🔹 Actualizar estado (igual que antes)
router.put("/:habitacionId", async (req, res) => {
  const { habitacionId } = req.params;
  const {
    estado,
    numero,
    tipo,
    precio_noche,
    precioNoche,
    tenantId,
    tenant_id: tenantIdSnake,
    usuarioId,
    usuario_id: usuarioIdSnake,
    hotelId,
    hotel_id: hotelIdSnake,
    sucursalId,
    sucursal_id: sucursalIdSnake,
  } = req.body;

  const tenant = tenantId || tenantIdSnake;
  const usuario = usuarioId || usuarioIdSnake;
  const hotel = hotelId || hotelIdSnake;
  const sucursal = sucursalId || sucursalIdSnake || null;

  if (!tenant || !usuario || !hotel) {
    return res.status(400).json({ error: "Se requieren tenantId, usuarioId y hotelId" });
  }

  try {
    const membership = await fetchMembership({ tenant, usuario });

    if (!membership) {
      return res.status(403).json({ error: "El usuario no pertenece al tenant indicado" });
    }

    const { rol } = membership;
    if (!["recepcionista", "admin", "gerente"].includes(rol)) {
      return res.status(403).json({ error: "Rol sin permisos para modificar habitaciones" });
    }

    const currentRoom = await Habitacion.findOne({
      where: {
        habitacion_id: habitacionId,
        tenant_id: tenant,
        hotel_id: hotel
      }
    });

    if (!currentRoom) {
      return res.status(404).json({ error: "Habitación no encontrada para el hotel indicado" });
    }

    if (rol === "recepcionista") {
      const recepSucursal = await fetchRecepcionistaSucursal({
        usuarioId: usuario,
        tenantId: tenant,
        hotelId: hotel,
      });

      if (!recepSucursal || recepSucursal.sucursal_id !== currentRoom.sucursal_id) {
        return res.status(403).json({ error: "No puede modificar habitaciones de otra sucursal" });
      }
    }

    const updates = {};

    if (typeof numero !== "undefined") {
      const numeroVal = Number(numero);
      if (!Number.isInteger(numeroVal) || numeroVal <= 0) {
        return res.status(400).json({ error: "Número de habitación inválido" });
      }
      updates.numero = numeroVal;
    }

    if (typeof tipo !== "undefined") {
      const tipoVal = typeof tipo === "string" ? tipo.toLowerCase().trim() : "";
      if (!TIPOS.includes(tipoVal)) {
        return res.status(400).json({ error: "Tipo de habitación inválido" });
      }
      updates.tipo = tipoVal;
    }

    const precioEntrada =
      typeof precio_noche !== "undefined" ? precio_noche : precioNoche;
    if (typeof precioEntrada !== "undefined") {
      const precio = Number(precioEntrada);
      if (Number.isNaN(precio) || precio < 0) {
        return res.status(400).json({ error: "Precio de noche inválido" });
      }
      updates.precio_noche = precio;
    }

    if (typeof estado !== "undefined") {
      const estadoVal = typeof estado === "string" ? estado.toLowerCase().trim() : "";
      if (!ESTADOS.includes(estadoVal)) {
        return res.status(400).json({ error: "Estado inválido" });
      }
      updates.estado = estadoVal;
    }

    if (sucursal) {
      const sucursalRow = await ensureSucursalBelongs({
        sucursalId: sucursal,
        hotelId: hotel,
        tenantId: tenant,
      });

      if (!sucursalRow) {
        return res.status(400).json({ error: "La sucursal indicada no pertenece al hotel" });
      }

      if (rol === "recepcionista" && sucursalRow.sucursal_id !== currentRoom.sucursal_id) {
        return res.status(403).json({ error: "No puede reasignar habitaciones a otra sucursal" });
      }

      updates.sucursal_id = sucursalRow.sucursal_id;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No se enviaron campos para actualizar" });
    }

    await currentRoom.update(updates);

    res.json(currentRoom);
  } catch (err) {
    console.error("Error al actualizar habitación:", err);
    res.status(500).json({ error: "Error al actualizar habitación" });
  }
});

router.delete("/:habitacionId", async (req, res) => {
  const { habitacionId } = req.params;
  const {
    tenantId,
    tenant_id: tenantIdSnake,
    usuarioId,
    usuario_id: usuarioIdSnake,
    hotelId,
    hotel_id: hotelIdSnake,
  } = req.body;

  const tenant = tenantId || tenantIdSnake;
  const usuario = usuarioId || usuarioIdSnake;
  const hotel = hotelId || hotelIdSnake;

  if (!tenant || !usuario || !hotel) {
    return res.status(400).json({ error: "Se requieren tenantId, usuarioId y hotelId" });
  }

  try {
    const membership = await fetchMembership({ tenant, usuario });

    if (!membership) {
      return res.status(403).json({ error: "El usuario no pertenece al tenant indicado" });
    }

    if (!["recepcionista", "admin", "gerente"].includes(membership.rol)) {
      return res.status(403).json({ error: "Rol sin permisos para eliminar habitaciones" });
    }

    const targetRoom = await Habitacion.findOne({
      where: {
        habitacion_id: habitacionId,
        tenant_id: tenant,
        hotel_id: hotel
      }
    });

    if (!targetRoom) {
      return res.status(404).json({ error: "Habitación no encontrada para el hotel indicado" });
    }

    if (membership.rol === "recepcionista") {
      const recepSucursal = await fetchRecepcionistaSucursal({
        usuarioId: usuario,
        tenantId: tenant,
        hotelId: hotel,
      });

      if (!recepSucursal || recepSucursal.sucursal_id !== targetRoom.sucursal_id) {
        return res.status(403).json({ error: "No puede eliminar habitaciones de otra sucursal" });
      }
    }

    await targetRoom.destroy();

    res.json({ message: "Habitación eliminada" });
  } catch (err) {
    console.error("Error al eliminar habitación:", err);
    res.status(500).json({ error: "Error al eliminar habitación" });
  }
});

export default router;
