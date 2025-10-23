import React, { useState, useEffect } from "react";
import { api } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import "./DetallePagoModal.css";

// Estilos para impresión
const printStyles = `
  @media print {
    @page {
      margin: 1cm;
      size: A4;
    }
    
    * {
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: black;
      background: white;
    }
    
    .modal-backdrop,
    .modal,
    .no-print,
    .btn,
    .modal-header,
    .modal-footer {
      display: none !important;
    }
    
    .print-content {
      display: block !important;
      position: static !important;
      width: 100% !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      color: black !important;
    }
    
    .print-header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid black;
    }
    
    .print-header h1 {
      font-size: 20px;
      margin: 0 0 5px 0;
      font-weight: bold;
    }
    
    .print-header h2 {
      font-size: 16px;
      margin: 15px 0 5px 0;
      font-weight: bold;
    }
    
    .print-section {
      margin: 15px 0;
    }
    
    .print-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
    }
    
    .print-col {
      flex: 1;
      padding-right: 20px;
    }
    
    .print-col:last-child {
      padding-right: 0;
    }
    
    .print-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    
    .print-table th,
    .print-table td {
      border: 1px solid black;
      padding: 6px;
      text-align: left;
      font-size: 11px;
    }
    
    .print-table th {
      background-color: #f0f0f0 !important;
      font-weight: bold;
    }
    
    .print-totals {
      margin-top: 20px;
      text-align: right;
    }
    
    .print-total-line {
      margin: 3px 0;
      font-size: 12px;
    }
    
    .print-total-final {
      font-size: 14px;
      font-weight: bold;
      border-top: 2px solid black;
      padding-top: 8px;
      margin-top: 8px;
    }
  }
`;

