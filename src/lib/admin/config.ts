// Admin Configuration & Database
export const adminDatabase = {
  // Owner admin account
  owner: {
    id: "admin_owner",
    email: "admin@imperiul-sui-luris.com",
    password: "test1",
    role: "owner",
    permissions: [
      "manage_users",
      "manage_posts",
      "manage_payments",
      "manage_settings",
      "view_analytics",
    ],
    createdAt: new Date().toISOString(),
  },

  // Payment Settings
  paymentSettings: {
    stripe: {
      publicKey: process.env.STRIPE_PUBLIC_KEY || "",
      secretKey: process.env.STRIPE_SECRET_KEY || "",
      enabled: !!process.env.STRIPE_PUBLIC_KEY,
    },
    metamask: {
      walletAddress: process.env.METAMASK_WALLET || "",
      enabled: !!process.env.METAMASK_WALLET,
      networkId: 1, // Ethereum mainnet
    },
    luris: {
      name: "Luris",
      symbol: "LURIS",
      conversionRate: 0.1, // 1 Luris = $0.10
      minPurchase: 10,
      maxPurchase: 1000,
    },
  },

  // Legal Pages Content
  legalPages: {
    terms: {
      title: "Termeni și Condiții",
      content: `
# Termeni și Condiții - Imperiul Sui Luris

Ultimă actualizare: ${new Date().toLocaleDateString("ro-RO")}

## 1. Acceptarea Termenilor
Prin accesarea și utilizarea acestui site, acceptați acești termeni și condiții în întregime.

## 2. Licență de Utilizare
Vi se acordă o licență limitată, non-exclusivă și revocabilă pentru a accesa și utiliza acest site.

## 3. Disclaimer
Acest site este furnizat "așa cum este". Nu garantăm acuratețea informațiilor.

## 4. Limitarea Răspunderii
În niciun caz nu vom fi răspunzători pentru daune indirecte sau accidentale.

## 5. Modificări
Ne rezervăm dreptul de a modifica acești termeni oricând.
      `,
      lastUpdated: new Date().toISOString(),
    },
    privacy: {
      title: "Politica de Confidențialitate",
      content: `
# Politica de Confidențialitate - Imperiul Sui Luris

## Colectarea Datelor
Colectăm date personale doar cu consimțământul dumneavoastră.

## Utilizarea Datelor
Datele sunt utilizate pentru a îmbunătăți serviciile noastre.

## Securitatea
Implementăm măsuri de securitate pentru a proteja datele personale.

## Drepturi
Aveți dreptul de acces, rectificare și ștergere a datelor.
      `,
      lastUpdated: new Date().toISOString(),
    },
    rules: {
      title: "Reguli de Comunitate",
      content: `
# Reguli de Comunitate

## 1. Respectul
Tratați alți membri cu respect și curtoazie.

## 2. Conținut Adecvat
Nu postați conținut ofensator, rasist sau discriminator.

## 3. Spam
Postarea repetată și inutilă nu este permisă.

## 4. Securitate
Nu partajați informații sensibile sau parole.

## 5. Vânzări Neautorizate
Vânzările neautorizate sunt interzise.
      `,
      lastUpdated: new Date().toISOString(),
    },
    faq: {
      title: "Întrebări Frecvente",
      items: [
        {
          id: "q1",
          question: "Ce este Luris?",
          answer: "Luris este moneda internă a Imperiului Sui Luris, utilizată pentru tranzacții.",
        },
        {
          id: "q2",
          question: "Cum cumpar Luris?",
          answer: "Poți cumpăra Luris folosind Stripe sau MetaMask din sectiunea de portofel.",
        },
        {
          id: "q3",
          question: "Cum se retrage banii?",
          answer: "Poti retrage fonduri prin Stripe sau MetaMask dupa validare.",
        },
        {
          id: "q4",
          question: "Este sigur?",
          answer: "Da, utilizăm encriptare SSL și integrări de plată sigure.",
        },
      ],
      lastUpdated: new Date().toISOString(),
    },
  },

  // Admin Logs
  adminLogs: [] as any[],
};

// Helper function to log admin actions
export const logAdminAction = (
  adminId: string,
  action: string,
  targetId?: string,
  details?: Record<string, unknown>
) => {
  const log = {
    id: `log_${Date.now()}`,
    adminId,
    action,
    targetId,
    timestamp: new Date().toISOString(),
    details: details || {},
  };

  adminDatabase.adminLogs.push(log);
  return log;
};
