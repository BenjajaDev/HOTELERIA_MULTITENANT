import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export default function GestionGerentes({ hoteles = [] }) {
  const [gerentes, setGerentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    hotelId: "",
    nombre: "",
    email: "",
    password: "",
  });
  const [createMsg, setCreateMsg] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    hotelId: "",
    nombre: "",
    email: "",
    password: "",
  });
  const [editMsg, setEditMsg] = useState("");

  const hotelOptions = useMemo(() => Array.isArray(hoteles) ? hoteles : [], [hoteles]);

  const loadGerentes = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.getGerentes();
      setGerentes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al cargar gerentes:", err);
      setError(err.error || "Error al cargar gerentes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGerentes();
  }, []);

  useEffect(() => {
    if (!form.hotelId && hotelOptions.length > 0) {
      setForm(prev => ({ ...prev, hotelId: hotelOptions[0].hotel_id }));
    }
  }, [hotelOptions, form.hotelId]);

  const resetForm = () => {
    setForm({
      hotelId: hotelOptions[0]?.hotel_id || "",
      nombre: "",
      email: "",
      password: "",
    });
    setCreateMsg("");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.hotelId) {
      setCreateMsg("Selecciona un hotel");
      return;
    }
    if (!form.nombre.trim()) {
      setCreateMsg("El nombre es obligatorio");
      return;
    }
    if (!form.email.trim()) {
      setCreateMsg("El email es obligatorio");
      return;
    }
    if (!form.password || form.password.length < 6) {
      setCreateMsg("Contraseña mínima 6 caracteres");
      return;
    }

    setCreateMsg("Creando...");
    try {
      const created = await api.createGerente({
        hotelId: form.hotelId,
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      setGerentes(prev => [created, ...prev]);
      setCreateMsg("Gerente creado ✅");
      resetForm();
    } catch (err) {
      console.error("Error al crear gerente:", err);
      setCreateMsg(err.error || "No se pudo crear");
    }
  };

  const startEdit = (gerente) => {
    setEditingId(gerente.usuario_id);
    setEditForm({
      hotelId: gerente.hotel_id || hotelOptions[0]?.hotel_id || "",
      nombre: gerente.nombre || "",
      email: gerente.email || "",
      password: "",
    });
    setEditMsg("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      hotelId: "",
      nombre: "",
      email: "",
      password: "",
    });
    setEditMsg("");
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    if (!editForm.email.trim()) {
      setEditMsg("El email es obligatorio");
      return;
    }

    setEditMsg("Guardando...");
    try {
      const payload = {
        hotelId: editForm.hotelId,
        nombre: editForm.nombre,
        email: editForm.email.trim(),
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }

      const updated = await api.updateGerente(editingId, payload);

      setGerentes(prev => prev.map(g => (
        g.usuario_id === editingId ? { ...g, ...updated } : g
      )));

      setEditMsg("Cambios guardados ✅");
      setTimeout(() => cancelEdit(), 1200);
    } catch (err) {
      console.error("Error al actualizar gerente:", err);
      setEditMsg(err.error || "No se pudo actualizar");
    }
  };

  const handleDelete = async (gerente) => {
    if (!window.confirm(`¿Eliminar a ${gerente.nombre || gerente.email}?`)) return;
    try {
      await api.deleteGerente(gerente.usuario_id);
      setGerentes(prev => prev.filter(g => g.usuario_id !== gerente.usuario_id));
    } catch (err) {
      console.error("Error al eliminar gerente:", err);
      alert(err.error || "No se pudo eliminar");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        <p className="mt-2">Cargando gerentes...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Gestión de Gerentes</h4>
        <button className="btn btn-outline-secondary" onClick={loadGerentes}>
          Refrescar
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card p-3">
            <h5 className="mb-3">Asignar nuevo gerente</h5>
            <form onSubmit={handleCreate}>
              <label className="form-label">Hotel</label>
              <select
                className="form-select mb-2"
                value={form.hotelId}
                onChange={e => setForm(prev => ({ ...prev, hotelId: e.target.value }))}
                required
              >
                <option value="">Selecciona hotel</option>
                {hotelOptions.map(h => (
                  <option key={h.hotel_id} value={h.hotel_id}>
                    {h.nombre}
                  </option>
                ))}
              </select>

              <input
                className="form-control mb-2"
                placeholder="Nombre"
                value={form.nombre}
                onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                required
              />
              <input
                className="form-control mb-2"
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                required
              />
              <input
                className="form-control mb-2"
                placeholder="Contraseña"
                type="password"
                value={form.password}
                onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                required
              />
              <button className="btn btn-primary w-100" type="submit">Crear gerente</button>
            </form>
            {createMsg && <div className="small text-muted mt-2">{createMsg}</div>}
          </div>
        </div>

        <div className="col-lg-8">
          {gerentes.length === 0 ? (
            <div className="text-muted">No hay gerentes asignados.</div>
          ) : (
            <div className="list-group">
              {gerentes.map(gerente => (
                <div key={`${gerente.tenant_id}-${gerente.usuario_id}`} className="list-group-item">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <strong>{gerente.nombre || gerente.email}</strong>
                      <div className="small text-muted">Email: {gerente.email}</div>
                      <div className="small text-muted">Hotel: {gerente.hotel_nombre || "Sin hotel"}</div>
                      <div className="small text-muted">Tenant: {gerente.tenant_nombre}</div>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => startEdit(gerente)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(gerente)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  {editingId === gerente.usuario_id && (
                    <div className="mt-3 border-top pt-3">
                      <h6>Editar gerente</h6>
                      <form onSubmit={handleUpdate}>
                        <label className="form-label">Hotel</label>
                        <select
                          className="form-select mb-2"
                          value={editForm.hotelId}
                          onChange={e => setEditForm(prev => ({ ...prev, hotelId: e.target.value }))}
                          required
                        >
                          {hotelOptions.map(h => (
                            <option key={h.hotel_id} value={h.hotel_id}>
                              {h.nombre}
                            </option>
                          ))}
                        </select>

                        <input
                          className="form-control mb-2"
                          placeholder="Nombre"
                          value={editForm.nombre}
                          onChange={e => setEditForm(prev => ({ ...prev, nombre: e.target.value }))}
                        />
                        <input
                          className="form-control mb-2"
                          type="email"
                          placeholder="Email"
                          value={editForm.email}
                          onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                          required
                        />
                        <input
                          className="form-control mb-2"
                          type="password"
                          placeholder="Nueva contraseña (opcional)"
                          value={editForm.password}
                          onChange={e => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                        />
                        <div className="d-flex gap-2">
                          <button className="btn btn-primary" type="submit">Guardar</button>
                          <button className="btn btn-outline-secondary" type="button" onClick={cancelEdit}>
                            Cancelar
                          </button>
                        </div>
                      </form>
                      {editMsg && <div className="small text-muted mt-2">{editMsg}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

