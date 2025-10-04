import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import DetallePagoModal from "./DetallePagoModal";
import "./DashboardContent.css";

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

  const pagoContext = useMemo(() => ({
    tenantId: user?.tenant_id,
    usuarioId: user?.usuario_id,
    hotelId: user?.hotel_id,
    sucursalId: user?.sucursal_id,
  }), [user]);

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

  const loadPagos = useCallback(async () => {
    if (!pagoContext.hotelId || !pagoContext.tenantId || !pagoContext.usuarioId) {
      setPagos([]);
      setMsg("El usuario no tiene hotel asignado");
      return;
    }

    if (!pagoContext.sucursalId) {
      setPagos([]);
      setMsg("El usuario no tiene una sucursal asignada");
      return;
    }

    try {
      setLoading(true);
      setMsg("");

      const params = {
        ...pagoContext,
      };

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
  }, [filters, pagoContext]);

  useEffect(() => {
    loadPagos();
  }, [loadPagos]);

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
      pagado: "status-success",
      pendiente: "status-warning"
    };
    return badges[estado] || "status-secondary";
  };

  const getMetodoBadge = (metodo) => {
    const badges = {
      tarjeta: "status-info",
      efectivo: "status-success",
      transferencia: "status-info"
    };
    return badges[metodo] || "status-secondary";
  };

  // Calcular estadísticas
  const stats = useMemo(() => {
    const total = pagos.reduce((sum, p) => sum + (p.monto || 0), 0);
    const pagados = pagos.filter(p => p.estado === "pagado");
    const totalPagado = pagados.reduce((sum, p) => sum + (p.monto || 0), 0);
    const totalPendiente = total - totalPagado;
    return {
      total,
      totalPagado,
      totalPendiente,
      cantidadPagados: pagados.length,
      cantidadPendientes: pagos.length - pagados.length
    };
  }, [pagos]);

  return (
    <div>
      {msg && (
        <div className={`alert ${msg.includes("Error") ? "alert-danger" : "alert-success"} mb-3`}>
          {msg}
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="1" y="4" width="22" height="16" rx="2" strokeWidth="2"/>
              <line x1="1" y1="10" x2="23" y2="10" strokeWidth="2"/>
            </svg>
          </div>
          <p className="stat-card-value">{pagos.length}</p>
          <p className="stat-card-label">Total Pagos</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="20 6 9 17 4 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="stat-card-value">{formatMoney(stats.totalPagado)}</p>
          <p className="stat-card-label">Total Pagado ({stats.cantidadPagados})</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
              <polyline points="12 6 12 12 16 14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="stat-card-value">{formatMoney(stats.totalPendiente)}</p>
          <p className="stat-card-label">Total Pendiente ({stats.cantidadPendientes})</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="stat-card-value">{formatMoney(stats.total)}</p>
          <p className="stat-card-label">Total General</p>
        </div>
      </div>

      {/* Filtros y Lista */}
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <div>
            <h3 className="dashboard-card-title">Historial de Pagos</h3>
            <p className="dashboard-card-subtitle">Gestiona y consulta todos los pagos registrados</p>
          </div>
          <button 
            className="btn-primary-custom"
            onClick={loadPagos}
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
              <path d="M1 4v6h6M23 20v-6h-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        {/* Filtros */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px', padding: '0 4px' }}>
          <div>
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
          <div>
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

        {loading && (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
          </div>
        )}

        {/* Lista de Pagos */}
        {!loading && pagos.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="48" height="48">
                <rect x="1" y="4" width="22" height="16" rx="2" strokeWidth="2"/>
                <line x1="1" y1="10" x2="23" y2="10" strokeWidth="2"/>
              </svg>
            </div>
            <p className="empty-state-text">No hay pagos registrados</p>
          </div>
        )}

        {!loading && pagos.length > 0 && (
          <div className="items-list">
            {pagos.map((pago) => (
              <div key={pago.pago_id} className="item-card">
                <div className="item-header">
                  <div className="item-info">
                    <div className="item-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20" style={{ marginRight: '8px' }}>
                        <rect x="1" y="4" width="22" height="16" rx="2" strokeWidth="2"/>
                        <line x1="1" y1="10" x2="23" y2="10" strokeWidth="2"/>
                      </svg>
                      {pago.hotel_nombre}
                    </div>
                    <div className="item-subtitle">
                      <strong>Huésped:</strong> {pago.huesped_nombre || "—"} • 
                      <strong> Habitación #{pago.habitacion_numero}</strong>
                    </div>
                    <div className="item-subtitle" style={{ marginTop: '4px' }}>
                      <strong>Reserva:</strong> {formatDate(pago.fecha_inicio)} → {formatDate(pago.fecha_fin)}
                    </div>
                    <div className="mt-2" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className={`status-badge ${getMetodoBadge(pago.metodo)}`}>
                        {pago.metodo}
                      </span>
                      <span className={`status-badge ${getEstadoBadge(pago.estado)}`}>
                        {pago.estado}
                      </span>
                      <small className="text-muted">
                        Fecha: {formatDate(pago.fecha)}
                      </small>
                      {pago.referencia_transaccion && (
                        <small className="text-muted">
                          Ref: {pago.referencia_transaccion.slice(0, 10)}...
                        </small>
                      )}
                    </div>
                    <button
                      className="btn-secondary-custom btn-sm mt-2"
                      onClick={() => openDetalle(pago.pago_id)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14">
                        <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                        <path d="M12 16v-4M12 8h.01" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Ver Detalle Completo
                    </button>
                  </div>
                  <div className="item-actions" style={{ textAlign: 'right' }}>
                    <div className="fw-bold fs-3" style={{ color: pago.estado === 'pagado' ? '#10b981' : '#f59e0b' }}>
                      {formatMoney(pago.monto)}
                    </div>
                    <small className="text-muted">
                      ID: {pago.pago_id.slice(0, 8)}...
                    </small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Detalle */}
      <DetallePagoModal
        pagoId={selectedPagoId}
        isOpen={showModal}
        onClose={closeModal}
        context={pagoContext}
      />
    </div>
  );
};

export default PagosManager;
