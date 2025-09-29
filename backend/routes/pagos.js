// backend/routes/pagos.js
import express from "express";
import { pool } from "../models/db.js";
const router = express.Router();

// Obtener detalles de un pago específico
router.get("/:pago_id/detalle", async (req, res) => {
  try {
    const { pago_id } = req.params;
    
    const query = `
      SELECT 
        p.*,
        dp.*,
        r.reserva_id,
        r.fecha_inicio,
        r.fecha_fin,
        r.total as reserva_total,
        h.numero as habitacion_numero,
        h.tipo as habitacion_tipo,
        hotel.nombre as hotel_nombre,
        hotel.direccion as hotel_direccion,
        hotel.telefono as hotel_telefono,
        hotel.email as hotel_email,
        u.nombre as huesped_nombre,
        u.email as huesped_email,
        t.nombre as tenant_nombre
      FROM pago p
      LEFT JOIN detalle_pago dp ON p.pago_id = dp.pago_id
      JOIN reserva r ON p.reserva_id = r.reserva_id
      JOIN habitacion h ON r.habitacion_id = h.habitacion_id
      JOIN hotel ON h.hotel_id = hotel.hotel_id
      JOIN tenant t ON p.tenant_id = t.tenant_id
      LEFT JOIN huesped hu ON r.huesped_id = hu.huesped_id
      LEFT JOIN usuario u ON hu.email = u.email
      WHERE p.pago_id = $1
    `;
    
    const result = await pool.query(query, [pago_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener detalle de pago:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Crear o actualizar detalle de pago
router.post("/:pago_id/detalle", async (req, res) => {
  try {
    const { pago_id } = req.params;
    const {
      descripcion,
      referencia_transaccion,
      comprobante_url
    } = req.body;

    // Verificar que el pago existe
    const pagoCheck = await pool.query(
      "SELECT pago_id FROM pago WHERE pago_id = $1",
      [pago_id]
    );

    if (pagoCheck.rows.length === 0) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    // Insertar o actualizar detalle de pago
    const query = `
      INSERT INTO detalle_pago (
        pago_id, 
        descripcion, 
        fecha_pago, 
        hora_confirmacion, 
        referencia_transaccion, 
        comprobante_url
      ) VALUES ($1, $2, NOW(), NOW(), $3, $4)
      ON CONFLICT (pago_id) DO UPDATE SET
        descripcion = EXCLUDED.descripcion,
        hora_confirmacion = NOW(),
        referencia_transaccion = EXCLUDED.referencia_transaccion,
        comprobante_url = EXCLUDED.comprobante_url
      RETURNING *
    `;

    const result = await pool.query(query, [
      pago_id,
      descripcion,
      referencia_transaccion,
      comprobante_url
    ]);

    // Actualizar estado del pago a 'pagado'
    await pool.query(
      "UPDATE pago SET estado = 'pagado' WHERE pago_id = $1",
      [pago_id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al crear/actualizar detalle de pago:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Generar boleta/factura
router.get("/:pago_id/boleta", async (req, res) => {
  try {
    const { pago_id } = req.params;
    
    const query = `
      SELECT 
        p.pago_id,
        p.monto,
        p.metodo,
        p.fecha as fecha_pago,
        p.estado as estado_pago,
        dp.descripcion,
        dp.fecha_pago as fecha_confirmacion,
        dp.referencia_transaccion,
        r.reserva_id,
        r.fecha_inicio,
        r.fecha_fin,
        r.total as reserva_total,
        r.estado as estado_reserva,
        h.numero as habitacion_numero,
        h.tipo as habitacion_tipo,
        h.precio_noche,
        hotel.nombre as hotel_nombre,
        hotel.direccion as hotel_direccion,
        hotel.telefono as hotel_telefono,
        hotel.email as hotel_email,
        u.nombre as huesped_nombre,
        u.email as huesped_email,
        t.nombre as tenant_nombre,
        (r.fecha_fin - r.fecha_inicio) as cantidad_noches
      FROM pago p
      LEFT JOIN detalle_pago dp ON p.pago_id = dp.pago_id
      JOIN reserva r ON p.reserva_id = r.reserva_id
      JOIN habitacion h ON r.habitacion_id = h.habitacion_id
      JOIN hotel ON h.hotel_id = hotel.hotel_id
      JOIN tenant t ON p.tenant_id = t.tenant_id
      LEFT JOIN huesped hu ON r.huesped_id = hu.huesped_id
      LEFT JOIN usuario u ON hu.email = u.email
      WHERE p.pago_id = $1
    `;
    
    const result = await pool.query(query, [pago_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    const data = result.rows[0];
    
    // Generar número de boleta único
    const numero_boleta = `BOL-${Date.now()}-${pago_id.slice(0, 8)}`;
    
    // Estructura de la boleta
    const boleta = {
      numero_boleta,
      fecha_emision: new Date().toISOString(),
      hotel: {
        nombre: data.hotel_nombre,
        direccion: data.hotel_direccion,
        telefono: data.hotel_telefono,
        email: data.hotel_email
      },
      cliente: {
        nombre: data.huesped_nombre,
        email: data.huesped_email
      },
      reserva: {
        id: data.reserva_id,
        habitacion: `${data.habitacion_numero} (${data.habitacion_tipo})`,
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin,
        noches: parseInt(data.cantidad_noches) || 1,
        precio_noche: data.precio_noche
      },
      pago: {
        id: data.pago_id,
        monto: data.monto,
        metodo: data.metodo,
        fecha: data.fecha_pago,
        estado: data.estado_pago,
        referencia: data.referencia_transaccion
      },
      detalles_facturacion: [
        {
          descripcion: `Alojamiento ${data.cantidad_noches} ${parseInt(data.cantidad_noches) === 1 ? 'noche' : 'noches'} - Habitación ${data.habitacion_numero}`,
          cantidad: parseInt(data.cantidad_noches) || 1,
          precio_unitario: Math.round(data.precio_noche / 1.19), // Precio unitario sin IVA
          subtotal: Math.round(data.monto / 1.19) // Subtotal sin IVA
        }
      ],
      subtotal: Math.round(data.monto / 1.19), // Subtotal sin IVA (precio con IVA / 1.19)
      iva: Math.round(data.monto - (data.monto / 1.19)), // IVA = Total - Subtotal
      total: data.monto, // El total ya incluye IVA
      observaciones: data.descripcion || null
    };

    res.json(boleta);
  } catch (error) {
    console.error("Error al generar boleta:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Obtener todos los pagos con sus detalles
router.get("/", async (req, res) => {
  try {
    const { hotelId, estado_pago, metodo } = req.query;
    
    let query = `
      SELECT 
        p.*,
        dp.descripcion,
        dp.referencia_transaccion,
        r.reserva_id,
        r.fecha_inicio,
        r.fecha_fin,
        h.numero as habitacion_numero,
        u.nombre as huesped_nombre,
        hotel.nombre as hotel_nombre
      FROM pago p
      LEFT JOIN detalle_pago dp ON p.pago_id = dp.pago_id
      JOIN reserva r ON p.reserva_id = r.reserva_id
      JOIN habitacion h ON r.habitacion_id = h.habitacion_id
      JOIN hotel ON h.hotel_id = hotel.hotel_id
      LEFT JOIN huesped hu ON r.huesped_id = hu.huesped_id
      LEFT JOIN usuario u ON hu.email = u.email
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (hotelId) {
      paramCount++;
      query += ` AND hotel.hotel_id = $${paramCount}`;
      params.push(hotelId);
    }

    if (estado_pago) {
      paramCount++;
      query += ` AND p.estado = $${paramCount}`;
      params.push(estado_pago);
    }

    if (metodo) {
      paramCount++;
      query += ` AND p.metodo = $${paramCount}`;
      params.push(metodo);
    }

    query += ` ORDER BY p.fecha DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener pagos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;