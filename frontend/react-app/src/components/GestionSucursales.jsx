import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export default function GestionSucursales({ hoteles = [], onHotelRefresh, restrictHotelId = "", userContext = {} }) {
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedHotelFilter, setSelectedHotelFilter] = useState("");
  const [form, setForm] = useState({
    hotelId: "",
    nombre: "",
    direccion: "",
    telefono: "",
    email: "",
  });
  const [creatingMsg, setCreatingMsg] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    hotelId: "",
    nombre: "",
    direccion: "",
    telefono: "",
    email: "",
  });
  const [editMsg, setEditMsg] = useState("");

  const hotelOptions = useMemo(() => {
    const list = Array.isArray(hoteles) ? hoteles : [];
    if (restrictHotelId) {
      return list.filter(h => h.hotel_id === restrictHotelId);
    }
    return list;
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

  const loadSucursales = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.getSucursales();
      setSucursales(data);
    } catch (err) {
      console.error("Error al cargar sucursales:", err);
      setError(err.error || "Error al cargar sucursales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSucursales();
  }, []);

  useEffect(() => {
    if (!form.hotelId && hotelOptions.length > 0) {
      setForm(prev => ({ ...prev, hotelId: hotelOptions[0].hotel_id }));
    }
  }, [hotelOptions, form.hotelId]);

  useEffect(() => {
    if (restrictHotelId) {
      setSelectedHotelFilter(restrictHotelId);
    }
  }, [restrictHotelId]);

  const filteredSucursales = useMemo(() => {
    const hotelFilter = restrictHotelId || selectedHotelFilter;
    if (!hotelFilter) return sucursales;
    return sucursales.filter(s => s.hotel_id === hotelFilter);
  }, [restrictHotelId, sucursales, selectedHotelFilter]);

  const resetForm = () => {
    setForm({
      hotelId: hotelOptions[0]?.hotel_id || "",
      nombre: "",
      direccion: "",
      telefono: "",
      email: "",
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.hotelId || !form.nombre.trim()) {
      setCreatingMsg("Completa hotel y nombre");
      return;
    }

    setCreatingMsg("Creando...");
    try {
      const payload = {
        hotelId: form.hotelId,
        nombre: form.nombre.trim(),
        direccion: form.direccion || null,
        telefono: form.telefono || null,
        email: form.email || null,
        ...contextPayload,
      };
      const created = await api.createSucursal(payload);
      setSucursales(prev => [created, ...prev]);
      setCreatingMsg("Sucursal creada ✅");
      resetForm();
      if (onHotelRefresh) onHotelRefresh();
    } catch (err) {
      console.error("Error al crear sucursal:", err);
      setCreatingMsg(err.error || "No se pudo crear la sucursal");
    }
  };

  const startEdit = (sucursal) => {
    setEditingId(sucursal.sucursal_id);
    setEditForm({
      hotelId: sucursal.hotel_id,
      nombre: sucursal.nombre || "",
      direccion: sucursal.direccion || "",
      telefono: sucursal.telefono || "",
      email: sucursal.email || "",
    });
    setEditMsg("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      hotelId: "",
      nombre: "",
      direccion: "",
      telefono: "",
      email: "",
    });
    setEditMsg("");
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    setEditMsg("Guardando...");
    try {
      const payload = {
        hotelId: editForm.hotelId,
        nombre: editForm.nombre?.trim() || "",
        direccion: editForm.direccion || null,
        telefono: editForm.telefono || null,
        email: editForm.email || null,
        ...contextPayload,
      };
      const updated = await api.updateSucursal(editingId, payload);
      setSucursales(prev => prev.map(s => (s.sucursal_id === editingId ? updated : s)));
      setEditMsg("Sucursal actualizada ✅");
      if (onHotelRefresh) onHotelRefresh();
      setTimeout(() => cancelEdit(), 1200);
    } catch (err) {
      console.error("Error al actualizar sucursal:", err);
      setEditMsg(err.error || "No se pudo actualizar");
    }
  };

  const handleDelete = async (sucursal) => {
    if (!confirm(`¿Eliminar la sucursal "${sucursal.nombre}"?`)) return;
    try {
      await api.deleteSucursal(sucursal.sucursal_id, contextPayload);
      setSucursales(prev => prev.filter(s => s.sucursal_id !== sucursal.sucursal_id));
      if (onHotelRefresh) onHotelRefresh();
    } catch (err) {
      console.error("Error al eliminar sucursal:", err);
      alert(err.error || "No se pudo eliminar");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        <p className="mt-2">Cargando sucursales...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Gestión de Sucursales</h4>
        <button className="btn btn-outline-secondary" onClick={loadSucursales}>
          Refrescar
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card p-3">
            <h5 className="mb-3">Crear nueva sucursal</h5>
            <form onSubmit={handleCreate}>
              <label className="form-label">Hotel</label>
              <select
                className="form-select mb-2"
                value={form.hotelId}
                onChange={e => setForm(prev => ({ ...prev, hotelId: e.target.value }))}
                required
                disabled={isRestricted}
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
                placeholder="Dirección"
                value={form.direccion}
                onChange={e => setForm(prev => ({ ...prev, direccion: e.target.value }))}
              />
              <input
                className="form-control mb-2"
                placeholder="Teléfono"
                value={form.telefono}
                onChange={e => setForm(prev => ({ ...prev, telefono: e.target.value }))}
              />
              <input
                type="email"
                className="form-control mb-2"
                placeholder="Email"
                value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
              />
              <button type="submit" className="btn btn-primary w-100">Crear sucursal</button>
            </form>
            {creatingMsg && <div className="small text-muted mt-2">{creatingMsg}</div>}
          </div>
        </div>

        <div className="col-lg-8">
          {!isRestricted && (
            <div className="mb-3">
              <label className="form-label">Filtrar por hotel</label>
              <select
                className="form-select"
                value={selectedHotelFilter}
                onChange={e => setSelectedHotelFilter(e.target.value)}
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

          {filteredSucursales.length === 0 ? (
            <div className="text-muted">No hay sucursales registradas.</div>
          ) : (
            <div className="list-group">
              {filteredSucursales.map(sucursal => (
                <div key={sucursal.sucursal_id} className="list-group-item">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <strong>{sucursal.nombre}</strong>
                      <div className="small text-muted">Hotel: {sucursal.hotel_nombre}</div>
                      {sucursal.direccion && (
                        <div className="small text-muted">Dirección: {sucursal.direccion}</div>
                      )}
                      <div className="small text-muted">
                        Tel: {sucursal.telefono || "—"} • Email: {sucursal.email || "—"}
                      </div>
                      <div className="small">
                        Recepcionistas asignados: {sucursal.total_recepcionistas}
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => startEdit(sucursal)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(sucursal)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  {editingId === sucursal.sucursal_id && (
                    <div className="mt-3 border-top pt-3">
                      <h6 className="mb-3">Editar sucursal</h6>
                      <form onSubmit={handleUpdate}>
                        <label className="form-label">Hotel</label>
                        <select
                          className="form-select mb-2"
                          value={editForm.hotelId}
                          onChange={e => setEditForm(prev => ({ ...prev, hotelId: e.target.value }))}
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
                          required
                        />
                        <input
                          className="form-control mb-2"
                          placeholder="Dirección"
                          value={editForm.direccion}
                          onChange={e => setEditForm(prev => ({ ...prev, direccion: e.target.value }))}
                        />
                        <input
                          className="form-control mb-2"
                          placeholder="Teléfono"
                          value={editForm.telefono}
                          onChange={e => setEditForm(prev => ({ ...prev, telefono: e.target.value }))}
                        />
                        <input
                          type="email"
                          className="form-control mb-2"
                          placeholder="Email"
                          value={editForm.email}
                          onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
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
