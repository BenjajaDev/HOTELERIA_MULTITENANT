import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import Modal from "./Modal";
import FormInput from "./FormInput";
import Button from "./Button";

export default function GestionHuespedes({ restrictTenantId = "", allowCreate = false, userContext = {} }) {
  const [huespedes, setHuespedes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { isDarkMode } = useTheme();
  const [selectedHuesped, setSelectedHuesped] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingHuesped, setEditingHuesped] = useState(null);
  const [editForm, setEditForm] = useState({
    nombre_completo: "",
    email: "",
    telefono: "",
    documento: ""
  });
  const [createForm, setCreateForm] = useState({
    nombre_completo: "",
    email: "",
    telefono: "",
    documento: "",
    password: "",
  });
  const [createMsg, setCreateMsg] = useState("");

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

  const tenantFilter = restrictTenantId || userContext?.tenantId || userContext?.tenant_id || "";

  // Cargar huéspedes
  const loadHuespedes = async () => {
    try {
      setLoading(true);
      setError("");
      const params = tenantFilter ? { tenant_id: tenantFilter } : {};
      const data = await api.getHuespedes(params);
      setHuespedes(data);
    } catch (err) {
      setError(err.error || "Error al cargar huéspedes");
      console.error("Error al cargar huéspedes:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredHuespedes = useMemo(() => {
    if (!tenantFilter) return huespedes;
    return huespedes.filter(h => (h.tenant_id || h.tenantId) === tenantFilter);
  }, [huespedes, tenantFilter]);

  useEffect(() => {
    loadHuespedes();
  }, []);

  // Ver detalles de un huésped
  const verDetalles = async (huesped) => {
    try {
      const params = tenantFilter ? { tenant_id: tenantFilter } : {};
      const detalles = await api.getHuesped(huesped.id, params);
      setSelectedHuesped(detalles);
      setShowModal(true);
    } catch (err) {
      alert(err.error || "Error al cargar detalles del huésped");
    }
  };

  // Iniciar edición
  const startEdit = (huesped) => {
    setEditingHuesped(huesped.id);
    setEditForm({
      nombre_completo: huesped.nombre_completo || "",
      email: huesped.email || "",
      telefono: huesped.telefono || "",
      documento: huesped.documento || ""
    });
  };

  // Cancelar edición
  const cancelEdit = () => {
    setEditingHuesped(null);
    setEditForm({
      nombre_completo: "",
      email: "",
      telefono: "",
      documento: ""
    });
  };

  // Guardar edición
  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...editForm, ...contextPayload };
      if (tenantFilter && !payload.tenant_id && !payload.tenantId) {
        payload.tenant_id = tenantFilter;
      }
      const updated = await api.updateHuesped(editingHuesped, payload);
      setHuespedes(prev => 
        prev.map(h => 
          h.id === editingHuesped 
            ? { ...h, ...updated }
            : h
        )
      );
      cancelEdit();
      alert("Huésped actualizado correctamente");
    } catch (err) {
      alert(err.error || "Error al actualizar huésped");
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.nombre_completo.trim()) {
      setCreateMsg("El nombre es obligatorio");
      return;
    }
    if (!createForm.email.trim()) {
      setCreateMsg("El email es obligatorio");
      return;
    }

    if (!createForm.password || createForm.password.length < 8) {
      setCreateMsg("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setCreateMsg("Creando...");
    try {
      const payload = {
        nombre_completo: createForm.nombre_completo.trim(),
        email: createForm.email.trim(),
        telefono: createForm.telefono || undefined,
        documento: createForm.documento || undefined,
        password: createForm.password,
        ...contextPayload,
      };
      if (tenantFilter && !payload.tenant_id && !payload.tenantId) {
        payload.tenant_id = tenantFilter;
      }
      if (!payload.hotelId && userContext?.hotelId) payload.hotelId = userContext.hotelId;
      if (!payload.hotel_id && userContext?.hotel_id) payload.hotel_id = userContext.hotel_id;

  const response = await api.createHuesped(payload);
      await loadHuespedes();
  const successMessage = response?.message || "Huésped creado y correo de verificación enviado";
  setCreateMsg(`${successMessage} ✅`);
      setCreateForm({ nombre_completo: "", email: "", telefono: "", documento: "", password: "" });
    } catch (err) {
      console.error("Error al crear huésped:", err);
      setCreateMsg(err.error || "No se pudo crear el huésped");
    }
  };

  // Eliminar huésped
  const deleteHuesped = async (huesped) => {
    const confirmDelete = window.confirm(
      `¿Estás seguro de que quieres eliminar al huésped "${huesped.nombre_completo}"?\n\n` +
      `Esta acción no se puede deshacer y eliminará también todo su historial de reservas.`
    );

    if (!confirmDelete) return;

    try {
      const payload = { ...contextPayload };
      if (tenantFilter && !payload.tenant_id && !payload.tenantId) {
        payload.tenant_id = tenantFilter;
      }
      await api.deleteHuesped(huesped.id, payload);
      setHuespedes(prev => prev.filter(h => h.id !== huesped.id));
      alert("Huésped eliminado correctamente");
    } catch (err) {
      alert(err.error || "Error al eliminar huésped");
    }
  };

  // Formatear fecha
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString('es-ES');
  };

  // Formatear dinero
  const formatMoney = (value) => {
    if (!value) return "$0";
    return new Intl.NumberFormat("es-CL", { 
      style: "currency", 
      currency: "CLP" 
    }).format(value);
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Cargando huéspedes...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Gestión de Huéspedes</h2>
        <button className="btn-secondary-custom" onClick={loadHuespedes}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
            <path d="M23 4v6h-6M1 20v-6h6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Refrescar
        </button>
      </div>

      {error && (
        <div className="alert-box alert-error">
          {error}
        </div>
      )}

      {allowCreate && (
        <div className="dashboard-card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20" style={{ verticalAlign: 'middle', marginRight: '8px' }}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="8.5" cy="7" r="4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="20" y1="8" x2="20" y2="14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="23" y1="11" x2="17" y2="11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Registrar Nuevo Huésped
          </h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nombre Completo</label>
                <input
                  className="form-input"
                  placeholder="Juan Pérez"
                  value={createForm.nombre_completo}
                  onChange={e => setCreateForm(prev => ({ ...prev, nombre_completo: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="juan@example.com"
                  value={createForm.email}
                  onChange={e => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input
                  className="form-input"
                  placeholder="+1234567890"
                  value={createForm.telefono}
                  onChange={e => setCreateForm(prev => ({ ...prev, telefono: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Documento</label>
                <input
                  className="form-input"
                  placeholder="DNI/Pasaporte"
                  value={createForm.documento}
                  onChange={e => setCreateForm(prev => ({ ...prev, documento: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña Temporal</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Al menos 8 caracteres"
                  value={createForm.password}
                  onChange={e => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
                <small style={{ display: 'block', marginTop: '6px', color: '#6b7280', fontSize: '12px' }}>
                  El huésped deberá cambiarla después de verificar su correo.
                </small>
              </div>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button className="btn-primary-custom" type="submit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="8.5" cy="7" r="4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="20" y1="8" x2="20" y2="14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="23" y1="11" x2="17" y2="11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Crear Huésped
              </button>
              {createMsg && (
                <div className={`alert-box ${createMsg.includes('✅') ? 'alert-success' : 'alert-info'}`} style={{ margin: 0, padding: '8px 12px' }}>
                  {createMsg}
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {filteredHuespedes.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="48" height="48">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="8.5" cy="7" r="4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20 8v6M23 11h-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3>No hay huéspedes registrados</h3>
          <p>Los huéspedes aparecerán aquí una vez registrados</p>
        </div>
      ) : (
        <div className="dashboard-card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Huésped</th>
                  <th>Contacto</th>
                  <th>Tipo</th>
                  <th>Reservas</th>
                  <th>Total Gastado</th>
                  <th>Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredHuespedes.map(huesped => (
                  <React.Fragment key={huesped.id}>
                    <tr>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: '50%', 
                            background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: 16,
                            flexShrink: 0
                          }}>
                            {(huesped.nombre_completo || huesped.email || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: isDarkMode ? '#ffffff' : '#1f2937' }}>
                              {huesped.nombre_completo || "Sin nombre"}
                            </div>
                            <div style={{ fontSize: 13, color: isDarkMode ? '#e2e8f0' : '#6b7280' }}>
                              ID: {huesped.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px' }}>
                          <div style={{ color: isDarkMode ? '#e2e8f0' : '#6b7280', marginBottom: '4px' }}>
                            ✉️ {huesped.email || "—"}
                          </div>
                          <div style={{ color: isDarkMode ? '#e2e8f0' : '#6b7280' }}>
                            📞 {huesped.telefono || "—"}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${huesped.source === 'huesped_table' ? 'badge-primary' : 'badge-info'}`}>
                          {huesped.source === 'huesped_table' ? '📋 Ficha' : '👤 Usuario'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px' }}>
                          <div style={{ color: '#10b981', marginBottom: '2px' }}>
                            ✓ {huesped.reservas_confirmadas || 0} confirmadas
                          </div>
                          <div style={{ color: '#f59e0b', marginBottom: '2px' }}>
                            ⏱ {huesped.reservas_pendientes || 0} pendientes
                          </div>
                          <div style={{ color: '#6b7280', fontWeight: '600' }}>
                            Total: {huesped.total_reservas || 0}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ color: '#10b981', fontWeight: '600', fontSize: '14px' }}>
                          {formatMoney(huesped.total_gastado)}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>
                          {formatDate(huesped.created_at)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-secondary-custom btn-icon"
                            onClick={() => verDetalles(huesped)}
                            title="Ver detalles"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <circle cx="12" cy="12" r="3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          {huesped.source === 'huesped_table' && editingHuesped !== huesped.id && (
                            <button
                              className="btn-secondary-custom btn-icon"
                              onClick={() => startEdit(huesped)}
                              title="Editar"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          )}
                          <button
                            className="btn-danger-custom btn-icon"
                            onClick={() => deleteHuesped(huesped)}
                            title="Eliminar"
                            disabled={huesped.total_reservas > 0 && (huesped.reservas_confirmadas > 0 || huesped.reservas_pendientes > 0)}
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

      {/* Modal de Edición con componentes independientes */}
      <Modal
        isOpen={editingHuesped !== null}
        onClose={cancelEdit}
        title="Editar Huésped"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={cancelEdit}>
              Cancelar
            </Button>
            <Button 
              variant="primary" 
              onClick={saveEdit}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="17 21 17 13 7 13 7 21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="7 3 7 8 15 8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
            >
              Guardar Cambios
            </Button>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); saveEdit(e); }}>
          <FormInput
            label="Nombre Completo"
            value={editForm.nombre_completo}
            onChange={e => setEditForm({...editForm, nombre_completo: e.target.value})}
            required
          />
          <FormInput
            label="Email"
            type="email"
            value={editForm.email}
            onChange={e => setEditForm({...editForm, email: e.target.value})}
            required
          />
          <FormInput
            label="Teléfono"
            value={editForm.telefono}
            onChange={e => setEditForm({...editForm, telefono: e.target.value})}
          />
          <FormInput
            label="Documento"
            value={editForm.documento}
            onChange={e => setEditForm({...editForm, documento: e.target.value})}
          />
        </form>
      </Modal>

      {/* Modal de detalles */}
      {showModal && selectedHuesped && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3>Detalles del Huésped</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="24" height="24">
                  <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <h4 style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    marginBottom: '16px', 
                    color: isDarkMode ? '#f1f5f9' : '#1f2937' 
                  }}>
                    Información Personal
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <span style={{ 
                        fontSize: '13px', 
                        color: isDarkMode ? '#94a3b8' : '#6b7280', 
                        display: 'block', 
                        marginBottom: '4px' 
                      }}>Tipo</span>
                      <span className={`badge ${selectedHuesped.source === 'huesped_table' ? 'badge-primary' : 'badge-info'}`}>
                        {selectedHuesped.source === 'huesped_table' ? '📋 Ficha de Huésped' : '👤 Usuario Registrado'}
                      </span>
                    </div>
                    <div>
                      <span style={{ 
                        fontSize: '13px', 
                        color: isDarkMode ? '#94a3b8' : '#6b7280', 
                        display: 'block', 
                        marginBottom: '4px' 
                      }}>Nombre</span>
                      <span style={{ 
                        fontWeight: '600', 
                        color: isDarkMode ? '#e2e8f0' : '#1f2937' 
                      }}>{selectedHuesped.nombre_completo || "—"}</span>
                    </div>
                    <div>
                      <span style={{ 
                        fontSize: '13px', 
                        color: isDarkMode ? '#94a3b8' : '#6b7280', 
                        display: 'block', 
                        marginBottom: '4px' 
                      }}>Email</span>
                      <span style={{ 
                        color: isDarkMode ? '#cbd5e1' : '#1f2937' 
                      }}>{selectedHuesped.email || "—"}</span>
                    </div>
                    <div>
                      <span style={{ 
                        fontSize: '13px', 
                        color: isDarkMode ? '#94a3b8' : '#6b7280', 
                        display: 'block', 
                        marginBottom: '4px' 
                      }}>Teléfono</span>
                      <span style={{ 
                        color: isDarkMode ? '#cbd5e1' : '#1f2937' 
                      }}>{selectedHuesped.telefono || "—"}</span>
                    </div>
                    {selectedHuesped.source === 'huesped_table' && (
                      <div>
                        <span style={{ 
                          fontSize: '13px', 
                          color: isDarkMode ? '#94a3b8' : '#6b7280', 
                          display: 'block', 
                          marginBottom: '4px' 
                        }}>Documento</span>
                        <span style={{ 
                          color: isDarkMode ? '#cbd5e1' : '#1f2937' 
                        }}>{selectedHuesped.documento || "—"}</span>
                      </div>
                    )}
                    <div>
                      <span style={{ 
                        fontSize: '13px', 
                        color: isDarkMode ? '#94a3b8' : '#6b7280', 
                        display: 'block', 
                        marginBottom: '4px' 
                      }}>Registrado</span>
                      <span style={{ 
                        color: isDarkMode ? '#cbd5e1' : '#1f2937' 
                      }}>{formatDate(selectedHuesped.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    marginBottom: '16px', 
                    color: isDarkMode ? '#f1f5f9' : '#1f2937' 
                  }}>
                    Historial de Reservas
                  </h4>
                  {selectedHuesped.reservas && selectedHuesped.reservas.length > 0 ? (
                    <div style={{ 
                      maxHeight: "300px", 
                      overflowY: "auto", 
                      border: `1px solid ${isDarkMode ? '#475569' : '#e5e7eb'}`, 
                      borderRadius: '8px',
                      background: isDarkMode ? '#334155' : '#ffffff'
                    }}>
                      <table className="data-table" style={{ marginBottom: 0 }}>
                        <thead>
                          <tr>
                            <th>Hotel</th>
                            <th>Hab.</th>
                            <th>Fechas</th>
                            <th>Estado</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedHuesped.reservas.map(reserva => (
                            <tr key={reserva.reserva_id}>
                              <td style={{ fontSize: '13px' }}>{reserva.hotel_nombre}</td>
                              <td style={{ fontSize: '13px' }}>{reserva.habitacion_numero}</td>
                              <td style={{ 
                                fontSize: '12px', 
                                color: isDarkMode ? '#94a3b8' : '#6b7280' 
                              }}>
                                {formatDate(reserva.fecha_inicio)} - {formatDate(reserva.fecha_fin)}
                              </td>
                              <td>
                                <span className={`badge ${reserva.estado === 'confirmada' ? 'badge-success' : reserva.estado === 'pendiente' ? 'badge-warning' : 'badge-secondary'}`}>
                                  {reserva.estado}
                                </span>
                              </td>
                              <td style={{ fontSize: '13px', fontWeight: '600', color: '#10b981' }}>
                                {formatMoney(reserva.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state" style={{ padding: '40px 20px' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="32" height="32">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>No tiene reservas</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-secondary-custom" onClick={() => setShowModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
