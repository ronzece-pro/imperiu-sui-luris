// Help System Settings Management
import { DEFAULT_HELP_SETTINGS, type HelpAdminSettings } from "@/types/help";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "help-settings.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export async function getHelpSettings(): Promise<HelpAdminSettings> {
  ensureDataDir();
  
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
      const settings = JSON.parse(data) as Partial<HelpAdminSettings>;
      return { ...DEFAULT_HELP_SETTINGS, ...settings };
    }
  } catch (error) {
    console.error("Error reading help settings:", error);
  }
  
  // Return defaults and save them
  await saveHelpSettings(DEFAULT_HELP_SETTINGS);
  return DEFAULT_HELP_SETTINGS;
}

export async function saveHelpSettings(settings: HelpAdminSettings): Promise<void> {
  ensureDataDir();
  
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving help settings:", error);
    throw error;
  }
}

export async function updateHelpSettings(updates: Partial<HelpAdminSettings>): Promise<HelpAdminSettings> {
  const current = await getHelpSettings();
  const updated = { ...current, ...updates };
  await saveHelpSettings(updated);
  return updated;
}

// Calculate badge level based on total helps
export function calculateBadgeLevel(totalHelps: number, settings: HelpAdminSettings): string {
  const { badgeLevels } = settings;
  
  if (totalHelps >= badgeLevels.platinum) return "platinum";
  if (totalHelps >= badgeLevels.gold) return "gold";
  if (totalHelps >= badgeLevels.silver) return "silver";
  if (totalHelps >= badgeLevels.bronze) return "bronze";
  return "none";
}

// Check if user earned consecutive bonus
export function checkConsecutiveBonus(consecutiveHelps: number, settings: HelpAdminSettings): boolean {
  return consecutiveHelps > 0 && consecutiveHelps % settings.consecutiveBonusThreshold === 0;
}

// Convert RON to LURIS based on conversion rate
export function ronToLuris(ronAmount: number): number {
  // Using the LURIS conversion rate from admin settings (default 0.1 USD per LURIS)
  // Assuming 1 USD ≈ 4.5 RON, so 1 LURIS ≈ 0.45 RON
  // This means 50 RON ≈ 111 LURIS
  const ronPerLuris = 0.45; // Configurable
  return Math.floor(ronAmount / ronPerLuris);
}
