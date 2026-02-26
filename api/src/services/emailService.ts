import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport(
  process.env.SMTP_URL || {
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT) || 1025,
    secure: false,
    ignoreTLS: true,
  }
);

export async function sendTeamInvitation(params: {
  to: string;
  teamName: string;
  tournamentName: string;
  inviteUrl: string;
  expiresAt: string;
}): Promise<void> {
  const { to, teamName, tournamentName, inviteUrl, expiresAt } = params;
  const appUrl = process.env.APP_URL || 'http://localhost:4000';

  if (!process.env.SMTP_URL && !process.env.SMTP_HOST) {
    console.log('[email] Team invitation (no SMTP configured):', { to, teamName, tournamentName, inviteUrl });
    return;
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'LigaMatch <noreply@ligamatch.local>',
    to,
    subject: `Invitación a gestionar el equipo "${teamName}" en ${tournamentName}`,
    html: `
      <h2>Invitación a LigaMatch</h2>
      <p>Has sido invitado a gestionar el equipo <strong>${teamName}</strong> en el torneo <strong>${tournamentName}</strong>.</p>
      <p>Haz clic en el siguiente enlace para crear tu cuenta y acceder al equipo:</p>
      <p><a href="${inviteUrl}">${inviteUrl}</a></p>
      <p>Este enlace expira el ${new Date(expiresAt).toLocaleString('es-ES')}.</p>
      <p>Si no esperabas esta invitación, puedes ignorar este correo.</p>
      <hr>
      <p style="color:#888;font-size:12px">LigaMatch - Organiza torneos sin complicaciones</p>
    `,
    text: `Invitación a gestionar el equipo "${teamName}" en ${tournamentName}. Crea tu cuenta en: ${inviteUrl}. Expira: ${expiresAt}`,
  });
}

export async function sendPasswordReset(params: {
  to: string;
  resetUrl: string;
  expiresAt: string;
}): Promise<void> {
  const { to, resetUrl, expiresAt } = params;

  if (!process.env.SMTP_URL && !process.env.SMTP_HOST) {
    console.log('[email] Password reset (no SMTP configured):', { to, resetUrl });
    return;
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'LigaMatch <noreply@ligamatch.local>',
    to,
    subject: 'Restablecer contraseña - LigaMatch',
    html: `
      <h2>Restablecer contraseña</h2>
      <p>Has solicitado restablecer la contraseña de tu cuenta en LigaMatch.</p>
      <p>Haz clic en el siguiente enlace para elegir una nueva contraseña:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Este enlace expira el ${new Date(expiresAt).toLocaleString('es-ES')}.</p>
      <p>Si no solicitaste este cambio, puedes ignorar este correo; tu contraseña no se modificará.</p>
      <hr>
      <p style="color:#888;font-size:12px">LigaMatch - Organiza torneos sin complicaciones</p>
    `,
    text: `Restablecer contraseña - LigaMatch. Abre este enlace para continuar: ${resetUrl}. Expira: ${expiresAt}`,
  });
}

export async function sendMessageCopy(params: {
  to: string;
  fromName: string;
  body: string;
  conversationLink: string;
}): Promise<void> {
  const { to, fromName, body, conversationLink } = params;

  if (!process.env.SMTP_URL && !process.env.SMTP_HOST) {
    console.log('[email] Message copy (no SMTP configured):', { to, fromName });
    return;
  }
  const safeBody = body.slice(0, 2000).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'LigaMatch <noreply@ligamatch.local>',
    to,
    subject: `Mensaje de ${fromName} - LigaMatch`,
    html: `
      <h2>Nuevo mensaje en LigaMatch</h2>
      <p><strong>${fromName}</strong> te ha enviado un mensaje:</p>
      <div style="background:#f5f5f5;padding:1em;border-radius:8px;margin:1em 0;">${safeBody}</div>
      <p><a href="${conversationLink}">Ver conversación y responder</a></p>
      <hr>
      <p style="color:#888;font-size:12px">LigaMatch - Organiza torneos sin complicaciones. Copia de tu mensaje.</p>
    `,
    text: `Mensaje de ${fromName} en LigaMatch:\n\n${body.slice(0, 2000)}\n\nVer conversación: ${conversationLink}`,
  });
}

/** Copy of the message sent by the user, to their own email (for records; messages older than 1 month are removed). */
export async function sendMessageCopyToSender(params: {
  to: string;
  body: string;
  conversationLink: string;
  recipientName?: string;
}): Promise<void> {
  const { to, body, conversationLink, recipientName } = params;

  if (!process.env.SMTP_URL && !process.env.SMTP_HOST) {
    console.log('[email] Message copy to sender (no SMTP configured):', { to });
    return;
  }
  const safeBody = body.slice(0, 2000).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  const toWhom = recipientName ? ` a ${recipientName}` : '';
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'LigaMatch <noreply@ligamatch.local>',
    to,
    subject: 'Copia del mensaje que enviaste - LigaMatch',
    html: `
      <h2>Copia de tu mensaje</h2>
      <p>Esta es una copia del mensaje que enviaste${toWhom} en LigaMatch:</p>
      <div style="background:#f5f5f5;padding:1em;border-radius:8px;margin:1em 0;">${safeBody}</div>
      <p><a href="${conversationLink}">Ver conversación</a></p>
      <hr>
      <p style="color:#888;font-size:12px">Los mensajes de más de un mes no se conservan en la aplicación. Guarda este correo si necesitas el historial.</p>
    `,
    text: `Copia del mensaje que enviaste${toWhom} en LigaMatch:\n\n${body.slice(0, 2000)}\n\nVer conversación: ${conversationLink}`,
  });
}

export async function sendBroadcastMessage(params: {
  to: string;
  fromName: string;
  subject: string;
  body: string;
  dashboardLink: string;
}): Promise<void> {
  const { to, fromName, subject, body, dashboardLink } = params;

  if (!process.env.SMTP_URL && !process.env.SMTP_HOST) {
    console.log('[email] Broadcast message (no SMTP configured):', { to, fromName });
    return;
  }
  const safeBody = body.slice(0, 2000).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'LigaMatch <noreply@ligamatch.local>',
    to,
    subject: subject || `Mensaje del organizador - LigaMatch`,
    html: `
      <h2>Mensaje del organizador</h2>
      <p><strong>${fromName}</strong> te envía un mensaje:</p>
      <div style="background:#f5f5f5;padding:1em;border-radius:8px;margin:1em 0;">${safeBody}</div>
      <p><a href="${dashboardLink}">Ver en el panel</a></p>
      <hr>
      <p style="color:#888;font-size:12px">LigaMatch</p>
    `,
    text: `Mensaje de ${fromName}:\n\n${body.slice(0, 2000)}\n\nVer en el panel: ${dashboardLink}`,
  });
}
