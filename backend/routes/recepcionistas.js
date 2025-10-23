import express from "express";
import bcrypt from "bcrypt";
import { RecepcionistaSucursal, Usuario, Sucursal, Hotel, Tenant, TenantUsuario } from "../models/index.js";
import { Op } from "sequelize";
import db from "../models/index.js";

const router = express.Router();

const BCRYPT_ROUNDS = Number.parseInt(process.env.BCRYPT_ROUNDS || "10", 10);

async function fetchRecepcionistaById(id) {
  const recepcionista = await RecepcionistaSucursal.findByPk(id, {
    include: [
      {
        model: Usuario,
        as: 'usuario',
        attributes: ['nombre', 'email']
      },
      {
        model: Sucursal,
        as: 'sucursal',
        attributes: ['nombre']
      },
      {
        model: Hotel,
        as: 'hotel',
        attributes: ['nombre']
      },
      {
        model: Tenant,
        as: 'tenant',
        attributes: ['nombre']
      }
    ]
  });

  if (!recepcionista) return null;

  const plain = recepcionista.get({ plain: true });
  return {
    recepcionista_sucursal_id: plain.recepcionista_sucursal_id,
    usuario_id: plain.usuario_id,
    sucursal_id: plain.sucursal_id,
    hotel_id: plain.hotel_id,
    tenant_id: plain.tenant_id,
    telefono: plain.telefono,
    activo: plain.activo,
    created_at: plain.created_at,
    nombre: plain.usuario?.nombre,
    email: plain.usuario?.email,
    hotel_nombre: plain.hotel?.nombre,
    sucursal_nombre: plain.sucursal?.nombre,
    tenant_nombre: plain.tenant?.nombre
  };
}

async function ensureTenantPermission({ usuarioId }, tenantId, allowedRoles = ["admin", "gerente"]) {
  if (!usuarioId) {
    return null;
  }

  const membership = await TenantUsuario.findOne({
    where: {
      usuario_id: usuarioId,
      tenant_id: tenantId
    },
    attributes: ['rol']
  });

  if (!membership) {
    const err = new Error("No autorizado para gestionar recepcionistas en este hotel");
    err.status = 403;
    throw err;
  }

  const rol = membership.rol;
  if (!allowedRoles.includes(rol)) {
    const err = new Error("El rol no tiene permisos suficientes");
    err.status = 403;
    throw err;
  }

  return rol;
}

