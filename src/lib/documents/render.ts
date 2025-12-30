export type DocumentKind = "bulletin" | "passport" | "certificate" | "visitor_certificate";

export function generateVerificationCode(): string {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${part()}-${part()}`;
}

/**
 * Generate smart serial number from name and birthdate
 * Similar to CNP (Romania) or Codice Fiscale (Italy)
 * Format: 3 letters from name + YYMMDD + 2 random digits
 * Example: DUM-951215-47 (Dumitrescu born 15 Dec 1995)
 */
export function generateSmartSerial(fullName: string, birthDate: Date, docType: DocumentKind): string {
  // Extract 3 consonants from surname (first word)
  const surname = fullName.split(" ")[0].toUpperCase();
  const consonants = surname.replace(/[AEIOU\s]/g, "").slice(0, 3);
  const nameCode = (consonants + surname.replace(/\s/g, "")).slice(0, 3).padEnd(3, "X");
  
  // Date format: YYMMDD
  const year = birthDate.getFullYear().toString().slice(-2);
  const month = (birthDate.getMonth() + 1).toString().padStart(2, "0");
  const day = birthDate.getDate().toString().padStart(2, "0");
  const dateCode = year + month + day;
  
  // Random 2-digit suffix
  const suffix = Math.floor(10 + Math.random() * 90).toString();
  
  // Doc type prefix
  const typePrefix: Record<DocumentKind, string> = {
    bulletin: "BUL",
    passport: "PSP",
    certificate: "CRT",
    visitor_certificate: "VIS",
  };
  
  return `ISJ-${typePrefix[docType]}-${nameCode}${dateCode}${suffix}`;
}

export function renderDocumentHtml(params: {
  fullName: string;
  type: DocumentKind;
  documentId?: string;
  documentNumber: string;
  issueDate: Date;
  expiryDate?: Date;
  verificationCode?: string;
  photoUrl?: string;
  userId?: string;
  birthDate?: Date;
  birthPlace?: string;
  cnp?: string;
  address?: string;
  nationality?: string;
  sex?: string;
  height?: string;
  eyeColor?: string;
}) {
  const format = (date: Date) =>
    new Intl.DateTimeFormat("ro-RO", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

  const initials = params.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Route templates based on document type
  if (params.type === "bulletin") {
    return renderBulletin(params, format, initials);
  } else if (params.type === "passport") {
    return renderPassport(params, format, initials);
  } else if (params.type === "visitor_certificate") {
    return renderVisitorCertificate(params, format, initials);
  } else {
    return renderCertificate(params, format);
  }
}

// ========== BULETIN (ID CARD) ==========
function renderBulletin(
  params: {
    fullName: string;
    documentNumber: string;
    issueDate: Date;
    expiryDate?: Date;
    verificationCode?: string;
    photoUrl?: string;
    userId?: string;
    birthDate?: Date;
    birthPlace?: string;
    cnp?: string;
    address?: string;
    nationality?: string;
    sex?: string;
    height?: string;
    eyeColor?: string;
  },
  format: (date: Date) => string,
  initials: string
) {
  const verifyUrl = params.verificationCode
    ? `/documents/verify?code=${encodeURIComponent(params.verificationCode)}`
    : "";

  const photoContent = params.photoUrl
    ? `<img src="${params.photoUrl}" alt="Photo" />`
    : initials;

  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Buletin — ${params.fullName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;800&display=swap');
    :root { --font-brand: 'Cinzel', serif; color-scheme: dark; }
    body { font-family: ui-sans-serif, system-ui, sans-serif; background: #0a0e1a; color: #e5e7eb; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; }
    
    .card-side { aspect-ratio: 1.586/1; border-radius: 20px; padding: 24px; position: relative; overflow: hidden;
      border: 2px solid rgba(148, 163, 184, 0.3); 
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); margin-bottom: 2rem; }
    
    .card-side::before { content: ''; position: absolute; inset: 0;
      background: 
        url('/images/stema.png') center/200px no-repeat,
        repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34, 211, 238, 0.08) 2px, rgba(34, 211, 238, 0.08) 4px),
        repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(168, 85, 247, 0.06) 2px, rgba(168, 85, 247, 0.06) 4px),
        radial-gradient(circle at 20% 30%, rgba(34, 211, 238, 0.15), transparent 50%);
      opacity: 0.3; pointer-events: none; }
    
    .card-content { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; }
    .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;
      padding-bottom: 12px; border-bottom: 1px solid rgba(148, 163, 184, 0.2); }
    .card-logo { display: flex; align-items: center; gap: 10px; }
    .logo-text { font-family: var(--font-brand); font-size: 11px; letter-spacing: 0.15em; font-weight: 700; line-height: 1.3; }
    .card-type { font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; padding: 4px 10px;
      background: rgba(34, 211, 238, 0.15); border: 1px solid rgba(34, 211, 238, 0.3); border-radius: 999px;
      color: #7dd3fc; font-weight: 700; }
    
    .card-body { flex: 1; display: grid; grid-template-columns: 1fr 100px; gap: 16px; }
    .card-info h2 { font-family: var(--font-brand); font-size: 1.4rem; margin: 0 0 8px 0;
      letter-spacing: 0.03em; color: #f1f5f9; }
    .card-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
    .meta-label { color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.65rem; margin-bottom: 4px; }
    .meta-value { color: #e2e8f0; font-weight: 700; font-size: 0.75rem; }
    .badge { padding: 4px 8px; background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.3);
      border-radius: 6px; color: #c084fc; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.65rem; }
    
    .card-avatar { width: 100px; height: 120px; border-radius: 12px;
      background: linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(168, 85, 247, 0.2));
      border: 2px solid rgba(148, 163, 184, 0.3); display: flex; align-items: center; justify-content: center;
      font-family: var(--font-brand); font-size: 2.5rem; font-weight: 700; color: #7dd3fc;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); overflow: hidden; position: relative; }
    .card-avatar img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    
    .card-footer { margin-top: auto; padding-top: 12px; border-top: 1px solid rgba(148, 163, 184, 0.2);
      display: flex; justify-content: space-between; align-items: center; font-size: 0.65rem; }
    .doc-number { font-family: 'Courier New', monospace; color: #cbd5e1; letter-spacing: 0.08em; }
    
    .qr-section { display: flex; align-items: center; gap: 16px; padding: 16px;
      background: rgba(0, 0, 0, 0.3); border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.2); margin-bottom: 16px; }
    .qr-code { width: 100px; height: 100px; background: white; border-radius: 8px; display: flex;
      align-items: center; justify-content: center; font-size: 0.6rem; color: #1e293b; font-weight: 700;
      text-align: center; padding: 8px; }
    .qr-info { flex: 1; }
    .qr-title { font-weight: 700; color: #22d3ee; margin-bottom: 6px; font-size: 0.75rem; letter-spacing: 0.05em; }
    .qr-text { font-size: 0.65rem; color: #94a3b8; line-height: 1.4; }
    
    .disclaimer { padding: 16px; background: rgba(239, 68, 68, 0.1); border: 1px dashed rgba(239, 68, 68, 0.3);
      border-radius: 12px; text-align: center; }
    .disclaimer-title { font-weight: 800; color: #fca5a5; margin-bottom: 6px; font-size: 0.75rem;
      letter-spacing: 0.1em; text-transform: uppercase; }
    .disclaimer-text { font-size: 0.65rem; color: #cbd5e1; line-height: 1.4; }
    
    .edit-notice { margin-top: 20px; padding: 16px; background: rgba(34, 211, 238, 0.1);
      border: 1px solid rgba(34, 211, 238, 0.3); border-radius: 12px; text-align: center; }
    .edit-link { display: inline-block; margin-top: 10px; padding: 10px 20px;
      background: linear-gradient(135deg, #22d3ee, #a855f7); border-radius: 8px;
      color: white; text-decoration: none; font-weight: 700; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1 style="font-family: var(--font-brand); text-align: center; font-size: 1.8rem; margin-bottom: 2rem;
      background: linear-gradient(135deg, #22d3ee, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
      BULETIN DE PLATFORMĂ
    </h1>
    
    <!-- Front -->
    <div class="card-side">
      <div class="card-content">
        <div class="card-header">
          <div class="card-logo">
            <div class="logo-text">IMPERIUL<br>SUI JURIS</div>
          </div>
          <div class="card-type">ID CETĂȚEAN</div>
        </div>
        
        <div class="card-body">
          <div class="card-info">
            <h2>${params.fullName}</h2>
            <div class="card-meta">
              <div><div class="meta-label">ID Intern</div><div class="meta-value">${params.documentNumber}</div></div>
              <div><div class="meta-label">Rang</div><div class="meta-value"><span class="badge">Citizen</span></div></div>
              ${params.birthDate ? `<div><div class="meta-label">Născut</div><div class="meta-value">${format(params.birthDate)}</div></div>` : ''}
              ${params.cnp ? `<div><div class="meta-label">CNP</div><div class="meta-value">${params.cnp}</div></div>` : ''}
              ${params.sex ? `<div><div class="meta-label">Sex</div><div class="meta-value">${params.sex === 'M' ? 'Masculin' : 'Feminin'}</div></div>` : ''}
              ${params.nationality ? `<div><div class="meta-label">Cetățenie</div><div class="meta-value">${params.nationality}</div></div>` : ''}
              <div><div class="meta-label">Emis</div><div class="meta-value">${format(params.issueDate)}</div></div>
              <div><div class="meta-label">Expiră</div><div class="meta-value">${params.expiryDate ? format(params.expiryDate) : "—"}</div></div>
            </div>
          </div>
          <div class="card-avatar">${photoContent}</div>
        </div>
        
        <div class="card-footer">
          <span class="doc-number">№ ${params.documentNumber}</span>
          <span style="color: #7dd3fc; font-weight: 700;">✓ ACTIV</span>
        </div>
      </div>
    </div>
    
    <!-- Back -->
    <div class="card-side">
      <div class="card-content">
        <div class="card-header">
          <div class="logo-text" style="text-align: center; width: 100%;">VERSO — Verificare Document</div>
        </div>
        
        <div class="qr-section">
          <div class="qr-code">[QR CODE]<br>Scanează<br>pentru<br>verificare</div>
          <div class="qr-info">
            <div class="qr-title">COD VERIFICARE</div>
            <div class="qr-text">
              <strong>${params.verificationCode || "N/A"}</strong><br>
              ${verifyUrl ? `<a href="${verifyUrl}" style="color: #7dd3fc;">${verifyUrl}</a>` : ""}
            </div>
          </div>
        </div>
        
        <div class="disclaimer">
          <div class="disclaimer-title">⚠️ DOCUMENT FICTIV</div>
          <div class="disclaimer-text">
            Acest document este un artefact digital al platformei Imperiul Sui Juris,
            folosit exclusiv pentru scopuri interne. <strong>NU ESTE EMIS DE AUTORITĂȚI REALE</strong>
            și nu substituie niciun act oficial. Nu are valoare legală.
          </div>
        </div>
      </div>
    </div>
    
    ${!params.photoUrl ? `<div class="edit-notice">
      <p style="margin: 0 0 10px; color: #cbd5e1; font-size: 0.9rem;">📸 Personalizează-ți documentul</p>
      <a href="/documents/edit/${params.documentNumber}" class="edit-link">Adaugă Poză & Date</a>
    </div>` : ""}
  </div>
</body>
</html>`;
}

