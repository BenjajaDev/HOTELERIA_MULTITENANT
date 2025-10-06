import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function GuestProfile({ user, onProfileUpdate = () => {} }) {
  const [form, setForm] = useState({
    nombre: user?.nombre || "",
    email: user?.email || "",
    telefono: "",
    documento: "",
    passwordActual: "",
    nuevoPassword: "",
    confirmarPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      nombre: user?.nombre || "",
      email: user?.email || "",
    }));
  }, [user?.nombre, user?.email]);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!user?.user_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const data = await api.getHuesped(user.user_id, {
          tenant_id: user.tenant_id,
        });

        if (isMounted && data) {
          setForm((prev) => ({
            ...prev,
            nombre: data.nombre_completo || prev.nombre || user?.nombre || "",
            telefono: data.telefono || "",
            documento: data.documento || "",
          }));
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.error || "No se pudieron cargar tus datos");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [user?.user_id, user?.tenant_id, user?.nombre]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    const nombre = form.nombre.trim();
    if (!nombre) {
      setError("El nombre es obligatorio");
      return;
    }

    if (form.nuevoPassword && form.nuevoPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (form.nuevoPassword && form.nuevoPassword !== form.confirmarPassword) {
      setError("La confirmación no coincide con la nueva contraseña");
      return;
    }

    const payload = {
      nombre,
      telefono: form.telefono,
      documento: form.documento,
      passwordActual: form.passwordActual || undefined,
      nuevoPassword: form.nuevoPassword || undefined,
      usuarioId: user?.user_id || user?.usuario_id,
      tenantId: user?.tenant_id,
    };

    try {
      setSaving(true);
      const response = await api.updateGuestProfile(user.user_id, payload);
      const successMessage = response?.message || "Datos actualizados correctamente";
      setMessage(successMessage);

      setForm((prev) => ({
        ...prev,
        nombre: response?.huesped?.nombre_completo || nombre,
        telefono: response?.huesped?.telefono || "",
        documento: response?.huesped?.documento || "",
        passwordActual: "",
        nuevoPassword: "",
        confirmarPassword: "",
      }));

      const updatedPayload = {
        ...(response?.usuario || {}),
        nombre: response?.usuario?.nombre || response?.huesped?.nombre_completo || nombre,
        email: response?.usuario?.email || user?.email,
        usuario_id: response?.usuario?.usuario_id || user?.user_id || user?.usuario_id,
        user_id: response?.usuario?.usuario_id || user?.user_id || user?.usuario_id,
        telefono: response?.huesped?.telefono ?? form.telefono,
        documento: response?.huesped?.documento ?? form.documento,
      };

      onProfileUpdate(updatedPayload);
    } catch (err) {
      setError(err?.error || "No se pudieron actualizar tus datos");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-card">
      <h3 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "20px" }}>
        Información Personal
      </h3>

      {loading ? (
        <div style={{ padding: "20px", color: "#64748b" }}>Cargando perfil...</div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px" }}>
            <div className="form-group">
              <label className="form-label">Nombre completo</label>
              <input
                className="form-input"
                value={form.nombre}
                onChange={(e) => handleChange("nombre", e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Correo electrónico</label>
              <input className="form-input" value={form.email} disabled />
              <small style={{ display: "block", marginTop: "6px", color: "#6b7280", fontSize: "12px" }}>
                Comunícate con el administrador si necesitas cambiar tu correo.
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input
                className="form-input"
                placeholder="Ej: +56912345678"
                value={form.telefono}
                onChange={(e) => handleChange("telefono", e.target.value)}
              />
              <small style={{ display: "block", marginTop: "6px", color: "#6b7280", fontSize: "12px" }}>
                Máximo 12 dígitos, incluye +56 si corresponde.
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Documento o RUT</label>
              <input
                className="form-input"
                placeholder="Ej: 12345678-9"
                value={form.documento}
                onChange={(e) => handleChange("documento", e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: "32px" }}>
            <h4 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>
              Cambiar contraseña
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Contraseña actual</label>
                <input
                  type="password"
                  className="form-input"
                  value={form.passwordActual}
                  onChange={(e) => handleChange("passwordActual", e.target.value)}
                  placeholder="Necesaria para confirmar cambios"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nueva contraseña</label>
                <input
                  type="password"
                  className="form-input"
                  value={form.nuevoPassword}
                  onChange={(e) => handleChange("nuevoPassword", e.target.value)}
                  placeholder="Al menos 8 caracteres"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Repetir nueva contraseña</label>
                <input
                  type="password"
                  className="form-input"
                  value={form.confirmarPassword}
                  onChange={(e) => handleChange("confirmarPassword", e.target.value)}
                />
              </div>
            </div>
            <small style={{ display: "block", marginTop: "8px", color: "#6b7280", fontSize: "12px" }}>
              Completa los campos anteriores solo si deseas cambiar tu contraseña.
            </small>
          </div>

          {(error || message) && (
            <div
              className={`alert-box ${error ? "alert-error" : "alert-success"}`}
              style={{ marginTop: "24px" }}
            >
              {error || message}
            </div>
          )}

          <div style={{ marginTop: "24px" }}>
            <button className="btn-primary-custom" type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
