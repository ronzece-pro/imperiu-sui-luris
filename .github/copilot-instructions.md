# Copilot Instructions — Imperiul Sui Juris

## Stack & Architecture
- **Framework:** Next.js 16 App Router + TypeScript + Tailwind v4
- **API Routes:** `src/app/api/**/route.ts` (Node runtime, export GET/POST/PUT/DELETE)
- **Auth:** JWT in `Authorization: Bearer <token>` — verify with `requireAuthenticatedUser(request)` from `src/lib/auth/require.ts`
- **Currency:** LURIS (internal token) — all marketplace prices in LURIS

## Persistence (Dual System)
| Domain | Storage | Location |
|--------|---------|----------|
| Wallet, Transactions | Prisma + PostgreSQL | `prisma/schema.prisma`, `src/lib/wallet/persistence.ts` |
| Users (file-based) | JSON files | `data/users.json`, `src/lib/users/persistence.ts` |
| Invites | JSON files | `data/invites.json`, `src/lib/invites/persistence.ts` |
| Dev/Mock data | In-memory | `src/lib/db/config.ts` (mockDatabase) |

- Wallet persistence auto-falls back to in-memory when `DATABASE_URL` is missing (dev only).
- Run `npx prisma generate` after schema changes; `npx prisma migrate dev` for new migrations.

## Payment Flows (Critical Security)
### Stripe
1. `POST /api/wallet` (action=addFunds, paymentMethod=stripe) → creates Checkout Session
2. `POST /api/stripe/webhook` → verifies signature, checks `payment_status === "paid"`, calls `completeStripeTopup()`

### MetaMask / EVM
1. `PUT /api/wallet` (action=createMetamaskTopup) → returns `{ to, valueWei, chainId }`
2. User sends tx via MetaMask
3. `PUT /api/wallet` (action=confirmMetamaskTopup, txHash) → verifies on-chain (recipient, value, status, ≥1 confirmation) → `completeMetamaskTopup()`

### HD Wallet Deposits
- `src/lib/wallet/hd-wallet.ts` — derives unique deposit addresses per user from `MASTER_WALLET_SEED`
- Supports Polygon, BSC, Ethereum (mainnet/testnet via `USE_TESTNET=true`)

## Hard Requirements (DO NOT BYPASS)
- **Never** accept `userId` from client for wallet operations — always derive from verified JWT
- **Never** credit Stripe payments without webhook signature verification
- **Never** credit MetaMask without on-chain tx verification (recipient, value, status, confirmations)
- **Never** re-introduce fallback JWT secrets — `JWT_SECRET` must be set in production
- Check `accountStatus` (active|blocked|banned|deleted) before allowing actions

## API Route Pattern
```typescript
import { NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/require";
import { successResponse, errorResponse } from "@/lib/api/response";
import { appendAuditLog } from "@/lib/audit/persistence";

export async function POST(request: NextRequest) {
  const authed = requireAuthenticatedUser(request);
  if (!authed.ok) return authed.response;
  const { userId } = authed.decoded;
  
  // ... business logic ...
  
  appendAuditLog({ type: "action_type", actorUserId: userId, message: "...", metadata: {} });
  return successResponse(data, "Success message");
}
```

## Folder Structure (`src/lib/`)
- `admin/` — admin config, payment settings persistence
- `api/` — `successResponse`, `errorResponse`, `authErrorResponse`
- `audit/` — `appendAuditLog()` with TTL pruning
- `auth/` — `createToken`, `verifyToken`, `requireAuthenticatedUser`
- `db/` — `prisma.ts` (singleton), `config.ts` (mockDatabase)
- `documents/` — `renderDocumentHtml()`, `generateVerificationCode()`
- `wallet/` — `getOrCreateWallet`, `addFundsToWallet`, `deductFundsFromWallet`, HD wallet
- `users/`, `invites/`, `chat/`, `notifications/`, `verification/` — domain-specific logic

## Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Production | Token signing secret |
| `DATABASE_URL` | Production | PostgreSQL connection string |
| `STRIPE_SECRET_KEY` | Stripe | API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Webhook signature verification |
| `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` | Stripe | Client-side key |
| `METAMASK_WALLET` | MetaMask | Recipient wallet address |
| `EVM_RPC_URL` | MetaMask | JSON-RPC endpoint for tx verification |
| `METAMASK_WEI_PER_LURIS` | MetaMask | Wei per 1 LURIS |
| `MASTER_WALLET_SEED` | HD Wallet | BIP39 mnemonic for deposit addresses |
| `USE_TESTNET` | Optional | Set `true` for testnet chains |

## Build & Deploy
```bash
npm run dev              # Development server
npm run build            # Production build (auto-runs prisma if DATABASE_URL set)
npm run render:build     # Render.com: prisma generate + migrate deploy + next build
```

## Coding Conventions
- Use `successResponse()`/`errorResponse()` for all API responses
- Log sensitive actions with `appendAuditLog()`
- Types in `src/types/` — import as `import type { User, Document } from "@/types"`
- Keep changes minimal; follow existing patterns
- Admin routes check `role === "admin"` after auth
