import React, { useState, useEffect } from 'react';
import { api } from '../api';
import './AuthPage.css';

export default function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    telefono: '',
    documento: '',
    hotel_id: '',
    sucursal_id: ''
  });
  const [hoteles, setHoteles] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [rememberMe, setRememberMe] = useState(false);

  // Cargar hoteles al montar el componente
  useEffect(() => {
    const loadHoteles = async () => {
      try {
        const data = await api.getHoteles();
        setHoteles(data || []);
      } catch (err) {
        console.error('Error cargando hoteles:', err);
      }
    };
    loadHoteles();
  }, []);

  // Cargar sucursales cuando se selecciona un hotel
  useEffect(() => {
    const loadSucursales = async () => {
      if (!formData.hotel_id) {
        setSucursales([]);
        setFormData(prev => ({ ...prev, sucursal_id: '' }));
        return;
      }
      try {
        const data = await api.getSucursales({ hotelId: formData.hotel_id });
        setSucursales(data || []);
        if (data && data.length > 0) {
          setFormData(prev => ({ ...prev, sucursal_id: data[0].sucursal_id }));
        }
      } catch (err) {
        console.error('Error cargando sucursales:', err);
        setSucursales([]);
      }
    };
    loadSucursales();
  }, [formData.hotel_id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setMessage({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (isLogin) {
        // Login
        const res = await api.login({
          email: formData.email,
          password: formData.password
        });

        if (res?.user) {
          setMessage({ type: 'success', text: res.message || '¡Bienvenido de nuevo!' });
          setTimeout(() => {
            onLogin(res.user);
          }, 1000);
        } else {
          setMessage({ type: 'error', text: res?.message || 'Error al iniciar sesión' });
        }
      } else {
        // Registro
        if (!formData.hotel_id) {
          setMessage({ type: 'error', text: 'Por favor seleccione un hotel' });
          setLoading(false);
          return;
        }

        if (!formData.sucursal_id) {
          setMessage({ type: 'error', text: 'Por favor seleccione una sucursal' });
          setLoading(false);
          return;
        }

        // Validar RUT chileno
        const rutLimpio = formData.documento.trim().toUpperCase();
        if (!/^\d{7,8}-[\dK]$/.test(rutLimpio)) {
          setMessage({ type: 'error', text: 'Ingrese un RUT válido (ej: 20759513-6)' });
          setLoading(false);
          return;
        }

        const res = await api.registerHuesped({
          hotel_id: formData.hotel_id,
          sucursal_id: formData.sucursal_id,
          email: formData.email,
          password: formData.password,
          nombre: formData.nombre,
          telefono: formData.telefono,
          documento: rutLimpio
        });

        setMessage({ type: 'success', text: res.message || '¡Cuenta creada exitosamente! Ya puedes iniciar sesión.' });
        
        // Cambiar a modo login después de 2 segundos
        setTimeout(() => {
          toggleMode();
        }, 2000);
      }
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.error || err.message || 'Error en la operación' 
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      nombre: '',
      telefono: '',
      documento: '',
      hotel_id: '',
      sucursal_id: ''
    });
    setMessage({ type: '', text: '' });
    setRememberMe(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="bg-blob blob-1"></div>
        <div className="bg-blob blob-2"></div>
        <div className="bg-blob blob-3"></div>
      </div>

      <div className="auth-card">
        <div className="auth-grid">
          {/* Panel izquierdo - Branding */}
          <div className="auth-branding">
            <div className="branding-content">
              <div className="logo-section">
                <div className="logo-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="9 22 9 12 15 12 15 22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="logo-text">
                  <h2>DockHotel</h2>
                  <p>Professional Manager</p>
                </div>
              </div>

              <div className="branding-slogan">
                <h1>Gestión hotelera simplificada</h1>
                <p>La plataforma integral para cadenas hoteleras modernas</p>
              </div>

              <div className="features-list">
                <div className="feature-item">
                  <div className="feature-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span>Multi-propiedad</span>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span>Seguridad avanzada</span>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="9" cy="7" r="4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span>Control total</span>
                </div>
              </div>
            </div>
          </div>

          {/* Panel derecho - Formulario */}
          <div className="auth-form-panel">
            <div className="form-header">
              <h2>{isLogin ? "Bienvenido" : "Crear cuenta"}</h2>
              <p>{isLogin ? "Accede a tu panel de control" : "Regístrate para comenzar"}</p>
            </div>

            {message.text && (
              <div className={`alert ${message.type === "success" ? "alert-success" : "alert-error"}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              {!isLogin && (
                <div className="form-group">
                  <label>Nombre completo</label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    required={!isLogin}
                    placeholder="Juan Pérez"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="tu@email.com"
                />
              </div>

              <div className="form-group">
                <label>Contraseña</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  placeholder="••••••••"
                />
              </div>

              {!isLogin && (
                <>
                  <div className="form-group">
                    <label>Hotel</label>
                    <select
                      name="hotel_id"
                      value={formData.hotel_id}
                      onChange={handleInputChange}
                      required={!isLogin}
                    >
                      <option value="">Selecciona un hotel</option>
                      {hoteles.map((hotel) => (
                        <option key={hotel.hotel_id} value={hotel.hotel_id}>
                          {hotel.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.hotel_id && sucursales.length > 0 && (
                    <div className="form-group">
                      <label>Sucursal</label>
                      <select
                        name="sucursal_id"
                        value={formData.sucursal_id}
                        onChange={handleInputChange}
                        required={!isLogin}
                      >
                        <option value="">Selecciona una sucursal</option>
                        {sucursales.map((sucursal) => (
                          <option key={sucursal.sucursal_id} value={sucursal.sucursal_id}>
                            {sucursal.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Teléfono</label>
                    <input
                      type="tel"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleInputChange}
                      required={!isLogin}
                      placeholder="+56912345678"
                    />
                  </div>

                  <div className="form-group">
                    <label>RUT (con guión)</label>
                    <input
                      type="text"
                      name="documento"
                      value={formData.documento}
                      onChange={handleInputChange}
                      required={!isLogin}
                      placeholder="12345678-9"
                    />
                  </div>
                </>
              )}

              {isLogin && (
                <div className="form-options">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Recordarme</span>
                  </label>
                  <button type="button" className="link-button">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}

              {!isLogin && (
                <p className="terms-text">
                  Al registrarte, aceptas nuestros términos y políticas de privacidad
                </p>
              )}

              <button type="submit" disabled={loading} className="submit-button">
                {loading ? "Procesando..." : isLogin ? "Iniciar sesión" : "Crear cuenta"}
              </button>
            </form>

            <div className="toggle-mode">
              <p>
                {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
                <button type="button" onClick={toggleMode} className="toggle-button">
                  {isLogin ? "Regístrate aquí" : "Inicia sesión"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