// ========== PASSPORT (INTERACTIVE) ==========
function renderPassport(
  params: {
    fullName: string;
    documentNumber: string;
    issueDate: Date;
    expiryDate?: Date;
    verificationCode?: string;
    photoUrl?: string;
    birthDate?: Date;
    birthPlace?: string;
    cnp?: string;
    address?: string;
    nationality?: string;
    sex?: string;
    height?: string;
    eyeColor?: string;
  },
  format: (date: Date) => string,
  initials: string
) {
  const photoContent = params.photoUrl
    ? `<img src="${params.photoUrl}" alt="Photo" />`
    : initials;

  const verifyUrl = params.verificationCode
    ? `/documents/verify?code=${encodeURIComponent(params.verificationCode)}`
    : "";

  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pașaport — ${params.fullName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;800&display=swap');
    :root { --font-brand: 'Cinzel', serif; color-scheme: dark; }
    body { font-family: ui-sans-serif, system-ui, sans-serif; background: #0a0e1a; color: #e5e7eb; margin: 0; padding: 40px 20px; }
    .container { max-width: 500px; margin: 0 auto; }
    
    .passport-flipbook { position: relative; width: 100%; aspect-ratio: 0.707/1; }
    .passport-page { aspect-ratio: 0.707/1; border-radius: 4px 16px 16px 4px; position: absolute; inset: 0;
      overflow: hidden; border: 1px solid rgba(148, 163, 184, 0.3); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(20, 30, 50, 0.95)); opacity: 0;
      visibility: hidden; transform: scale(0.95); transition: all 0.5s ease; pointer-events: none; }
    .passport-page.active { opacity: 1; visibility: visible; transform: scale(1); pointer-events: auto; z-index: 10; }
    
    .passport-cover { background: linear-gradient(160deg, #0c1527 0%, #1e2a47 100%); display: flex;
      flex-direction: column; align-items: center; justify-content: center; padding: 40px; position: relative; }
    .passport-cover::before { content: ''; position: absolute; inset: 0;
      background: url('/images/stema.png') center/300px no-repeat,
        repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(34, 211, 238, 0.03) 10px, rgba(34, 211, 238, 0.03) 20px),
        radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.08), transparent 70%);
      opacity: 0.15; pointer-events: none; }
    .passport-title { font-family: var(--font-brand); font-size: 2.5rem; text-align: center; letter-spacing: 0.2em;
      margin-bottom: 16px; color: #f1f5f9; font-weight: 800; position: relative; z-index: 1; text-transform: uppercase; }
    .passport-subtitle { font-family: var(--font-brand); font-size: 1.1rem; text-align: center; letter-spacing: 0.15em;
      color: #cbd5e1; font-weight: 600; position: relative; z-index: 1; }
    .passport-serial { position: absolute; bottom: 30px; width: 100%; text-align: center;
      font-family: 'Courier New', monospace; font-size: 0.75rem; color: #94a3b8; letter-spacing: 0.15em; font-weight: 700; }
    
    .passport-interior { width: 100%; height: 100%; padding: 30px; position: relative; overflow: hidden; box-sizing: border-box; }
    .passport-interior::before { content: ''; position: absolute; inset: 0;
      background: url('/images/stema.png') center/150px no-repeat,
        repeating-linear-gradient(0deg, transparent 0px, transparent 20px, rgba(34, 211, 238, 0.03) 20px, rgba(34, 211, 238, 0.03) 21px),
        repeating-linear-gradient(90deg, transparent 0px, transparent 20px, rgba(168, 85, 247, 0.02) 20px, rgba(168, 85, 247, 0.02) 21px);
      opacity: 0.5; pointer-events: none; }
    
    .passport-data-content { position: relative; z-index: 1; }
    .passport-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;
      padding-bottom: 16px; border-bottom: 2px solid rgba(34, 211, 238, 0.3); }
    .passport-doc-type { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.12em; color: #7dd3fc; font-weight: 700; }
    .passport-country { font-family: var(--font-brand); font-size: 0.85rem; letter-spacing: 0.08em; text-align: right; color: #cbd5e1; }
    
    .passport-main { display: grid; grid-template-columns: 1fr 110px; gap: 20px; margin-bottom: 24px; }
    .passport-photo { width: 110px; height: 140px; border-radius: 8px;
      background: linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(168, 85, 247, 0.2));
      border: 2px solid rgba(148, 163, 184, 0.4); display: flex; align-items: center; justify-content: center;
      font-family: var(--font-brand); font-size: 3rem; font-weight: 700; color: #7dd3fc;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); overflow: hidden; position: relative; }
    .passport-photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    
    .passport-info h3 { font-family: var(--font-brand); font-size: 1.5rem; margin: 0 0 16px 0; color: #f1f5f9; letter-spacing: 0.02em; }
    .passport-fields { display: grid; gap: 12px; }
    .field { display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid rgba(148, 163, 184, 0.2); }
    .field-label { font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; }
    .field-value { font-size: 0.75rem; color: #e2e8f0; font-weight: 700; font-family: 'Courier New', monospace; }
    
    .passport-footer { margin-top: 24px; padding: 16px; background: rgba(239, 68, 68, 0.08);
      border: 1px dashed rgba(239, 68, 68, 0.25); border-radius: 8px; }
    .passport-disclaimer { font-size: 0.65rem; color: #cbd5e1; text-align: center; line-height: 1.5; }
    .passport-disclaimer strong { color: #fca5a5; display: block; margin-bottom: 4px; font-size: 0.7rem; letter-spacing: 0.08em; }
    
    .stamp-area { height: calc(100% - 60px); display: flex; align-items: center; justify-content: center;
      border: 2px dashed rgba(148, 163, 184, 0.2); border-radius: 12px; color: #64748b;
      font-size: 0.75rem; font-style: italic; text-align: center; padding: 20px; }
    .page-number { position: absolute; bottom: 20px; right: 30px; font-family: var(--font-brand);
      font-size: 0.7rem; color: #475569; letter-spacing: 0.1em; }
    
    .passport-controls { display: flex; gap: 12px; justify-content: center; margin-top: 20px; align-items: center; }
    .page-nav-btn { background: rgba(34, 211, 238, 0.15); border: 1px solid rgba(34, 211, 238, 0.3); color: #7dd3fc;
      padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 0.85rem; letter-spacing: 0.05em;
      transition: all 0.3s; }
    .page-nav-btn:hover:not(:disabled) { background: rgba(34, 211, 238, 0.25); transform: scale(1.05); }
    .page-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .page-indicator { font-size: 0.85rem; color: #94a3b8; font-weight: 600; letter-spacing: 0.05em; min-width: 80px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1 style="font-family: var(--font-brand); text-align: center; font-size: 1.8rem; margin-bottom: 2rem;
      background: linear-gradient(135deg, #22d3ee, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
      PAȘAPORT DE PLATFORMĂ
    </h1>
    
    <div class="passport-flipbook">
      <!-- Cover -->
      <div class="passport-page passport-cover active" data-page="0">
        <h3 class="passport-title">PAȘAPORT</h3>
        <p class="passport-subtitle">IMPERIUL SUI JURIS</p>
        <div class="passport-serial">${params.documentNumber}</div>
      </div>
      
      <!-- Page 1: Data -->
      <div class="passport-page" data-page="1">
        <div class="passport-interior">
          <div class="passport-data-content">
            <div class="passport-header">
              <div class="passport-doc-type">P &lt; PAȘAPORT</div>
              <div class="passport-country">IMPERIUL<br>SUI JURIS</div>
            </div>
            
            <div class="passport-main">
              <div class="passport-info">
                <h3>${params.fullName}</h3>
                <div class="passport-fields">
                  <div class="field"><span class="field-label">Tip</span><span class="field-value">PASSPORT</span></div>
                  <div class="field"><span class="field-label">Nr. Document</span><span class="field-value">${params.documentNumber}</span></div>
                  ${params.birthDate ? `<div class="field"><span class="field-label">Data Nașterii</span><span class="field-value">${format(params.birthDate)}</span></div>` : ''}
                  ${params.birthPlace ? `<div class="field"><span class="field-label">Locul Nașterii</span><span class="field-value">${params.birthPlace}</span></div>` : ''}
                  ${params.sex ? `<div class="field"><span class="field-label">Sex</span><span class="field-value">${params.sex === 'M' ? 'M' : 'F'}</span></div>` : ''}
                  ${params.nationality ? `<div class="field"><span class="field-label">Cetățenie</span><span class="field-value">${params.nationality}</span></div>` : ''}
                  ${params.height ? `<div class="field"><span class="field-label">Înălțime</span><span class="field-value">${params.height} cm</span></div>` : ''}
                  ${params.eyeColor ? `<div class="field"><span class="field-label">Culoare Ochi</span><span class="field-value">${params.eyeColor}</span></div>` : ''}
                  <div class="field"><span class="field-label">Data Emiterii</span><span class="field-value">${format(params.issueDate)}</span></div>
                  <div class="field"><span class="field-label">Data Expirării</span><span class="field-value">${params.expiryDate ? format(params.expiryDate) : "—"}</span></div>
                  <div class="field"><span class="field-label">Cod Verificare</span><span class="field-value">${params.verificationCode || "N/A"}</span></div>
                </div>
              </div>
              <div class="passport-photo">${photoContent}</div>
            </div>
            
            <div class="passport-footer">
              <div class="passport-disclaimer">
                <strong>⚠️ DOCUMENT FICTIV / DOAR PLATFORMĂ</strong>
                Acest pașaport este un artefact digital intern. NU este emis de autorități reale
                și NU are valoare legală. Folosit exclusiv pe platforma Imperiul Sui Juris.
              </div>
            </div>
            
            ${verifyUrl ? `<div style="text-align: center; margin-top: 16px; font-size: 0.6rem; color: #475569;">
              <a href="${verifyUrl}" style="color: #7dd3fc;">Verificare document</a>
            </div>` : ""}
          </div>
        </div>
      </div>
      
      <!-- Pages 2-4: Stamps -->
      ${[2, 3, 4]
        .map(
          (n) => `
      <div class="passport-page" data-page="${n}">
        <div class="passport-interior">
          <div class="stamp-area">Pagină pentru ștampile de călătorie<br>(Stamps / Visas)</div>
          <div class="page-number">${String(n).padStart(2, "0")}</div>
        </div>
      </div>`
        )
        .join("")}
    </div>
    
    <div class="passport-controls">
      <button class="page-nav-btn" id="prevBtn" onclick="previousPage()">← Înapoi</button>
      <div class="page-indicator" id="pageIndicator">Copertă</div>
      <button class="page-nav-btn" id="nextBtn" onclick="nextPage()">Înainte →</button>
    </div>
    
    ${!params.photoUrl ? `<div style="margin-top: 30px; padding: 16px; background: rgba(34, 211, 238, 0.1);
      border: 1px solid rgba(34, 211, 238, 0.3); border-radius: 12px; text-align: center;">
      <p style="margin: 0 0 10px; color: #cbd5e1; font-size: 0.9rem;">📸 Personalizează-ți pașaportul</p>
      <a href="/documents/edit/${params.documentNumber}" style="display: inline-block; margin-top: 10px; padding: 10px 20px;
        background: linear-gradient(135deg, #22d3ee, #a855f7); border-radius: 8px;
        color: white; text-decoration: none; font-weight: 700; font-size: 0.85rem;">Adaugă Poză & Date</a>
    </div>` : ""}
  </div>
  
  <script>
    let currentPage = 0;
    const totalPages = 4;
    const labels = ['Copertă', 'Date Personale', 'Ștampile 1', 'Ștampile 2', 'Ștampile 3'];
    
    function nextPage() { if (currentPage < totalPages) { currentPage++; updatePage(); } }
    function previousPage() { if (currentPage > 0) { currentPage--; updatePage(); } }
    
    function updatePage() {
      document.querySelectorAll('.passport-page').forEach(page => {
        page.classList.remove('active');
        if (parseInt(page.getAttribute('data-page')) === currentPage) page.classList.add('active');
      });
      document.getElementById('prevBtn').disabled = currentPage === 0;
      document.getElementById('nextBtn').disabled = currentPage === totalPages;
      document.getElementById('pageIndicator').textContent = labels[currentPage];
    }
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') nextPage();
      if (e.key === 'ArrowLeft') previousPage();
    });
    updatePage();
  </script>
</body>
</html>`;
}

// ========== VISITOR CERTIFICATE ==========
function renderVisitorCertificate(
  params: {
    fullName: string;
    type: DocumentKind;
    documentNumber: string;
    issueDate: Date;
    expiryDate?: Date;
    verificationCode?: string;
    photoUrl?: string;
    birthDate?: Date;
    birthPlace?: string;
    cnp?: string;
    address?: string;
    nationality?: string;
    sex?: string;
    height?: string;
    eyeColor?: string;
  },
  format: (date: Date) => string,
  initials: string
) {
  const verifyUrl = params.verificationCode
    ? `/documents/verify?code=${encodeURIComponent(params.verificationCode)}`
    : "";

  const photoContent = params.photoUrl
    ? `<img src="${params.photoUrl}" alt="Photo" />`
    : initials;

  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificat Vizitator — ${params.fullName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;800&display=swap');
    :root { --font-brand: 'Cinzel', serif; color-scheme: dark; }
    body { font-family: ui-sans-serif, system-ui, sans-serif; background: #0a0e1a; color: #e5e7eb; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; }
    
    .card-side { aspect-ratio: 1.586/1; border-radius: 20px; padding: 24px; position: relative; overflow: hidden;
      border: 2px solid rgba(251, 191, 36, 0.4); 
      background: linear-gradient(135deg, rgba(30, 27, 20, 0.95), rgba(45, 35, 25, 0.95));
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); margin-bottom: 2rem; }
    
    .card-side::before { content: ''; position: absolute; inset: 0;
      background: 
        url('/images/stema.png') center/200px no-repeat,
        repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(251, 191, 36, 0.08) 10px, rgba(251, 191, 36, 0.08) 20px),
        radial-gradient(circle at 20% 30%, rgba(251, 191, 36, 0.15), transparent 50%);
      opacity: 0.3; pointer-events: none; }
    
    .card-content { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; }
    .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;
      padding-bottom: 12px; border-bottom: 1px solid rgba(251, 191, 36, 0.3); }
    .card-logo { display: flex; align-items: center; gap: 10px; }
    .logo-text { font-family: var(--font-brand); font-size: 11px; letter-spacing: 0.15em; font-weight: 700; line-height: 1.3; }
    .card-type { font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; padding: 4px 10px;
      background: rgba(251, 191, 36, 0.15); border: 1px solid rgba(251, 191, 36, 0.4); border-radius: 999px;
      color: #fbbf24; font-weight: 700; }
    
    .card-body { flex: 1; display: grid; grid-template-columns: 1fr 100px; gap: 16px; }
    .card-info h2 { font-family: var(--font-brand); font-size: 1.4rem; margin: 0 0 8px 0;
      letter-spacing: 0.03em; color: #fbbf24; }
    .card-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
    .meta-label { color: #d97706; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.65rem; margin-bottom: 4px; }
    .meta-value { color: #fde68a; font-weight: 700; font-size: 0.75rem; }
    .badge { padding: 4px 8px; background: rgba(251, 191, 36, 0.15); border: 1px solid rgba(251, 191, 36, 0.4);
      border-radius: 6px; color: #fbbf24; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.65rem; }
    
    .card-avatar { width: 100px; height: 120px; border-radius: 12px;
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2));
      border: 2px solid rgba(251, 191, 36, 0.3); display: flex; align-items: center; justify-content: center;
      font-family: var(--font-brand); font-size: 2.5rem; font-weight: 700; color: #fbbf24;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); overflow: hidden; position: relative; }
    .card-avatar img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    
    .card-footer { margin-top: auto; padding-top: 12px; border-top: 1px solid rgba(251, 191, 36, 0.3);
      display: flex; justify-content: space-between; align-items: center; font-size: 0.65rem; }
    .doc-number { font-family: 'Courier New', monospace; color: #fde68a; letter-spacing: 0.08em; }
    
    .disclaimer { padding: 16px; background: rgba(239, 68, 68, 0.1); border: 1px dashed rgba(239, 68, 68, 0.3);
      border-radius: 12px; text-align: center; }
    .disclaimer-title { font-weight: 800; color: #fca5a5; margin-bottom: 6px; font-size: 0.75rem;
      letter-spacing: 0.1em; text-transform: uppercase; }
    .disclaimer-text { font-size: 0.65rem; color: #cbd5e1; line-height: 1.4; }
  </style>
</head>
<body>
  <div class="container">
    <h1 style="font-family: var(--font-brand); text-align: center; font-size: 1.8rem; margin-bottom: 2rem;
      background: linear-gradient(135deg, #fbbf24, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
      CERTIFICAT VIZITATOR
    </h1>
    
    <div class="card-side">
      <div class="card-content">
        <div class="card-header">
          <div class="card-logo">
            <div class="logo-text">IMPERIUL<br>SUI JURIS</div>
          </div>
          <div class="card-type">VIZITATOR</div>
        </div>
        
        <div class="card-body">
          <div class="card-info">
            <h2>${params.fullName}</h2>
            <div class="card-meta">
              <div><div class="meta-label">ID Vizitator</div><div class="meta-value">${params.documentNumber}</div></div>
              <div><div class="meta-label">Statut</div><div class="meta-value"><span class="badge">Visitor</span></div></div>
              <div><div class="meta-label">Emis</div><div class="meta-value">${format(params.issueDate)}</div></div>
              <div><div class="meta-label">Expiră</div><div class="meta-value">${params.expiryDate ? format(params.expiryDate) : "—"}</div></div>
            </div>
          </div>
          <div class="card-avatar">${photoContent}</div>
        </div>
        
        <div class="card-footer">
          <span class="doc-number">№ ${params.documentNumber}</span>
          <span style="color: #fbbf24; font-weight: 700;">✓ VALABIL 3 LUNI</span>
        </div>
      </div>
    </div>
    
    <div class="disclaimer">
      <div class="disclaimer-title">⚠️ DOCUMENT TEMPORAR</div>
      <div class="disclaimer-text">
        Acest certificat este valabil 3 luni și permite accesul limitat la platformă.
        Nu conferă drepturile unui cetățean deplin. Pentru upgrade, achiziționați un Buletin sau Pașaport.
        ${verifyUrl ? `<br><br><a href="${verifyUrl}" style="color: #7dd3fc;">Verificare document</a>` : ""}
      </div>
    </div>
    
    ${!params.photoUrl ? `<div style="margin-top: 20px; padding: 16px; background: rgba(251, 191, 36, 0.1);
      border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 12px; text-align: center;">
      <p style="margin: 0 0 10px; color: #fde68a; font-size: 0.9rem;">📸 Personalizează certificatul</p>
      <a href="/documents/edit/${params.documentNumber}" style="display: inline-block; margin-top: 10px; padding: 10px 20px;
        background: linear-gradient(135deg, #fbbf24, #f59e0b); border-radius: 8px;
        color: #1e293b; text-decoration: none; font-weight: 700; font-size: 0.85rem;">Adaugă Poză & Date</a>
    </div>` : ""}
  </div>
</body>
</html>`;
}

// ========== CERTIFICATE (GENERIC) ==========
function renderCertificate(
  params: {
    fullName: string;
    type: DocumentKind;
    documentNumber: string;
    issueDate: Date;
    expiryDate?: Date;
    verificationCode?: string;
  },
  format: (date: Date) => string
) {
  const title = "Certificat";

  const docLabel = "Certificat";

  const verifyPageUrl =
    params.verificationCode ? `/documents/verify?code=${encodeURIComponent(params.verificationCode)}` : null;

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
