import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";

export default function GestionRecepcionistas({ hoteles = [], restrictHotelId = "", userContext = {} }) {
  const [sucursales, setSucursales] = useState([]);
  const [recepcionistas, setRecepcionistas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { isDarkMode } = useTheme();
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
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Cargando recepcionistas...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Gestión de Recepcionistas</h2>
        <button className="btn-secondary-custom" onClick={loadInitialData}>
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
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="7" r="4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Crear Recepcionista
          </h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Hotel</label>
              <select
                className="form-input"
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
            </div>

            <div className="form-group">
              <label className="form-label">Sucursal</label>
              <select
                className="form-input"
                value={form.sucursalId}
                onChange={e => setForm(prev => ({ ...prev, sucursalId: e.target.value }))}
                required
              >
                {sucursalesParaFormulario.length === 0 && (
                  <option value="">Sin sucursales disponibles</option>
                )}
                {sucursalesParaFormulario.map(s => (
                  <option key={s.sucursal_id} value={s.sucursal_id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Nombre Completo</label>
              <input
                className="form-input"
                placeholder="Ej: María González"
                value={form.nombre}
                onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="recepcion@hotel.com"
                value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono (opcional)</label>
              <input
                className="form-input"
                placeholder="+1234567890"
                value={form.telefono}
                onChange={e => setForm(prev => ({ ...prev, telefono: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input
                type="password"
                className="form-input"
                placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>
            <button className="btn-primary-custom" type="submit" disabled={!form.sucursalId} style={{ width: '100%' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="7" r="4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Crear Recepcionista
            </button>
          </form>
          {createMsg && (
            <div className={`alert-box ${createMsg.includes('✅') ? 'alert-success' : 'alert-info'}`} style={{ marginTop: '16px' }}>
              {createMsg}
            </div>
          )}
        </div>

        <div>
          {/* Filtros */}
          <div className="dashboard-card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: !isRestricted ? '1fr 1fr' : '1fr', gap: '16px' }}>
              {!isRestricted && (
                <div>
                  <label className="form-label">Filtrar por hotel</label>
                  <select
                    className="form-input"
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
              <div>
                <label className="form-label">Filtrar por sucursal</label>
                <select
                  className="form-input"
                  value={filters.sucursalId}
                  onChange={e => setFilters(prev => ({ ...prev, sucursalId: e.target.value }))}
                  disabled={!isRestricted && filters.hotelId && sucursalesParaFiltro.length === 0}
                >
                  <option value="">Todas las sucursales</option>
                  {sucursalesParaFiltro.map(s => (
                    <option key={s.sucursal_id} value={s.sucursal_id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {filteredRecepcionistas.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="48" height="48">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="7" r="4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3>No hay recepcionistas</h3>
              <p>Crea el primer recepcionista usando el formulario</p>
            </div>
          ) : (
            <div className="dashboard-card">
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Recepcionista</th>
                      <th>Contacto</th>
                      <th>Hotel / Sucursal</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecepcionistas.map(recepcionista => (
                      <React.Fragment key={recepcionista.recepcionista_sucursal_id}>
                        <tr>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ 
                                width: 40, 
                                height: 40, 
                                borderRadius: '50%', 
                                background: 'linear-gradient(135deg, #0891b2 0%, #2563eb 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: 16,
                                flexShrink: 0
                              }}>
                                {(recepcionista.nombre || recepcionista.email).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: isDarkMode ? '#ffffff' : '#1f2937' }}>
                                  {recepcionista.nombre || "Sin nombre"}
                                </div>
                                <div style={{ fontSize: 13, color: isDarkMode ? '#e2e8f0' : '#6b7280' }}>
                                  ID: {recepcionista.recepcionista_sucursal_id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: 13 }}>
                              <div style={{ color: isDarkMode ? '#e2e8f0' : '#6b7280', marginBottom: 4 }}>
                                ✉️ {recepcionista.email}
                              </div>
                              <div style={{ color: isDarkMode ? '#e2e8f0' : '#6b7280' }}>
                                📞 {recepcionista.telefono || "—"}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div>
                              <span className="badge badge-primary" style={{ display: 'block', marginBottom: '6px' }}>
                                {recepcionista.hotel_nombre}
                              </span>
                              <span className="badge badge-info">
                                {recepcionista.sucursal_nombre}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${recepcionista.activo ? 'badge-success' : 'badge-secondary'}`}>
                              {recepcionista.activo ? '✓ Activo' : '✗ Inactivo'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="btn-secondary-custom btn-icon"
                                onClick={() => startEdit(recepcionista)}
                                title="Editar"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <button
                                className="btn-danger-custom btn-icon"
                                onClick={() => handleDelete(recepcionista)}
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
              <h3>Editar Recepcionista</h3>
              <button className="modal-close" onClick={cancelEdit}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="24" height="24">
                  <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleUpdate}>
                <div className="form-group">
                  <label className="form-label">Sucursal</label>
                  <select
                    className="form-input"
                    value={editForm.sucursalId}
                    onChange={e => setEditForm(prev => ({ ...prev, sucursalId: e.target.value }))}
                    required
                  >
                    {sucursales.map(s => (
                      <option key={s.sucursal_id} value={s.sucursal_id}>
                        {s.hotel_nombre} - {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input
                    className="form-input"
                    placeholder="Nombre del recepcionista"
                    value={editForm.nombre}
                    onChange={e => setEditForm(prev => ({ ...prev, nombre: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="Email"
                    value={editForm.email}
                    onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    required
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
                  <label className="form-label">Nueva Contraseña (opcional)</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Dejar vacío para mantener la actual"
                    value={editForm.password}
                    onChange={e => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editForm.activo}
                      onChange={e => setEditForm(prev => ({ ...prev, activo: e.target.checked }))}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span className="form-label" style={{ margin: 0 }}>Usuario activo</span>
                  </label>
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
