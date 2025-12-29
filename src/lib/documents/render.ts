export type DocumentKind = "bulletin" | "passport" | "certificate";

export function generateVerificationCode(): string {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${part()}-${part()}`;
}

export function renderDocumentHtml(params: {
  fullName: string;
  type: DocumentKind;
  documentId?: string;
  documentNumber: string;
  issueDate: Date;
  expiryDate?: Date;
  verificationCode?: string;
}) {
  const format = (date: Date) =>
    new Intl.DateTimeFormat("ro-RO", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

  const title =
    params.type === "passport" ? "Pașaport (simbolic)" : params.type === "certificate" ? "Certificat" : "Buletin (simbolic)";

  const docLabel = params.type === "passport" ? "Pașaport" : params.type === "certificate" ? "Certificat" : "Buletin";

  const verifyPageUrl =
    params.documentId && params.verificationCode
      ? `/documents/verify?documentId=${encodeURIComponent(params.documentId)}&code=${encodeURIComponent(params.verificationCode)}`
      : null;

  const verifyText = params.verificationCode
    ? `Cod verificare: <strong>${params.verificationCode}</strong>`
    : "Cod verificare: <span class=\"muted\">n/a</span>";

  // Proprietary / fictional layout. Avoids copying any real or third-party templates.
  return `<!doctype html>
<html lang="ro">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title} - Imperiul Sui Juris</title>
    <style>
      :root { color-scheme: dark; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:#070b14; color:#e5e7eb; margin:0; padding:24px; }
      .wrap { max-width: 920px; margin: 0 auto; }
      .top { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; }
      .brand { display:flex; align-items:center; gap:10px; }
      .mark { width:34px; height:34px; border-radius:10px; border:1px solid rgba(255,255,255,0.18); background: radial-gradient(circle at 30% 20%, rgba(34,211,238,0.35), rgba(168,85,247,0.12) 45%, rgba(0,0,0,0) 70%); position:relative; overflow:hidden; }
      .mark:after { content:""; position:absolute; inset:-40%; background: linear-gradient(110deg, rgba(34,211,238,0.0), rgba(34,211,238,0.35), rgba(168,85,247,0.0)); transform: rotate(10deg); animation: sweep 6s linear infinite; }
      @keyframes sweep { 0%{ transform: translateX(-18%) rotate(10deg);} 100%{ transform: translateX(18%) rotate(10deg);} }
      .title { font-weight:800; letter-spacing:0.08em; font-size:12px; color:#cbd5e1; }
      .subtitle { font-size:12px; color:#94a3b8; margin-top:2px; }

      .card { position:relative; border-radius:18px; padding:18px; border:1px solid rgba(148,163,184,0.22);
        background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)); overflow:hidden; }
      .card:before { content:""; position:absolute; inset:-2px; background:
        radial-gradient(circle at 15% 20%, rgba(34,211,238,0.18), rgba(0,0,0,0) 55%),
        radial-gradient(circle at 90% 30%, rgba(168,85,247,0.16), rgba(0,0,0,0) 55%),
        linear-gradient(125deg, rgba(34,211,238,0.14), rgba(168,85,247,0.10), rgba(34,211,238,0.10));
        filter: blur(10px); opacity:0.9; pointer-events:none; }
      .holo { position:absolute; inset:0; pointer-events:none; mix-blend-mode: screen; opacity:0.55;
        background:
          linear-gradient(110deg, rgba(0,0,0,0) 30%, rgba(255,255,255,0.18) 45%, rgba(0,0,0,0) 60%),
          repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0, rgba(255,255,255,0.06) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 6px);
        transform: rotate(-2deg);
        animation: holo 7s ease-in-out infinite; }
      @keyframes holo { 0%{ transform: translateX(-10px) rotate(-2deg); } 50%{ transform: translateX(12px) rotate(-2deg);} 100%{ transform: translateX(-10px) rotate(-2deg);} }
      .inner { position:relative; z-index:1; display:grid; grid-template-columns: 1.25fr 0.75fr; gap:14px; }
      .pill { display:inline-flex; align-items:center; gap:8px; border-radius:999px; padding:6px 10px;
        border:1px solid rgba(148,163,184,0.22); background: rgba(2,6,23,0.35); color:#e2e8f0; font-size:12px; font-weight:700; letter-spacing:0.06em; }
      .spec { color:#fbbf24; border-color: rgba(251,191,36,0.25); }
      .hdr h1 { margin:10px 0 0; font-size:18px; letter-spacing:0.02em; }
      .muted { color:#94a3b8; }
      .grid { display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:14px; }
      .box { border: 1px solid rgba(148,163,184,0.22); border-radius: 14px; padding: 12px; background: rgba(2,6,23,0.35); }
      .lbl { color:#94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.10em; }
      .val { margin-top: 6px; font-size: 14px; font-weight: 700; color:#e5e7eb; }
      .side { border: 1px solid rgba(148,163,184,0.22); border-radius: 14px; padding: 12px; background: rgba(2,6,23,0.25); }
      .kv { display:flex; justify-content:space-between; gap:10px; font-size:12px; margin-top:8px; }
      .kv strong { color:#e2e8f0; }
      .badge { display:inline-block; margin-top:10px; padding:8px 10px; border-radius:12px;
        background: rgba(255,255,255,0.04); border:1px dashed rgba(148,163,184,0.28); font-size:12px; line-height:1.35; }
      .note { margin-top: 14px; color:#cbd5e1; font-size: 12px; line-height: 1.45; }
      a { color:#7dd3fc; text-decoration: none; }
      a:hover { text-decoration: underline; }
      @media (max-width: 820px) { .inner { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="top">
        <div class="brand">
          <div class="mark" aria-hidden="true"></div>
          <div>
            <div class="title">IMPERIUL SUI JURIS</div>
            <div class="subtitle">Document digital intern · ${docLabel}</div>
          </div>
        </div>
        <div class="pill spec">SPECIMEN · INTERNAL</div>
      </div>

      <div class="card">
        <div class="holo" aria-hidden="true"></div>
        <div class="inner">
          <div>
            <div class="hdr">
              <div class="pill">${title}</div>
              <h1>${params.fullName}</h1>
              <div class="muted" style="margin-top:6px; font-size:12px;">Identificator document: <strong>${params.documentNumber}</strong></div>
            </div>

            <div class="grid">
              <div class="box">
                <div class="lbl">Tip</div>
                <div class="val">${params.type}</div>
              </div>
              <div class="box">
                <div class="lbl">Statut</div>
                <div class="val">active</div>
              </div>
              <div class="box">
                <div class="lbl">Data emiterii</div>
                <div class="val">${format(params.issueDate)}</div>
              </div>
              <div class="box">
                <div class="lbl">Data expirării</div>
                <div class="val">${params.expiryDate ? format(params.expiryDate) : "—"}</div>
              </div>
            </div>

            <div class="note">
              <strong>Notă:</strong> Acest document este un artefact digital al platformei, folosit doar pentru scopuri interne.
              Nu este emis de autorități reale și nu substituie acte oficiale.
            </div>
          </div>

          <div class="side">
            <div class="lbl">Emitent</div>
            <div class="val">Platforma Imperiul Sui Juris</div>

            <div class="kv"><span class="muted">Nr.</span><strong>${params.documentNumber}</strong></div>
            <div class="kv"><span class="muted">Emis</span><strong>${format(params.issueDate)}</strong></div>
            ${params.expiryDate ? `<div class=\"kv\"><span class=\"muted\">Expiră</span><strong>${format(params.expiryDate)}</strong></div>` : ""}

            <div class="badge">
              <div class="lbl">Verificare</div>
              <div style="margin-top:6px;">${verifyText}</div>
              <div class="muted" style="margin-top:8px;">Verificare: ${verifyPageUrl ? `<a href=\"${verifyPageUrl}\" target=\"_blank\" rel=\"noreferrer\">${verifyPageUrl}</a>` : "n/a"}</div>
            </div>

            <div class="badge">
              <div class="lbl">Design</div>
              <div style="margin-top:6px;" class="muted">Model grafic proprietar (fictiv). Efectul “hologramă” este doar vizual.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}
