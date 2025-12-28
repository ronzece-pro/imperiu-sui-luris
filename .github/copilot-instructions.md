# Copilot instructions (Imperiu Sui Luris)

## Stack
- Next.js App Router + TypeScript + Tailwind.
- Server routes: `src/app/api/**/route.ts` (Node runtime).
- Auth: JWT in `Authorization: Bearer <token>`.
- Payments:
  - Stripe topups: create checkout in `POST /api/wallet` and credit wallet only via `POST /api/stripe/webhook` (signature-verified).
  - MetaMask topups: create quote + confirm on-chain in `PUT /api/wallet`.
- Persistence:
  - Wallet uses Prisma + Postgres (`prisma/schema.prisma`, `src/lib/db/prisma.ts`, `src/lib/wallet/persistence.ts`).

## Hard requirements (do not bypass)
- Never accept `userId` from client for wallet/credits/debits; always derive from verified JWT.
- Never credit Stripe payments without verifying webhook signature (`STRIPE_WEBHOOK_SECRET`) and payment status.
- For MetaMask, always verify tx on-chain via RPC (recipient, value, status, confirmations) before crediting.
- Do not re-introduce fallback JWT secrets; `JWT_SECRET` must be provided in production.

## Environment variables
- **Required (production):** `JWT_SECRET`, `DATABASE_URL`.
- **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`.
- **MetaMask:** `METAMASK_WALLET`, `EVM_RPC_URL`, `METAMASK_WEI_PER_LURIS` (optional `METAMASK_CHAIN_ID`).

## Deployment
- Render build should use `npm run render:build` (runs `prisma generate`, `prisma migrate deploy`, then `next build`).

## Coding conventions
- Keep API responses using `successResponse`/`errorResponse` from `src/lib/api/response.ts`.
- Keep changes minimal and aligned with existing patterns; avoid adding new UI/flows unless explicitly requested.
