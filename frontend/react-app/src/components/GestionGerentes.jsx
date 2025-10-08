import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";

export default function GestionGerentes({ hoteles = [] }) {
  const [gerentes, setGerentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { isDarkMode } = useTheme();
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
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Cargando gerentes...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Gestión de Gerentes</h2>
        <button className="btn-secondary-custom" onClick={loadGerentes}>
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="8.5" cy="7" r="4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="20" y1="8" x2="20" y2="14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="23" y1="11" x2="17" y2="11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Asignar Nuevo Gerente
          </h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Hotel</label>
              <select
                className="form-input"
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
            </div>

            <div className="form-group">
              <label className="form-label">Nombre Completo</label>
              <input
                className="form-input"
                placeholder="Ej: Juan Pérez"
                value={form.nombre}
                onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                placeholder="gerente@hotel.com"
                type="email"
                value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input
                className="form-input"
                placeholder="Mínimo 6 caracteres"
                type="password"
                value={form.password}
                onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>
            <button className="btn-primary-custom" type="submit" style={{ width: '100%' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="8.5" cy="7" r="4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="20" y1="8" x2="20" y2="14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="23" y1="11" x2="17" y2="11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Crear Gerente
            </button>
          </form>
          {createMsg && (
            <div className={`alert-box ${createMsg.includes('✅') ? 'alert-success' : 'alert-info'}`} style={{ marginTop: '16px' }}>
              {createMsg}
            </div>
          )}
        </div>

        <div>
          {gerentes.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="48" height="48">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9" cy="7" r="4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3>No hay gerentes asignados</h3>
              <p>Crea el primer gerente usando el formulario</p>
            </div>
          ) : (
            <div className="dashboard-card">
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Gerente</th>
                      <th>Email</th>
                      <th>Hotel</th>
                      <th>Tenant</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gerentes.map(gerente => (
                      <React.Fragment key={`${gerente.tenant_id}-${gerente.usuario_id}`}>
                        <tr>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ 
                                width: 40, 
                                height: 40, 
                                borderRadius: '50%', 
                                background: 'linear-gradient(135deg, #2563eb 0%, #0891b2 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: 16,
                                flexShrink: 0
                              }}>
                                {(gerente.nombre || gerente.email).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: isDarkMode ? '#ffffff' : '#1f2937' }}>
                                  {gerente.nombre || "Sin nombre"}
                                </div>
                                <div style={{ fontSize: 13, color: isDarkMode ? '#e2e8f0' : '#6b7280' }}>
                                  ID: {gerente.usuario_id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '14px', color: isDarkMode ? '#e2e8f0' : '#6b7280' }}>
                              {gerente.email}
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-primary">
                              {gerente.hotel_nombre || "Sin hotel"}
                            </span>
                          </td>
                          <td>
                            <span className="badge badge-info">
                              {gerente.tenant_nombre}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="btn-secondary-custom btn-icon"
                                onClick={() => startEdit(gerente)}
                                title="Editar"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <button
                                className="btn-danger-custom btn-icon"
                                onClick={() => handleDelete(gerente)}
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
              <h3>Editar Gerente</h3>
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
                    required
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
                    placeholder="Nombre del gerente"
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
                  <label className="form-label">Nueva Contraseña (opcional)</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Dejar vacío para mantener la actual"
                    value={editForm.password}
                    onChange={e => setEditForm(prev => ({ ...prev, password: e.target.value }))}
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

