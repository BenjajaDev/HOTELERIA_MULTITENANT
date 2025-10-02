import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const METODOS = [
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
  { value: "efectivo", label: "Efectivo" },
];

export default function GestionReservasGerente({ user }) {
  const [habitaciones, setHabitaciones] = useState([]);
  const [huespedes, setHuespedes] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    habitacionId: "",
    huespedId: "",
    fechaInicio: "",
    fechaFin: "",
    metodoPago: "tarjeta",
    detalles: "",
  });
  const [creating, setCreating] = useState(false);
  const [resLoading, setResLoading] = useState(false);

  const hotelId = user?.hotel_id || null;
  const tenantId = user?.tenant_id || null;
  const usuarioId = user?.usuario_id || null;

  const loadHabitaciones = async () => {
    if (!hotelId) return;
    try {
      const data = await api.getHabitacionesDelUsuario({
        tenantId,
        usuarioId,
        hotelId,
      });
      setHabitaciones(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      console.error("Error al cargar habitaciones:", err);
    }
  };

  const loadHuespedes = async () => {
    try {
      const data = await api.getHuespedes({ tenant_id: tenantId });
      setHuespedes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al cargar huéspedes:", err);
    }
  };

  const loadReservas = async () => {
    if (!hotelId) return;
    try {
      setResLoading(true);
      const data = await api.getReservas({ hotelId });
      setReservas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al cargar reservas:", err);
      setMsg(err.error || "Error al cargar reservas");
    } finally {
      setResLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setLoading(true);
        await Promise.all([loadHabitaciones(), loadHuespedes(), loadReservas()]);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!form.habitacionId && habitaciones.length > 0) {
      setForm(prev => ({ ...prev, habitacionId: habitaciones[0].habitacion_id }));
    }
  }, [habitaciones, form.habitacionId]);

  const reservasOrdenadas = useMemo(
    () => [...reservas].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)),
    [reservas]
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.habitacionId || !form.huespedId || !form.fechaInicio || !form.fechaFin) {
      setMsg("Completa todos los campos obligatorios");
      return;
    }

    setCreating(true);
    setMsg("Creando reserva...");
    try {
      const payload = {
        habitacion_id: form.habitacionId,
        huesped_id: form.huespedId,
        fecha_inicio: form.fechaInicio,
        fecha_fin: form.fechaFin,
        metodo_pago: form.metodoPago,
        detalles_pago: form.detalles ? { referencia: form.detalles } : undefined,
        tenant_id: tenantId,
      };

      await api.createReserva(payload);
      setMsg("Reserva creada ✅");
      setForm({
        habitacionId: form.habitacionId,
        huespedId: "",
        fechaInicio: "",
        fechaFin: "",
        metodoPago: form.metodoPago,
        detalles: "",
      });
      await loadReservas();
    } catch (err) {
      console.error("Error al crear reserva:", err);
      setMsg(err.error || "No se pudo crear la reserva");
    } finally {
      setCreating(false);
    }
  };

  const updateEstado = async (reservaId, changes) => {
    try {
      await api.updateReserva(reservaId, changes);
      await loadReservas();
      setMsg("Reserva actualizada ✅");
    } catch (err) {
      console.error("Error al actualizar reserva:", err);
      setMsg(err.error || "No se pudo actualizar");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border" role="status">
          <span className="visualmente-hidden">Cargando...</span>
        </div>
        <p className="mt-2">Preparando datos...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Reservas del Hotel</h4>
        <button className="btn btn-outline-secondary" onClick={loadReservas} disabled={resLoading}>
          {resLoading ? "Actualizando..." : "Refrescar"}
        </button>
      </div>

      {msg && <div className="alert alert-info py-2">{msg}</div>}

      <div className="card p-3 mb-4">
        <h5 className="mb-3">Crear reserva manual</h5>
        <form onSubmit={handleCreate} className="row g-3">
          <div className="col-md-3">
            <label className="form-label">Habitación</label>
            <select
              className="form-select"
              value={form.habitacionId}
              onChange={e => setForm(prev => ({ ...prev, habitacionId: e.target.value }))}
              required
            >
              {habitaciones.length === 0 && <option value="">Sin habitaciones</option>}
              {habitaciones.map(h => (
                <option key={h.habitacion_id} value={h.habitacion_id}>
                  Nº {h.numero} • {h.tipo}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">Huésped</label>
            <select
              className="form-select"
              value={form.huespedId}
              onChange={e => setForm(prev => ({ ...prev, huespedId: e.target.value }))}
              required
            >
              <option value="">Selecciona huésped</option>
              {huespedes
                .filter(h => h.tenant_id === tenantId)
                .map(h => (
                  <option key={h.id} value={h.id}>
                    {h.nombre_completo || h.email || h.id}
                  </option>
                ))}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label">Ingreso</label>
            <input
              type="date"
              className="form-control"
              value={form.fechaInicio}
              onChange={e => setForm(prev => ({ ...prev, fechaInicio: e.target.value }))}
              required
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">Salida</label>
            <input
              type="date"
              className="form-control"
              value={form.fechaFin}
              onChange={e => setForm(prev => ({ ...prev, fechaFin: e.target.value }))}
              required
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">Método de pago</label>
            <select
              className="form-select"
              value={form.metodoPago}
              onChange={e => setForm(prev => ({ ...prev, metodoPago: e.target.value }))}
            >
              {METODOS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="col-12">
            <label className="form-label">Detalles (opcional)</label>
            <input
              className="form-control"
              placeholder="Referencia, notas, etc."
              value={form.detalles}
              onChange={e => setForm(prev => ({ ...prev, detalles: e.target.value }))}
            />
          </div>
          <div className="col-12">
            <button className="btn btn-primary" type="submit" disabled={creating}>
              {creating ? "Creando..." : "Crear reserva"}
            </button>
          </div>
        </form>
      </div>

      <div className="card p-3">
        <h5 className="mb-3">Reservas recientes</h5>
        {reservasOrdenadas.length === 0 ? (
          <div className="text-muted">No hay reservas registradas.</div>
        ) : (
          <div className="list-group">
            {reservasOrdenadas.slice(0, 10).map(reserva => {
              const pagoClass = reserva.pago_estado === "pagado"
                ? "text-success"
                : reserva.pago_estado === "pendiente"
                  ? "text-warning"
                  : "text-muted";
              const reservaClass = reserva.estado === "confirmada"
                ? "text-success"
                : reserva.estado === "pendiente"
                  ? "text-warning"
                  : "text-muted";
              return (
                <div key={reserva.reserva_id} className="list-group-item">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <strong>Hab. {reserva.habitacion_numero}</strong>
                      <div className="small text-muted">Huésped: {reserva.huesped_nombre || reserva.huesped_email || reserva.huesped_id}</div>
                      <div className="small text-muted">{reserva.fecha_inicio} → {reserva.fecha_fin}</div>
                    </div>
                    <div className="text-end small">
                      <div>{new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(reserva.total || 0)}</div>
                      <div className={`${pagoClass} text-capitalize`}>{reserva.pago_estado || "sin pago"}</div>
                      <div className={`${reservaClass} text-capitalize`}>Estado: {reserva.estado}</div>
                    </div>
                  </div>
                  <div className="d-flex gap-2 mt-2">
                    <button
                      className="btn btn-sm btn-outline-success"
                      disabled={reserva.estado === "confirmada" && reserva.pago_estado === "pagado"}
                      onClick={() => updateEstado(reserva.reserva_id, { estado: "confirmada", estado_pago: "pagado" })}
                    >
                      Confirmar y marcar pagada
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => updateEstado(reserva.reserva_id, { estado: "pendiente", estado_pago: "pendiente" })}
                    >
                      Marcar pendiente
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => updateEstado(reserva.reserva_id, { estado: "cancelada" })}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

