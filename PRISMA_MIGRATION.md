# 🚀 Migrare la Prisma + PostgreSQL

## ✅ Ce am făcut:

### 1. **Schema Prisma completă** (`prisma/schema.prisma`)
- ✅ Toate modelele: User, Document, LandProperty, MarketplaceItem, Chat (rooms, messages, reports), Notifications, AuditLog, VerificationRequest, Wallet
- ✅ Câmp nou `verifiedUntil` în User pentru verificare temporară (certificat vizitator)
- ✅ Relații complete cu foreign keys și cascade delete
- ✅ Indexuri pentru performanță

### 2. **Migrație SQL generată** (`prisma/migrations/20251230_initial_full_schema/migration.sql`)
- SQL complet pentru PostgreSQL
- Gata să fie aplicat pe Render când setezi DATABASE_URL

### 3. **Script de build actualizat** (`render-build.sh`)
```bash
#!/bin/bash
set -e
npx prisma generate        # Generează Prisma Client
npx prisma migrate deploy  # Aplică migrațiile
npm run build             # Build Next.js
```

### 4. **Prisma Client configurat** (`src/lib/db/prisma.ts`)
- Singleton pattern pentru connection pooling
- Gata de folosit în API routes

## 📋 Pași pentru deploy pe Render:

### 1. **Creează PostgreSQL database pe Render:**
   - Dashboard Render → New → PostgreSQL
   - Nume: `imperiu-sui-luris-db`
   - Plan: Free (sau Starter dacă vrei performanță)
   - Salvează `Internal Database URL` (format: `postgresql://user:pass@host/db`)

### 2. **Setează DATABASE_URL în Web Service:**
   - Dashboard Render → Web Service → Environment
   - Add: `DATABASE_URL` = `<Internal Database URL de la pas 1>`
   - Salvează

### 3. **Deploy automat:**
   - Render va rula `render-build.sh`
   - Migrațiile se aplică automat
   - Next.js se buildează cu Prisma Client

## 🔄 Următorii pași (optional - să înlocuim mockDatabase):

Pentru a folosi Prisma în loc de `mockDatabase`, trebuie să:

1. **Înlocuiesc** `mockDatabase.users.find(...)` cu `prisma.user.findUnique(...)`
2. **Înlocuiesc** `mockDatabase.documents.push(...)` cu `prisma.document.create(...)`
3. **Șterg** `src/lib/db/config.ts` (mockDatabase)

### Exemplu conversie API route:

**Înainte (mockDatabase):**
```typescript
const user = mockDatabase.users.find(u => u.id === userId);
if (!user) return errorResponse("User not found", 404);
```

**După (Prisma):**
```typescript
const user = await prisma.user.findUnique({ where: { id: userId } });
if (!user) return errorResponse("User not found", 404);
```

## ⚠️ Important:

- **mockDatabase continuă să funcționeze local** (fără Postgres)
- **Pe Render, trebuie să migrezi la Prisma** pentru persistență reală
- Pot automatiza conversia completă dacă vrei

## 🧪 Test local (dacă ai Postgres instalat):

```bash
# Pornește Postgres local (ex: Docker)
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres

# Rulează migrația
npx prisma migrate deploy

# Test
npm run dev
```

---

Vrei să continui cu **conversia completă a API routes la Prisma**? Sau deployăm mai întâi cu mockDatabase și migrăm treptat?
