import express from "express";
import { pool } from "../models/db.js";

const router = express.Router();

// GET /api/reservas
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM reserva");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reservas
router.post("/", async (req, res) => {
  const { tenant_id, habitacion_id, huesped_id, fecha_inicio, fecha_fin, estado, total } =
    req.body;
  try {
    const result = await pool.query(
      `INSERT INTO reserva 
      (tenant_id, habitacion_id, huesped_id, fecha_inicio, fecha_fin, estado, total) 
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [tenant_id, habitacion_id, huesped_id, fecha_inicio, fecha_fin, estado, total]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/reservas/:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { fecha_inicio, fecha_fin, estado, total } = req.body;
  try {
    const result = await pool.query(
      `UPDATE reserva SET fecha_inicio=$1, fecha_fin=$2, estado=$3, total=$4 
       WHERE reserva_id=$5 RETURNING *`,
      [fecha_inicio, fecha_fin, estado, total, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/reservas/:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM reserva WHERE reserva_id=$1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }
    res.json({ message: "Reserva eliminada", reserva: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;