function emailConfig() {
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST || '';
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
  const secure = (process.env.EMAIL_SECURE || process.env.SMTP_SECURE || 'false') === 'true';
  const user = process.env.EMAIL_USER || process.env.SMTP_USER || '';
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS || '';
  const from = process.env.EMAIL_FROM || process.env.MAIL_FROM || user || 'Your Health <no-reply@example.com>';
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

export async function sendVerificationEmail({ to, name, url }: { to: string; name: string; url: string }) {
  const subject = 'Welcome to Your Health — confirm your email';
  const safeName = escapeHtml(name || 'there');
  const safeUrl = escapeHtml(url);
  const text = `Hi ${name},

Welcome to Your Health.

You can use this app to create meal plans, save meals, track training, build day and week plans, and share health tips with others. You can also keep plans private or share them with family and friends in a group.

Confirm your email here:
${url}

Take care,
Your Health`;

  // Supports both naming styles:
  // EMAIL_HOST / EMAIL_PORT / EMAIL_USER / EMAIL_PASS / EMAIL_FROM
  // and SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / MAIL_FROM
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
      html: `<div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0f172a;background:#f8fafc;padding:28px"><div style="max-width:620px;margin:auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;padding:28px"><p style="margin:0 0 10px;color:#64748b;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:12px">Your Health</p><h1 style="margin:0 0 14px;font-size:30px;color:#020617">Welcome to Your Health</h1><p>Hi ${safeName},</p><p>You can use this app to create meal plans, save meals, track training, build day and week plans, and share health tips with others.</p><p>You can keep your plans private, or share meal and training plans with family and friends in small groups.</p><p><a href="${safeUrl}" style="display:inline-block;background:#34d399;color:#020617;padding:12px 18px;border-radius:14px;font-weight:800;text-decoration:none">Confirm email</a></p><p style="color:#64748b;font-size:14px">Or open this link:<br>${safeUrl}</p></div></div>`,
    });
  } else {
    console.log('[HealthApp] Verification email fallback:', { to, subject, url, text });
  }
}
