import express from "express";
import { pool } from "../models/db.js";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import db, { Usuario, Tenant, TenantUsuario, Hotel, Huesped } from "../models/index.js";
import { sendVerificationEmail, isEmailConfigured } from "../utils/emailService.js";

const router = express.Router();

// -------------------------
// LOGIN de usuario
// -------------------------
router.post("/login", async (req, res) => {
  const {
    email,
    password,
    tenantId: tenantIdFromBody,
    tenant_id: tenantIdSnake,
    hotelId,
    hotel_id: hotelIdSnake,
  } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña son requeridos" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  // Permitir tenantId/hotelId en camelCase o snake_case para compatibilidad
  const requestedTenantId = tenantIdFromBody || tenantIdSnake;
  const requestedHotelId = hotelId || hotelIdSnake;

  try {
    const userResult = await pool.query(
      `SELECT usuario_id, email, password_hash, nombre, email_verificado
       FROM usuario
       WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    const memberships = await pool.query(
      `SELECT tu.rol, tu.tenant_id, t.nombre AS tenant_nombre
       FROM tenant_usuario tu
       JOIN tenant t ON t.tenant_id = tu.tenant_id
       WHERE tu.usuario_id = $1`,
      [user.usuario_id]
    );

    if (memberships.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "El usuario no tiene un hotel asignado" });
    }

    const membershipList = memberships.rows;

    const tenantFromRequest = requestedTenantId
      ? membershipList.find((m) => m.tenant_id === requestedTenantId)
      : null;

    if (requestedTenantId && !tenantFromRequest) {
      return res
        .status(403)
        .json({ error: "No tiene acceso al tenant indicado" });
    }

    const membership = tenantFromRequest || membershipList[0];

    if (membership.rol === "huesped" && !user.email_verificado) {
      return res.status(403).json({
        error: "Debes confirmar tu correo electrónico antes de acceder",
        needs_verification: true,
      });
    }

    const tenantId = membership.tenant_id;

    let hotelInfo = null;

    if (requestedHotelId) {
      const hotelResult = await pool.query(
        `SELECT hotel_id, tenant_id, nombre
         FROM hotel
         WHERE hotel_id = $1`,
        [requestedHotelId]
      );

      if (hotelResult.rows.length === 0) {
        return res.status(404).json({ error: "Hotel no encontrado" });
      }

      hotelInfo = hotelResult.rows[0];

      if (hotelInfo.tenant_id !== tenantId) {
        return res
          .status(403)
          .json({ error: "El hotel no pertenece al tenant del usuario" });
      }
    }

    if (!hotelInfo) {
      const hotelResult = await pool.query(
        `SELECT hotel_id, tenant_id, nombre
         FROM hotel
         WHERE tenant_id = $1
         ORDER BY created_at ASC NULLS LAST, nombre ASC
         LIMIT 1`,
        [tenantId]
      );

      hotelInfo = hotelResult.rows[0] || null;
    }

    let sucursalInfo = null;

    if (membership.rol === "recepcionista") {
      const sucursalConditions = [user.usuario_id, tenantId];
      let sucursalQuery = `
        SELECT
          rs.recepcionista_sucursal_id,
          rs.sucursal_id,
          rs.hotel_id,
          rs.tenant_id,
          rs.activo,
          s.nombre AS sucursal_nombre,
          h.nombre AS hotel_nombre
        FROM recepcionista_sucursal rs
        JOIN sucursal s ON s.sucursal_id = rs.sucursal_id
        JOIN hotel h ON h.hotel_id = rs.hotel_id
        WHERE rs.usuario_id = $1
          AND rs.tenant_id = $2
      `;

      if (requestedHotelId) {
        sucursalConditions.push(requestedHotelId);
        sucursalQuery += ` AND rs.hotel_id = $${sucursalConditions.length}`;
      }

      sucursalQuery += " ORDER BY rs.created_at ASC NULLS LAST LIMIT 1";

      const sucursalResult = await pool.query(sucursalQuery, sucursalConditions);
      sucursalInfo = sucursalResult.rows[0] || null;

      if (sucursalInfo) {
        // Alinear hotel devuelto con la sucursal asignada
        hotelInfo = {
          hotel_id: sucursalInfo.hotel_id,
          tenant_id: sucursalInfo.tenant_id,
          nombre: sucursalInfo.hotel_nombre,
        };
      }
    } else if (membership.rol === "huesped") {
      const huespedResult = await pool.query(
        `SELECT h.sucursal_id, s.nombre AS sucursal_nombre, s.hotel_id
         FROM huesped h
         LEFT JOIN sucursal s ON s.sucursal_id = h.sucursal_id
         WHERE h.huesped_id = $1
         LIMIT 1`,
        [user.usuario_id]
      );

      if (huespedResult.rowCount > 0) {
        const row = huespedResult.rows[0];
        if (row.sucursal_id) {
          sucursalInfo = {
            sucursal_id: row.sucursal_id,
            sucursal_nombre: row.sucursal_nombre,
            hotel_id: row.hotel_id,
            tenant_id: tenantId,
            activo: true,
          };

          if (!hotelInfo || (row.hotel_id && hotelInfo.hotel_id !== row.hotel_id)) {
            const hotelLookup = await pool.query(
              `SELECT hotel_id, tenant_id, nombre
               FROM hotel
               WHERE hotel_id = $1
               LIMIT 1`,
              [row.hotel_id]
            );

            const hotelRow = hotelLookup.rows[0];
            if (hotelRow) {
              hotelInfo = hotelRow;
            }
          }
        }
      }
    }

    let mensaje = "";
    if (membership.rol === "admin") {
      mensaje = "🎉 Has ingresado como ADMIN";
    } else if (membership.rol === "recepcionista") {
      mensaje = "🎉 Has ingresado como RECEPCIONISTA";
    } else if (membership.rol === "gerente") {
      mensaje = "🎉 Has ingresado como GERENTE";
    } else if (membership.rol === "huesped") {
      mensaje = "🎉 Has ingresado como HUESPED";
    }

    if (hotelInfo?.nombre) {
      mensaje = `${mensaje} en ${hotelInfo.nombre}`.trim();
    }

    res.json({
      message: mensaje,
      user: {
        usuario_id: user.usuario_id,
        user_id: user.usuario_id,
        nombre: user.nombre,
        email: user.email,
        rol: membership.rol,
        tenant_id: membership.tenant_id,
        tenant_nombre: membership.tenant_nombre,
        hotel_id: hotelInfo?.hotel_id || null,
        hotel_nombre: hotelInfo?.nombre || null,
        sucursal_id: sucursalInfo?.sucursal_id || null,
        sucursal_nombre: sucursalInfo?.sucursal_nombre || null,
        sucursal_activa: sucursalInfo?.activo ?? null,
      },
    });
  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// backend/routes/usuarios.js
router.get("/me", async (req, res) => {
  try {
    // 🔹 Supongamos que ya tienes userId desde el token o sesión
    const userId = req.user.id; 
    const result = await pool.query(
      "SELECT id, email, role, hotel_id FROM usuario WHERE id = $1",
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al obtener usuario:", err);
    res.status(500).json({ error: "Error al obtener usuario" });
  }
});

// -------------------------
// REGISTRO de huésped
// -------------------------
router.post("/register-huesped", async (req, res) => {
  const {
    tenant_id: tenantIdSnake,
    tenantId: tenantIdCamel,
    hotel_id: hotelIdSnake,
    hotelId: hotelIdCamel,
    sucursal_id: sucursalIdSnake,
    sucursalId: sucursalIdCamel,
    email,
    password,
    nombre,
    telefono: telefonoCampo,
    phone: phoneCampo,
    documento: documentoCampo,
    rut: rutCampo,
  } = req.body;

  const providedTenantId = tenantIdCamel || tenantIdSnake || null;
  const providedHotelId = hotelIdCamel || hotelIdSnake || null;
  const providedSucursalId = sucursalIdCamel || sucursalIdSnake || null;
  const telefonoRaw = telefonoCampo ?? phoneCampo ?? "";
  const telefonoSanitizado = typeof telefonoRaw === "string"
    ? telefonoRaw.replace(/[\s-]/g, "").trim()
    : "";
  const telefonoNormalizado = telefonoSanitizado.replace(/[^+\d]/g, "");
  const documentoRaw = documentoCampo ?? rutCampo ?? "";
  const documentoNormalizado = typeof documentoRaw === "string"
    ? documentoRaw.trim().toUpperCase()
    : "";
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!normalizedEmail) {
    return res.status(400).json({ error: "El correo del huésped es requerido" });
  }

  if (!providedTenantId && !providedHotelId) {
    return res.status(400).json({
      error: "Debe indicar el hotel en el que desea registrarse",
    });
  }

  if (!telefonoNormalizado) {
    return res.status(400).json({ error: "El teléfono del huésped es requerido" });
  }

  if (telefonoNormalizado.length > 12) {
    return res.status(400).json({ error: "El teléfono debe tener como máximo 12 caracteres" });
  }

  if (!/^\d{7,8}-[\dK]$/.test(documentoNormalizado)) {
    return res.status(400).json({ error: "El RUT debe tener el formato ########-# (usar K en mayúscula si aplica)" });
  }

  if (!password || String(password).length < 8) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
  }

  if (!isEmailConfigured()) {
    return res.status(500).json({ error: "El servicio de correo no está configurado. Contacta al administrador para completar el registro." });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const exists = await client.query(
      "SELECT 1 FROM usuario WHERE LOWER(email) = $1",
      [normalizedEmail]
    );

    if (exists.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "El correo ya está registrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const usuario_id = uuidv4();
    const verificationToken = uuidv4();
    const verificationExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48);

    let tenantIdToUse = providedTenantId;
    let hotelIdToUse = providedHotelId;
    let sucursalIdToUse = providedSucursalId;

    if (!tenantIdToUse && providedHotelId) {
      const hotelLookup = await client.query(
        `SELECT hotel_id, tenant_id
         FROM hotel
         WHERE hotel_id = $1`,
        [providedHotelId]
      );

      if (hotelLookup.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: "Hotel no encontrado" });
      }

      tenantIdToUse = hotelLookup.rows[0].tenant_id;
      hotelIdToUse = hotelLookup.rows[0].hotel_id;
    }

    if (!tenantIdToUse) {
      await client.query('ROLLBACK');
      return res
        .status(400)
        .json({ error: "No se pudo determinar el tenant para el registro" });
    }

    if (sucursalIdToUse) {
      const sucursalLookup = await client.query(
        `SELECT sucursal_id, hotel_id, tenant_id
         FROM sucursal
         WHERE sucursal_id = $1`,
        [sucursalIdToUse]
      );

      if (sucursalLookup.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: "Sucursal no encontrada" });
      }

      const sucursalRow = sucursalLookup.rows[0];

      if (sucursalRow.tenant_id !== tenantIdToUse) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: "La sucursal no pertenece al tenant indicado" });
      }

      if (hotelIdToUse && sucursalRow.hotel_id !== hotelIdToUse) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: "La sucursal no pertenece al hotel seleccionado" });
      }

      hotelIdToUse = sucursalRow.hotel_id;
      sucursalIdToUse = sucursalRow.sucursal_id;
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "Debe seleccionar la sucursal del hotel" });
    }

    await client.query(
      `INSERT INTO usuario (usuario_id, email, password_hash, nombre, email_verificado, email_verification_token, email_verification_expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [usuario_id, normalizedEmail, hashedPassword, nombre, false, verificationToken, verificationExpiresAt]
    );

    await client.query(
      "INSERT INTO tenant_usuario (tenant_id, usuario_id, rol) VALUES ($1, $2, $3)",
      [tenantIdToUse, usuario_id, "huesped"]
    );

    await client.query(
      `INSERT INTO huesped (huesped_id, tenant_id, sucursal_id, nombre_completo, email, telefono, documento, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (huesped_id) DO NOTHING`,
      [
        usuario_id,
        tenantIdToUse,
        sucursalIdToUse,
        nombre || normalizedEmail,
        normalizedEmail,
        telefonoNormalizado,
        documentoNormalizado,
      ]
    );

    await sendVerificationEmail({
      to: normalizedEmail,
      nombre: nombre || normalizedEmail,
      token: verificationToken,
    });

    await client.query('COMMIT');

    res.status(201).json({
      message: "Registro exitoso. Revisa tu correo para activar tu cuenta.",
      usuario_id,
      sucursal_id: sucursalIdToUse,
      hotel_id: hotelIdToUse,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: "Error en el servidor" });
  } finally {
    client.release();
  }
});

// -------------------------
// VERIFICAR CORREO ELECTRÓNICO
// -------------------------
router.get("/verify-email", async (req, res) => {
  const { token } = req.query;

  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Token de verificación requerido" });
  }

  try {
    const result = await pool.query(
      `SELECT usuario_id, email, nombre, email_verificado, email_verification_expires_at
       FROM usuario
       WHERE email_verification_token = $1`,
      [token]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "El enlace de verificación no es válido" });
    }

    const user = result.rows[0];

    if (user.email_verificado) {
      return res.json({ message: "Tu correo ya estaba verificado. Puedes iniciar sesión." });
    }

    const expiresAt = user.email_verification_expires_at
      ? new Date(user.email_verification_expires_at)
      : null;

    if (expiresAt && expiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        error: "El enlace de verificación ha expirado. Solicita uno nuevo.",
        expired: true,
      });
    }

    await pool.query(
      `UPDATE usuario
       SET email_verificado = TRUE,
           email_verificado_en = NOW(),
           email_verification_token = NULL,
           email_verification_expires_at = NULL
       WHERE usuario_id = $1`,
      [user.usuario_id]
    );

    res.json({ message: "¡Tu correo fue verificado correctamente! Ya puedes iniciar sesión." });
  } catch (err) {
    console.error("Error al verificar correo:", err);
    res.status(500).json({ error: "Error al verificar el correo" });
  }
});

