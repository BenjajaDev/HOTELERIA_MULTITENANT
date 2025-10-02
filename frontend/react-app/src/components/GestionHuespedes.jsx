import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export default function GestionHuespedes({ restrictTenantId = "", allowCreate = false, userContext = {} }) {
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
  const [createForm, setCreateForm] = useState({
    nombre_completo: "",
    email: "",
    telefono: "",
    documento: "",
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

    setCreateMsg("Creando...");
    try {
      const payload = {
        nombre_completo: createForm.nombre_completo.trim(),
        email: createForm.email.trim(),
        telefono: createForm.telefono || undefined,
        documento: createForm.documento || undefined,
        ...contextPayload,
      };
      if (tenantFilter && !payload.tenant_id && !payload.tenantId) {
        payload.tenant_id = tenantFilter;
      }
      if (!payload.hotelId && userContext?.hotelId) payload.hotelId = userContext.hotelId;
      if (!payload.hotel_id && userContext?.hotel_id) payload.hotel_id = userContext.hotel_id;

      const created = await api.createHuesped(payload);
      setHuespedes(prev => [created, ...prev]);
      setCreateMsg("Huésped creado ✅");
      setCreateForm({ nombre_completo: "", email: "", telefono: "", documento: "" });
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

      {allowCreate && (
        <div className="card p-3 mb-4">
          <h5 className="mb-3">Registrar huésped</h5>
          <form className="row g-3" onSubmit={handleCreate}>
            <div className="col-md-4">
              <label className="form-label">Nombre completo</label>
              <input
                className="form-control"
                value={createForm.nombre_completo}
                onChange={e => setCreateForm(prev => ({ ...prev, nombre_completo: e.target.value }))}
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={createForm.email}
                onChange={e => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Teléfono</label>
              <input
                className="form-control"
                value={createForm.telefono}
                onChange={e => setCreateForm(prev => ({ ...prev, telefono: e.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Documento</label>
              <input
                className="form-control"
                value={createForm.documento}
                onChange={e => setCreateForm(prev => ({ ...prev, documento: e.target.value }))}
              />
            </div>
            <div className="col-12">
              <button className="btn btn-primary" type="submit">Crear huésped</button>
              {createMsg && <span className="small text-muted ms-3">{createMsg}</span>}
            </div>
          </form>
        </div>
      )}

      {filteredHuespedes.length === 0 ? (
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
              {filteredHuespedes.map(huesped => (
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
