# HD Wallet Setup Guide

## 🔐 Master Seed Generation (ONE-TIME SETUP)

Your HD wallet system requires a master seed phrase to generate unique deposit addresses for each user. **This is the most critical security step.**

### ⚠️ CRITICAL WARNINGS

- **NEVER regenerate the seed after production launch** - you will lose access to all funds!
- **Write the seed on paper and store in a safe place** (fire-proof safe, bank deposit box)
- **NEVER share the seed with anyone** - whoever has it controls ALL funds
- **NEVER commit the seed to git** - it must only exist in `.env`
- **Consider splitting the seed**: Write 12 words in one location, 12 words in another
- **If you lose the seed, you lose ALL user funds permanently**

### Step 1: Generate Master Seed

**Option A: Via API (Recommended)**

1. Start your local server:
   ```bash
   npm run dev
   ```

2. Login as admin and call the seed generation endpoint:
   ```bash
   curl -X GET http://localhost:3000/api/admin/sweep-deposits \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

3. The response will contain a 24-word seed phrase. **COPY IT IMMEDIATELY.**

**Option B: Manual Generation**

Run this Node.js script once:

```javascript
import { Mnemonic } from "ethers";
import { randomBytes } from "crypto";

const entropy = randomBytes(32); // 256 bits = 24 words
const mnemonic = Mnemonic.fromEntropy(entropy);
console.log("Master Seed:", mnemonic.phrase);
```

### Step 2: Save to Environment

Add the generated seed to your `.env` file:

```bash
# HD Wallet Master Seed (24 words)
# ⚠️ NEVER COMMIT THIS TO GIT
# ⚠️ BACKUP SECURELY - IF LOST, ALL FUNDS ARE GONE
MASTER_WALLET_SEED="word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22 word23 word24"
```

### Step 3: Verify Setup

1. Restart your server:
   ```bash
   npm run dev
   ```

2. Check if HD wallet is working:
   ```bash
   curl -X GET http://localhost:3000/api/deposit-address-hd \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. You should receive a unique deposit address. **Save this for testing.**

### Step 4: Production Deployment

**Render.com Setup:**

1. Go to your Render dashboard
2. Navigate to your web service → Environment
3. Add environment variable:
   - Key: `MASTER_WALLET_SEED`
   - Value: `your 24 word seed phrase`
4. **DO NOT** check "Share with team members" (unless trusted)
5. Click "Save Changes" (this will trigger redeploy)

**Vercel Setup:**

1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add:
   - Name: `MASTER_WALLET_SEED`
   - Value: `your 24 word seed phrase`
   - Environments: Production, Preview, Development
4. Click "Save"
5. Redeploy your site

### Step 5: Backup Strategy

**Recommended Backup Methods:**

1. **Paper Wallet** (Primary):
   - Write all 24 words on paper
   - Store in fire-proof safe or bank deposit box
   - Consider laminating

2. **Split Storage** (Advanced):
   - Words 1-12: Location A (e.g., home safe)
   - Words 13-24: Location B (e.g., bank deposit box)
   - Both pieces needed to reconstruct seed

3. **Encrypted Digital Backup** (Optional):
   - Use password manager (1Password, Bitwarden) with strong master password
   - Or encrypt with GPG and store encrypted file in multiple locations
   - **NEVER store unencrypted seed on cloud services**

4. **Metal Backup** (Advanced):
   - Engrave seed on stainless steel plate
   - Fire/water resistant
   - Products: Cryptosteel, Billfodl

### Step 6: Hot Wallet Setup

Create a separate hot wallet for daily operations:

```bash
# Hot Wallet Address (where sweep sends funds)
HOT_WALLET_ADDRESS="0xYourHotWalletAddressHere"
```

**Hot Wallet Best Practices:**
- Use a separate MetaMask account for hot wallet
- Keep only operational funds (e.g., $100-$1000)
- Regularly transfer to cold storage
- Monitor for suspicious activity

---

## 🔄 Cron Job Setup (Deposit Monitoring)

The system needs to check for deposits every 30-60 seconds and run daily sweeps.

### Option A: Vercel Cron (Recommended for Vercel)

Create `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-deposits",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

Add cron secret to environment:

```bash
# Cron Secret (random string to prevent unauthorized calls)
CRON_SECRET="your-random-secret-here-min-32-chars"
```

### Option B: External Cron Service

Use [cron-job.org](https://cron-job.org) or similar:

1. Create account
2. Add new cron job:
   - URL: `https://yourdomain.com/api/cron/check-deposits`
   - Schedule: `*/1 * * * *` (every minute)
   - HTTP Method: POST
   - Headers:
     - `x-cron-secret`: `your-cron-secret`

### Daily Sweep Setup

Call the sweep endpoint once per day:

**Vercel Cron:**

```json
{
  "crons": [
    {
      "path": "/api/admin/sweep-deposits",
      "schedule": "0 3 * * *"
    }
  ]
}
```

**Or via admin panel:** Navigate to Admin → Sweep Deposits → Click "Rulează Sweep Acum"

---

## 🧪 Testing the HD Wallet

### Test 1: Generate Deposit Address

