// frontend/components/ReceptionistDashboard.jsx
import React, { useCallback, useEffect, useState } from "react";
import { api } from "../api";

export default function ReceptionistDashboard({ user }) {
  const [habitaciones, setHabitaciones] = useState([]);
  const [msg, setMsg] = useState("");
  const [newRoom, setNewRoom] = useState({ numero: "", tipo: "simple", precio_noche: "", estado: "disponible" });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔹 Ya no necesitamos un hotelId fijo; el backend nos devolverá las habitaciones del hotel del usuario
  const loadHabitaciones = useCallback(async () => {
    if (!user?.tenant_id || !user?.usuario_id || !user?.hotel_id) {
      setMsg("El usuario no tiene hotel asignado");
      return;
    }

    try {
      setLoading(true);
      setMsg("");
      const h = await api.getHabitacionesDelUsuario({
        tenantId: user.tenant_id,
        usuarioId: user.usuario_id,
        hotelId: user.hotel_id,
      });

      if (Array.isArray(h)) {
        setHabitaciones(h);
      } else if (h?.data && Array.isArray(h.data)) {
        setHabitaciones(h.data);
      } else {
        setHabitaciones([]);
      }
    } catch (err) {
      setMsg(err.error || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadHabitaciones();
  }, [loadHabitaciones]);

  const updateEstado = async (habit, newEstado) => {
    try {
      const updated = await api.updateHabitacion(habit.habitacion_id, {
        estado: newEstado,
        tenantId: user.tenant_id,
        usuarioId: user.usuario_id,
        hotelId: user.hotel_id,
      });
      setHabitaciones(prev =>
        prev.map(x => x.habitacion_id === updated.habitacion_id ? updated : x)
      );
    } catch (err) {
      setMsg(err.error || JSON.stringify(err));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setMsg("Creando habitación...");
    try {
      await api.createHabitacion({
        tenantId: user.tenant_id,
        usuarioId: user.usuario_id,
        hotelId: user.hotel_id,
        numero: newRoom.numero,
        tipo: newRoom.tipo,
        precio_noche: newRoom.precio_noche,
        estado: newRoom.estado,
      });
      setNewRoom({ numero: "", tipo: "simple", precio_noche: "", estado: "disponible" });
      await loadHabitaciones();
      setMsg("Habitación creada ✅");
    } catch (err) {
      setMsg(err.error || JSON.stringify(err));
    }
  };

  const startEdit = (habit) => {
    setEditing({
      habitacion_id: habit.habitacion_id,
      numero: habit.numero,
      tipo: habit.tipo,
      precio_noche: habit.precio_noche,
      estado: habit.estado,
    });
  };

  const handleEditChange = (field, value) => {
    setEditing((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setMsg("Actualizando habitación...");
    try {
      const updated = await api.updateHabitacion(editing.habitacion_id, {
        tenantId: user.tenant_id,
        usuarioId: user.usuario_id,
        hotelId: user.hotel_id,
        numero: editing.numero,
        tipo: editing.tipo,
        precio_noche: editing.precio_noche,
        estado: editing.estado,
      });
      setHabitaciones(prev => prev.map(h => h.habitacion_id === updated.habitacion_id ? updated : h));
      setEditing(null);
      setMsg("Habitación actualizada ✅");
    } catch (err) {
      setMsg(err.error || JSON.stringify(err));
    }
  };

  const handleDelete = async (habitacion) => {
    if (!window.confirm("¿Eliminar habitación?")) return;
    setMsg("Eliminando habitación...");
    try {
      await api.deleteHabitacion(habitacion.habitacion_id, {
        tenantId: user.tenant_id,
        usuarioId: user.usuario_id,
        hotelId: user.hotel_id,
      });
      setHabitaciones(prev => prev.filter(h => h.habitacion_id !== habitacion.habitacion_id));
      if (editing?.habitacion_id === habitacion.habitacion_id) {
        setEditing(null);
      }
      setMsg("Habitación eliminada ✅");
    } catch (err) {
      setMsg(err.error || JSON.stringify(err));
    }
  };

  return (
    <div>
      <h3>Gestión de Habitaciones</h3>
      {msg && <div className="alert alert-info">{msg}</div>}

      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card p-3">
            <h5>Nueva habitación</h5>
            <form onSubmit={handleCreate}>
              <div className="mb-2">
                <label className="form-label">Número</label>
                <input
                  className="form-control"
                  value={newRoom.numero}
                  onChange={(e) => setNewRoom({ ...newRoom, numero: e.target.value })}
                  required
                  min="1"
                  type="number"
                />
              </div>
              <div className="mb-2">
                <label className="form-label">Tipo</label>
                <select
                  className="form-select"
                  value={newRoom.tipo}
                  onChange={(e) => setNewRoom({ ...newRoom, tipo: e.target.value })}
                  required
                >
                  <option value="simple">Simple</option>
                  <option value="doble">Doble</option>
                  <option value="suite">Suite</option>
                </select>
              </div>
              <div className="mb-2">
                <label className="form-label">Precio por noche</label>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  value={newRoom.precio_noche}
                  onChange={(e) => setNewRoom({ ...newRoom, precio_noche: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Estado</label>
                <select
                  className="form-select"
                  value={newRoom.estado}
                  onChange={(e) => setNewRoom({ ...newRoom, estado: e.target.value })}
                >
                  <option value="disponible">Disponible</option>
                  <option value="ocupada">Ocupada</option>
                  <option value="limpieza">Limpieza</option>
                </select>
              </div>
              <button className="btn btn-success" type="submit">Crear habitación</button>
            </form>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card p-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">Habitaciones registradas</h5>
              <button className="btn btn-sm btn-outline-secondary" type="button" onClick={loadHabitaciones} disabled={loading}>
                {loading ? "Actualizando..." : "Actualizar"}
              </button>
            </div>

            <ul className="list-group">
              {habitaciones.length > 0 ? (
                habitaciones.map(h => (
                  <li
                    key={h.habitacion_id}
                    className="list-group-item"
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div>
                        <strong>Hab. {h.numero}</strong> — {h.tipo}
                        <div className="text-muted small">
                          Precio: ${h.precio_noche} • Hotel: {h.hotel_id}
                        </div>
                      </div>
                      <div className="d-flex align-items-center">
                        <span
                          className={`badge me-2 ${
                            h.estado === "disponible" ? "bg-success"
                            : h.estado === "ocupada" ? "bg-danger"
                            : h.estado === "limpieza" ? "bg-warning"
                            : "bg-secondary"
                          }`}
                        >
                          {h.estado}
                        </span>
                        <select
                          className="form-select form-select-sm me-2"
                          value={h.estado}
                          onChange={(e) => updateEstado(h, e.target.value)}
                        >
                          <option value="disponible">Disponible</option>
                          <option value="ocupada">Ocupada</option>
                          <option value="limpieza">Limpieza</option>
                        </select>
                        <button className="btn btn-sm btn-outline-primary me-2" onClick={() => startEdit(h)}>Editar</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(h)}>Eliminar</button>
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <li className="list-group-item text-muted">
                  No hay habitaciones registradas para este hotel.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {editing && (
        <div className="card p-3 mt-3">
          <h5>Editar habitación #{editing.numero}</h5>
          <form onSubmit={handleEditSubmit} className="row g-2">
            <div className="col-sm-3">
              <label className="form-label">Número</label>
              <input
                className="form-control"
                type="number"
                min="1"
                value={editing.numero}
                onChange={(e) => handleEditChange("numero", e.target.value)}
                required
              />
            </div>
            <div className="col-sm-3">
              <label className="form-label">Tipo</label>
              <select
                className="form-select"
                value={editing.tipo}
                onChange={(e) => handleEditChange("tipo", e.target.value)}
                required
              >
                <option value="simple">Simple</option>
                <option value="doble">Doble</option>
                <option value="suite">Suite</option>
              </select>
            </div>
            <div className="col-sm-3">
              <label className="form-label">Precio/noche</label>
              <input
                className="form-control"
                type="number"
                min="0"
                value={editing.precio_noche}
                onChange={(e) => handleEditChange("precio_noche", e.target.value)}
                required
              />
            </div>
            <div className="col-sm-3">
              <label className="form-label">Estado</label>
              <select
                className="form-select"
                value={editing.estado}
                onChange={(e) => handleEditChange("estado", e.target.value)}
              >
                <option value="disponible">Disponible</option>
                <option value="ocupada">Ocupada</option>
                <option value="limpieza">Limpieza</option>
              </select>
            </div>
            <div className="col-12 d-flex justify-content-end gap-2 mt-2">
              <button type="button" className="btn btn-light" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="btn btn-primary" type="submit">Guardar cambios</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
