function emailConfig() {
  const host = process.env.EMAIL_HOST || '';
  const port = Number(process.env.EMAIL_PORT || 587);
  const secure = (process.env.EMAIL_SECURE || 'false') === 'true';
  const user = process.env.EMAIL_USER || '';
  const pass = process.env.EMAIL_PASS || '';
  const from = process.env.EMAIL_FROM || user || 'Your Health <no-reply@example.com>';
  return { host, port, secure, user, pass, from };
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function sendWelcomeEmail({ to, name }: { to: string; name: string }) {
  const subject = 'Welcome to Your Health';
  const safeName = escapeHtml(name || 'there');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const safeAppUrl = escapeHtml(appUrl);
  const text = `Hi ${name || 'there'},

Welcome to Your Health.

Your account is ready. You can use the app to create meal plans, save meals, track training, build day and week plans, and share health tips with others.

You can keep your plans private, share plans with a small group of family or friends, or publish meal and training plans as inspiration for others.

Take care,
Your Health`;

  const config = emailConfig();

  if (config.host && config.user && config.pass) {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });
    await transporter.sendMail({
      from: config.from,
      to,
      subject,
      text,
      html: `<div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0f172a;background:#f8fafc;padding:28px"><div style="max-width:620px;margin:auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:28px"><p style="margin:0 0 10px;color:#64748b;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:12px">Your Health</p><h1 style="margin:0 0 14px;font-size:30px;color:#020617">Welcome to Your Health</h1><p>Hi ${safeName},</p><p>Your account is ready. No email confirmation is needed.</p><p>You can create meal plans, save meals, track training, build day and week plans, and share health tips with others.</p><p>You can keep plans private, share with a small group of family or friends, or publish meal and training plans as inspiration for the community.</p>${safeAppUrl ? `<p><a href="${safeAppUrl}" style="display:inline-block;background:#34d399;color:#020617;padding:12px 18px;border-radius:14px;font-weight:800;text-decoration:none">Open Your Health</a></p>` : ''}<p style="color:#64748b;font-size:14px">Take care,<br>Your Health</p></div></div>`,
    });
  } else {
    console.log('[HealthApp] Welcome email fallback:', { to, subject, text });
  }
}
