export function authLockoutTemplate(params: { email: string; ip: string; minutes: number }) {
  const subject = "Alertă securitate: cont blocat temporar";
  const text = `Salut,\n\nAm detectat prea multe încercări eșuate de autentificare pentru ${params.email}.\nPentru siguranță, autentificarea a fost blocată pentru ${params.minutes} minute.\n\nIP: ${params.ip}\n\nDacă nu ai fost tu, recomandăm să schimbi parola.\n`;
  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height: 1.5;">
      <h2>Alertă securitate</h2>
      <p>Am detectat prea multe încercări eșuate de autentificare pentru <b>${escapeHtml(params.email)}</b>.</p>
      <p>Pentru siguranță, autentificarea a fost blocată pentru <b>${params.minutes}</b> minute.</p>
      <p style="color:#666;">IP: ${escapeHtml(params.ip)}</p>
      <p>Dacă nu ai fost tu, recomandăm să schimbi parola.</p>
    </div>
  `;

  return { subject, text, html };
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
