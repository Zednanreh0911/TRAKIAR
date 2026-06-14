const nodemailer = require('nodemailer');

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('Falta configurar SMTP_HOST, SMTP_USER o SMTP_PASS');
  }

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

async function sendPasswordResetCode({ to, name, code }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!from) {
    throw new Error('Falta configurar SMTP_FROM o SMTP_USER');
  }

  const transporter = getTransporter();
  const subject = 'Trakiar - Código para restablecer tu contraseña';
  const text = `Hola${name ? ` ${name}` : ''},\n\nTu código para restablecer la contraseña es: ${code}\n\nEste código vence en 15 minutos. Si no lo pediste, ignora este mensaje.`;

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1a2a4a;">
        <h2>Restablecer contraseña</h2>
        <p>Hola${name ? ` ${name}` : ''},</p>
        <p>Tu código para restablecer la contraseña es:</p>
        <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; margin: 16px 0;">${code}</div>
        <p>Este código vence en 15 minutos.</p>
        <p>Si no pediste este cambio, puedes ignorar este correo.</p>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetCode };