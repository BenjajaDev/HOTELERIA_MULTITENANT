import express from "express";
import { pool } from "../models/db.js";

const router = express.Router();

const ESTADOS = ["disponible", "ocupada", "limpieza"];

// 🔹 Endpoint: obtener habitaciones del hotel del usuario logueado o por defecto
router.get("/del-usuario", async (req, res) => {
  try {
    let hotelId;

    const usuarioId = req.usuario?.usuario_id;

    if (usuarioId) {
      // Obtener hotel_id del recepcionista
      const hotelRes = await pool.query(
        `SELECT h.hotel_id
         FROM hotel h
         JOIN tenant_usuario tu ON tu.tenant_id = h.tenant_id
         WHERE tu.usuario_id = $1 AND tu.rol = 'recepcionista'
         LIMIT 1`,
        [usuarioId]
      );

      if (hotelRes.rows.length > 0) {
        hotelId = hotelRes.rows[0].hotel_id;
      } else {
        // Si no se encuentra hotel del recepcionista, usar un hotel por defecto
        const defaultHotelRes = await pool.query(
          `SELECT hotel_id FROM hotel WHERE nombre = $1 LIMIT 1`,
          ["Hotel Stella"]
        );
        hotelId = defaultHotelRes.rows[0]?.hotel_id;
      }
    } else {
      // Usuario no autenticado: usar hotel por defecto
      const defaultHotelRes = await pool.query(
        `SELECT hotel_id FROM hotel WHERE nombre = $1 LIMIT 1`,
        ["Hotel Stella"]
      );
      hotelId = defaultHotelRes.rows[0]?.hotel_id;
    }

    if (!hotelId) {
      return res.status(404).json({ error: "No se encontró hotel por defecto" });
    }

    // Obtener habitaciones del hotel seleccionado
    const habitacionesRes = await pool.query(
      `SELECT habitacion_id, numero, tipo, estado, hotel_id
       FROM habitacion
       WHERE hotel_id = $1
       ORDER BY numero ASC`,
      [hotelId]
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
  const { estado } = req.body;

  if (!ESTADOS.includes(estado)) return res.status(400).json({ error: "Estado inválido" });

  try {
    const result = await pool.query(
      `UPDATE habitacion
       SET estado = $1
       WHERE habitacion_id = $2
       RETURNING habitacion_id, numero, tipo, estado, hotel_id`,
      [estado, habitacionId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Habitación no encontrada" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al actualizar habitación:", err);
    res.status(500).json({ error: "Error al actualizar habitación" });
  }
});

export default router;