const DetallePagoModal = ({ pagoId, isOpen, onClose, context = {} }) => {
  const [boleta, setBoleta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { isDarkMode } = useTheme();

  useEffect(() => {
    if (isOpen && pagoId) {
      loadBoleta();
    }
  }, [isOpen, pagoId]);

  const loadBoleta = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.getBoleta(pagoId, context);
      setBoleta(data);
    } catch (err) {
      setError(err.error || "Error al cargar boleta");
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat("es-CL", { 
      style: "currency", 
      currency: "CLP" 
    }).format(value || 0);
  };

  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("es-CL");
  };

  const handlePrint = () => {
    if (!boleta) return;
    
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Boleta ${boleta.numero_boleta}</title>
          <meta charset="utf-8">
          <style>
            @page {
              margin: 1cm;
              size: A4;
            }
            
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
              color: black;
              background: white;
              margin: 0;
              padding: 20px;
            }
            
            .print-header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid black;
            }
            
            .print-header h1 {
              font-size: 20px;
              margin: 0 0 5px 0;
              font-weight: bold;
            }
            
            .print-header h2 {
              font-size: 16px;
              margin: 15px 0 5px 0;
              font-weight: bold;
            }
            
            .print-header p {
              margin: 5px 0;
            }
            
            .print-section {
              margin: 15px 0;
            }
            
            .print-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 15px;
            }
            
            .print-col {
              flex: 1;
              padding-right: 20px;
            }
            
            .print-col:last-child {
              padding-right: 0;
            }
            
            .print-col h3 {
              font-size: 14px;
              margin: 0 0 10px 0;
              font-weight: bold;
            }
            
            .print-col p {
              margin: 5px 0;
            }
            
            .print-table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            
            .print-table th,
            .print-table td {
              border: 1px solid black;
              padding: 6px;
              text-align: left;
              font-size: 11px;
            }
            
            .print-table th {
              background-color: #f0f0f0;
              font-weight: bold;
            }
            
            .print-totals {
              margin-top: 20px;
              text-align: right;
            }
            
            .print-total-line {
              margin: 3px 0;
              font-size: 12px;
            }
            
            .print-total-final {
              font-size: 14px;
              font-weight: bold;
              border-top: 2px solid black;
              padding-top: 8px;
              margin-top: 8px;
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>${boleta.hotel.nombre}</h1>
            <p>${boleta.hotel.direccion}</p>
            <p>Tel: ${boleta.hotel.telefono} | Email: ${boleta.hotel.email}</p>
            <h2>BOLETA DE PAGO</h2>
            <p><strong>N° ${boleta.numero_boleta}</strong></p>
            <p>Fecha: ${formatDate(boleta.fecha_emision)}</p>
          </div>

          <div class="print-section">
            <div class="print-row">
              <div class="print-col">
                <h3>Datos del Cliente</h3>
                <p><strong>Nombre:</strong> ${boleta.cliente.nombre}</p>
                <p><strong>Email:</strong> ${boleta.cliente.email}</p>
              </div>
              <div class="print-col">
                <h3>Información del Pago</h3>
                <p><strong>Método:</strong> ${boleta.pago.metodo}</p>
                <p><strong>Estado:</strong> ${boleta.pago.estado}</p>
                ${boleta.pago.referencia ? `<p><strong>Referencia:</strong> ${boleta.pago.referencia}</p>` : ''}
              </div>
            </div>
          </div>

          <div class="print-section">
            <h3>Detalle de la Reserva</h3>
            <table class="print-table">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th style="text-align: center; width: 80px;">Cantidad</th>
                  <th style="text-align: right; width: 120px;">Precio Unit.</th>
                  <th style="text-align: right; width: 120px;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${boleta.detalles_facturacion.map(item => `
                  <tr>
                    <td>${item.descripcion}</td>
                    <td style="text-align: center;">${item.cantidad}</td>
                    <td style="text-align: right;">${formatMoney(item.precio_unitario)}</td>
                    <td style="text-align: right;">${formatMoney(item.subtotal)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="print-section">
            <div class="print-row">
              <div class="print-col">
                ${boleta.observaciones ? `
                  <div>
                    <h4>Observaciones</h4>
                    <p>${boleta.observaciones}</p>
                  </div>
                ` : ''}
              </div>
              <div class="print-col">
                <div class="print-totals">
                  <div class="print-total-line">Subtotal: ${formatMoney(boleta.subtotal)}</div>
                  <div class="print-total-line">IVA (19%): ${formatMoney(boleta.iva)}</div>
                  <div class="print-total-final">TOTAL: ${formatMoney(boleta.total)}</div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Esperar a que se cargue completamente antes de imprimir
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{printStyles}</style>
      <div className={`modal show d-block detalle-pago-modal ${isDarkMode ? 'dark-mode' : ''}`} style={{ backgroundColor: isDarkMode ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.5)" }}>
        <div className="modal-dialog modal-xl" style={{ maxWidth: '90%', width: '1200px' }}>
          <div className="modal-content" style={{
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
            color: isDarkMode ? '#e2e8f0' : '#212529'
          }}>
            <div className={`modal-header no-print`} style={{
              backgroundColor: isDarkMode ? '#0f172a' : '#343a40',
              color: '#ffffff',
              borderBottom: `1px solid ${isDarkMode ? '#334155' : '#dee2e6'}`
            }}>
              <h5 className="modal-title">
                <i className="bi bi-receipt me-2"></i>
                Boleta de Pago
              </h5>
              <button 
                type="button" 
                className="btn-close btn-close-white" 
                onClick={onClose}
              ></button>
            </div>
            
            <div className="modal-body" style={{ 
              padding: '25px',
              maxHeight: '80vh',
              overflowY: 'auto',
              backgroundColor: isDarkMode ? '#1e293b' : '#ffffff'
            }}>
              {error && (
                <div className="alert alert-danger no-print">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                </div>
              )}
              
              {loading && (
                <div className="text-center no-print" style={{ padding: '60px 0' }}>
                  <div className="spinner-border" role="status" style={{ 
                    width: '3rem', 
                    height: '3rem',
                    color: isDarkMode ? '#60a5fa' : '#0d6efd'
                  }}>
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                  <p className="mt-3" style={{ 
                    fontSize: '16px',
                    color: isDarkMode ? '#94a3b8' : '#6c757d'
                  }}>
                    <i className="bi bi-hourglass-split me-2"></i>
                    Cargando boleta de pago...
                  </p>
                </div>
              )}
              
              {boleta && (
                <div className="print-content" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  {/* Encabezado del Hotel */}
                  <div style={{ 
                    textAlign: 'center', 
                    marginBottom: '30px', 
                    paddingBottom: '20px', 
                    borderBottom: `1px solid ${isDarkMode ? '#334155' : '#dee2e6'}`,
                    background: isDarkMode ? '#0f172a' : '#f8f9fa',
                    padding: '25px',
                    borderRadius: '8px',
                    border: `1px solid ${isDarkMode ? '#334155' : '#dee2e6'}`
                  }}>
                    <h1 style={{ 
                      fontSize: '28px', 
                      fontWeight: 'bold', 
                      color: isDarkMode ? '#f1f5f9' : '#212529',
                      margin: '0 0 8px 0'
                    }}>
                      {boleta.hotel.nombre}
                    </h1>
                    <p style={{ 
                      margin: '4px 0', 
                      color: isDarkMode ? '#94a3b8' : '#6c757d', 
                      fontSize: '14px' 
                    }}>
                      <i className="bi bi-geo-alt-fill me-1" style={{ color: isDarkMode ? '#64748b' : '#495057' }}></i>
                      {boleta.hotel.direccion}
                    </p>
                    <p style={{ 
                      margin: '4px 0', 
                      color: isDarkMode ? '#94a3b8' : '#6c757d', 
                      fontSize: '14px' 
                    }}>
                      <i className="bi bi-telephone-fill me-1" style={{ color: isDarkMode ? '#64748b' : '#495057' }}></i>
                      {boleta.hotel.telefono} 
                      <span className="mx-2">|</span>
                      <i className="bi bi-envelope-fill me-1" style={{ color: isDarkMode ? '#64748b' : '#495057' }}></i>
                      {boleta.hotel.email}
                    </p>
                    
                    <div style={{ 
                      marginTop: '20px',
                      padding: '15px',
                      background: isDarkMode ? '#1e293b' : '#ffffff',
                      borderRadius: '6px',
                      border: `1px solid ${isDarkMode ? '#334155' : '#dee2e6'}`,
                      boxShadow: isDarkMode ? '0 1px 3px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}>
                      <h2 style={{ 
                        fontSize: '22px', 
                        fontWeight: 'bold', 
                        color: isDarkMode ? '#f1f5f9' : '#212529',
                        margin: '0 0 10px 0'
                      }}>
                        BOLETA DE PAGO
                      </h2>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ 
                          fontSize: '16px', 
                          fontWeight: 'bold',
                          color: isDarkMode ? '#f1f5f9' : '#212529',
                          background: isDarkMode ? '#334155' : '#e9ecef',
                          padding: '5px 10px',
                          borderRadius: '4px',
                          border: `1px solid ${isDarkMode ? '#475569' : '#ced4da'}`
                        }}>
                          N° {boleta.numero_boleta}
                        </span>
                        <span style={{ fontSize: '14px', color: isDarkMode ? '#94a3b8' : '#6c757d' }}>
                          <i className="bi bi-calendar3 me-1" style={{ color: isDarkMode ? '#cbd5e1' : '#495057' }}></i>
                          {formatDate(boleta.fecha_emision)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Información del Cliente y Pago */}
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <div className="card h-100" style={{
                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                        border: `1px solid ${isDarkMode ? '#334155' : '#dee2e6'}`
                      }}>
                        <div className="card-body">
                          <h3 style={{ 
                            fontSize: '18px', 
                            fontWeight: 'bold', 
                            color: isDarkMode ? '#f1f5f9' : '#212529',
                            marginBottom: '15px',
                            borderBottom: `1px solid ${isDarkMode ? '#334155' : '#dee2e6'}`,
                            paddingBottom: '8px'
                          }}>
                            <i className="bi bi-person-fill me-2" style={{ color: isDarkMode ? '#cbd5e1' : '#495057' }}></i>
                            Datos del Cliente
                          </h3>
                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: isDarkMode ? '#cbd5e1' : '#495057' }}>Nombre:</strong>
                            <span style={{ marginLeft: '8px', color: isDarkMode ? '#e2e8f0' : '#212529' }}>{boleta.cliente.nombre}</span>
                          </div>
                          <div>
                            <strong style={{ color: isDarkMode ? '#cbd5e1' : '#495057' }}>Email:</strong>
                            <span style={{ marginLeft: '8px', color: isDarkMode ? '#e2e8f0' : '#212529' }}>{boleta.cliente.email}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card h-100" style={{
                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                        border: `1px solid ${isDarkMode ? '#334155' : '#dee2e6'}`
                      }}>
                        <div className="card-body">
                          <h3 style={{ 
                            fontSize: '18px', 
                            fontWeight: 'bold', 
                            color: isDarkMode ? '#f1f5f9' : '#212529',
                            marginBottom: '15px',
                            borderBottom: `1px solid ${isDarkMode ? '#334155' : '#dee2e6'}`,
                            paddingBottom: '8px'
                          }}>
                            <i className="bi bi-credit-card-fill me-2" style={{ color: isDarkMode ? '#cbd5e1' : '#495057' }}></i>
                            Información del Pago
                          </h3>
                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: isDarkMode ? '#cbd5e1' : '#495057' }}>Método:</strong>
                            <span className="badge ms-2" style={{ 
                              fontSize: '12px',
                              textTransform: 'capitalize',
                              backgroundColor: isDarkMode ? '#334155' : '#f8f9fa',
                              color: isDarkMode ? '#e2e8f0' : '#212529'
                            }}>
                              {boleta.pago.metodo}
                            </span>
                          </div>
                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: isDarkMode ? '#cbd5e1' : '#495057' }}>Estado:</strong>
                            <span className="badge ms-2" style={{ 
                              fontSize: '12px',
                              textTransform: 'capitalize',
                              backgroundColor: isDarkMode ? '#1e293b' : '#212529',
                              color: '#ffffff'
                            }}>
                              {boleta.pago.estado}
                            </span>
                          </div>
                          {boleta.pago.referencia && (
                            <div>
                              <strong style={{ color: '#495057' }}>Referencia:</strong>
                              <span style={{ marginLeft: '8px', color: '#212529', fontFamily: 'monospace' }}>
                                {boleta.pago.referencia}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detalle de la Reserva */}
                  <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ 
                      fontSize: '18px', 
                      fontWeight: 'bold', 
                      color: isDarkMode ? '#f1f5f9' : '#212529',
                      marginBottom: '15px',
                      borderBottom: `1px solid ${isDarkMode ? '#334155' : '#dee2e6'}`,
                      paddingBottom: '8px'
                    }}>
                      <i className="bi bi-list-ul me-2" style={{ color: isDarkMode ? '#cbd5e1' : '#495057' }}></i>
                      Detalle de la Reserva
                    </h3>
                    <div className="table-responsive">
                      <table className="table table-hover" style={{
                        color: isDarkMode ? '#e2e8f0' : '#212529'
                      }}>
                        <thead style={{
                          backgroundColor: isDarkMode ? '#334155' : '#212529',
                          color: '#ffffff'
                        }}>
                          <tr>
                            <th>Descripción</th>
                            <th style={{ textAlign: 'center', width: '100px' }}>Cantidad</th>
                            <th style={{ textAlign: 'right', width: '130px' }}>Precio Unit.</th>
                            <th style={{ textAlign: 'right', width: '130px' }}>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody style={{
                          backgroundColor: isDarkMode ? '#1e293b' : '#ffffff'
                        }}>
                          {boleta.detalles_facturacion.map((item, index) => (
                            <tr key={index}>
                              <td style={{ verticalAlign: 'middle' }}>
                                {item.descripcion}
                              </td>
                              <td style={{ 
                                textAlign: 'center', 
                                verticalAlign: 'middle',
                                fontWeight: 'bold'
                              }}>
                                {item.cantidad}
                              </td>
                              <td style={{ 
                                textAlign: 'right', 
                                verticalAlign: 'middle',
                                fontFamily: 'monospace'
                              }}>
                                {formatMoney(item.precio_unitario)}
                              </td>
                              <td style={{ 
                                textAlign: 'right', 
                                verticalAlign: 'middle',
                                fontFamily: 'monospace',
                                fontWeight: 'bold'
                              }}>
                                {formatMoney(item.subtotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Observaciones y Totales */}
                  <div className="row">
                    <div className="col-md-6">
                      {boleta.observaciones && (
                        <div className="card" style={{
                          backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                          border: `1px solid ${isDarkMode ? '#334155' : '#dee2e6'}`
                        }}>
                          <div className="card-body">
                            <h4 style={{ 
                              fontSize: '16px', 
                              fontWeight: 'bold', 
                              color: isDarkMode ? '#f1f5f9' : '#212529',
                              marginBottom: '10px'
                            }}>
                              <i className="bi bi-sticky-fill me-2" style={{ color: isDarkMode ? '#cbd5e1' : '#495057' }}></i>
                              Observaciones
                            </h4>
                            <p style={{ margin: '0', color: isDarkMode ? '#94a3b8' : '#6c757d', fontStyle: 'italic' }}>
                              {boleta.observaciones}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <div className="card" style={{
                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                        border: `1px solid ${isDarkMode ? '#334155' : '#dee2e6'}`
                      }}>
                        <div className="card-body text-end">
                          <div style={{ 
                            marginBottom: '8px',
                            fontSize: '16px',
                            color: isDarkMode ? '#cbd5e1' : '#495057'
                          }}>
                            Subtotal: 
                            <span style={{ 
                              marginLeft: '10px',
                              fontFamily: 'monospace',
                              fontWeight: 'bold',
                              color: isDarkMode ? '#e2e8f0' : '#212529'
                            }}>
                              {formatMoney(boleta.subtotal)}
                            </span>
                          </div>
                          <div style={{ 
                            marginBottom: '15px',
                            fontSize: '16px',
                            color: isDarkMode ? '#cbd5e1' : '#495057'
                          }}>
                            IVA (19%): 
                            <span style={{ 
                              marginLeft: '10px',
                              fontFamily: 'monospace',
                              fontWeight: 'bold',
                              color: isDarkMode ? '#e2e8f0' : '#212529'
                            }}>
                              {formatMoney(boleta.iva)}
                            </span>
                          </div>
                          <div className="border-top pt-3" style={{
                            borderColor: `${isDarkMode ? '#334155' : '#dee2e6'} !important`
                          }}>
                            <div style={{ 
                              fontSize: '20px',
                              fontWeight: 'bold',
                              color: isDarkMode ? '#f1f5f9' : '#212529',
                              background: isDarkMode ? '#334155' : '#f8f9fa',
                              padding: '12px',
                              borderRadius: '4px',
                              border: `1px solid ${isDarkMode ? '#475569' : '#dee2e6'}`
                            }}>
                              TOTAL: 
                              <span style={{ 
                                marginLeft: '15px',
                                fontFamily: 'monospace'
                              }}>
                                {formatMoney(boleta.total)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer no-print" style={{
              backgroundColor: isDarkMode ? '#1e293b' : '#f8f9fa',
              borderTop: `1px solid ${isDarkMode ? '#334155' : '#dee2e6'}`
            }}>
              {boleta && (
                <button 
                  className="btn me-3"
                  onClick={handlePrint}
                  style={{
                    backgroundColor: isDarkMode ? '#334155' : '#212529',
                    borderColor: isDarkMode ? '#475569' : '#212529',
                    color: '#ffffff'
                  }}
                >
                  <i className="bi bi-printer-fill me-2"></i>
                  Imprimir Boleta
                </button>
              )}
              <button 
                type="button" 
                className="btn" 
                onClick={onClose}
                style={{
                  backgroundColor: 'transparent',
                  borderColor: isDarkMode ? '#475569' : '#6c757d',
                  color: isDarkMode ? '#e2e8f0' : '#6c757d'
                }}
              >
                <i className="bi bi-x-circle me-2"></i>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DetallePagoModal;
