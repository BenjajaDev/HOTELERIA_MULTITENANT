import express from "express";
import { pool } from "../models/db.js";

const router = express.Router();

const ESTADOS = ["disponible", "ocupada", "limpieza"];
const TIPOS = ["simple", "doble", "suite"];

async function fetchMembership({ tenant, usuario }) {
  if (!tenant || !usuario) return null;
  const membershipRes = await pool.query(
    `SELECT rol
     FROM tenant_usuario
     WHERE tenant_id = $1 AND usuario_id = $2
     LIMIT 1`,
    [tenant, usuario]
  );
  return membershipRes.rows[0] || null;
}

async function ensureHotelBelongs({ hotel, tenant }) {
  if (!hotel || !tenant) return null;
  const hotelRes = await pool.query(
    `SELECT hotel_id, tenant_id
     FROM hotel
     WHERE hotel_id = $1 AND tenant_id = $2
     LIMIT 1`,
    [hotel, tenant]
  );
  return hotelRes.rows[0] || null;
}

async function ensureSucursalBelongs({ sucursalId, hotelId, tenantId }) {
  if (!sucursalId || !hotelId || !tenantId) return null;
  const sucursalRes = await pool.query(
    `SELECT sucursal_id, hotel_id, tenant_id
     FROM sucursal
     WHERE sucursal_id = $1 AND hotel_id = $2 AND tenant_id = $3
     LIMIT 1`,
    [sucursalId, hotelId, tenantId]
  );
  return sucursalRes.rows[0] || null;
}

async function fetchRecepcionistaSucursal({ usuarioId, tenantId, hotelId }) {
  if (!usuarioId || !tenantId) return null;
  const params = [usuarioId, tenantId];
  let query = `
    SELECT sucursal_id, hotel_id, tenant_id
    FROM recepcionista_sucursal
    WHERE usuario_id = $1
      AND tenant_id = $2
      AND (activo IS NULL OR activo = true)
  `;

  if (hotelId) {
    params.push(hotelId);
    query += ` AND hotel_id = $${params.length}`;
  }

  query += " ORDER BY created_at ASC NULLS LAST LIMIT 1";

  const result = await pool.query(query, params);
  return result.rows[0] || null;
}

