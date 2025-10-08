import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import GestionHuespedes from "./GestionHuespedes";
import GestionSucursales from "./GestionSucursales";
import GestionRecepcionistas from "./GestionRecepcionistas";
import GestionGerentes from "./GestionGerentes";
import DashboardLayout from "./DashboardLayout";
import { useTheme } from "../contexts/ThemeContext";
import "./DashboardContent.css";

export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("hoteles");
  const [hoteles, setHoteles] = useState([]);
  const [form, setForm] = useState({ nombre: "", direccion: "", telefono: "", email: "" });
  const [msg, setMsg] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ nombre: "", direccion: "", telefono: "", email: "" });
  const [editMsg, setEditMsg] = useState("");
  const [reservas, setReservas] = useState([]);
  const [reservasMsg, setReservasMsg] = useState("");
  const [selectedReserva, setSelectedReserva] = useState(null);
  const { isDarkMode } = useTheme();

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }),
    []
  );

  const formatMoney = (value) => currencyFormatter.format(value || 0);
  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  };
  const formatNights = (reserva) => {
    if (!reserva?.fecha_inicio || !reserva?.fecha_fin) return "—";
    const inicio = new Date(reserva.fecha_inicio);
    const fin = new Date(reserva.fecha_fin);
    const diff = Math.max(1, Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)));
    return `${diff} ${diff === 1 ? "noche" : "noches"}`;
  };

  const menuItems = [
    {
      id: 'hoteles',
      label: 'Hoteles',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="9 22 9 12 15 12 15 22" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    },
    {
      id: 'sucursales',
      label: 'Sucursales',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" stroke-width="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" stroke-width="2"/></svg>'
    },
    {
      id: 'gerentes',
      label: 'Gerentes',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    },
    {
      id: 'recepcionistas',
      label: 'Recepcionistas',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="7" r="4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    },
    {
      id: 'huespedes',
      label: 'Huéspedes',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="7" r="4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    },
    {
      id: 'reservas',
      label: 'Reservas',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2"/><line x1="16" y1="2" x2="16" y2="6" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke-width="2" stroke-linecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke-width="2"/></svg>'
    }
  ];

  const load = async () => {
    try {
      const h = await api.getHoteles();
      setHoteles(h);
    } catch (err) {
      setMsg(err.error || JSON.stringify(err));
    }
  };

  const loadReservas = async () => {
    try {
      const data = await api.getReservas();
      setReservas(data);
      setReservasMsg("");
    } catch (err) {
      setReservasMsg(err.error || JSON.stringify(err));
    }
  };

  useEffect(() => {
    load();
    loadReservas();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("Creando...");
    try {
      const created = await api.createHotel(form);
      setHoteles(prev => [created, ...prev]);
      setForm({ nombre: "", direccion: "", telefono: "", email: "" });
      setMsg("Creado ✅");
    } catch (err) {
      setMsg(err.error || JSON.stringify(err));
    }
  };

  const startEdit = (hotel) => {
    setEditingId(hotel.hotel_id);
    setEditForm({
      nombre: hotel.nombre || "",
      direccion: hotel.direccion || "",
      telefono: hotel.telefono || "",
      email: hotel.email || "",
    });
    setEditMsg("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ nombre: "", direccion: "", telefono: "", email: "" });
    setEditMsg("");
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    setEditMsg("Actualizando...");
    try {
      const updated = await api.updateHotel(editingId, editForm);
      setHoteles(prev => prev.map(h => (h.hotel_id === editingId ? { ...h, ...updated } : h)));
      setMsg("Hotel actualizado ✅");
      cancelEdit();
    } catch (err) {
      setEditMsg(err.error || JSON.stringify(err));
    }
  };

  const del = async (id) => {
    if (!confirm("Eliminar hotel?")) return;
    try {
      await api.deleteHotel(id);
      setHoteles(prev => prev.filter(h => h.hotel_id !== id));
    } catch (err) {
      alert(err.error || JSON.stringify(err));
    }
  };

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/* Contenido de las pestañas */}
      {activeTab === "huespedes" && <GestionHuespedes />}

      {activeTab === "sucursales" && (
        <GestionSucursales hoteles={hoteles} onHotelRefresh={load} />
      )}

      {activeTab === "gerentes" && (
        <GestionGerentes hoteles={hoteles} />
      )}

      {activeTab === "recepcionistas" && (
        <GestionRecepcionistas hoteles={hoteles} />
      )}

      {activeTab === "hoteles" && (
        <div>
          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-icon blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="stat-card-value">{hoteles.length}</p>
              <p className="stat-card-label">Total Hoteles</p>
            </div>

            <div className="stat-card">
              <div className="stat-card-icon green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="stat-card-value">
                {formatMoney(hoteles.reduce((sum, h) => sum + (h.total_ganancias || 0), 0))}
              </p>
              <p className="stat-card-label">Ganancias Confirmadas</p>
            </div>

            <div className="stat-card">
              <div className="stat-card-icon orange">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                  <polyline points="12 6 12 12 16 14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="stat-card-value">
                {formatMoney(hoteles.reduce((sum, h) => sum + (h.total_pendiente || 0), 0))}
              </p>
              <p className="stat-card-label">Ingresos Pendientes</p>
            </div>

            <div className="stat-card">
              <div className="stat-card-icon purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="2" y="7" width="20" height="14" rx="2" strokeWidth="2"/>
                  <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" strokeWidth="2"/>
                </svg>
              </div>
              <p className="stat-card-value">{hoteles.reduce((sum, h) => sum + (h.sucursales_count || 0), 0)}</p>
              <p className="stat-card-label">Total Sucursales</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: editingId ? '1fr 1fr' : '2fr 1fr', gap: '24px', alignItems: 'start' }}>
            {/* Lista de Hoteles */}
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <div>
                  <h3 className="dashboard-card-title">Hoteles Registrados</h3>
                  <p className="dashboard-card-subtitle">Gestiona todos los hoteles del sistema</p>
                </div>
                <button className="btn-primary-custom" onClick={load}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                    <path d="M1 4v6h6M23 20v-6h-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Actualizar
                </button>
              </div>

              {hoteles.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h4 className="empty-state-title">No hay hoteles registrados</h4>
                  <p className="empty-state-text">Comienza creando tu primer hotel en el panel de la derecha</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Hotel</th>
                        <th>Contacto</th>
                        <th>Tenant</th>
                        <th>Finanzas</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hoteles.map(h => (
                        <tr key={h.hotel_id}>
                          <td>
                            <div style={{ fontWeight: 600, color: isDarkMode ? '#ffffff' : '#1f2937', marginBottom: '4px' }}>{h.nombre}</div>
                            <div style={{ fontSize: '13px', color: isDarkMode ? '#e2e8f0' : '#6b7280' }}>{h.direccion}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: '13px', color: isDarkMode ? '#ffffff' : '#4b5563' }}>
                              <div>{h.telefono}</div>
                              <div style={{ color: isDarkMode ? '#e2e8f0' : '#6b7280' }}>{h.email}</div>
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-info">
                              {h.tenant_nombre || h.tenant_id}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: '13px' }}>
                              <div style={{ color: '#059669', fontWeight: 500 }}>✓ {formatMoney(h.total_ganancias)}</div>
                              <div style={{ color: '#d97706', fontWeight: 500 }}>⏱ {formatMoney(h.total_pendiente)}</div>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="btn-secondary-custom btn-icon"
                                onClick={() => startEdit(h)}
                                title="Editar"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <button
                                className="btn-danger-custom btn-icon"
                                onClick={() => del(h.hotel_id)}
                                title="Eliminar"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                                  <polyline points="3 6 5 6 21 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Formulario de Creación/Edición */}
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <h3 className="dashboard-card-title">
                  {editingId ? 'Editar Hotel' : 'Nuevo Hotel'}
                </h3>
              </div>

              {msg && <div className="alert-box alert-info">{msg}</div>}
              {editMsg && <div className="alert-box alert-info">{editMsg}</div>}

              <form onSubmit={editingId ? submitEdit : submit}>
                <div className="form-grid">
                  <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Nombre del Hotel</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Hotel Paraíso"
                      value={editingId ? editForm.nombre : form.nombre}
                      onChange={e => editingId 
                        ? setEditForm({ ...editForm, nombre: e.target.value })
                        : setForm({ ...form, nombre: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Dirección</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Av. Principal 123"
                      value={editingId ? editForm.direccion : form.direccion}
                      onChange={e => editingId 
                        ? setEditForm({ ...editForm, direccion: e.target.value })
                        : setForm({ ...form, direccion: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">Teléfono</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="+56912345678"
                      value={editingId ? editForm.telefono : form.telefono}
                      onChange={e => editingId 
                        ? setEditForm({ ...editForm, telefono: e.target.value })
                        : setForm({ ...form, telefono: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="info@hotel.com"
                      value={editingId ? editForm.email : form.email}
                      onChange={e => editingId 
                        ? setEditForm({ ...editForm, email: e.target.value })
                        : setForm({ ...form, email: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button type="submit" className="btn-primary-custom" style={{ flex: 1 }}>
                    {editingId ? 'Guardar Cambios' : 'Crear Hotel'}
                  </button>
                  {editingId && (
                    <button type="button" onClick={cancelEdit} className="btn-secondary-custom">
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === "reservas" && (
        <div>
          {/* Stats de Reservas */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-icon blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2"/>
                  <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/>
                </svg>
              </div>
              <p className="stat-card-value">{reservas.length}</p>
              <p className="stat-card-label">Total Reservas</p>
            </div>

            <div className="stat-card">
              <div className="stat-card-icon green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="20 6 9 17 4 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="stat-card-value">
                {reservas.filter(r => r.estado === 'confirmada').length}
              </p>
              <p className="stat-card-label">Confirmadas</p>
            </div>

            <div className="stat-card">
              <div className="stat-card-icon orange">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                  <polyline points="12 6 12 12 16 14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="stat-card-value">
                {reservas.filter(r => r.pago_estado === 'pendiente').length}
              </p>
              <p className="stat-card-label">Pagos Pendientes</p>
            </div>

            <div className="stat-card">
              <div className="stat-card-icon purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="stat-card-value">
                {formatMoney(reservas.reduce((sum, r) => sum + (r.total || 0), 0))}
              </p>
              <p className="stat-card-label">Ingresos Totales</p>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <div>
                <h3 className="dashboard-card-title">Reservas del Sistema</h3>
                <p className="dashboard-card-subtitle">Todas las reservas registradas en la plataforma</p>
              </div>
              <button className="btn-primary-custom" onClick={loadReservas}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                  <path d="M1 4v6h6M23 20v-6h-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Actualizar
              </button>
            </div>

            {reservasMsg && <div className="alert-box alert-error">{reservasMsg}</div>}

            {!reservasMsg && reservas.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2"/>
                    <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/>
                  </svg>
                </div>
                <h4 className="empty-state-title">No hay reservas registradas</h4>
                <p className="empty-state-text">Las reservas aparecerán aquí cuando los huéspedes realicen reservaciones</p>
              </div>
            )}

            {!reservasMsg && reservas.length > 0 && (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Hotel & Habitación</th>
                      <th>Fechas</th>
                      <th>Estadía</th>
                      <th>Total</th>
                      <th>Estado Pago</th>
                      <th>Estado Reserva</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservas.map(r => {
                      const getBadgeClass = (estado) => {
                        if (estado === 'pagado' || estado === 'confirmada') return 'badge-success';
                        if (estado === 'pendiente') return 'badge-warning';
                        return 'badge-danger';
                      };

                      return (
                        <tr key={r.reserva_id}>
                          <td>
                            <div style={{ fontWeight: 600, color: isDarkMode ? '#ffffff' : '#1f2937', marginBottom: '4px' }}>
                              {r.hotel_nombre}
                            </div>
                            <div style={{ fontSize: '13px', color: isDarkMode ? '#e2e8f0' : '#6b7280' }}>
                              Habitación {r.habitacion_numero}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '13px', color: isDarkMode ? '#ffffff' : '#4b5563' }}>
                              <div>{formatDate(r.fecha_inicio)}</div>
                              <div style={{ color: isDarkMode ? '#e2e8f0' : '#6b7280' }}>→ {formatDate(r.fecha_fin)}</div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: isDarkMode ? '#ffffff' : '#4b5563' }}>
                              {formatNights(r)}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: isDarkMode ? '#ffffff' : '#1f2937' }}>
                              {formatMoney(r.total)}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${getBadgeClass(r.pago_estado)}`}>
                              {r.pago_estado || 'sin estado'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${getBadgeClass(r.estado)}`}>
                              {r.estado}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn-secondary-custom btn-icon"
                              onClick={() => setSelectedReserva(r)}
                              title="Ver detalles"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <circle cx="12" cy="12" r="3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedReserva && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.35)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Detalle de reserva</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedReserva(null)}></button>
              </div>
              <div className="modal-body">
                <p><strong>Hotel:</strong> {selectedReserva.hotel_nombre}</p>
                <p><strong>Habitación:</strong> {selectedReserva.habitacion_numero}</p>
                <p><strong>Huésped:</strong> {selectedReserva.huesped_nombre || "Sin nombre registrado"}</p>
                <p><strong>Email huésped:</strong> {selectedReserva.huesped_email || "—"}</p>
                <p><strong>Ingreso:</strong> {formatDate(selectedReserva.fecha_inicio)}</p>
                <p><strong>Salida:</strong> {formatDate(selectedReserva.fecha_fin)}</p>
                <p><strong>Estadía:</strong> {formatNights(selectedReserva)}</p>
                <p><strong>Total:</strong> {formatMoney(selectedReserva.total)}</p>
                <p><strong>Método de pago:</strong> {selectedReserva.pago_metodo || "—"}</p>
                <p><strong>Estado de pago:</strong> {selectedReserva.pago_estado || "—"}</p>
                <p><strong>Estado de la reserva:</strong> {selectedReserva.estado}</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedReserva(null)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