// -------------------------
// REENVIAR VERIFICACIÓN DE CORREO
// -------------------------
router.post("/resend-verification", async (req, res) => {
  const { email } = req.body;

  if (!email || !String(email).trim()) {
    return res.status(400).json({ error: "Debes indicar el correo electrónico" });
  }

  if (!isEmailConfigured()) {
    return res.status(500).json({ error: "El servicio de correo no está configurado" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    const result = await pool.query(
      `SELECT usuario_id, email, nombre, email_verificado
       FROM usuario
       WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "No encontramos una cuenta con ese correo" });
    }

    const user = result.rows[0];

    if (user.email_verificado) {
      return res.json({ message: "Este correo ya está verificado. Ya puedes iniciar sesión." });
    }

    const newToken = uuidv4();
    const newExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48);

    await pool.query(
      `UPDATE usuario
       SET email_verification_token = $1,
           email_verification_expires_at = $2
       WHERE usuario_id = $3`,
      [newToken, newExpiresAt, user.usuario_id]
    );

    await sendVerificationEmail({
      to: user.email,
      nombre: user.nombre || user.email,
      token: newToken,
    });

    res.json({ message: "Hemos reenviado el correo de verificación. Revisa tu bandeja de entrada." });
  } catch (err) {
    console.error("Error al reenviar verificación:", err);
    res.status(500).json({ error: "Error al reenviar el correo de verificación" });
  }
});

// -------------------------
// OBTENER USUARIOS CON ROL DE HUÉSPED (solo admin)
// -------------------------
router.get("/huespedes", async (req, res) => {
  try {
    const query = `
      SELECT 
        u.usuario_id,
        u.email,
        u.nombre,
        u.created_at,
        tu.tenant_id,
        t.nombre as tenant_nombre
      FROM usuario u
      JOIN tenant_usuario tu ON u.usuario_id = tu.usuario_id
      JOIN tenant t ON tu.tenant_id = t.tenant_id
      WHERE tu.rol = 'huesped'
      ORDER BY u.created_at DESC
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener usuarios huéspedes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// -------------------------
// ELIMINAR USUARIO CON ROL DE HUÉSPED (solo admin)
// -------------------------
router.delete("/huespedes/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    await client.query('BEGIN');
    
    // Verificar si el usuario existe con rol de huésped
    const checkQuery = `
      SELECT u.usuario_id 
      FROM usuario u
      JOIN tenant_usuario tu ON u.usuario_id = tu.usuario_id
      WHERE u.usuario_id = $1 AND tu.rol = 'huesped'
    `;
    const checkResult = await client.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuario huésped no encontrado' });
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
        error: 'No se puede eliminar el usuario porque tiene reservas activas o futuras' 
      });
    }
    
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
    
    await client.query('COMMIT');
    res.status(204).send();
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar usuario huésped:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// -------------------------
// ACTUALIZAR PERFIL DE HUÉSPED (autogestión)
// -------------------------
router.put('/:id/perfil', async (req, res) => {
  const { id } = req.params;
  const {
    nombre,
    telefono,
    documento,
    passwordActual,
    nuevoPassword,
    usuarioId,
    usuario_id,
    user_id,
    tenantId,
    tenant_id,
  } = req.body || {};

  const requesterId = usuarioId || usuario_id || user_id || null;
  if (!requesterId || requesterId !== id) {
    return res.status(403).json({ error: 'No puedes modificar este perfil' });
  }

  const nombreNormalizado = typeof nombre === 'string' ? nombre.trim() : '';
  const documentoNormalizado = typeof documento === 'string'
    ? documento.trim()
    : null;

  let telefonoNormalizado;
  if (typeof telefono !== 'undefined') {
    const raw = typeof telefono === 'string' ? telefono.trim() : String(telefono || '').trim();
    const cleaned = raw.replace(/[\s-]/g, '').replace(/[^+\d]/g, '');
    if (cleaned && cleaned.length > 12) {
      return res.status(400).json({ error: 'El teléfono debe tener como máximo 12 caracteres' });
    }
    telefonoNormalizado = cleaned || null;
  }

  if (nuevoPassword && String(nuevoPassword).length < 8) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
  }

  const transaction = await db.sequelize.transaction();

  try {
    const usuario = await Usuario.findByPk(id, { transaction });
    if (!usuario) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const membership = await TenantUsuario.findOne({
      where: { usuario_id: id, rol: 'huesped' },
      attributes: ['tenant_id'],
      transaction,
    });

    if (!membership) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Solo los huéspedes pueden actualizar este perfil' });
    }

    const requestedTenant = tenantId || tenant_id || null;
    if (requestedTenant && requestedTenant !== membership.tenant_id) {
      await transaction.rollback();
      return res.status(403).json({ error: 'No puedes modificar datos de otro hotel' });
    }

    const updatesUsuario = {};

    if (nombreNormalizado) {
      updatesUsuario.nombre = nombreNormalizado;
    }

    if (nuevoPassword) {
      if (!passwordActual || !String(passwordActual).trim()) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Debes indicar tu contraseña actual para cambiarla' });
      }

      const passwordMatch = await bcrypt.compare(String(passwordActual), usuario.password_hash);
      if (!passwordMatch) {
        await transaction.rollback();
        return res.status(400).json({ error: 'La contraseña actual no es correcta' });
      }

      updatesUsuario.password_hash = await bcrypt.hash(String(nuevoPassword), 10);
    }

    if (Object.keys(updatesUsuario).length > 0) {
      await usuario.update(updatesUsuario, { transaction });
    }

    let huesped = await Huesped.findByPk(id, { transaction });

    const updatesHuesped = {};
    if (typeof telefonoNormalizado !== 'undefined') {
      updatesHuesped.telefono = telefonoNormalizado;
    }
    if (documentoNormalizado !== null) {
      updatesHuesped.documento = documentoNormalizado || null;
    }
    if (nombreNormalizado) {
      updatesHuesped.nombre_completo = nombreNormalizado;
    }

    if (!huesped) {
      huesped = await Huesped.create({
        huesped_id: id,
        tenant_id: membership.tenant_id,
        sucursal_id: null,
        nombre_completo: nombreNormalizado || usuario.nombre || usuario.email,
        email: usuario.email,
        telefono: typeof telefonoNormalizado === 'undefined' ? null : telefonoNormalizado,
        documento: documentoNormalizado || null,
        created_at: new Date(),
      }, { transaction });
    } else if (Object.keys(updatesHuesped).length > 0) {
      await huesped.update(updatesHuesped, { transaction });
    }

    await transaction.commit();

    await huesped.reload({ transaction: null });
    await usuario.reload({ transaction: null, attributes: ['usuario_id', 'email', 'nombre'] });

    res.json({
      message: 'Perfil actualizado correctamente',
      usuario: {
        usuario_id: usuario.usuario_id,
        email: usuario.email,
        nombre: usuario.nombre,
      },
      huesped: {
        huesped_id: huesped.huesped_id,
        tenant_id: huesped.tenant_id,
        nombre_completo: huesped.nombre_completo,
        telefono: huesped.telefono,
        documento: huesped.documento,
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al actualizar perfil de huésped:', error);
    res.status(500).json({ error: 'Error al actualizar el perfil' });
  }
});

export default router;