```bash
curl -X GET https://yourdomain.com/api/deposit-address-hd \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:

```json
{
  "success": true,
  "data": {
    "depositAddress": "0x123...",
    "derivationPath": "m/44'/60'/0'/0/0",
    "userIndex": 0,
    "balances": {
      "polygon": { "usdt": 0, "usdc": 0, "matic": 0 },
      "bsc": { "usdt": 0, "usdc": 0, "bnb": 0 }
    }
  }
}
```

### Test 2: Send Test Deposit

1. Get your deposit address from above
2. Send 1 USDT on Polygon testnet (Mumbai) or BSC testnet
3. Wait 30-60 seconds for cron to detect
4. Check your LURIS balance - should increase by 10 LURIS ($1 / $0.10)

### Test 3: Manual Sweep

```bash
curl -X POST https://yourdomain.com/api/admin/sweep-deposits \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "hotWallet": "0xYourHotWalletAddress",
    "chains": ["polygon", "bsc"],
    "tokens": ["usdt", "usdc"],
    "minAmount": 0.01
  }'
```

Expected response:

```json
{
  "success": true,
  "data": {
    "totalSwept": 1.00,
    "sweeps": [
      {
        "userId": "user123",
        "chain": "polygon",
        "token": "usdt",
        "amount": "1.00",
        "txHash": "0xabc..."
      }
    ],
    "summary": {
      "successful": 1,
      "failed": 0,
      "totalAmount": "$1.00"
    }
  }
}
```

---

## 📊 Multi-Chain Configuration

Your HD wallet supports multiple EVM chains. Same address works on all chains!

### Supported Chains

| Chain     | Fee      | Confirmation | Status      |
|-----------|----------|-------------|-------------|
| Polygon   | ~$0.05   | 2-3 min     | ✅ Primary  |
| BSC       | ~$0.30   | 1-2 min     | ✅ Secondary|
| Ethereum  | ~$15     | 10-15 min   | 🟡 Optional |

### Supported Tokens

- **USDT** (Tether) - Most popular stablecoin
- **USDC** (USD Coin) - High liquidity

### Add More Chains

Edit `src/lib/wallet/hd-wallet.ts`:

```typescript
const RPC_URLS: Record<string, string> = {
  polygon: "https://polygon-rpc.com",
  bsc: "https://bsc-dataseed.binance.org",
  ethereum: "https://eth.llamarpc.com",
  arbitrum: "https://arb1.arbitrum.io/rpc", // NEW
};

const TOKEN_ADDRESSES: Record<string, Record<string, string>> = {
  usdt: {
    polygon: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    bsc: "0x55d398326f99059fF775485246999027B3197955",
    ethereum: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    arbitrum: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // NEW
  },
  // ...
};
```

---

## 🚨 Emergency Recovery

### If You Lose Access to Server

1. **You still have the master seed** (backed up securely, right?)
2. Import seed into MetaMask or hardware wallet
3. Derive addresses manually using BIP44 path: `m/44'/60'/0'/0/{userIndex}`
4. Each user's index is stored in `data/wallet-data.json`
5. Transfer funds manually from each address to new hot wallet

### If Server is Compromised

1. **Immediately change MASTER_WALLET_SEED** (generates new addresses going forward)
2. **Run emergency sweep**: Send all funds from old addresses to secure wallet
3. **Audit logs**: Check `data/audit-log.json` for suspicious activity
4. **Notify users**: If funds were lost, communicate transparently

### If You Accidentally Regenerate Seed

**YOU CANNOT RECOVER.** Old addresses are lost forever.

**Prevention:**
- Add to `.env`: `# DO NOT CHANGE - REGENERATING WILL LOSE ALL FUNDS`
- Backup seed in multiple locations
- Set environment variable as "protected" on hosting platform

---

## 📈 Monitoring & Maintenance

### Daily Checklist

- ✅ Check sweep logs in admin panel
- ✅ Verify hot wallet balance is reasonable
- ✅ Monitor for failed deposits in cron logs
- ✅ Check Polygon/BSC network status

### Weekly Tasks

- Transfer hot wallet surplus to cold storage
- Review user deposit patterns
- Check for stuck transactions on explorer
- Verify LURIS conversion rates are accurate

### Monthly Tasks

- Backup `data/wallet-data.json` (user balances + metadata)
- Review and rotate cron secrets if needed
- Test recovery procedure (derive test address from seed)
- Update RPC endpoints if any are slow/offline

---

## 🔗 Resources

- **BIP44 Standard**: https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
- **Ethers.js Docs**: https://docs.ethers.org/v6/
- **Polygon Scan**: https://polygonscan.com/
- **BSC Scan**: https://bscscan.com/
- **Ethereum Scan**: https://etherscan.io/

---

## ❓ FAQ

**Q: Can I change the master seed later?**
A: NO. Changing it will generate completely different addresses, making old deposits inaccessible.

**Q: What if a user loses their deposit address?**
A: They can always get it again from `/api/deposit-address-hd` - it's deterministically derived from their userId.

**Q: Do users need to pay gas fees?**
A: No. Users just send USDT/USDC. Admin pays gas when sweeping (hence daily batching).

**Q: Can multiple users have the same address?**
A: No. Each userId maps to a unique index, deriving a unique address via BIP44.

**Q: What happens if sweep fails?**
A: Funds remain in user's deposit address. Retry sweep manually or wait for next daily run.

**Q: How do I add more RPC endpoints?**
A: Edit `RPC_URLS` in `hd-wallet.ts`. Consider using Alchemy/Infura for better reliability.

---

**Next Steps:**
1. ✅ Generate and backup master seed
2. ✅ Add MASTER_WALLET_SEED to environment
3. ✅ Create hot wallet and add HOT_WALLET_ADDRESS
4. ✅ Setup cron for deposit monitoring
5. ✅ Test with small deposit
6. ✅ Configure daily sweep schedule
7. 🚀 Launch to production!
