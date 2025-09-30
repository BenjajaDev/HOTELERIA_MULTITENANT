import React, { useState, useEffect, useMemo } from "react";
import { api } from "../api";
import DetallePagoModal from "./DetallePagoModal";

const PagosManager = ({ user }) => {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [selectedPagoId, setSelectedPagoId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    estado_pago: "",
    metodo: ""
  });

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }),
    []
  );

  const formatMoney = (value) => currencyFormatter.format(value || 0);
  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("es-CL");
  };

  const loadPagos = async () => {
    try {
      setLoading(true);
      setMsg("");
      
      const params = {};
      if (user?.hotel_id) {
        params.hotelId = user.hotel_id;
      }
      if (filters.estado_pago) {
        params.estado_pago = filters.estado_pago;
      }
      if (filters.metodo) {
        params.metodo = filters.metodo;
      }

      const data = await api.getPagos(params);
      setPagos(Array.isArray(data) ? data : []);
    } catch (error) {
      setMsg(error.error || "Error al cargar pagos");
      setPagos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPagos();
  }, [user?.hotel_id, filters]);

  const openDetalle = (pagoId) => {
    setSelectedPagoId(pagoId);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPagoId(null);
    // Recargar pagos por si hubo cambios
    loadPagos();
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      pagado: "bg-success",
      pendiente: "bg-warning text-dark"
    };
    return badges[estado] || "bg-secondary";
  };

  const getMetodoBadge = (metodo) => {
    const badges = {
      tarjeta: "bg-primary",
      efectivo: "bg-success",
      transferencia: "bg-info"
    };
    return badges[metodo] || "bg-secondary";
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>Gestión de Pagos</h3>
        <button 
          className="btn btn-outline-secondary"
          onClick={loadPagos}
          disabled={loading}
        >
          <i className="bi bi-arrow-clockwise"></i> Actualizar
        </button>
      </div>

      {msg && (
        <div className={`alert ${msg.includes("Error") ? "alert-danger" : "alert-info"}`}>
          {msg}
        </div>
      )}

      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-body">
          <h6 className="card-title">Filtros</h6>
          <div className="row">
            <div className="col-md-3">
              <label className="form-label">Estado de Pago</label>
              <select
                className="form-select"
                value={filters.estado_pago}
                onChange={(e) => setFilters({...filters, estado_pago: e.target.value})}
              >
                <option value="">Todos los estados</option>
                <option value="pagado">Pagado</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Método de Pago</label>
              <select
                className="form-select"
                value={filters.metodo}
                onChange={(e) => setFilters({...filters, metodo: e.target.value})}
              >
                <option value="">Todos los métodos</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      )}

      {/* Tabla de Pagos */}
      {!loading && (
        <div className="card">
          <div className="card-body">
            {pagos.length === 0 ? (
              <div className="text-center text-muted">
                <p>No hay pagos registrados</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>ID Pago</th>
                      <th>Hotel</th>
                      <th>Huésped</th>
                      <th>Habitación</th>
                      <th>Reserva</th>
                      <th>Monto</th>
                      <th>Método</th>
                      <th>Estado</th>
                      <th>Fecha</th>
                      <th>Referencia</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagos.map((pago) => (
                      <tr key={pago.pago_id}>
                        <td>
                          <small className="text-muted">
                            {pago.pago_id.slice(0, 8)}...
                          </small>
                        </td>
                        <td>{pago.hotel_nombre}</td>
                        <td>{pago.huesped_nombre || "—"}</td>
                        <td>#{pago.habitacion_numero}</td>
                        <td>
                          <small>
                            {formatDate(pago.fecha_inicio)} - {formatDate(pago.fecha_fin)}
                          </small>
                        </td>
                        <td className="fw-bold">{formatMoney(pago.monto)}</td>
                        <td>
                          <span className={`badge ${getMetodoBadge(pago.metodo)}`}>
                            {pago.metodo}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getEstadoBadge(pago.estado)}`}>
                            {pago.estado}
                          </span>
                        </td>
                        <td>{formatDate(pago.fecha)}</td>
                        <td>
                          <small className="text-muted">
                            {pago.referencia_transaccion || "—"}
                          </small>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => openDetalle(pago.pago_id)}
                          >
                            Ver Detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Detalle */}
      <DetallePagoModal
        pagoId={selectedPagoId}
        isOpen={showModal}
        onClose={closeModal}
      />
    </div>
  );
};

export default PagosManager;