router.get("/", async (req, res) => {
  const { hotelId, tenantId, sucursalId } = req.query;
  const where = {};

  if (hotelId) {
    where.hotel_id = hotelId;
  }

  if (tenantId) {
    where.tenant_id = tenantId;
  }

  if (sucursalId) {
    where.sucursal_id = sucursalId;
  }

  try {
    const recepcionistas = await RecepcionistaSucursal.findAll({
      where,
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['nombre', 'email']
        },
        {
          model: Sucursal,
          as: 'sucursal',
          attributes: ['nombre']
        },
        {
          model: Hotel,
          as: 'hotel',
          attributes: ['nombre']
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['nombre']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const formatted = recepcionistas.map(r => {
      const plain = r.get({ plain: true });
      return {
        recepcionista_sucursal_id: plain.recepcionista_sucursal_id,
        usuario_id: plain.usuario_id,
        sucursal_id: plain.sucursal_id,
        hotel_id: plain.hotel_id,
        tenant_id: plain.tenant_id,
        telefono: plain.telefono,
        activo: plain.activo,
        created_at: plain.created_at,
        nombre: plain.usuario?.nombre,
        email: plain.usuario?.email,
        hotel_nombre: plain.hotel?.nombre,
        sucursal_nombre: plain.sucursal?.nombre,
        tenant_nombre: plain.tenant?.nombre
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error("Error al obtener recepcionistas:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const recepcionista = await fetchRecepcionistaById(id);
    if (!recepcionista) {
      return res.status(404).json({ error: "Recepcionista no encontrado" });
    }
    res.json(recepcionista);
  } catch (err) {
    console.error("Error al obtener recepcionista:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const {
    sucursal_id: sucursalIdSnake,
    sucursalId: sucursalIdCamel,
    nombre,
    email,
    telefono,
    password,
  } = req.body;

  const sucursalId = sucursalIdCamel || sucursalIdSnake;
  const emailNormalizado = email ? email.trim().toLowerCase() : "";

  if (!sucursalId) {
    return res.status(400).json({ error: "Debe indicar la sucursal" });
  }

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "El nombre es obligatorio" });
  }

  if (!emailNormalizado) {
    return res.status(400).json({ error: "El email es obligatorio" });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
  }

  const transaction = await db.sequelize.transaction();

  try {
    const sucursal = await Sucursal.findByPk(sucursalId, {
      attributes: ['sucursal_id', 'tenant_id', 'hotel_id'],
      transaction
    });

    if (!sucursal) {
      await transaction.rollback();
      return res.status(404).json({ error: "Sucursal no encontrada" });
    }

    try {
      await ensureTenantPermission(
        {
          usuarioId: req.body.usuarioId || req.body.usuario_id || null,
        },
        sucursal.tenant_id
      );
    } catch (err) {
      await transaction.rollback();
      return res.status(err.status || 500).json({ error: err.message });
    }

    const existingEmail = await Usuario.findOne({
      where: {
        email: db.sequelize.where(
          db.sequelize.fn('LOWER', db.sequelize.col('email')),
          emailNormalizado
        )
      },
      transaction
    });

    if (existingEmail) {
      await transaction.rollback();
      return res.status(409).json({ error: "El email ya está registrado" });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const nuevoUsuario = await Usuario.create({
      email: emailNormalizado,
      password_hash: passwordHash,
      nombre: nombre.trim()
    }, { transaction });

    const usuarioId = nuevoUsuario.usuario_id;

    await TenantUsuario.create({
      tenant_id: sucursal.tenant_id,
      usuario_id: usuarioId,
      rol: 'recepcionista'
    }, { 
      transaction,
      ignoreDuplicates: true 
    });

    const nuevoRecepcionista = await RecepcionistaSucursal.create({
      tenant_id: sucursal.tenant_id,
      hotel_id: sucursal.hotel_id,
      sucursal_id: sucursal.sucursal_id,
      usuario_id: usuarioId,
      telefono: telefono || null,
      activo: true
    }, { transaction });

    await transaction.commit();

    const created = await fetchRecepcionistaById(nuevoRecepcionista.recepcionista_sucursal_id);
    res.status(201).json(created);
  } catch (err) {
    await transaction.rollback();
    console.error("Error al crear recepcionista:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    sucursal_id: sucursalIdSnake,
    sucursalId: sucursalIdCamel,
    nombre,
    email,
    telefono,
    password,
    activo,
  } = req.body;

  const transaction = await db.sequelize.transaction();

  try {
    const current = await RecepcionistaSucursal.findByPk(id, {
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['email', 'nombre']
        }
      ],
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!current) {
      await transaction.rollback();
      return res.status(404).json({ error: "Recepcionista no encontrado" });
    }

    const currentPlain = current.get({ plain: true });

    try {
      await ensureTenantPermission(
        {
          usuarioId: req.body.usuarioId || req.body.usuario_id || null,
        },
        currentPlain.tenant_id
      );
    } catch (err) {
      await transaction.rollback();
      return res.status(err.status || 500).json({ error: err.message });
    }

    const userUpdates = {};

    if (nombre !== undefined) {
      userUpdates.nombre = nombre;
    }

    if (email !== undefined) {
      const emailNormalizado = email ? email.trim().toLowerCase() : "";
      if (!emailNormalizado) {
        await transaction.rollback();
        return res.status(400).json({ error: "El email no puede quedar vacío" });
      }

      if (emailNormalizado !== currentPlain.usuario.email.toLowerCase()) {
        const emailExists = await Usuario.findOne({
          where: {
            email: db.sequelize.where(
              db.sequelize.fn('LOWER', db.sequelize.col('email')),
              emailNormalizado
            ),
            usuario_id: { [Op.ne]: currentPlain.usuario_id }
          },
          transaction
        });

        if (emailExists) {
          await transaction.rollback();
          return res.status(409).json({ error: "El email ya está registrado" });
        }

        userUpdates.email = emailNormalizado;
      }
    }

    if (password) {
      if (password.length < 6) {
        await transaction.rollback();
        return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      }
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      userUpdates.password_hash = passwordHash;
    }

    if (Object.keys(userUpdates).length > 0) {
      await Usuario.update(
        userUpdates,
        {
          where: { usuario_id: currentPlain.usuario_id },
          transaction
        }
      );
    }

    const mappingUpdates = {};

    if (telefono !== undefined) {
      mappingUpdates.telefono = telefono;
    }

    if (activo !== undefined) {
      mappingUpdates.activo = Boolean(activo);
    }

    const providedSucursalId = sucursalIdCamel || sucursalIdSnake;
    let targetTenantId = currentPlain.tenant_id;
    let targetHotelId = currentPlain.hotel_id;
    let targetSucursalId = currentPlain.sucursal_id;

    if (providedSucursalId && providedSucursalId !== currentPlain.sucursal_id) {
      const sucursal = await Sucursal.findByPk(providedSucursalId, {
        attributes: ['sucursal_id', 'tenant_id', 'hotel_id'],
        transaction
      });

      if (!sucursal) {
        await transaction.rollback();
        return res.status(404).json({ error: "Sucursal no encontrada" });
      }

      try {
        await ensureTenantPermission(
          {
            usuarioId: req.body.usuarioId || req.body.usuario_id || null,
          },
          sucursal.tenant_id
        );
      } catch (err) {
        await transaction.rollback();
        return res.status(err.status || 500).json({ error: err.message });
      }

      targetSucursalId = sucursal.sucursal_id;
      targetTenantId = sucursal.tenant_id;
      targetHotelId = sucursal.hotel_id;

      mappingUpdates.sucursal_id = targetSucursalId;
      mappingUpdates.tenant_id = targetTenantId;
      mappingUpdates.hotel_id = targetHotelId;
    }

    if (Object.keys(mappingUpdates).length > 0) {
      await current.update(mappingUpdates, { transaction });
    }

    if (providedSucursalId && providedSucursalId !== currentPlain.sucursal_id) {
      await TenantUsuario.destroy({
        where: {
          tenant_id: currentPlain.tenant_id,
          usuario_id: currentPlain.usuario_id,
          rol: 'recepcionista'
        },
        transaction
      });

      await TenantUsuario.create({
        tenant_id: targetTenantId,
        usuario_id: currentPlain.usuario_id,
        rol: 'recepcionista'
      }, { 
        transaction,
        ignoreDuplicates: true 
      });
    }

    await transaction.commit();

    const updated = await fetchRecepcionistaById(id);
    res.json(updated);
  } catch (err) {
    await transaction.rollback();
    console.error("Error al actualizar recepcionista:", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const transaction = await db.sequelize.transaction();

  try {
    const current = await RecepcionistaSucursal.findOne({
      where: { recepcionista_sucursal_id: id, activo: true },
      attributes: ['recepcionista_sucursal_id', 'usuario_id', 'tenant_id'],
      transaction
    });

    if (!current) {
      await transaction.rollback();
      return res.status(404).json({ error: "Recepcionista no encontrado" });
    }

    try {
      await ensureTenantPermission(
        {
          usuarioId: req.body?.usuarioId || req.body?.usuario_id || null,
        },
        current.tenant_id
      );
    } catch (err) {
      await transaction.rollback();
      return res.status(err.status || 500).json({ error: err.message });
    }

    // Soft delete de recepcionista_sucursal
    await current.update({ activo: false }, { transaction });

    // Eliminar la relación tenant_usuario
    await TenantUsuario.destroy({
      where: {
        tenant_id: current.tenant_id,
        usuario_id: current.usuario_id,
        rol: 'recepcionista'
      },
      transaction
    });

    const membershipsCount = await TenantUsuario.count({
      where: { usuario_id: current.usuario_id },
      transaction
    });

    if (membershipsCount === 0) {
      await Usuario.destroy({
        where: { usuario_id: current.usuario_id },
        transaction
      });
    }

    await transaction.commit();

    res.json({ message: "Recepcionista eliminado" });
  } catch (err) {
    await transaction.rollback();
    console.error("Error al eliminar recepcionista:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
