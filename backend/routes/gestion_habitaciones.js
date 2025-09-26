import express from "express";
import { pool } from "../models/db.js";

const router = express.Router();

const ESTADOS = ["disponible", "ocupada", "limpieza"];

// 🔹 Endpoint: obtener habitaciones del hotel del usuario logueado o por defecto
router.get("/del-usuario", async (req, res) => {
  const { tenantId, tenant_id: tenantIdSnake, usuarioId, usuario_id: usuarioIdSnake, hotelId, hotel_id: hotelIdSnake } =
    req.query;

  const tenant = tenantId || tenantIdSnake;
  const usuario = usuarioId || usuarioIdSnake;
  const hotel = hotelId || hotelIdSnake;

  if (!tenant || !usuario || !hotel) {
    return res.status(400).json({ error: "Se requieren tenantId, usuarioId y hotelId" });
  }

  try {
    const membershipRes = await pool.query(
      `SELECT rol
       FROM tenant_usuario
       WHERE tenant_id = $1 AND usuario_id = $2
       LIMIT 1`,
      [tenant, usuario]
    );

    if (membershipRes.rows.length === 0) {
      return res.status(403).json({ error: "El usuario no pertenece al tenant indicado" });
    }

    const { rol } = membershipRes.rows[0];
    if (!["recepcionista", "admin"].includes(rol)) {
      return res.status(403).json({ error: "Rol sin permisos para gestionar habitaciones" });
    }

    const hotelRes = await pool.query(
      `SELECT hotel_id
       FROM hotel
       WHERE hotel_id = $1 AND tenant_id = $2
       LIMIT 1`,
      [hotel, tenant]
    );

    if (hotelRes.rows.length === 0) {
      return res.status(404).json({ error: "Hotel no encontrado para el tenant" });
    }

    const habitacionesRes = await pool.query(
      `SELECT habitacion_id, numero, tipo, estado, hotel_id, tenant_id
       FROM habitacion
       WHERE hotel_id = $1 AND tenant_id = $2
       ORDER BY numero ASC`,
      [hotel, tenant]
    );

    res.json(habitacionesRes.rows);
  } catch (err) {
    console.error("Error al listar habitaciones:", err);
    res.status(500).json({ error: "Error al obtener habitaciones" });
  }
});

// 🔹 Actualizar estado (igual que antes)
router.put("/:habitacionId", async (req, res) => {
  const { habitacionId } = req.params;
  const {
    estado,
    tenantId,
    tenant_id: tenantIdSnake,
    usuarioId,
    usuario_id: usuarioIdSnake,
    hotelId,
    hotel_id: hotelIdSnake,
  } = req.body;

  if (!ESTADOS.includes(estado)) {
    return res.status(400).json({ error: "Estado inválido" });
  }

  const tenant = tenantId || tenantIdSnake;
  const usuario = usuarioId || usuarioIdSnake;
  const hotel = hotelId || hotelIdSnake;

  if (!tenant || !usuario || !hotel) {
    return res.status(400).json({ error: "Se requieren tenantId, usuarioId y hotelId" });
  }

  try {
    const membershipRes = await pool.query(
      `SELECT rol
       FROM tenant_usuario
       WHERE tenant_id = $1 AND usuario_id = $2
       LIMIT 1`,
      [tenant, usuario]
    );

    if (membershipRes.rows.length === 0) {
      return res.status(403).json({ error: "El usuario no pertenece al tenant indicado" });
    }

    const { rol } = membershipRes.rows[0];
    if (!["recepcionista", "admin"].includes(rol)) {
      return res.status(403).json({ error: "Rol sin permisos para modificar habitaciones" });
    }

    const updateResult = await pool.query(
      `UPDATE habitacion
       SET estado = $1
       WHERE habitacion_id = $2 AND tenant_id = $3 AND hotel_id = $4
       RETURNING habitacion_id, numero, tipo, estado, hotel_id, tenant_id`,
      [estado, habitacionId, tenant, hotel]
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

export default router;
