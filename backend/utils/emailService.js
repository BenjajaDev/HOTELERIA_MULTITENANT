import nodemailer from 'nodemailer';

let cachedTransporter = null;

function createTransporter() {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (!host || !user || !pass) {
    return null;
  }

  const secure = process.env.EMAIL_SECURE
    ? String(process.env.EMAIL_SECURE).toLowerCase() === 'true'
    : port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

function getTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = createTransporter();
  }
  return cachedTransporter;
}

export function isEmailConfigured() {
  return Boolean(
    process.env.EMAIL_HOST &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASSWORD
  );
}

export async function sendEmail({ to, subject, html, text }) {
  if (!isEmailConfigured()) {
    throw new Error('El servicio de correo no está configurado');
  }

  const transporter = getTransporter();
  if (!transporter) {
    throw new Error('No se pudo inicializar el transporte de correo');
  }

  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text,
  });
}

export function buildVerificationLink(token) {
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}/verify-email?token=${encodeURIComponent(token)}`;
}

export async function sendVerificationEmail({ to, nombre, token }) {
  const verificationUrl = buildVerificationLink(token);
  const safeNombre = nombre || to;

  const subject = 'Confirma tu correo electrónico';
  const text = `Hola ${safeNombre},\n\n` +
    'Gracias por unirte a DockHotel. Para activar tu cuenta y acceder al sistema, confirma tu correo ' +
    `visitando el siguiente enlace: ${verificationUrl}\n\n` +
    'Si no creaste esta cuenta, puedes ignorar este mensaje.';

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <h2 style="color: #10b981;">¡Hola ${safeNombre}!</h2>
      <p>Has sido registrado en DockHotel. Para activar tu acceso debes confirmar tu correo electrónico.</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${verificationUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Confirmar correo</a>
      </p>
      <p>Si no puedes abrir el botón, copia y pega este enlace en tu navegador:</p>
      <p style="background: #f3f4f6; padding: 12px; border-radius: 6px; word-break: break-all;">${verificationUrl}</p>
      <p style="font-size: 12px; color: #6b7280;">Si no solicitaste este registro, ignora este mensaje.</p>
    </div>
  `;

  await sendEmail({ to, subject, html, text });
}
