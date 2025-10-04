import express from "express";
import bcrypt from "bcrypt";
import { TenantUsuario, Usuario, Tenant, Hotel } from "../models/index.js";
import { Op } from "sequelize";
import db from "../models/index.js";

const router = express.Router();
const BCRYPT_ROUNDS = Number.parseInt(process.env.BCRYPT_ROUNDS || "10", 10);

async function fetchGerenteByIds({ tenantId, usuarioId }) {
  const tenantUsuario = await TenantUsuario.findOne({
    where: {
      tenant_id: tenantId,
      usuario_id: usuarioId,
      rol: 'gerente'
    },
    include: [
      {
        model: Usuario,
        as: 'usuario',
        attributes: ['nombre', 'email', 'created_at']
      },
      {
        model: Tenant,
        as: 'tenant',
        attributes: ['nombre']
      }
    ]
  });

  if (!tenantUsuario) return null;

  const hotel = await Hotel.findOne({
    where: { tenant_id: tenantId },
    attributes: ['hotel_id', 'nombre']
  });

  const plain = tenantUsuario.get({ plain: true });

  return {
    tenant_id: plain.tenant_id,
    usuario_id: plain.usuario_id,
    nombre: plain.usuario?.nombre,
    email: plain.usuario?.email,
    created_at: plain.usuario?.created_at,
    tenant_nombre: plain.tenant?.nombre,
    hotel_id: hotel?.hotel_id || null,
    hotel_nombre: hotel?.nombre || null
  };
}

