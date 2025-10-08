import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";

export default function GestionSucursales({ hoteles = [], onHotelRefresh, restrictHotelId = "", userContext = {} }) {
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { isDarkMode } = useTheme();
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
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Cargando sucursales...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Gestión de Sucursales</h2>
        <button className="btn-secondary-custom" onClick={loadSucursales}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
            <path d="M23 4v6h-6M1 20v-6h6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Refrescar
        </button>
      </div>

      {error && <div className="alert-box alert-error">{error}</div>}

      <div className="content-grid" style={{ gridTemplateColumns: '400px 1fr', gap: '24px' }}>
        <div className="dashboard-card">
          <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20" style={{ verticalAlign: 'middle', marginRight: '8px' }}>
              <path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Crear Nueva Sucursal
          </h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Hotel</label>
              <select
                className="form-input"
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
            </div>
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input
                className="form-input"
                placeholder="Ej: Sucursal Centro"
                value={form.nombre}
                onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Dirección</label>
              <input
                className="form-input"
                placeholder="Ej: Av. Principal 123"
                value={form.direccion}
                onChange={e => setForm(prev => ({ ...prev, direccion: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input
                className="form-input"
                placeholder="Ej: +1234567890"
                value={form.telefono}
                onChange={e => setForm(prev => ({ ...prev, telefono: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="contacto@sucursal.com"
                value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <button type="submit" className="btn-primary-custom" style={{ width: '100%' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                <path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Crear Sucursal
            </button>
          </form>
          {creatingMsg && (
            <div className={`alert-box ${creatingMsg.includes('✅') ? 'alert-success' : 'alert-info'}`} style={{ marginTop: '16px' }}>
              {creatingMsg}
            </div>
          )}
        </div>

        <div>
          {!isRestricted && (
            <div className="dashboard-card" style={{ marginBottom: '24px' }}>
              <label className="form-label">Filtrar por hotel</label>
              <select
                className="form-input"
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
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="48" height="48">
                <rect x="3" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="14" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="14" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="3" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3>No hay sucursales</h3>
              <p>Crea tu primera sucursal usando el formulario</p>
            </div>
          ) : (
            <div className="dashboard-card">
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sucursal</th>
                      <th>Hotel</th>
                      <th>Ubicación</th>
                      <th>Contacto</th>
                      <th>Personal</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSucursales.map(sucursal => (
                      <React.Fragment key={sucursal.sucursal_id}>
                        <tr>
                          <td>
                            <div style={{ fontWeight: '600', color: isDarkMode ? '#ffffff' : '#1f2937' }}>
                              {sucursal.nombre}
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-info">
                              {sucursal.hotel_nombre}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: '14px', color: isDarkMode ? '#e2e8f0' : '#6b7280' }}>
                              {sucursal.direccion || "Sin dirección"}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '13px' }}>
                              <div style={{ color: isDarkMode ? '#e2e8f0' : '#6b7280' }}>
                                📞 {sucursal.telefono || "—"}
                              </div>
                              <div style={{ color: isDarkMode ? '#e2e8f0' : '#6b7280' }}>
                                ✉️ {sucursal.email || "—"}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-primary">
                              {sucursal.total_recepcionistas} recepcionistas
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="btn-secondary-custom btn-icon"
                                onClick={() => startEdit(sucursal)}
                                title="Editar"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <button
                                className="btn-danger-custom btn-icon"
                                onClick={() => handleDelete(sucursal)}
                                title="Eliminar"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Edición */}
      {editingId && (
        <div className="modal-overlay" onClick={cancelEdit}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Editar Sucursal</h3>
              <button className="modal-close" onClick={cancelEdit}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="24" height="24">
                  <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleUpdate}>
                <div className="form-group">
                  <label className="form-label">Hotel</label>
                  <select
                    className="form-input"
                    value={editForm.hotelId}
                    onChange={e => setEditForm(prev => ({ ...prev, hotelId: e.target.value }))}
                  >
                    {hotelOptions.map(h => (
                      <option key={h.hotel_id} value={h.hotel_id}>
                        {h.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input
                    className="form-input"
                    placeholder="Nombre de la sucursal"
                    value={editForm.nombre}
                    onChange={e => setEditForm(prev => ({ ...prev, nombre: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Dirección</label>
                  <input
                    className="form-input"
                    placeholder="Dirección"
                    value={editForm.direccion}
                    onChange={e => setEditForm(prev => ({ ...prev, direccion: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input
                    className="form-input"
                    placeholder="Teléfono"
                    value={editForm.telefono}
                    onChange={e => setEditForm(prev => ({ ...prev, telefono: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="Email"
                    value={editForm.email}
                    onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button className="btn-primary-custom" type="submit" style={{ flex: 1 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="17 21 17 13 7 13 7 21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="7 3 7 8 15 8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Guardar Cambios
                  </button>
                  <button className="btn-secondary-custom" type="button" onClick={cancelEdit} style={{ flex: 1 }}>
                    Cancelar
                  </button>
                </div>
              </form>
              {editMsg && (
                <div className={`alert-box ${editMsg.includes('✅') ? 'alert-success' : 'alert-info'}`} style={{ marginTop: '16px' }}>
                  {editMsg}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
