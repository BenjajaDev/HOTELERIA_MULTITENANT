import express from "express";
import { pool } from "../models/db.js";

const router = express.Router();

// GET /api/hoteles
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT h.*, t.nombre AS tenant_nombre
      FROM hotel h
      JOIN tenant t ON h.tenant_id = t.tenant_id
      ORDER BY h.created_at DESC NULLS LAST
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener hoteles:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/hoteles/:id
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT h.*, t.nombre AS tenant_nombre
       FROM hotel h
       JOIN tenant t ON h.tenant_id = t.tenant_id
       WHERE h.hotel_id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Hotel no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al obtener hotel:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hoteles
router.post("/", async (req, res) => {
  const { nombre, direccion, telefono, email } = req.body;

  try {
    // 1. Crear tenant con el nombre del hotel
    const tenantResult = await pool.query(
      "INSERT INTO tenant (nombre) VALUES ($1) RETURNING tenant_id",
      [nombre]
    );
    const tenant_id = tenantResult.rows[0].tenant_id;

    // 2. Crear hotel asociado al tenant
    const hotelResult = await pool.query(
      `INSERT INTO hotel (tenant_id, nombre, direccion, telefono, email) 
       VALUES ($1, $2, $3, $4, $5) RETURNING hotel_id`,
      [tenant_id, nombre, direccion, telefono, email]
    );

    const created = await pool.query(
      `SELECT h.*, t.nombre AS tenant_nombre
       FROM hotel h
       JOIN tenant t ON h.tenant_id = t.tenant_id
       WHERE h.hotel_id = $1`,
      [hotelResult.rows[0].hotel_id]
    );

    res.status(201).json(created.rows[0]);
  } catch (err) {
    console.error("Error al crear hotel:", err);
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
    if (nombre) {
      await pool.query("UPDATE tenant SET nombre=$1 WHERE tenant_id=$2", [nombre, result.rows[0].tenant_id]);
    }
    const updated = await pool.query(
      `SELECT h.*, t.nombre AS tenant_nombre
       FROM hotel h
       JOIN tenant t ON h.tenant_id = t.tenant_id
       WHERE h.hotel_id = $1`,
      [id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    console.error("Error al actualizar hotel:", err);
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
    console.error("Error al eliminar hotel:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
