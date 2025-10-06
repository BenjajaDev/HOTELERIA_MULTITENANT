import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";

const statusConfig = {
  loading: {
    title: "Verificando correo…",
    color: "#3b82f6",
  },
  success: {
    title: "¡Correo verificado!",
    color: "#10b981",
  },
  expired: {
    title: "Enlace expirado",
    color: "#f59e0b",
  },
  error: {
    title: "No pudimos verificar tu correo",
    color: "#ef4444",
  },
};

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState(token ? "loading" : "error");
  const [message, setMessage] = useState(
    token ? "Estamos confirmando tu cuenta…" : "El enlace recibido es inválido."
  );

  useEffect(() => {
    if (!token) return;

    let active = true;

    api
      .verifyEmail(token)
      .then((res) => {
        if (!active) return;
        setStatus("success");
        setMessage(res?.message || "Tu correo quedó verificado. Ya puedes iniciar sesión.");
      })
      .catch((err) => {
        if (!active) return;
        if (err?.expired) {
          setStatus("expired");
          setMessage(err?.error || "El enlace de verificación expiró. Solicita uno nuevo.");
        } else {
          setStatus("error");
          setMessage(err?.error || err?.message || "No pudimos verificar tu correo. Intenta reenviar el enlace.");
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  const { title, color } = statusConfig[status] || statusConfig.error;

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={{ ...styles.badge, backgroundColor: color }}>{title}</div>
        <p style={styles.message}>{message}</p>
        <div style={styles.actions}>
          <Link to="/" style={styles.primaryButton}>
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #eef2ff 0%, #ecfdf5 100%)",
    padding: "24px",
  },
  card: {
    maxWidth: "480px",
    width: "100%",
    backgroundColor: "white",
    borderRadius: "20px",
    boxShadow: "0 20px 60px rgba(15, 23, 42, 0.12)",
    padding: "40px",
    textAlign: "center",
  },
  badge: {
    display: "inline-block",
    marginBottom: "20px",
    padding: "10px 18px",
    borderRadius: "999px",
    color: "white",
    fontWeight: 600,
    fontSize: "15px",
  },
  message: {
    fontSize: "16px",
    color: "#374151",
    lineHeight: 1.6,
    marginBottom: "32px",
  },
  actions: {
    display: "flex",
    justifyContent: "center",
  },
  primaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 24px",
    borderRadius: "12px",
    backgroundColor: "#1d4ed8",
    color: "white",
    fontWeight: 600,
    textDecoration: "none",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
};
