import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import DashboardLayout from "./DashboardLayout";
import "./DashboardContent.css";

const GATEWAY_INITIAL_STATE = {
  titular: "",
  numero: "",
  expiracion: "",
  cvv: "",
  banco: "",
  referencia: "",
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export default function GuestDashboard({ user, onLogout }) {
  const [hotel, setHotel] = useState(null);
  const [loadingHotel, setLoadingHotel] = useState(false);
  const [habitaciones, setHabitaciones] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [form, setForm] = useState({
    tenant_id: user?.tenant_id || "",
    habitacion_id: "",
    fecha_inicio: "",
    fecha_fin: "",
    metodo_pago: "tarjeta",
  });
  const [msg, setMsg] = useState("");
  const [total, setTotal] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showGateway, setShowGateway] = useState(false);
  const [gatewayData, setGatewayData] = useState(GATEWAY_INITIAL_STATE);
  const [gatewayMsg, setGatewayMsg] = useState("");

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }),
    []
  );

  const formatMoney = (value) => currencyFormatter.format(value || 0);

  const fetchHabitaciones = useCallback(
    async ({ hotelId, fechaInicio, fechaFin, sucursalId }) => {
      if (!hotelId) return;
      try {
        setLoadingRooms(true);
        const params = {};
        if (fechaInicio && fechaFin) {
          params.fechaInicio = fechaInicio;
          params.fechaFin = fechaFin;
        }
        if (sucursalId) {
          params.sucursalId = sucursalId;
        }
        const rooms = await api.getHabitaciones(hotelId, params);
        setHabitaciones(Array.isArray(rooms) ? rooms : []);
      } catch (err) {
        setHabitaciones([]);
        setMsg(err.error || JSON.stringify(err));
      } finally {
        setLoadingRooms(false);
      }
    },
    []
  );

  const loadHotel = useCallback(async () => {
    if (!user?.hotel_id) {
      setHotel(null);
      setHabitaciones([]);
      setMsg("No tienes un hotel asignado. Contacta al administrador.");
      return;
    }

    try {
      setLoadingHotel(true);
      setMsg("");
      const data = await api.getHotel(user.hotel_id);
      setHotel(data);
      setForm((prev) => ({
        ...prev,
        tenant_id: data.tenant_id,
        habitacion_id: "",
      }));
    } catch (err) {
      setHotel(null);
      setHabitaciones([]);
      setMsg(err.error || JSON.stringify(err));
    } finally {
      setLoadingHotel(false);
    }
  }, [user?.hotel_id]);

  useEffect(() => {
    loadHotel();
  }, [loadHotel]);

  useEffect(() => {
    if (!hotel) {
      setTotal(0);
      return;
    }
    if (!form.habitacion_id || !form.fecha_inicio || !form.fecha_fin) {
      setTotal(0);
      return;
    }
    const room = habitaciones.find((h) => h.habitacion_id === form.habitacion_id);
    if (!room) {
      setTotal(0);
      return;
    }
    const startDate = new Date(`${form.fecha_inicio}T00:00:00Z`);
    const endDate = new Date(`${form.fecha_fin}T00:00:00Z`);
    const diff = Math.ceil((endDate - startDate) / MS_PER_DAY);
    if (Number.isNaN(diff) || diff <= 0) {
      setTotal(0);
      return;
    }
    setTotal(diff * Number(room.precio_noche || 0));
  }, [hotel, form.habitacion_id, form.fecha_inicio, form.fecha_fin, habitaciones]);

  useEffect(() => {
    if (!hotel) return;
    fetchHabitaciones({
      hotelId: hotel.hotel_id,
      fechaInicio: form.fecha_inicio,
      fechaFin: form.fecha_fin,
      sucursalId: user?.sucursal_id || null,
    });
  }, [hotel, form.fecha_inicio, form.fecha_fin, fetchHabitaciones, user?.sucursal_id]);

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "habitacion_id") {
      setMsg("");
    }
  };

  const handleGatewayChange = (field, value) => {
    setGatewayData((prev) => ({ ...prev, [field]: value }));
  };

  const closeGateway = () => {
    setShowGateway(false);
    setGatewayData(GATEWAY_INITIAL_STATE);
    setGatewayMsg("");
  };

  const performReserva = async (detalles_pago = {}) => {
    if (!hotel) {
      setMsg("No se encontró hotel asignado para tu usuario");
      throw new Error("Hotel no asignado");
    }

    const payload = {
      tenant_id: hotel.tenant_id,
      habitacion_id: form.habitacion_id,
      huesped_id: user?.user_id || user?.usuario_id,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      metodo_pago: form.metodo_pago,
      detalles_pago,
      total,
    };

    setSubmitting(true);
    setGatewayMsg("");
    try {
      setMsg("Procesando reserva...");
      await api.createReserva(payload);
      const mensajeExito =
        form.metodo_pago === "efectivo"
          ? "Reserva registrada. El recepcionista la confirmará al recibir el pago en efectivo."
          : "Reserva confirmada y pagada ✅";
      setMsg(mensajeExito);
      setShowGateway(false);
      setGatewayData(GATEWAY_INITIAL_STATE);
      setGatewayMsg("");
      setForm({
        tenant_id: hotel.tenant_id,
        habitacion_id: "",
        fecha_inicio: "",
        fecha_fin: "",
        metodo_pago: "tarjeta",
      });
      setTotal(0);
      await fetchHabitaciones({ hotelId: hotel.hotel_id, sucursalId: user?.sucursal_id || null });
    } catch (err) {
      const message = err?.error || err?.message || JSON.stringify(err);
      if (form.metodo_pago !== "efectivo" && showGateway) {
        setGatewayMsg(message);
      }
      setMsg(message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const submitReserva = async (e) => {
    e.preventDefault();
    setMsg("");
    setGatewayMsg("");

    if (!hotel) {
      setMsg("No tienes un hotel asignado");
      return;
    }
    if (!form.habitacion_id) {
      setMsg("Elige una habitación disponible");
      return;
    }
    if (!form.fecha_inicio || !form.fecha_fin) {
      setMsg("Define las fechas de entrada y salida");
      return;
    }

    const startDate = new Date(`${form.fecha_inicio}T00:00:00Z`);
    const endDate = new Date(`${form.fecha_fin}T00:00:00Z`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      setMsg("El rango de fechas es inválido");
      return;
    }

    if (form.metodo_pago === "efectivo") {
      try {
        await performReserva();
      } catch (err) {
        /* el error ya se mostró */
      }
      return;
    }

    setShowGateway(true);
    setMsg("Completa la pasarela de pago ficticia para finalizar la reserva.");
  };

  const confirmarGateway = async (e) => {
    e.preventDefault();
    setGatewayMsg("");

    if (form.metodo_pago === "tarjeta") {
      if (!gatewayData.titular || !gatewayData.numero || !gatewayData.expiracion || !gatewayData.cvv) {
        setGatewayMsg("Completa todos los datos de la tarjeta ficticia");
        return;
      }
    } else if (form.metodo_pago === "transferencia") {
      if (!gatewayData.banco || !gatewayData.referencia) {
        setGatewayMsg("Completa los datos de la transferencia ficticia");
        return;
      }
    }

    try {
      setGatewayMsg("Validando pago ficticio...");
      await performReserva(gatewayData);
    } catch (err) {
      /* performReserva ya muestra el error */
    }
  };

  const menuItems = [
    {
      id: 'reservar',
      label: 'Reservar Habitación',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-width="2"/><path d="M9 3v18M3 9h18M3 15h6M15 9h6" stroke-width="2"/></svg>'
    }
  ];

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      activeTab="reservar"
      onTabChange={() => {}}
    >
      <div style={{ padding: "24px" }}>
        {msg && (
          <div className={`alert ${msg.includes("✅") || msg.includes("confirmada") ? "alert-success" : "alert-info"}`} style={{ marginBottom: "20px" }}>
            {msg}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "400px 1fr", gap: "24px", alignItems: "start" }}>
          {/* Card del Hotel */}
          <div className="dashboard-card" style={{ position: "sticky", top: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <svg width="32" height="32" fill="none" stroke="#3b82f6" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b", margin: 0 }}>
                  Tu Hotel
                </h3>
              </div>
            </div>

            {loadingHotel ? (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm" role="status"></div>
                <p className="text-muted mt-2" style={{ fontSize: "13px" }}>Cargando...</p>
              </div>
            ) : hotel ? (
              <div>
                <div style={{ padding: "16px", backgroundColor: "#f8fafc", borderRadius: "8px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b", marginBottom: "12px" }}>
                    {hotel.nombre}
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "start", gap: "8px", marginBottom: "8px" }}>
                    <svg width="16" height="16" fill="none" stroke="#64748b" strokeWidth="2" viewBox="0 0 24 24" style={{ marginTop: "2px", flexShrink: 0 }}>
                      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span style={{ fontSize: "13px", color: "#64748b" }}>{hotel.direccion}</span>
                  </div>

                  {hotel.telefono && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <svg width="16" height="16" fill="none" stroke="#64748b" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span style={{ fontSize: "13px", color: "#64748b" }}>{hotel.telefono}</span>
                    </div>
                  )}

                  {hotel.email && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <svg width="16" height="16" fill="none" stroke="#64748b" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span style={{ fontSize: "13px", color: "#64748b" }}>{hotel.email}</span>
                    </div>
                  )}
                </div>

                <div style={{ padding: "12px", backgroundColor: "#eff6ff", borderLeft: "3px solid #3b82f6", borderRadius: "8px" }}>
                  <div style={{ fontSize: "13px", color: "#1e40af", lineHeight: "1.5" }}>
                    💡 Podrás reservar solo habitaciones de este hotel
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: "32px 16px" }}>
                <svg width="48" height="48" fill="none" stroke="#cbd5e1" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p style={{ fontSize: "13px" }}>No se pudo cargar el hotel</p>
              </div>
            )}
          </div>

          {/* Formulario de Reserva */}
          <div className="dashboard-card">
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <svg width="32" height="32" fill="none" stroke="#10b981" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b", margin: 0 }}>
                  {hotel ? `Reservar en ${hotel.nombre}` : "Reservar Habitación"}
                </h3>
                <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                  Completa el formulario para crear tu reserva
                </p>
              </div>
            </div>

            <form onSubmit={submitReserva}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#64748b", marginBottom: "6px" }}>
                    Habitación Disponible
                  </label>
                  <select
                    className="form-control"
                    value={form.habitacion_id}
                    onChange={(e) => handleFormChange("habitacion_id", e.target.value)}
                    disabled={!hotel || loadingRooms}
                    required
                    style={{ width: "100%" }}
                  >
                    <option value="">-- Selecciona una habitación --</option>
                    {habitaciones.map((h) => (
                      <option key={h.habitacion_id} value={h.habitacion_id}>
                        Habitación {h.numero} • {h.tipo} • {formatMoney(h.precio_noche)}/noche
                      </option>
                    ))}
                  </select>
                  {loadingRooms && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                      <div className="spinner-border spinner-border-sm"></div>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Cargando habitaciones...</span>
                    </div>
                  )}
                  {!loadingRooms && hotel && habitaciones.length === 0 && (
                    <div style={{ fontSize: "12px", color: "#ef4444", marginTop: "6px" }}>
                      ⚠️ Sin disponibilidad para las fechas seleccionadas
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#64748b", marginBottom: "6px" }}>
                    Fecha de Entrada
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.fecha_inicio}
                    onChange={(e) => handleFormChange("fecha_inicio", e.target.value)}
                    required
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#64748b", marginBottom: "6px" }}>
                    Fecha de Salida
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.fecha_fin}
                    onChange={(e) => handleFormChange("fecha_fin", e.target.value)}
                    required
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#64748b", marginBottom: "6px" }}>
                    Método de Pago
                  </label>
                  <select
                    className="form-control"
                    value={form.metodo_pago}
                    onChange={(e) => handleFormChange("metodo_pago", e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="tarjeta">💳 Tarjeta de Crédito/Débito</option>
                    <option value="transferencia">🏦 Transferencia Bancaria</option>
                    <option value="efectivo">💵 Efectivo (al llegar)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#64748b", marginBottom: "6px" }}>
                    Total Estimado
                  </label>
                  <div style={{ 
                    padding: "10px 14px", 
                    backgroundColor: "#f0fdf4", 
                    border: "1px solid #86efac",
                    borderRadius: "8px",
                    fontSize: "20px",
                    fontWeight: "600",
                    color: "#15803d"
                  }}>
                    {formatMoney(total)}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button className="btn-primary-custom" type="submit" disabled={submitting || !hotel}>
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" style={{ marginRight: "8px" }}></span>
                      Procesando...
                    </>
                  ) : form.metodo_pago === "efectivo" ? (
                    <>
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginRight: "8px" }}>
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Reservar (Pago en Hotel)
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginRight: "8px" }}>
                        <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Continuar a Pasarela
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Modal de Pasarela de Pago */}
        {showGateway && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px"
          }}>
            <div className="dashboard-card" style={{ 
              maxWidth: "500px", 
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <svg width="32" height="32" fill="none" stroke="#3b82f6" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <div>
                    <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b", margin: 0 }}>
                      Pasarela de Pago
                    </h3>
                    <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                      Simulación ficticia - No uses datos reales
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeGateway}
                  disabled={submitting}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    color: "#64748b"
                  }}
                >
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div style={{ 
                padding: "12px", 
                backgroundColor: "#fef3c7", 
                borderLeft: "3px solid #f59e0b",
                borderRadius: "8px",
                marginBottom: "20px"
              }}>
                <div style={{ fontSize: "13px", color: "#92400e", lineHeight: "1.5" }}>
                  ⚠️ Esta es una pasarela ficticia para pruebas. Usa datos de prueba, no ingreses información real.
                </div>
              </div>

              <form onSubmit={confirmarGateway}>
                {form.metodo_pago === "tarjeta" ? (
                  <div style={{ display: "grid", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#64748b", marginBottom: "6px" }}>
                        Nombre del Titular
                      </label>
                      <input
                        className="form-control w-100"
                        placeholder="Juan Pérez"
                        value={gatewayData.titular}
                        onChange={(e) => handleGatewayChange("titular", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#64748b", marginBottom: "6px" }}>
                        Número de Tarjeta
                      </label>
                      <input
                        className="form-control w-100"
                        placeholder="4111 1111 1111 1111"
                        value={gatewayData.numero}
                        onChange={(e) => handleGatewayChange("numero", e.target.value)}
                        required
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#64748b", marginBottom: "6px" }}>
                          Expiración
                        </label>
                        <input
                          className="form-control"
                          placeholder="MM/AA"
                          value={gatewayData.expiracion}
                          onChange={(e) => handleGatewayChange("expiracion", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#64748b", marginBottom: "6px" }}>
                          CVV
                        </label>
                        <input
                          className="form-control"
                          placeholder="123"
                          value={gatewayData.cvv}
                          onChange={(e) => handleGatewayChange("cvv", e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#64748b", marginBottom: "6px" }}>
                        Banco
                      </label>
                      <input
                        className="form-control w-100"
                        placeholder="Banco Estado"
                        value={gatewayData.banco}
                        onChange={(e) => handleGatewayChange("banco", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#64748b", marginBottom: "6px" }}>
                        Referencia/Comprobante
                      </label>
                      <input
                        className="form-control w-100"
                        placeholder="REF123456789"
                        value={gatewayData.referencia}
                        onChange={(e) => handleGatewayChange("referencia", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                {gatewayMsg && (
                  <div style={{ 
                    marginTop: "16px",
                    padding: "12px",
                    backgroundColor: "#fee2e2",
                    border: "1px solid #fca5a5",
                    borderRadius: "8px",
                    fontSize: "13px",
                    color: "#991b1b"
                  }}>
                    {gatewayMsg}
                  </div>
                )}

                <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                  <button className="btn-primary-custom" type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm" style={{ marginRight: "8px" }}></span>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginRight: "8px" }}>
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Confirmar Pago
                      </>
                    )}
                  </button>
                  <button
                    className="btn-secondary-custom"
                    type="button"
                    onClick={closeGateway}
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