router.get("/", async (req, res) => {
  const { tenantId, hotelId } = req.query;
  const where = { rol: 'gerente' };

  if (tenantId) {
    where.tenant_id = tenantId;
  }

  try {
    const gerentes = await TenantUsuario.findAll({
      where,
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['nombre', 'email', 'created_at']
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['nombre'],
          include: hotelId ? [
            {
              model: Hotel,
              as: 'hoteles',
              where: { hotel_id: hotelId },
              required: true,
              attributes: ['hotel_id', 'nombre']
            }
          ] : [
            {
              model: Hotel,
              as: 'hoteles',
              required: false,
              attributes: ['hotel_id', 'nombre']
            }
          ]
        }
      ],
      order: [[{ model: Usuario, as: 'usuario' }, 'created_at', 'DESC']]
    });

    const formatted = gerentes.map(g => {
      const plain = g.get({ plain: true });
      const hotel = plain.tenant?.hoteles?.[0] || null;

      return {
        tenant_id: plain.tenant_id,
        usuario_id: plain.usuario_id,
        nombre: plain.usuario?.nombre,
        email: plain.usuario?.email,
        created_at: plain.usuario?.created_at,
        tenant_nombre: plain.tenant?.nombre,
        hotel_id: hotel?.hotel_id || null,
        hotel_nombre: hotel?.nombre || null
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error("Error al obtener gerentes:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { hotelId, nombre, email, password } = req.body;

  if (!hotelId) {
    return res.status(400).json({ error: "Debe indicar el hotel" });
  }

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "El nombre es obligatorio" });
  }

  if (!email || !email.trim()) {
    return res.status(400).json({ error: "El email es obligatorio" });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
  }

  const t = await db.sequelize.transaction();

  try {
    const hotel = await Hotel.findByPk(hotelId, { transaction: t });

    if (!hotel) {
      await t.rollback();
      return res.status(404).json({ error: "Hotel no encontrado" });
    }

    const existingGerente = await TenantUsuario.findOne({
      where: { tenant_id: hotel.tenant_id, rol: 'gerente' },
      transaction: t
    });

    if (existingGerente) {
      await t.rollback();
      return res.status(409).json({ error: "El hotel ya tiene un gerente asignado" });
    }

    const emailLower = email.trim().toLowerCase();

    const emailExists = await Usuario.findOne({
      where: db.sequelize.where(
        db.sequelize.fn('LOWER', db.sequelize.col('email')),
        emailLower
      ),
      transaction: t
    });

    if (emailExists) {
      await t.rollback();
      return res.status(409).json({ error: "Ya existe un usuario con ese email" });
    }

    const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const newUsuario = await Usuario.create(
      { nombre: nombre.trim(), email: emailLower, password_hash: passwordHash },
      { transaction: t }
    );

    await TenantUsuario.create(
      { tenant_id: hotel.tenant_id, usuario_id: newUsuario.usuario_id, rol: 'gerente' },
      { transaction: t }
    );

    await t.commit();

    const gerente = await fetchGerenteByIds({ tenantId: hotel.tenant_id, usuarioId: newUsuario.usuario_id });
    res.status(201).json(gerente);
  } catch (err) {
    await t.rollback();
    console.error("Error al crear gerente:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const { id: usuarioId } = req.params;
  const { hotelId, nombre, email, password } = req.body;

  const t = await db.sequelize.transaction();

  try {
    const currentGerente = await TenantUsuario.findOne({
      where: { usuario_id: usuarioId, rol: 'gerente' },
      transaction: t
    });

    if (!currentGerente) {
      await t.rollback();
      return res.status(404).json({ error: "Gerente no encontrado" });
    }

    let targetTenantId = currentGerente.tenant_id;
    let targetHotelId = null;

    if (hotelId) {
      const hotel = await Hotel.findByPk(hotelId, { transaction: t });

      if (!hotel) {
        await t.rollback();
        return res.status(404).json({ error: "Hotel no encontrado" });
      }

      const existingGerente = await TenantUsuario.findOne({
        where: {
          tenant_id: hotel.tenant_id,
          rol: 'gerente',
          usuario_id: { [Op.ne]: usuarioId }
        },
        transaction: t
      });

      if (existingGerente) {
        await t.rollback();
        return res.status(409).json({ error: "El hotel seleccionado ya tiene un gerente" });
      }

      if (hotel.tenant_id !== targetTenantId) {
        await TenantUsuario.destroy({
          where: { tenant_id: targetTenantId, usuario_id: usuarioId, rol: 'gerente' },
          transaction: t
        });

        await TenantUsuario.findOrCreate({
          where: { tenant_id: hotel.tenant_id, usuario_id: usuarioId, rol: 'gerente' },
          transaction: t
        });

        targetTenantId = hotel.tenant_id;
      }

      targetHotelId = hotel.hotel_id;
    }

    const usuarioUpdates = {};

    if (nombre !== undefined) {
      usuarioUpdates.nombre = nombre;
    }

    if (email !== undefined) {
      const emailLower = email ? email.trim().toLowerCase() : "";
      if (!emailLower) {
        await t.rollback();
        return res.status(400).json({ error: "El email no puede quedar vacío" });
      }

      const emailExists = await Usuario.findOne({
        where: {
          [Op.and]: [
            db.sequelize.where(
              db.sequelize.fn('LOWER', db.sequelize.col('email')),
              emailLower
            ),
            { usuario_id: { [Op.ne]: usuarioId } }
          ]
        },
        transaction: t
      });

      if (emailExists) {
        await t.rollback();
        return res.status(409).json({ error: "El email ya está en uso" });
      }

      usuarioUpdates.email = emailLower;
    }

    if (password) {
      if (password.length < 6) {
        await t.rollback();
        return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      }
      const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      usuarioUpdates.password_hash = passwordHash;
    }

    if (Object.keys(usuarioUpdates).length > 0) {
      await Usuario.update(usuarioUpdates, {
        where: { usuario_id: usuarioId },
        transaction: t
      });
    }

    await t.commit();

    const gerente = await fetchGerenteByIds({ tenantId: targetTenantId, usuarioId });
    res.json({ ...gerente, hotel_id: targetHotelId || gerente?.hotel_id || null });
  } catch (err) {
    await t.rollback();
    console.error("Error al actualizar gerente:", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id: usuarioId } = req.params;

  const t = await db.sequelize.transaction();

  try {
    const currentGerente = await TenantUsuario.findOne({
      where: { usuario_id: usuarioId, rol: 'gerente' },
      transaction: t
    });

    if (!currentGerente) {
      await t.rollback();
      return res.status(404).json({ error: "Gerente no encontrado" });
    }

    const tenantId = currentGerente.tenant_id;

    await TenantUsuario.destroy({
      where: { tenant_id: tenantId, usuario_id: usuarioId, rol: 'gerente' },
      transaction: t
    });

    const remainingRoles = await TenantUsuario.count({
      where: { usuario_id: usuarioId },
      transaction: t
    });

    if (remainingRoles === 0) {
      await Usuario.destroy({
        where: { usuario_id: usuarioId },
        transaction: t
      });
    }

    await t.commit();

    res.json({ message: "Gerente eliminado" });
  } catch (err) {
    await t.rollback();
    console.error("Error al eliminar gerente:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

