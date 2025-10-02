import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export default function GestionRecepcionistas({ hoteles = [], restrictHotelId = "", userContext = {} }) {
  const [sucursales, setSucursales] = useState([]);
  const [recepcionistas, setRecepcionistas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ hotelId: restrictHotelId || "", sucursalId: "" });
  const [formHotelId, setFormHotelId] = useState(restrictHotelId || "");
  const [form, setForm] = useState({
    sucursalId: "",
    nombre: "",
    email: "",
    telefono: "",
    password: "",
  });
  const [createMsg, setCreateMsg] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    sucursalId: "",
    nombre: "",
    email: "",
    telefono: "",
    password: "",
    activo: true,
  });
  const [editMsg, setEditMsg] = useState("");

  const hotelOptions = useMemo(() => {
    if (!Array.isArray(hoteles)) return [];
    if (restrictHotelId) {
      return hoteles.filter(h => h.hotel_id === restrictHotelId);
    }
    return hoteles;
  }, [hoteles, restrictHotelId]);

  const contextPayload = useMemo(() => {
    const payload = {};
    if (userContext?.usuarioId) payload.usuarioId = userContext.usuarioId;
    if (userContext?.usuario_id) payload.usuario_id = userContext.usuario_id;
    if (userContext?.tenantId) payload.tenantId = userContext.tenantId;
    if (userContext?.tenant_id) payload.tenant_id = userContext.tenant_id;
    if (userContext?.hotelId) payload.hotelId = userContext.hotelId;
    if (userContext?.hotel_id) payload.hotel_id = userContext.hotel_id;
    return payload;
  }, [userContext]);

  const isRestricted = Boolean(restrictHotelId);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError("");
      const sucursalParams = restrictHotelId ? { hotelId: restrictHotelId } : {};
      const recepcionistaParams = {};
      if (restrictHotelId) recepcionistaParams.hotelId = restrictHotelId;
      if (userContext?.tenantId || userContext?.tenant_id) {
        recepcionistaParams.tenantId = userContext.tenantId || userContext.tenant_id;
      }

      const [sucursalData, recepcionistaData] = await Promise.all([
        api.getSucursales(sucursalParams),
        api.getRecepcionistas(recepcionistaParams),
      ]);
      setSucursales(sucursalData);
      setRecepcionistas(recepcionistaData);
    } catch (err) {
      console.error("Error al cargar recepcionistas:", err);
      setError(err.error || "Error al cargar recepcionistas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!formHotelId && hotelOptions.length > 0) {
      setFormHotelId(hotelOptions[0].hotel_id);
    }
  }, [hotelOptions, formHotelId]);

  useEffect(() => {
    if (restrictHotelId) {
      setForm(prev => ({ ...prev, sucursalId: "" }));
    }
  }, [restrictHotelId]);

  useEffect(() => {
    setFilters(prev => {
      if (!prev.hotelId) return prev;
      const disponibles = sucursales.filter(s => s.hotel_id === prev.hotelId);
      if (disponibles.length === 0) {
        if (!prev.sucursalId) return prev;
        return { ...prev, sucursalId: "" };
      }
      if (prev.sucursalId && disponibles.some(s => s.sucursal_id === prev.sucursalId)) {
        return prev;
      }
      return { ...prev, sucursalId: disponibles[0].sucursal_id };
    });
  }, [sucursales]);

  useEffect(() => {
    const disponibles = sucursales.filter(s => !formHotelId || s.hotel_id === formHotelId);
    setForm(prev => {
      if (disponibles.length === 0) {
        if (prev.sucursalId === "") return prev;
        return { ...prev, sucursalId: "" };
      }
      if (prev.sucursalId && disponibles.some(s => s.sucursal_id === prev.sucursalId)) {
        return prev;
      }
      return { ...prev, sucursalId: disponibles[0].sucursal_id };
    });
  }, [formHotelId, sucursales]);

  useEffect(() => {
    if (restrictHotelId) {
      setFilters(prev => ({ hotelId: restrictHotelId, sucursalId: prev.sucursalId }));
    }
  }, [restrictHotelId]);

  const sucursalesParaFormulario = useMemo(() => {
    return sucursales.filter(s => !formHotelId || s.hotel_id === formHotelId);
  }, [sucursales, formHotelId]);

  const sucursalesParaFiltro = useMemo(() => {
    if (!filters.hotelId) return sucursales;
    return sucursales.filter(s => s.hotel_id === filters.hotelId);
  }, [sucursales, filters.hotelId]);

  const filteredRecepcionistas = useMemo(() => {
    return recepcionistas.filter(r => {
      if (filters.hotelId && r.hotel_id !== filters.hotelId) return false;
      if (filters.sucursalId && r.sucursal_id !== filters.sucursalId) return false;
      return true;
    });
  }, [recepcionistas, filters]);

  const resetForm = () => {
    setForm(prev => ({
      sucursalId: sucursalesParaFormulario[0]?.sucursal_id || "",
      nombre: "",
      email: "",
      telefono: "",
      password: "",
    }));
    setCreateMsg("");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.sucursalId) {
      setCreateMsg("Selecciona una sucursal disponible");
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
      setCreateMsg("La contraseña debe tener 6+ caracteres");
      return;
    }

    setCreateMsg("Creando...");
    try {
      const payload = {
        sucursalId: form.sucursalId,
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        telefono: form.telefono || undefined,
        password: form.password,
        ...contextPayload,
      };
      const created = await api.createRecepcionista(payload);
      setRecepcionistas(prev => [created, ...prev]);
      setSucursales(prev => prev.map(s => {
        if (s.sucursal_id === created.sucursal_id) {
          const total = Number(s.total_recepcionistas || 0) + 1;
          return { ...s, total_recepcionistas: total };
        }
        return s;
      }));
      setCreateMsg("Recepcionista creado ✅");
      resetForm();
    } catch (err) {
      console.error("Error al crear recepcionista:", err);
      setCreateMsg(err.error || "No se pudo crear");
    }
  };

  const startEdit = (recepcionista) => {
    setEditingId(recepcionista.recepcionista_sucursal_id);
    setEditForm({
      sucursalId: recepcionista.sucursal_id,
      nombre: recepcionista.nombre || "",
      email: recepcionista.email || "",
      telefono: recepcionista.telefono || "",
      password: "",
      activo: recepcionista.activo,
    });
    setEditMsg("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      sucursalId: "",
      nombre: "",
      email: "",
      telefono: "",
      password: "",
      activo: true,
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
        sucursalId: editForm.sucursalId,
        nombre: editForm.nombre?.trim() || "",
        email: editForm.email.trim(),
        telefono: editForm.telefono || undefined,
        activo: editForm.activo,
        ...contextPayload,
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }

      const anterior = recepcionistas.find(r => r.recepcionista_sucursal_id === editingId);
      const updated = await api.updateRecepcionista(editingId, payload);

      setRecepcionistas(prev => prev.map(r => (
        r.recepcionista_sucursal_id === editingId ? updated : r
      )));

      if (anterior) {
        if (anterior.sucursal_id !== updated.sucursal_id) {
          setSucursales(prev => prev.map(s => {
            if (s.sucursal_id === anterior.sucursal_id) {
              const total = Math.max(0, Number(s.total_recepcionistas || 0) - 1);
              return { ...s, total_recepcionistas: total };
            }
            if (s.sucursal_id === updated.sucursal_id) {
              const total = Number(s.total_recepcionistas || 0) + 1;
              return { ...s, total_recepcionistas: total };
            }
            return s;
          }));
        }
      }

      setEditMsg("Cambios guardados ✅");
      setTimeout(() => cancelEdit(), 1200);
    } catch (err) {
      console.error("Error al actualizar recepcionista:", err);
      setEditMsg(err.error || "No se pudo actualizar");
    }
  };

  const handleDelete = async (recepcionista) => {
    if (!confirm(`¿Eliminar al recepcionista "${recepcionista.nombre}"?`)) return;
    try {
      await api.deleteRecepcionista(recepcionista.recepcionista_sucursal_id, contextPayload);
      setRecepcionistas(prev => prev.filter(r => r.recepcionista_sucursal_id !== recepcionista.recepcionista_sucursal_id));
      setSucursales(prev => prev.map(s => {
        if (s.sucursal_id === recepcionista.sucursal_id) {
          const total = Math.max(0, Number(s.total_recepcionistas || 0) - 1);
          return { ...s, total_recepcionistas: total };
        }
        return s;
      }));
    } catch (err) {
      console.error("Error al eliminar recepcionista:", err);
      alert(err.error || "No se pudo eliminar");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        <p className="mt-2">Cargando recepcionistas...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Gestión de Recepcionistas</h4>
        <button className="btn btn-outline-secondary" onClick={loadInitialData}>
          Refrescar
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card p-3">
            <h5 className="mb-3">Crear recepcionista</h5>
            <form onSubmit={handleCreate}>
              <label className="form-label">Hotel</label>
              <select
                className="form-select mb-2"
                value={formHotelId}
                onChange={e => setFormHotelId(e.target.value)}
                disabled={isRestricted}
              >
                {hotelOptions.map(h => (
                  <option key={h.hotel_id} value={h.hotel_id}>
                    {h.nombre}
                  </option>
                ))}
              </select>

              <label className="form-label">Sucursal</label>
              <select
                className="form-select mb-2"
                value={form.sucursalId}
                onChange={e => setForm(prev => ({ ...prev, sucursalId: e.target.value }))}
                required
              >
                {sucursalesParaFormulario.length === 0 && (
                  <option value="">Sin sucursales</option>
                )}
                {sucursalesParaFormulario.map(s => (
                  <option key={s.sucursal_id} value={s.sucursal_id}>
                    {s.nombre}
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
                type="email"
                className="form-control mb-2"
                placeholder="Email"
                value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                required
              />
              <input
                className="form-control mb-2"
                placeholder="Teléfono"
                value={form.telefono}
                onChange={e => setForm(prev => ({ ...prev, telefono: e.target.value }))}
              />
              <input
                type="password"
                className="form-control mb-2"
                placeholder="Contraseña"
                value={form.password}
                onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                required
              />
              <button className="btn btn-primary w-100" type="submit" disabled={!form.sucursalId}>
                Crear recepcionista
              </button>
            </form>
            {createMsg && <div className="small text-muted mt-2">{createMsg}</div>}
          </div>
        </div>

        <div className="col-lg-8">
          <div className="row g-3 mb-3">
            {!isRestricted && (
              <div className="col-md-6">
                <label className="form-label">Filtrar por hotel</label>
                <select
                  className="form-select"
                  value={filters.hotelId}
                  onChange={e => setFilters(prev => ({ hotelId: e.target.value, sucursalId: "" }))}
                >
                  <option value="">Todos los hoteles</option>
                  {hotelOptions.map(h => (
                    <option key={h.hotel_id} value={h.hotel_id}>
                      {h.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className={isRestricted ? "col-12" : "col-md-6"}>
              <label className="form-label">Filtrar por sucursal</label>
              <select
                className="form-select"
                value={filters.sucursalId}
                onChange={e => setFilters(prev => ({ ...prev, sucursalId: e.target.value }))}
                disabled={!isRestricted && filters.hotelId && sucursalesParaFiltro.length === 0}
              >
                <option value="">Todas</option>
                {sucursalesParaFiltro.map(s => (
                  <option key={s.sucursal_id} value={s.sucursal_id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredRecepcionistas.length === 0 ? (
            <div className="text-muted">No hay recepcionistas registrados.</div>
          ) : (
            <div className="list-group">
              {filteredRecepcionistas.map(recepcionista => (
                <div key={recepcionista.recepcionista_sucursal_id} className="list-group-item">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <strong>{recepcionista.nombre || recepcionista.email}</strong>
                      <div className="small text-muted">Email: {recepcionista.email}</div>
                      <div className="small text-muted">Tel: {recepcionista.telefono || "—"}</div>
                      <div className="small text-muted">
                        Hotel: {recepcionista.hotel_nombre} • Sucursal: {recepcionista.sucursal_nombre}
                      </div>
                      <span className={`badge ${recepcionista.activo ? "bg-success" : "bg-secondary"} mt-2`}>
                        {recepcionista.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => startEdit(recepcionista)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(recepcionista)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  {editingId === recepcionista.recepcionista_sucursal_id && (
                    <div className="mt-3 border-top pt-3">
                      <h6 className="mb-3">Editar recepcionista</h6>
                      <form onSubmit={handleUpdate}>
                        <div className="row g-2">
                          <div className="col-md-6">
                            <label className="form-label">Sucursal</label>
                            <select
                              className="form-select"
                              value={editForm.sucursalId}
                              onChange={e => setEditForm(prev => ({ ...prev, sucursalId: e.target.value }))}
                              required
                            >
                              {sucursales.map(s => (
                                <option key={s.sucursal_id} value={s.sucursal_id}>
                                  {s.nombre} ({s.hotel_nombre})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-6 align-self-end">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`activo-${editingId}`}
                                checked={Boolean(editForm.activo)}
                                onChange={e => setEditForm(prev => ({ ...prev, activo: e.target.checked }))}
                              />
                              <label className="form-check-label" htmlFor={`activo-${editingId}`}>
                                Activo
                              </label>
                            </div>
                          </div>
                        </div>

                        <input
                          className="form-control mb-2 mt-2"
                          placeholder="Nombre"
                          value={editForm.nombre}
                          onChange={e => setEditForm(prev => ({ ...prev, nombre: e.target.value }))}
                        />
                        <input
                          type="email"
                          className="form-control mb-2"
                          placeholder="Email"
                          value={editForm.email}
                          onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                          required
                        />
                        <input
                          className="form-control mb-2"
                          placeholder="Teléfono"
                          value={editForm.telefono}
                          onChange={e => setEditForm(prev => ({ ...prev, telefono: e.target.value }))}
                        />
                        <input
                          type="password"
                          className="form-control mb-2"
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
