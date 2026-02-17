// Upgrade Definitionen (Meta & In-Game)
export const UPGRADES = {
  auraRadius: {
    id: "auraRadius",
    name: "AURA RADIUS",
    category: "CORE MODULES",
    color: "#00d2ff",
    desc: "Erhöht die Reichweite der Verteidigungs-Aura.",
    baseCost: 150,
    costMult: 2.5,
    defaultValue: 20, // Basis Radius
    increment: 5, // +15px pro Level
  },
  auraDamage: {
    id: "auraDamage",
    name: "TICK DAMAGE",
    category: "CORE MODULES",
    color: "#00d2ff",
    desc: "Erhöht den Schaden pro Tick.",
    baseCost: 30,
    costMult: 2.6,
    defaultValue: 3, // Damage pro Tick
    increment: 1, // +0.5 Dmg pro Level
  },
  tickRate: {
    id: "tickRate",
    name: "FREQUENCY",
    category: "CORE MODULES",
    color: "#00d2ff",
    desc: "Erhöht die Anzahl der Schadens-Ticks pro Sekunde.",
    baseCost: 50,
    costMult: 2.8,
    defaultValue: 1, // Ticks pro Sekunde
    increment: 1, // +1 Tick pro Sekunde
  },
  coreHp: {
    id: "coreHp",
    name: "CORE HULL",
    category: "DEFENSE MATRIX",
    color: "#2ecc71",
    desc: "Verstärkt die Struktur des Kerns (Max HP).",
    baseCost: 50,
    costMult: 1.5,
    defaultValue: 100, // Basis HP
    increment: 20, // +20 HP pro Level
  },
  coreRegen: {
    id: "coreRegen",
    name: "CORE REGEN",
    category: "DEFENSE MATRIX",
    color: "#2ecc71",
    desc: "Regenerates Core HP per second.",
    baseCost: 120,
    costMult: 2.4,
    defaultValue: 0,
    increment: 0.5, // +0.5 HP pro Sekunde
  },
  critChance: {
    id: "critChance",
    name: "CRIT CHANCE",
    category: "CRITICAL SUB-ROUTINE",
    color: "#ff0055",
    desc: "Chance, kritischen Schaden zu verursachen.",
    baseCost: 100,
    costMult: 1.8,
    defaultValue: 5, // 5% Startwert
    increment: 1, // +1% pro Level
    maxLevel: 95, // Limit: 5 + 95 = 100%
  },
  critFactor: {
    id: "critFactor",
    name: "CRIT LETHALITY",
    category: "CRITICAL SUB-ROUTINE",
    color: "#ff0055",
    desc: "Erhöht den Multiplikator bei kritischen Treffern.",
    baseCost: 120,
    costMult: 1.8,
    defaultValue: 1.5, // Startet bei 150% Schaden (50% Bonus)
    increment: 0.1, // +10% (0.1) pro Level
  },
  chainChance: {
    id: "chainChance",
    name: "CHAIN CHANCE",
    category: "CHAIN REACTION",
    color: "#be2edd",
    desc: "Chance, dass ein Gegner beim Tod einen Kettenblitz auslöst.",
    baseCost: 10,
    costMult: 1.8,
    defaultValue: 0,
    increment: 5, // +5% pro Level
  },
  chainDamage: {
    id: "chainDamage",
    name: "CHAIN DAMAGE",
    category: "CHAIN REACTION",
    color: "#be2edd",
    desc: "Schaden des Kettenblitzes.",
    baseCost: 150,
    costMult: 2.6,
    defaultValue: 100,
    increment: 50,
  },
  chainJumps: {
    id: "chainJumps",
    name: "CHAIN JUMPS",
    category: "CHAIN REACTION",
    color: "#be2edd",
    desc: "Anzahl der zusätzlichen Sprünge.",
    baseCost: 250,
    costMult: 3.0,
    defaultValue: 1,
    increment: 1,
  },
  // --- TEMPORAL SYSTEMS (Crowd Control) ---
  stasisField: {
    id: "stasisField",
    name: "STASIS VISCOSITY",
    desc: "Gegner in der Aura werden verlangsamt.",
    category: "TEMPORAL SYSTEMS",
    color: "#a29bfe", // Lavender
    baseCost: 50,
    costMult: 1.6,
    defaultValue: 10,
    increment: 5, // +5% Slow pro Level
    maxLevel: 14, // Max 80% Slow (damit sie nicht stehen bleiben)
  },

  // --- VOLATILE SYSTEMS (Explosions) ---
  explodeChance: {
    id: "explodeChance",
    name: "MATTER DESTABILIZER",
    desc: "Chance, dass Gegner beim Tod explodieren.",
    category: "VOLATILE SYSTEMS",
    color: "#e17055", // Burnt Orange
    baseCost: 500,
    costMult: 1.7,
    defaultValue: 0,
    increment: 5, // +5% Chance
    maxLevel: 20, // 100% Chance
  },
  explodeRadius: {
    id: "explodeRadius",
    name: "BLAST RADIUS",
    desc: "Erhöht die Reichweite der Explosionen.",
    category: "VOLATILE SYSTEMS",
    color: "#e17055",
    baseCost: 450,
    costMult: 1.5,
    defaultValue: 60,
    increment: 10,
  },
  explodeDamage: {
    id: "explodeDamage",
    name: "FRAGMENTATION",
    desc: "Explosion verursacht % des max. Lebens des Gegners als Schaden.",
    category: "VOLATILE SYSTEMS",
    color: "#e17055",
    baseCost: 600,
    costMult: 1.8,
    defaultValue: 0.2, // 20% Max HP Damage
    increment: 0.05, // +5% pro Level
  },

  // --- ECONOMY PROTOCOLS (Greed) ---
  salvageScanner: {
    id: "salvageScanner",
    name: "SALVAGE SCANNER",
    desc: "Erhöht den Gewinn an Währung pro Kill.",
    category: "ECONOMY PROTOCOLS",
    color: "#f1c40f", // Gold
    baseCost: 250,
    costMult: 1.4,
    defaultValue: 1.0, // 100% (x1.0)
    increment: 0.1, // +10% pro Level
  },
  orbitalCount: {
    id: "orbitalCount",
    name: "Orbital Projectiles",
    desc: "Adds rotating defense orbs around the core.",
    category: "ORBITAL DEFENSE",
    color: "#046c96",
    defaultValue: 0,
    increment: 1, // Startet bei 0, erstes Upgrade gibt 1 oder 2
    maxLevel: 3,
    baseCost: 5000,
    costMult: 10,
  },
  orbitalSpeed: {
    id: "orbitalSpeed",
    category: "ORBITAL DEFENSE",
    name: "Rotation Speed",
    desc: "Increases the speed of the orbitals.",
    color: "#046c96",
    defaultValue: 0.5,
    increment: 0.5,
    maxLevel: 10,
    baseCost: 300,
    costMult: 1.8,
  },
  orbitalDamage: {
    id: "orbitalDamage",
    category: "ORBITAL DEFENSE",
    name: "Orbital Energy",
    desc: "Increases damage dealt by orbitals.",
    color: "#046c96",
    defaultValue: 100,
    increment: 100,
    maxLevel: 200,
    baseCost: 400,
    costMult: 1.6,
  },
};
