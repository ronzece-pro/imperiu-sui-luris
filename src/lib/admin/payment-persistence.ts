import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "payment-settings.json");

interface PaymentSettings {
  stripe: {
    enabled: boolean;
    adminToggle: boolean;
    configured: boolean;
  };
  metamask: {
    enabled: boolean;
    configured: boolean;
  };
  bankTransfer: {
    enabled: boolean;
  };
  hdWallet: {
    enabled: boolean;
    configured: boolean;
  };
  luris: {
    name: string;
    symbol: string;
    conversionRate: number;
    onlyLurisMarketplace: boolean;
  };
}

const defaultSettings: PaymentSettings = {
  stripe: {
    enabled: !!process.env.STRIPE_SECRET_KEY,
    adminToggle: false, // Disabled by default - admin must enable
    configured: !!process.env.STRIPE_SECRET_KEY,
  },
  metamask: {
    enabled: false, // Disabled - using HD wallet instead
    configured: !!process.env.METAMASK_WALLET,
  },
  bankTransfer: {
    enabled: false, // Disabled - using HD wallet instead
  },
  hdWallet: {
    enabled: true, // HD Wallet enabled by default!
    configured: !!process.env.MASTER_WALLET_SEED,
  },
  luris: {
    name: "Luris",
    symbol: "LURIS",
    conversionRate: 0.1, // 1 LURIS = $0.10
    onlyLurisMarketplace: true,
  },
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getPaymentSettings(): PaymentSettings {
  ensureDataDir();
  
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
      const saved = JSON.parse(data);
      
      // Merge with defaults (in case new fields added)
      return {
        ...defaultSettings,
        ...saved,
        stripe: { ...defaultSettings.stripe, ...saved.stripe },
        metamask: { ...defaultSettings.metamask, ...saved.metamask },
        bankTransfer: { ...defaultSettings.bankTransfer, ...saved.bankTransfer },
        hdWallet: { 
          ...defaultSettings.hdWallet, 
          ...saved.hdWallet,
          configured: !!process.env.MASTER_WALLET_SEED, // Always check env
        },
        luris: { ...defaultSettings.luris, ...saved.luris },
      };
    }
  } catch (error) {
    console.error("Error reading payment settings:", error);
  }
  
  return defaultSettings;
}

export function savePaymentSettings(settings: PaymentSettings): void {
  ensureDataDir();
  
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error("Error saving payment settings:", error);
  }
}

export function updatePaymentSetting(
  setting: string, 
  value: boolean | number | string
): { success: boolean; message?: string; error?: string } {
  const settings = getPaymentSettings();

  switch (setting) {
    case "stripeToggle":
      if (typeof value !== "boolean") {
        return { success: false, error: "Invalid value for stripeToggle" };
      }
      settings.stripe.adminToggle = value;
      savePaymentSettings(settings);
      return { success: true, message: `Stripe ${value ? "activat" : "dezactivat"} cu succes` };

    case "metamaskToggle":
      if (typeof value !== "boolean") {
        return { success: false, error: "Invalid value for metamaskToggle" };
      }
      settings.metamask.enabled = value;
      savePaymentSettings(settings);
      return { success: true, message: `MetaMask ${value ? "activat" : "dezactivat"} cu succes` };

    case "bankTransferToggle":
      if (typeof value !== "boolean") {
        return { success: false, error: "Invalid value for bankTransferToggle" };
      }
      settings.bankTransfer.enabled = value;
      savePaymentSettings(settings);
      return { success: true, message: `Transfer bancar ${value ? "activat" : "dezactivat"} cu succes` };

    case "hdWalletToggle":
      if (typeof value !== "boolean") {
        return { success: false, error: "Invalid value for hdWalletToggle" };
      }
      settings.hdWallet.enabled = value;
      savePaymentSettings(settings);
      return { success: true, message: `HD Wallet ${value ? "activat" : "dezactivat"} cu succes` };

    case "lurisConversionRate":
      const rate = parseFloat(String(value));
      if (isNaN(rate) || rate <= 0) {
        return { success: false, error: "Invalid conversion rate" };
      }
      settings.luris.conversionRate = rate;
      savePaymentSettings(settings);
      return { success: true, message: "Rata de conversie actualizată" };

    default:
      return { success: false, error: "Invalid setting" };
  }
}
