import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function GestionHuespedes() {
  const [huespedes, setHuespedes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedHuesped, setSelectedHuesped] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingHuesped, setEditingHuesped] = useState(null);
  const [editForm, setEditForm] = useState({
    nombre_completo: "",
    email: "",
    telefono: "",
    documento: ""
  });

  // Cargar huéspedes
  const loadHuespedes = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.getHuespedes();
      setHuespedes(data);
    } catch (err) {
      setError(err.error || "Error al cargar huéspedes");
      console.error("Error al cargar huéspedes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHuespedes();
  }, []);

  // Ver detalles de un huésped
  const verDetalles = async (huesped) => {
    try {
      const detalles = await api.getHuesped(huesped.id);
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
      const updated = await api.updateHuesped(editingHuesped, editForm);
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

  // Eliminar huésped
  const deleteHuesped = async (huesped) => {
    const confirmDelete = window.confirm(
      `¿Estás seguro de que quieres eliminar al huésped "${huesped.nombre_completo}"?\n\n` +
      `Esta acción no se puede deshacer y eliminará también todo su historial de reservas.`
    );

    if (!confirmDelete) return;

    try {
      await api.deleteHuesped(huesped.id);
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
      <div className="text-center py-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        <p className="mt-2">Cargando huéspedes...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Gestión de Huéspedes</h4>
        <button className="btn btn-outline-primary" onClick={loadHuespedes}>
          Refrescar
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {huespedes.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-muted">No hay huéspedes registrados</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Tipo</th>
                <th>Tenant</th>
                <th>Reservas</th>
                <th>Total Gastado</th>
                <th>Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {huespedes.map(huesped => (
                <tr key={huesped.id}>
                  <td>
                    {editingHuesped === huesped.id ? (
                      <input
                        className="form-control form-control-sm"
                        value={editForm.nombre_completo}
                        onChange={e => setEditForm({...editForm, nombre_completo: e.target.value})}
                        required
                      />
                    ) : (
                      <strong>{huesped.nombre_completo || "Sin nombre"}</strong>
                    )}
                  </td>
                  <td>
                    {editingHuesped === huesped.id ? (
                      <input
                        type="email"
                        className="form-control form-control-sm"
                        value={editForm.email}
                        onChange={e => setEditForm({...editForm, email: e.target.value})}
                        required
                      />
                    ) : (
                      huesped.email || "—"
                    )}
                  </td>
                  <td>
                    {editingHuesped === huesped.id ? (
                      <input
                        className="form-control form-control-sm"
                        value={editForm.telefono}
                        onChange={e => setEditForm({...editForm, telefono: e.target.value})}
                      />
                    ) : (
                      huesped.telefono || "—"
                    )}
                  </td>
                  <td>
                    <span className={`badge ${huesped.source === 'huesped_table' ? 'bg-primary' : 'bg-info'}`}>
                      {huesped.source === 'huesped_table' ? 'Ficha' : 'Usuario'}
                    </span>
                  </td>
                  <td>
                    <small className="text-muted">
                      {huesped.tenant_nombre || huesped.tenant_id}
                    </small>
                  </td>
                  <td>
                    <div className="small">
                      <div className="text-success"><i className="bi bi-check-circle"></i> {huesped.reservas_confirmadas || 0}</div>
                      <div className="text-warning"><i className="bi bi-clock"></i> {huesped.reservas_pendientes || 0}</div>
                      <div className="text-muted">Total: {huesped.total_reservas || 0}</div>
                    </div>
                  </td>
                  <td>
                    <span className="text-success">
                      {formatMoney(huesped.total_gastado)}
                    </span>
                  </td>
                  <td>
                    <small className="text-muted">
                      {formatDate(huesped.created_at)}
                    </small>
                  </td>
                  <td>
                    {editingHuesped === huesped.id ? (
                      <div className="btn-group btn-group-sm">
                        <button 
                          className="btn btn-success"
                          onClick={saveEdit}
                          type="button"
                        >
                          <i className="bi bi-check"></i>
                        </button>
                        <button 
                          className="btn btn-secondary"
                          onClick={cancelEdit}
                          type="button"
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                    ) : (
                      <div className="btn-group btn-group-sm">
                        <button 
                          className="btn btn-outline-info"
                          onClick={() => verDetalles(huesped)}
                          title="Ver detalles"
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        {huesped.source === 'huesped_table' && (
                          <button 
                            className="btn btn-outline-primary"
                            onClick={() => startEdit(huesped)}
                            title="Editar"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                        )}
                        <button 
                          className="btn btn-outline-danger"
                          onClick={() => deleteHuesped(huesped)}
                          title="Eliminar"
                          disabled={huesped.total_reservas > 0 && (huesped.reservas_confirmadas > 0 || huesped.reservas_pendientes > 0)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de detalles */}
      {showModal && selectedHuesped && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Detalles de {selectedHuesped.nombre_completo}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Información Personal</h6>
                    <p><strong>Tipo:</strong> 
                      <span className={`badge ms-1 ${selectedHuesped.source === 'huesped_table' ? 'bg-primary' : 'bg-info'}`}>
                        {selectedHuesped.source === 'huesped_table' ? 'Ficha de Huésped' : 'Usuario Registrado'}
                      </span>
                    </p>
                    <p><strong>Nombre:</strong> {selectedHuesped.nombre_completo || "—"}</p>
                    <p><strong>Email:</strong> {selectedHuesped.email || "—"}</p>
                    <p><strong>Teléfono:</strong> {selectedHuesped.telefono || "—"}</p>
                    {selectedHuesped.source === 'huesped_table' && (
                      <p><strong>Documento:</strong> {selectedHuesped.documento || "—"}</p>
                    )}
                    <p><strong>Tenant:</strong> {selectedHuesped.tenant_nombre || selectedHuesped.tenant_id}</p>
                    <p><strong>Registrado:</strong> {formatDate(selectedHuesped.created_at)}</p>
                  </div>
                  <div className="col-md-6">
                    <h6>Historial de Reservas</h6>
                    {selectedHuesped.reservas && selectedHuesped.reservas.length > 0 ? (
                      <div className="table-responsive" style={{ maxHeight: "300px", overflowY: "auto" }}>
                        <table className="table table-sm">
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
                                <td>
                                  <small>{reserva.hotel_nombre}</small>
                                </td>
                                <td>
                                  <small>{reserva.habitacion_numero}</small>
                                </td>
                                <td>
                                  <small>
                                    {formatDate(reserva.fecha_inicio)} - {formatDate(reserva.fecha_fin)}
                                  </small>
                                </td>
                                <td>
                                  <small>
                                    <span className={`badge ${reserva.estado === 'confirmada' ? 'bg-success' : reserva.estado === 'pendiente' ? 'bg-warning' : 'bg-secondary'}`}>
                                      {reserva.estado}
                                    </span>
                                  </small>
                                </td>
                                <td>
                                  <small>{formatMoney(reserva.total)}</small>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted">No tiene reservas registradas</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setShowModal(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
