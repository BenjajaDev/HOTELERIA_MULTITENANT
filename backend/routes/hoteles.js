import express from "express";
import { pool } from "../models/db.js";

const router = express.Router();

// GET /api/hoteles
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM hotel");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hoteles
router.post("/", async (req, res) => {
  const { tenant_id, nombre, direccion, telefono, email } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO hotel (tenant_id, nombre, direccion, telefono, email) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [tenant_id, nombre, direccion, telefono, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/hoteles/:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, direccion, telefono, email } = req.body;
  try {
    const result = await pool.query(
      "UPDATE hotel SET nombre=$1, direccion=$2, telefono=$3, email=$4 WHERE hotel_id=$5 RETURNING *",
      [nombre, direccion, telefono, email, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Hotel no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/hoteles/:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM hotel WHERE hotel_id=$1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Hotel no encontrado" });
    }
    res.json({ message: "Hotel eliminado", hotel: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
