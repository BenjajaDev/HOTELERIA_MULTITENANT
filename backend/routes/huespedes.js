import express from 'express';
import { pool } from '../models/db.js';

const router = express.Router();

// GET /api/huespedes - Obtener todos los huéspedes (solo admin)
router.get('/', async (req, res) => {
  try {
    // Obtener huéspedes de la tabla huesped
    const queryHuespedes = `
      SELECT 
        h.huesped_id as id,
        h.tenant_id,
        h.nombre_completo,
        h.email,
        h.telefono,
        h.documento,
        h.created_at,
        t.nombre as tenant_nombre,
        COUNT(r.reserva_id) as total_reservas,
        COUNT(CASE WHEN r.estado = 'confirmada' THEN 1 END) as reservas_confirmadas,
        COUNT(CASE WHEN r.estado = 'pendiente' THEN 1 END) as reservas_pendientes,
        SUM(CASE WHEN r.estado = 'confirmada' THEN r.total ELSE 0 END) as total_gastado,
        'huesped_table' as source
      FROM huesped h
      LEFT JOIN tenant t ON h.tenant_id = t.tenant_id
      LEFT JOIN reserva r ON h.huesped_id = r.huesped_id
      GROUP BY h.huesped_id, h.tenant_id, h.nombre_completo, h.email, h.telefono, h.documento, h.created_at, t.nombre
    `;

    // Obtener usuarios con rol de huésped
    const queryUsuarios = `
      SELECT 
        u.usuario_id as id,
        tu.tenant_id,
        u.nombre as nombre_completo,
        u.email,
        NULL as telefono,
        NULL as documento,
        u.created_at,
        t.nombre as tenant_nombre,
        0 as total_reservas,
        0 as reservas_confirmadas,
        0 as reservas_pendientes,
        0 as total_gastado,
        'usuario_table' as source
      FROM usuario u
      JOIN tenant_usuario tu ON u.usuario_id = tu.usuario_id
      JOIN tenant t ON tu.tenant_id = t.tenant_id
      WHERE tu.rol = 'huesped'
        AND u.usuario_id NOT IN (SELECT huesped_id FROM huesped WHERE huesped_id = u.usuario_id)
    `;

    const [huespedResult, usuarioResult] = await Promise.all([
      pool.query(queryHuespedes),
      pool.query(queryUsuarios)
    ]);

    // Combinar resultados
    const combinedResults = [
      ...huespedResult.rows,
      ...usuarioResult.rows
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(combinedResults);
  } catch (error) {
    console.error('Error al obtener huéspedes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/huespedes/:id - Obtener un huésped específico con detalles de reservas
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Primero buscar en la tabla huesped
    const huespedQuery = `
      SELECT 
        h.huesped_id as id,
        h.tenant_id,
        h.nombre_completo,
        h.email,
        h.telefono,
        h.documento,
        h.created_at,
        t.nombre as tenant_nombre,
        'huesped_table' as source
      FROM huesped h
      LEFT JOIN tenant t ON h.tenant_id = t.tenant_id
      WHERE h.huesped_id = $1
    `;
    
    let huespedResult = await pool.query(huespedQuery, [id]);
    
    // Si no se encuentra en huesped, buscar en usuarios con rol de huesped
    if (huespedResult.rows.length === 0) {
      const usuarioQuery = `
        SELECT 
          u.usuario_id as id,
          tu.tenant_id,
          u.nombre as nombre_completo,
          u.email,
          NULL as telefono,
          NULL as documento,
          u.created_at,
          t.nombre as tenant_nombre,
          'usuario_table' as source
        FROM usuario u
        JOIN tenant_usuario tu ON u.usuario_id = tu.usuario_id
        JOIN tenant t ON tu.tenant_id = t.tenant_id
        WHERE u.usuario_id = $1 AND tu.rol = 'huesped'
      `;
      
      huespedResult = await pool.query(usuarioQuery, [id]);
    }
    
    if (huespedResult.rows.length === 0) {
      return res.status(404).json({ error: 'Huésped no encontrado' });
    }
    
    // Obtener reservas del huésped
    const reservasQuery = `
      SELECT 
        r.reserva_id,
        r.fecha_inicio,
        r.fecha_fin,
        r.estado,
        r.total,
        h_hotel.nombre as hotel_nombre,
        hab.numero as habitacion_numero,
        hab.tipo,
        p.metodo as pago_metodo,
        p.estado as pago_estado
      FROM reserva r
      LEFT JOIN habitacion hab ON r.habitacion_id = hab.habitacion_id
      LEFT JOIN hotel h_hotel ON hab.hotel_id = h_hotel.hotel_id
      LEFT JOIN pago p ON r.reserva_id = p.reserva_id
      WHERE r.huesped_id = $1
      ORDER BY r.created_at DESC
    `;
    
    const reservasResult = await pool.query(reservasQuery, [id]);
    
    const huesped = huespedResult.rows[0];
    huesped.reservas = reservasResult.rows;
    
    res.json(huesped);
  } catch (error) {
    console.error('Error al obtener huésped:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/huespedes/:id - Eliminar un huésped (solo admin)
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    await client.query('BEGIN');
    
    // Verificar si el huésped existe en la tabla huesped
    const checkHuespedQuery = 'SELECT huesped_id FROM huesped WHERE huesped_id = $1';
    const checkHuespedResult = await client.query(checkHuespedQuery, [id]);
    
    // Verificar si el usuario existe con rol de huésped
    const checkUsuarioQuery = `
      SELECT u.usuario_id 
      FROM usuario u
      JOIN tenant_usuario tu ON u.usuario_id = tu.usuario_id
      WHERE u.usuario_id = $1 AND tu.rol = 'huesped'
    `;
    const checkUsuarioResult = await client.query(checkUsuarioQuery, [id]);
    
    if (checkHuespedResult.rows.length === 0 && checkUsuarioResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Huésped no encontrado' });
    }
    
    // Verificar si tiene reservas activas o confirmadas
    const reservasActivasQuery = `
      SELECT COUNT(*) as count 
      FROM reserva 
      WHERE huesped_id = $1 
      AND estado IN ('confirmada', 'pendiente')
      AND fecha_fin >= CURRENT_DATE
    `;
    
    const reservasActivasResult = await client.query(reservasActivasQuery, [id]);
    
    if (parseInt(reservasActivasResult.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'No se puede eliminar el huésped porque tiene reservas activas o futuras' 
      });
    }
    
    // Si existe en la tabla huesped, eliminarlo
    if (checkHuespedResult.rows.length > 0) {
      const deleteHuespedQuery = 'DELETE FROM huesped WHERE huesped_id = $1';
      await client.query(deleteHuespedQuery, [id]);
    }
    
    // Si existe como usuario con rol de huésped, eliminar la relación tenant-usuario y el usuario
    if (checkUsuarioResult.rows.length > 0) {
      // Eliminar relación tenant-usuario
      const deleteTenantUsuarioQuery = 'DELETE FROM tenant_usuario WHERE usuario_id = $1 AND rol = $2';
      await client.query(deleteTenantUsuarioQuery, [id, 'huesped']);
      
      // Verificar si el usuario tiene otros roles
      const otherRolesQuery = 'SELECT COUNT(*) as count FROM tenant_usuario WHERE usuario_id = $1';
      const otherRolesResult = await client.query(otherRolesQuery, [id]);
      
      // Si no tiene otros roles, eliminar el usuario
      if (parseInt(otherRolesResult.rows[0].count) === 0) {
        const deleteUsuarioQuery = 'DELETE FROM usuario WHERE usuario_id = $1';
        await client.query(deleteUsuarioQuery, [id]);
      }
    }
    
    await client.query('COMMIT');
    res.status(204).send();
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar huésped:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// PUT /api/huespedes/:id - Actualizar datos de un huésped
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;
  try {
    const { id } = req.params;
    const { nombre_completo, email, telefono, documento } = req.body;

    if (!nombre_completo || !email) {
      return res.status(400).json({ error: 'Nombre completo y email son requeridos' });
    }

    await client.query('BEGIN');
    transactionStarted = true;

    const [huespedExistResult, usuarioExistResult] = await Promise.all([
      client.query('SELECT huesped_id, tenant_id FROM huesped WHERE huesped_id = $1', [id]),
      client.query('SELECT usuario_id FROM usuario WHERE usuario_id = $1', [id])
    ]);

    if (huespedExistResult.rows.length === 0 && usuarioExistResult.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(404).json({ error: 'Huésped no encontrado' });
    }

    const emailHuespedResult = await client.query(
      `SELECT huesped_id FROM huesped WHERE email = $1 AND huesped_id != $2`,
      [email, id]
    );

    if (emailHuespedResult.rows.length > 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(400).json({ error: 'Ya existe otro huésped con ese email' });
    }

    const emailUsuarioResult = await client.query(
      `SELECT usuario_id FROM usuario WHERE email = $1 AND usuario_id != $2`,
      [email, id]
    );

    if (emailUsuarioResult.rows.length > 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(400).json({ error: 'Ya existe otro usuario con ese email' });
    }

    let updatedHuesped = null;

    if (huespedExistResult.rows.length > 0) {
      const huespedUpdate = await client.query(
        `UPDATE huesped
         SET nombre_completo = $1, email = $2, telefono = $3, documento = $4
         WHERE huesped_id = $5
         RETURNING *`,
        [
          nombre_completo,
          email,
          telefono ?? null,
          documento ?? null,
          id
        ]
      );
      updatedHuesped = huespedUpdate.rows[0] || null;
    }

    if (usuarioExistResult.rows.length > 0) {
      await client.query(
        `UPDATE usuario
         SET nombre = $1, email = $2
         WHERE usuario_id = $3`,
        [nombre_completo, email, id]
      );
    }

    await client.query('COMMIT');
    transactionStarted = false;

    if (updatedHuesped) {
      return res.json(updatedHuesped);
    }

    return res.json({
      huesped_id: id,
      tenant_id: huespedExistResult.rows[0]?.tenant_id || null,
      nombre_completo,
      email,
      telefono: telefono ?? null,
      documento: documento ?? null
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error al revertir la transacción:', rollbackError);
      }
    }
    console.error('Error al actualizar huésped:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

export default router;