// 🔹 Endpoint: obtener habitaciones del hotel del usuario logueado o por defecto
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

    const values = [hotelRow.hotel_id, tenant];
    if (sucursalRow) {
      values.push(sucursalRow.sucursal_id);
    }

    const habitacionesRes = await pool.query(
      `SELECT habitacion_id, numero, tipo, estado, precio_noche, hotel_id, tenant_id, sucursal_id
       FROM habitacion
       WHERE hotel_id = $1 AND tenant_id = $2
         ${sucursalRow ? "AND sucursal_id = $3" : ""}
       ORDER BY numero ASC`,
      values
    );

    res.json(habitacionesRes.rows);
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

  const values = [hotelId];
  let idx = 2;
  let availabilityClause = "";
  const sucursalFilter = sucursalId || sucursalIdSnake || null;

  if (fecha_inicio && fecha_fin) {
    availabilityClause = `
      AND NOT EXISTS (
        SELECT 1
        FROM reserva r
        WHERE r.habitacion_id = h.habitacion_id
          AND r.estado != 'cancelada'
          AND NOT ($${idx + 1} <= r.fecha_inicio OR $${idx} >= r.fecha_fin)
      )`;
    values.push(fecha_inicio, fecha_fin);
    idx += 2;
  }

  let sucursalClause = "";
  if (sucursalFilter) {
    sucursalClause = ` AND h.sucursal_id = $${idx++}`;
    values.push(sucursalFilter);
  }

  try {
    const result = await pool.query(
      `SELECT habitacion_id, numero, tipo, estado, precio_noche, hotel_id, tenant_id, sucursal_id
       FROM habitacion h
       WHERE h.hotel_id = $1
         AND h.estado = 'disponible'
         ${availabilityClause}
         ${sucursalClause}
       ORDER BY numero ASC`,
      values
    );
    res.json(result.rows);
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

    const insertResult = await pool.query(
      `INSERT INTO habitacion (tenant_id, hotel_id, sucursal_id, numero, tipo, precio_noche, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING habitacion_id, numero, tipo, estado, precio_noche, hotel_id, tenant_id, sucursal_id`,
      [tenant, hotel, sucursalToUse, numeroVal, tipoVal, precioVal, estadoVal || "disponible"]
    );

    res.status(201).json(insertResult.rows[0]);
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

    const currentRoomRes = await pool.query(
      `SELECT habitacion_id, sucursal_id
       FROM habitacion
       WHERE habitacion_id = $1 AND tenant_id = $2 AND hotel_id = $3
       LIMIT 1`,
      [habitacionId, tenant, hotel]
    );

    if (currentRoomRes.rowCount === 0) {
      return res.status(404).json({ error: "Habitación no encontrada para el hotel indicado" });
    }

    const currentRoom = currentRoomRes.rows[0];

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

    const updates = [];
    const values = [];
    let idx = 1;

    if (typeof numero !== "undefined") {
      const numeroVal = Number(numero);
      if (!Number.isInteger(numeroVal) || numeroVal <= 0) {
        return res.status(400).json({ error: "Número de habitación inválido" });
      }
      updates.push(`numero = $${idx++}`);
      values.push(numeroVal);
    }
    if (typeof tipo !== "undefined") {
      const tipoVal = typeof tipo === "string" ? tipo.toLowerCase().trim() : "";
      if (!TIPOS.includes(tipoVal)) {
        return res.status(400).json({ error: "Tipo de habitación inválido" });
      }
      updates.push(`tipo = $${idx++}`);
      values.push(tipoVal);
    }
    const precioEntrada =
      typeof precio_noche !== "undefined" ? precio_noche : precioNoche;
    if (typeof precioEntrada !== "undefined") {
      const precio = Number(precioEntrada);
      if (Number.isNaN(precio) || precio < 0) {
        return res.status(400).json({ error: "Precio de noche inválido" });
      }
      updates.push(`precio_noche = $${idx++}`);
      values.push(precio);
    }

    if (typeof estado !== "undefined") {
      const estadoVal = typeof estado === "string" ? estado.toLowerCase().trim() : "";
      if (!ESTADOS.includes(estadoVal)) {
        return res.status(400).json({ error: "Estado inválido" });
      }
      updates.push(`estado = $${idx++}`);
      values.push(estadoVal);
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

      updates.push(`sucursal_id = $${idx++}`);
      values.push(sucursalRow.sucursal_id);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No se enviaron campos para actualizar" });
    }

    values.push(habitacionId, tenant, hotel);

    const updateResult = await pool.query(
      `UPDATE habitacion
       SET ${updates.join(", ")}
       WHERE habitacion_id = $${idx++} AND tenant_id = $${idx++} AND hotel_id = $${idx}
       RETURNING habitacion_id, numero, tipo, estado, precio_noche, hotel_id, tenant_id, sucursal_id`,
      values
    );

    if (updateResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Habitación no encontrada para el hotel indicado" });
    }

    res.json(updateResult.rows[0]);
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

    const targetRoomRes = await pool.query(
      `SELECT sucursal_id
       FROM habitacion
       WHERE habitacion_id = $1 AND tenant_id = $2 AND hotel_id = $3
       LIMIT 1`,
      [habitacionId, tenant, hotel]
    );

    if (targetRoomRes.rowCount === 0) {
      return res.status(404).json({ error: "Habitación no encontrada para el hotel indicado" });
    }

    if (membership.rol === "recepcionista") {
      const recepSucursal = await fetchRecepcionistaSucursal({
        usuarioId: usuario,
        tenantId: tenant,
        hotelId: hotel,
      });

      if (!recepSucursal || recepSucursal.sucursal_id !== targetRoomRes.rows[0].sucursal_id) {
        return res.status(403).json({ error: "No puede eliminar habitaciones de otra sucursal" });
      }
    }

    const deleteResult = await pool.query(
      `DELETE FROM habitacion
       WHERE habitacion_id = $1 AND tenant_id = $2 AND hotel_id = $3
       RETURNING habitacion_id`,
      [habitacionId, tenant, hotel]
    );

    if (deleteResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Habitación no encontrada para el hotel indicado" });
    }

    res.json({ message: "Habitación eliminada" });
  } catch (err) {
    console.error("Error al eliminar habitación:", err);
    res.status(500).json({ error: "Error al eliminar habitación" });
  }
});

export default router;
