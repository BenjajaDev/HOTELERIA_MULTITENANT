import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";

const GATEWAY_INITIAL_STATE = {
  titular: "",
  numero: "",
  expiracion: "",
  cvv: "",
  banco: "",
  referencia: "",
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export default function GuestDashboard({ user }) {
  const [hoteles, setHoteles] = useState([]);
  const [habitaciones, setHabitaciones] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [form, setForm] = useState({
    tenant_id: "",
    habitacion_id: "",
    fecha_inicio: "",
    fecha_fin: "",
    metodo_pago: "tarjeta",
  });
  const [msg, setMsg] = useState("");
  const [total, setTotal] = useState(0);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showGateway, setShowGateway] = useState(false);
  const [gatewayData, setGatewayData] = useState(GATEWAY_INITIAL_STATE);
  const [gatewayMsg, setGatewayMsg] = useState("");

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }),
    []
  );

  const fetchHabitaciones = useCallback(
    async ({ hotelId, fechaInicio, fechaFin }) => {
      if (!hotelId) return;
      try {
        setLoadingRooms(true);
        const params = fechaInicio && fechaFin ? { fechaInicio, fechaFin } : {};
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

  const loadHoteles = useCallback(async () => {
    try {
      const h = await api.getHoteles();
      setHoteles(h);
    } catch (err) {
      setMsg(err.error || JSON.stringify(err));
    }
  }, []);

  useEffect(() => {
    loadHoteles();
  }, [loadHoteles]);

  useEffect(() => {
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
  }, [form.habitacion_id, form.fecha_inicio, form.fecha_fin, habitaciones]);

  useEffect(() => {
    if (!selectedHotel) return;
    fetchHabitaciones({
      hotelId: selectedHotel.hotel_id,
      fechaInicio: form.fecha_inicio,
      fechaFin: form.fecha_fin,
    });
  }, [selectedHotel, form.fecha_inicio, form.fecha_fin, fetchHabitaciones]);

  const selectHotel = (hotel) => {
    setSelectedHotel(hotel);
    setForm((prev) => ({
      ...prev,
      tenant_id: hotel.tenant_id,
      habitacion_id: "",
    }));
    setShowGateway(false);
    setGatewayData(GATEWAY_INITIAL_STATE);
    setGatewayMsg("");
    setMsg("");
    fetchHabitaciones({
      hotelId: hotel.hotel_id,
      fechaInicio: form.fecha_inicio,
      fechaFin: form.fecha_fin,
    });
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
    if (!selectedHotel) {
      setMsg("Selecciona un hotel antes de reservar");
      throw new Error("Hotel no seleccionado");
    }

    const payload = {
      tenant_id: selectedHotel.tenant_id,
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
        tenant_id: selectedHotel.tenant_id,
        habitacion_id: "",
        fecha_inicio: "",
        fecha_fin: "",
        metodo_pago: "tarjeta",
      });
      setTotal(0);
      await fetchHabitaciones({ hotelId: selectedHotel.hotel_id });
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

    if (!selectedHotel) {
      setMsg("Selecciona un hotel antes de reservar");
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

  const formattedTotal = currencyFormatter.format(total || 0);

  return (
    <div>
      <h3>Reservar habitación</h3>
      <div className="row g-3">
        <div className="col-md-5">
          <div className="card p-3 h-100">
            <h5>Hoteles</h5>
            <ul className="list-group">
              {hoteles.map((h) => {
                const isActive = selectedHotel?.hotel_id === h.hotel_id;
                return (
                  <li
                    key={h.hotel_id}
                    className={`list-group-item d-flex justify-content-between align-items-center ${isActive ? "active" : ""}`}
                  >
                    <div>
                      <strong>{h.nombre}</strong><br />
                      <small className={isActive ? "text-light" : "text-muted"}>{h.direccion}</small>
                    </div>
                    <button
                      className={`btn btn-sm ${isActive ? "btn-light" : "btn-primary"}`}
                      onClick={() => selectHotel(h)}
                    >
                      {isActive ? "Seleccionado" : "Ver habitaciones"}
                    </button>
                  </li>
                );
              })}
              {hoteles.length === 0 && <li className="list-group-item text-muted">No hay hoteles disponibles</li>}
            </ul>
          </div>
        </div>

        <div className="col-md-7">
          <div className="card p-3 mb-3">
            <h5>{selectedHotel ? `Habitaciones en ${selectedHotel.nombre}` : "Seleccione un hotel"}</h5>
            <form onSubmit={submitReserva}>
              <div className="mb-2">
                <label className="form-label">Habitación</label>
                <select
                  className="form-select"
                  value={form.habitacion_id}
                  onChange={(e) => handleFormChange("habitacion_id", e.target.value)}
                  disabled={!selectedHotel || loadingRooms}
                  required
                >
                  <option value="">-- elegir --</option>
                  {habitaciones.map((h) => (
                    <option key={h.habitacion_id} value={h.habitacion_id}>
                      {h.numero} — {h.tipo} — S/ {h.precio_noche}
                    </option>
                  ))}
                </select>
                {loadingRooms && <div className="small text-muted mt-1">Cargando habitaciones...</div>}
                {!loadingRooms && selectedHotel && habitaciones.length === 0 && (
                  <div className="small text-muted mt-1">Sin disponibilidad para las fechas seleccionadas.</div>
                )}
              </div>
              <div className="mb-2">
                <label className="form-label">Fecha inicio</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.fecha_inicio}
                  onChange={(e) => handleFormChange("fecha_inicio", e.target.value)}
                  required
                />
              </div>
              <div className="mb-2">
                <label className="form-label">Fecha fin</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.fecha_fin}
                  onChange={(e) => handleFormChange("fecha_fin", e.target.value)}
                  required
                />
              </div>
              <div className="mb-2">
                <label className="form-label">Método de pago</label>
                <select
                  className="form-select"
                  value={form.metodo_pago}
                  onChange={(e) => handleFormChange("metodo_pago", e.target.value)}
                >
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo al llegar</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Total estimado</label>
                <div className="form-control-plaintext fw-semibold">{formattedTotal}</div>
              </div>
              <button className="btn btn-success" type="submit" disabled={submitting}>
                {submitting
                  ? "Procesando..."
                  : form.metodo_pago === "efectivo"
                  ? "Reservar (pago en hotel)"
                  : "Continuar a pasarela"}
              </button>
            </form>
            <div className="mt-2 text-muted" style={{ minHeight: "1.5rem" }}>{msg}</div>
          </div>

          {showGateway && (
            <div className="card border-primary">
              <div className="card-body">
                <h5 className="card-title">Pasarela de pago ficticia</h5>
                <p className="card-text text-muted small">
                  Ingresa datos falsos para simular el pago. No se almacenan datos reales.
                </p>
                <form onSubmit={confirmarGateway}>
                  {form.metodo_pago === "tarjeta" ? (
                    <>
                      <div className="mb-2">
                        <label className="form-label">Titular</label>
                        <input
                          className="form-control"
                          value={gatewayData.titular}
                          onChange={(e) => handleGatewayChange("titular", e.target.value)}
                          required
                        />
                      </div>
                      <div className="mb-2">
                        <label className="form-label">Número de tarjeta</label>
                        <input
                          className="form-control"
                          value={gatewayData.numero}
                          onChange={(e) => handleGatewayChange("numero", e.target.value)}
                          required
                        />
                      </div>
                      <div className="row g-2">
                        <div className="col">
                          <label className="form-label">Expiración</label>
                          <input
                            className="form-control"
                            placeholder="MM/AA"
                            value={gatewayData.expiracion}
                            onChange={(e) => handleGatewayChange("expiracion", e.target.value)}
                            required
                          />
                        </div>
                        <div className="col">
                          <label className="form-label">CVV</label>
                          <input
                            className="form-control"
                            value={gatewayData.cvv}
                            onChange={(e) => handleGatewayChange("cvv", e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mb-2">
                        <label className="form-label">Banco</label>
                        <input
                          className="form-control"
                          value={gatewayData.banco}
                          onChange={(e) => handleGatewayChange("banco", e.target.value)}
                          required
                        />
                      </div>
                      <div className="mb-2">
                        <label className="form-label">Referencia</label>
                        <input
                          className="form-control"
                          value={gatewayData.referencia}
                          onChange={(e) => handleGatewayChange("referencia", e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}

                  {gatewayMsg && <div className="text-danger small mb-2">{gatewayMsg}</div>}

                  <div className="d-flex gap-2">
                    <button className="btn btn-primary" type="submit" disabled={submitting}>
                      {submitting ? "Procesando..." : "Confirmar pago"}
                    </button>
                    <button
                      className="btn btn-outline-secondary"
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
      </div>
    </div>
  );
}
