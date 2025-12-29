# 🚀 Ghid Deploy pe Render - Imperiu Sui Luris

## ✅ Ce am configurat pentru tine

- ✅ Repo GitHub creat și codul pus
- ✅ `render.yaml` - Configurare Render automată
- ✅ `Procfile` - Start command
- ✅ `.env.production` - Variabile de mediu

---

## 📋 Pași pentru Deploy pe Render

### 1. **Accesează Render Dashboard**
1. Mergi pe https://dashboard.render.com
2. Conectează-te cu GitHub (dacă nu ești logat)

### 2. **Creează Web Service**
1. Click pe **"New +"** → **"Web Service"**
2. Conectează GitHub account
3. Selectează repo: `imperiu-sui-luris`
4. Click **"Connect"**

### 3. **Configurare Service**

| Setting | Valoare |
|---------|---------|
| **Name** | `imperiu-sui-luris` |
| **Environment** | `Node` |
| **Build Command** | `npm run render:build` |
| **Start Command** | `npm start` |
| **Plan** | Free (sau Premium) |
| **Region** | Frankfurt (Europa) |

### 4. **Setează Environment Variables**
În Render Dashboard → Settings → Environment:

```
NEXT_PUBLIC_API_URL=https://imperiu-sui-luris.onrender.com
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
JWT_SECRET=your-super-secret-key-here
DATABASE_URL=postgresql://... (obligatoriu în production)

# Stripe (dacă folosești topup cu card)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_...

# MetaMask (dacă folosești topup on-chain)
METAMASK_WALLET=0xYourReceivingWallet
EVM_RPC_URL=https://your-rpc-provider
METAMASK_WEI_PER_LURIS=1000000000000000
# optional
METAMASK_CHAIN_ID=1

# Email (Resend) - recomandat pentru început
# 1) Fă cont pe https://resend.com
# 2) Adaugă un domeniu și verifică DNS (SPF/DKIM) sau folosește domeniul pus la dispoziție de ei
# 3) Generează API key și setează:
RESEND_API_KEY=re_...
EMAIL_FROM="Imperiu <no-reply@domeniul-tau.ro>"
```

### 5. **Deploy Automat din GitHub**
1. Orice push la `main` va declanța deploy automat
2. Renderul va rula: `npm run build` → `npm start`
3. Verifică status în Render Dashboard

---

## 🗄️ Adaugă PostgreSQL

### A. Crează Database pe Render

1. Dashboard → **"New +"** → **"PostgreSQL"**
2. Setări:
   - **Name**: `imperiu-sui-luris-db`
   - **Database**: `imperiu_sui_luris`
   - **User**: `admin`
   - **Plan**: Free (sau paid)

3. Render va genera `DATABASE_URL` - **COPIAZĂ-O!**

### B. Conectează Database la App

1. Web Service → Environment Variables
2. Adaugă `DATABASE_URL` cu valorea copiată
3. Redeploy serviciul

### C. Prisma migrations

Aplicația rulează automat `prisma generate` + `prisma migrate deploy` în `npm run render:build`.

---

## 🔐 Variabile Importante

```env
# OBLIGATORIU
NEXT_PUBLIC_API_URL=https://your-app.onrender.com
JWT_SECRET=generate-this-with: openssl rand -base64 32

# OPTIONAL
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_...

METAMASK_WALLET=0xYourReceivingWallet
EVM_RPC_URL=https://your-rpc-provider
METAMASK_WEI_PER_LURIS=1000000000000000

# Email (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM="Imperiu <no-reply@domeniul-tau.ro>"
```

---

## 📊 Monitoring & Logs

1. Render Dashboard → Web Service
2. Click pe **"Logs"** pentru a vedea:
   - Deploy progress
   - Runtime errors
   - API requests

---

## 🔄 Deploy Manual

Dacă vrei să forțezi redeploy:
1. Render Dashboard → Web Service
2. Click **"Manual Deploy"** → **"Deploy latest commit"**

---

## 🌐 URL Aplicație

După deploy:
```
https://imperiu-sui-luris.onrender.com
```

---

## 💡 Troubleshooting

### Build Fails
```bash
# Curățează cache
git rm -r --cached node_modules
npm install
git push
```

### App Crashes
- Verifică Logs în Render Dashboard
- Asigură-te că variabilele de mediu sunt setate

### Database Connection Error
- Verifică `DATABASE_URL` copiat corect
- Asigură-te că database e în aceeași regiune

---

## 📱 Testing Post-Deploy

1. Accesează: https://imperiu-sui-luris.onrender.com
2. Încearcă să te registrezi
3. Mergi la Dashboard
4. Cumpără din Piață

---

## 🚀 Status Curent

✅ Repo GitHub: https://github.com/PlatformaTEST/imperiu-sui-luris
✅ Gata de deploy pe Render
✅ Frontend + Backend inclus
✅ Mock Database inclus
✅ Production-ready

---

## 📞 Suport Render

- Docs: https://render.com/docs
- Status: https://status.render.com
- Support: support@render.com

---

**Libertate • Fraternitate • Durabilitate** ⚡💧🌾
