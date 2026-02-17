import {SPAWN_DISTRIBUTION} from "./spawnDistribution.js";
import {UPGRADES} from "./metaUpgrades.js";

/**
 * KONFIGURATION & DEFINITIONEN
 */
const GAME_STATE = {
  START: 0,
  PLAYING: 1,
  SHOP: 2,
  GAME_OVER: 3,
};

const ENEMY_COLORS = {
  3: "#ffd32a",
  4: "#ff9f43",
  5: "#ff4757",
  6: "#a29bfe",
  7: "#6c5ce7",
  8: "#d630aa",
  9: "#fd79a8",
  10: "#e17055",
  11: "#00b894",
  12: "#00cec9",
  13: "#0984e3",
  14: "#6c5ce7",
  15: "#ffeaa7",
  16: "#fab1a0",
  17: "#55efc4",
  18: "#81ecec",
  19: "#74b9ff",
  20: "#fdcb6e",
};

const CONFIG = {
  WAVE_DURATION: 150,
  SPAWN_RATE_START: 1,
  ENEMY_BASE_SPEED: 120,
};

/**
 * UTILITIES
 */
const MathUtils = {
  getSpawnPoint(w, h, buffer = 50) {
    const cx = w / 2,
      cy = h / 2;
    const r = Math.sqrt(cx ** 2 + cy ** 2) + buffer;
    const a = Math.random() * Math.PI * 2;
    return {x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r};
  },
  getDistance(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  },
};

function formatNumber(value) {
  if (value < 1000) return Math.floor(value).toString();

  const units = [
    {value: 1e9, suffix: "b"},
    {value: 1e6, suffix: "m"},
    {value: 1e3, suffix: "k"},
  ];

  for (const unit of units) {
    if (value >= unit.value) {
      return (value / unit.value).toFixed(2) + unit.suffix;
    }
  }
}

/**
 * SAVE SYSTEM UTILITY
 */
const SAVE_KEY = "GEODEF_SAVE_DATA_V1";

const SaveSystem = {
  save(gameState) {
    const data = {
      currency: gameState.currency,
      waveIndex: gameState.waveIndex,
      upgradeLevels: gameState.upgradeLevels,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      console.log("Game Saved"); // Debug
    } catch (e) {
      console.error("Save failed:", e);
    }
  },

  load() {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error("Load failed:", e);
      return null;
    }
  },

  reset() {
    localStorage.removeItem(SAVE_KEY);
    location.reload(); // Seite neu laden für sauberen Start
  },
};

/**
 * Gibt ein Array zurück: [{vertices: 3, prob: 0.75}, ...]
 */
function getSpawnDistributionForLevel(level) {
  const levels = Object.keys(SPAWN_DISTRIBUTION)
    .map(Number)
    .sort((a, b) => a - b);

  let selected = levels[0];

  for (const lvl of levels) {
    if (level >= lvl) selected = lvl;
    else break;
  }

  return SPAWN_DISTRIBUTION[selected];
}

/**
 * ENTITIES (Core & Enemy unverändert, aber Enemy nutzt jetzt Rotation)
 * CombatText Klasse von oben übernehmen
 */
class Entity {
  constructor(x, y, radius, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.markedForDeletion = false;
  }
  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

class Core extends Entity {
  constructor(x, y, maxHp) {
    super(x, y, 30, "#00d2ff");
    this.maxHp = maxHp;
    this.hp = this.maxHp;
    this.healPulse = 0; // 0 = kein Pulse aktiv
    this.healPulseDuration = 0.15; // Sekunden
  }
  draw(ctx) {
    ctx.save();

    ctx.shadowBlur = 20;
    ctx.shadowColor = this.color;

    super.draw(ctx);

    ctx.restore();

    const hpRatio = Math.max(0, this.hp) / this.maxHp;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2 * hpRatio);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

class Enemy extends Entity {
  constructor(x, y, type) {
    super(x, y, 15, "#ff4757");
    this.vertices = type;
    this.maxHp = 10 * Math.pow(1.6, this.vertices - 3);
    this.hp = this.maxHp;
    this.baseSpeed = CONFIG.ENEMY_BASE_SPEED * (3 / this.vertices);
    this.speed = this.baseSpeed;
    this.damage = this.vertices;
    this.rotation = 0;
    this.rotationSpeed = 2;
    this.hitFlashTimer = 0;
    this.flashDuration = 0.1;
    this.color = ENEMY_COLORS[type] || "#fff";
    this.isDying = false;
    this.fragments = [];
    this.deathTimer = 0;
    this.deathDuration = 0.6; // Sekunden
  }
  update(deltaTime, target) {
    if (this.isDying) {
      this.deathTimer += deltaTime;

      const progress = this.deathTimer / this.deathDuration;

      this.fragments.forEach((f) => {
        f.x += f.vx * deltaTime;
        f.y += f.vy * deltaTime;
        f.rotation += f.rotationSpeed * deltaTime;
        f.life = 1 - progress;
      });

      if (progress >= 1) {
        this.markedForDeletion = true;
      }

      return; // keine normale Bewegung mehr
    }
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 0) {
      this.x += (dx / distance) * this.speed * deltaTime;
      this.y += (dy / distance) * this.speed * deltaTime;
    }
    this.rotation += this.rotationSpeed * deltaTime;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= deltaTime;
  }
  draw(ctx) {
    if (this.isDying) {
      this.fragments.forEach((f) => {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rotation);

        ctx.globalAlpha = Math.max(0, f.life);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(f.p1.x, f.p1.y);
        ctx.lineTo(f.p2.x, f.p2.y);
        ctx.closePath();

        ctx.fillStyle = this.color;
        ctx.fill();

        ctx.restore();
      });

      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    const hpRatio = this.hp / this.maxHp;
    ctx.globalAlpha = 0.3 + hpRatio * 0.7;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10 + (1 - hpRatio) * 20;

    ctx.beginPath();
    const angleStep = (Math.PI * 2) / this.vertices;
    for (let i = 0; i < this.vertices; i++) {
      const angle = i * angleStep;
      const px = Math.cos(angle) * this.radius;
      const py = Math.sin(angle) * this.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();

    if (this.hitFlashTimer > 0) {
      ctx.globalAlpha = this.hitFlashTimer / this.flashDuration;
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }
    ctx.restore();
  }
  startDeath() {
    this.isDying = true;
    this.speed = 0;
    this.fragments = [];

    const angleStep = (Math.PI * 2) / this.vertices;

    for (let i = 0; i < this.vertices; i++) {
      const angle1 = i * angleStep;
      const angle2 = (i + 1) * angleStep;

      const p1 = {
        x: Math.cos(angle1) * this.radius,
        y: Math.sin(angle1) * this.radius,
      };

      const p2 = {
        x: Math.cos(angle2) * this.radius,
        y: Math.sin(angle2) * this.radius,
      };

      const vx = Math.cos((angle1 + angle2) / 2) * (150 + Math.random() * 100);
      const vy = Math.sin((angle1 + angle2) / 2) * (150 + Math.random() * 100);

      this.fragments.push({
        x: this.x,
        y: this.y,
        p1,
        p2,
        vx,
        vy,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 10,
        life: 1,
      });
    }
  }
}

class Orbital {
  constructor(index) {
    this.index = index;
    this.baseRadius = 8;
    this.trail = [];
    this.maxTrailLength = 10;
    this.hitCooldowns = new Map();
    this.hitInterval = 0.2;
    this.x = 0;
    this.y = 0;
  }

  update(dt, game, totalOrbitals) {
    const speed = game.getStat("orbitalSpeed");
    const damage = game.getStat("orbitalDamage");
    const orbitDistance = 90; // Etwas weiter weg
    const damageTextLifeTime = Math.max(0.5, 1);

    // --- 1. DYNAMISCHE TRAIL LÄNGE ---
    this.maxTrailLength = Math.floor(5 + speed * 4);

    // --- 2. POSITIONS-HISTORIE ---
    if (this.x !== 0 && this.y !== 0) {
      this.trail.push({x: this.x, y: this.y});
    }

    // Zu alte Positionen entfernen
    while (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }

    // --- 3. BEWEGUNG ---
    this.angle = (Date.now() / 1000) * speed + this.index * ((Math.PI * 2) / totalOrbitals);
    this.x = game.core.x + Math.cos(this.angle) * orbitDistance;
    this.y = game.core.y + Math.sin(this.angle) * orbitDistance;

    // --- 4. KOLLISION ---
    game.enemies.forEach((enemy) => {
      if (!this.hitCooldowns.has(enemy)) {
        this.hitCooldowns.set(enemy, 0);
      }

      this.hitCooldowns.set(enemy, this.hitCooldowns.get(enemy) - dt);

      const distance = MathUtils.getDistance(this, enemy);
      const isColliding = distance < this.baseRadius + enemy.radius + 5;

      if (isColliding && !enemy.isDying && this.hitCooldowns.get(enemy) <= 0) {
        enemy.hp -= damage;
        enemy.hitFlashTimer = enemy.flashDuration;

        game.combatTexts.push(
          new CombatText(enemy.x, enemy.y, `${Math.ceil(damage)}`, {
            color: "#ffcfcf",
            size: 22,
            lifeTime: damageTextLifeTime,
          }),
        );

        this.hitCooldowns.set(enemy, this.hitInterval);

        if (enemy.hp <= 0) game.handleEnemyDeath(enemy);
      }
    });

    // --- 5. CLEANUP ---
    for (let enemy of this.hitCooldowns.keys()) {
      if (!game.enemies.includes(enemy)) {
        this.hitCooldowns.delete(enemy);
      }
    }
  }

  draw(ctx) {
    // --- TRAIL ZEICHNEN (VOR DER KUGEL) ---
    if (this.trail.length > 1) {
      ctx.save();
      ctx.strokeStyle = "#00d2ff";
      ctx.shadowColor = "#00d2ff";
      ctx.shadowBlur = 10;
      ctx.lineCap = "round";

      for (let i = 0; i < this.trail.length - 1; i++) {
        const p1 = this.trail[i];
        const p2 = this.trail[i + 1];
        const progress = i / this.trail.length;

        ctx.globalAlpha = 0.1 + progress * 0.4;
        ctx.lineWidth = 1 + progress * (this.baseRadius * 0.8);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // --- HAUPT KUGEL ZEICHNEN ---
    ctx.save();
    ctx.translate(this.x, this.y);

    // Leuchteffekt
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#00d2ff";
    ctx.fillStyle = "#00d2ff";

    ctx.beginPath();
    ctx.arc(0, 0, this.baseRadius, 0, Math.PI * 2);
    ctx.fill();

    // Hellerer Kern/Glanzpunkt für 3D-Effekt
    ctx.fillStyle = "#e0ffff";
    ctx.beginPath();
    ctx.arc(0, 0, this.baseRadius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class CombatText {
  constructor(x, y, text, options = {}) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = options.color || "#ffffff";
    this.lifeTime = options.lifeTime || 0.8;
    this.elapsed = 0;
    this.speedY = options.speedY || 50;
    this.speedX = options.speedX || (Math.random() - 0.5) * 30;
    this.baseSize = options.size || 18;
  }
  update(dt) {
    this.elapsed += dt;
    this.y -= this.speedY * dt;
    this.x += this.speedX * dt;
  }
  draw(ctx) {
    const progress = this.elapsed / this.lifeTime;
    if (progress >= 1) return;
    const scale = 1 + (1 - progress) * 0.4;
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.translate(this.x, this.y);
    ctx.scale(scale, scale);
    ctx.fillStyle = this.color;
    ctx.font = `bold ${this.baseSize}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(this.text, 0, 0);
    ctx.restore();
  }
  get isExpired() {
    return this.elapsed >= this.lifeTime;
  }
}

class LightningEffect {
  constructor(x1, y1, x2, y2) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;

    this.lifeTime = 0.15;
    this.elapsed = 0;
  }

  update(dt) {
    this.elapsed += dt;
  }

  draw(ctx) {
    const progress = this.elapsed / this.lifeTime;
    if (progress >= 1) return;

    ctx.save();

    ctx.globalAlpha = 1 - progress;
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#00e5ff";
    ctx.shadowBlur = 15;

    ctx.beginPath();

    const segments = 6;
    const dx = this.x2 - this.x1;
    const dy = this.y2 - this.y1;

    ctx.moveTo(this.x1, this.y1);

    for (let i = 1; i < segments; i++) {
      const t = i / segments;

      const offset = (Math.random() - 0.5) * 15;

      const px = this.x1 + dx * t + (-dy / 100) * offset;
      const py = this.y1 + dy * t + (dx / 100) * offset;

      ctx.lineTo(px, py);
    }

    ctx.lineTo(this.x2, this.y2);
    ctx.stroke();

    ctx.restore();
  }

  get isExpired() {
    return this.elapsed >= this.lifeTime;
  }
}

class HealPulse {
  constructor(x, y, baseRadius) {
    this.x = x;
    this.y = y;

    this.radius = baseRadius;
    this.maxRadius = baseRadius + 25;

    this.lifeTime = 0.4;
    this.elapsed = 0;
  }

  update(dt) {
    this.elapsed += dt;
    const progress = this.elapsed / this.lifeTime;

    this.radius = this.radius + (this.maxRadius - this.radius) * progress;
  }

  draw(ctx) {
    const progress = this.elapsed / this.lifeTime;
    if (progress >= 1) return;

    ctx.save();

    ctx.globalAlpha = 1 - progress;
    ctx.strokeStyle = "#00ff88";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  get isExpired() {
    return this.elapsed >= this.lifeTime;
  }
}

class ExplosionEffect {
  constructor(x, y, radius, color) {
    this.x = x;
    this.y = y;
    this.maxRadius = radius;
    this.color = color;
    this.lifeTime = 0.3;
    this.elapsed = 0;
  }

  update(dt) {
    this.elapsed += dt;
  }

  draw(ctx) {
    const progress = this.elapsed / this.lifeTime;
    if (progress >= 1) return;

    ctx.save();
    ctx.globalAlpha = 1 - progress; // Fade out

    // Füllung
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.maxRadius * progress, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    // Schockwelle (Ring)
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.maxRadius * progress, 0, Math.PI * 2);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  get isExpired() {
    return this.elapsed >= this.lifeTime;
  }
}

/**
 * GAME ENGINE
 */
class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    // DOM Elements
    this.ui = {
      layer: document.getElementById("ui-layer"),
      hp: document.getElementById("ui-core-hp"),
      timer: document.getElementById("ui-timer"),
      currency: document.getElementById("ui-currency"),
      screens: {
        start: document.getElementById("start-screen"),
        shop: document.getElementById("shop-screen"),
        gameOver: document.getElementById("game-over-screen"),
      },
      menu: {
        waveNum: document.getElementById("start-wave-num"),
        currency: document.getElementById("start-currency"),
        shopCurrency: document.getElementById("shop-currency"),
      },
    };

    this.worldWidth = 1280;
    this.worldHeight = 720;

    // Player Progress (Persistent Stats)
    this.currency = 0;
    this.waveIndex = 1;
    this.upgradeLevels = {
      auraRadius: 0,
      auraDamage: 0,
      tickRate: 0,
    };

    // Game State
    this.state = GAME_STATE.START;
    this.lastTime = 0;

    // Runtime Vars
    this.waveTime = 0;
    this.core = null;
    this.enemies = [];
    this.orbitals = [];
    this.combatTexts = [];
    this.mouse = {x: this.width / 2, y: this.height / 2};
    this.spawnTimer = 0;
    this.auraTickTimer = 0;
    this.lightningEffects = [];
    this.explosions = [];
    this.healPulses = [];
    this.regenTickTimer = 0;

    // Loading
    this.loadProgress();

    this.init();
  }

  // Neue Methode zum Laden
  loadProgress() {
    const saveData = SaveSystem.load();

    if (saveData) {
      this.currency = saveData.currency || 0;
      this.waveIndex = saveData.waveIndex || 1;

      // Merge Upgrade Levels:
      this.upgradeLevels = Object.assign(
        {
          auraRadius: 0,
          auraDamage: 0,
          tickRate: 0,
          coreHp: 0,
          critChance: 0,
          critFactor: 0,
          chainChance: 0,
          chainDamage: 0,
          chainJumps: 0,
          coreRegen: 0,
          stasisField: 0,
          explodeChance: 0,
          explodeRadius: 0,
          explodeDamage: 0,
          salvageScanner: 0,
          orbitalCount: 0,
          orbitalSpeed: 0,
          orbitalDamage: 0,
        },
        saveData.upgradeLevels,
      );
    } else {
      // Defaults, wenn kein Save existiert
      this.currency = 0;
      this.waveIndex = 1;
      this.upgradeLevels = {
        auraRadius: 0,
        auraDamage: 0,
        tickRate: 0,
        coreHp: 0,
        critChance: 0,
        critFactor: 0,
        chainChance: 0,
        chainDamage: 0,
        chainJumps: 0,
        coreRegen: 0,
        stasisField: 0,
        explodeChance: 0,
        explodeRadius: 0,
        explodeDamage: 0,
        salvageScanner: 0,
        orbitalCount: 0,
        orbitalSpeed: 0,
        orbitalDamage: 0,
      };
    }
  }

  init() {
    this.resize();
    this.initInput();
    this.bindUI();
    this.updateMenuUI();

    // Start Loop
    requestAnimationFrame((t) => this.loop(t));
  }

  // --- SETUP & UI BINDING ---

  initInput() {
    globalThis.addEventListener("resize", () => this.resize());
    globalThis.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();

      const scaleX = this.worldWidth / rect.width;
      const scaleY = this.worldHeight / rect.height;

      this.mouse.x = (e.clientX - rect.left) * scaleX;
      this.mouse.y = (e.clientY - rect.top) * scaleY;
    });
  }

  bindUI() {
    // Start Screen Buttons
    document.getElementById("btn-start").addEventListener("click", () => this.startGame());
    document.getElementById("btn-shop").addEventListener("click", () => this.openShop());
    document.getElementById("btn-shop-back").addEventListener("click", () => this.closeShop());
    document.getElementById("btn-reset").addEventListener("click", () => {
      if (confirm("WARNING: Complete system format? All progress will be lost.")) {
        SaveSystem.reset();
      }
    });
  }

  resize() {
    const scale = Math.min(window.innerWidth / this.worldWidth, window.innerHeight / this.worldHeight);

    this.canvas.width = this.worldWidth;
    this.canvas.height = this.worldHeight;

    this.canvas.style.width = this.worldWidth * scale + "px";
    this.canvas.style.height = this.worldHeight * scale + "px";
  }

  pickEnemyFromDistribution(distribution) {
    const r = Math.random();
    let acc = 0;

    for (const vertices in distribution) {
      acc += distribution[vertices];
      if (r <= acc) return Number(vertices);
    }

    return Number(Object.keys(distribution)[0]);
  }

  // --- STATE MANAGEMENT ---

  setScreen(screenName) {
    // Alle Screens verstecken
    Object.values(this.ui.screens).forEach((el) => el.classList.add("hidden"));
    this.ui.layer.classList.add("hidden");

    // Ziel-Screen zeigen
    if (screenName === "game") {
      this.ui.layer.classList.remove("hidden");
    } else if (this.ui.screens[screenName]) {
      this.ui.screens[screenName].classList.remove("hidden");
    }
  }

  startGame() {
    this.state = GAME_STATE.PLAYING;
    this.canvas.classList.add("hide-cursor");
    this.setScreen("game");
    SaveSystem.save(this);
    this.resetWave();
  }

  openShop() {
    this.state = GAME_STATE.SHOP;
    this.canvas.classList.remove("hide-cursor");
    this.renderShop();
    SaveSystem.save(this);
    this.setScreen("shop");
  }

  closeShop() {
    this.state = GAME_STATE.START;
    this.canvas.classList.remove("hide-cursor");
    this.updateMenuUI();
    SaveSystem.save(this);
    this.setScreen("start");
  }

  gameOver() {
    this.state = GAME_STATE.GAME_OVER;
    this.canvas.classList.remove("hide-cursor");
    SaveSystem.save(this);
    this.setScreen("gameOver");
  }

  resetWave() {
    const maxHp = this.getStat("coreHp");
    this.core = new Core(this.worldWidth / 2, this.worldHeight / 2, maxHp);

    this.enemies = [];
    this.combatTexts = [];
    this.waveTime = CONFIG.WAVE_DURATION;
    this.spawnTimer = 0;
  }

  updateMenuUI() {
    this.ui.menu.waveNum.innerText = this.waveIndex;
    this.ui.menu.currency.innerText = Math.floor(this.currency);
  }

  // --- SHOP SYSTEM ---

  renderShop() {
    const container = document.getElementById("shop-container");
    container.innerHTML = "";

    this.ui.menu.shopCurrency.innerText = formatNumber(Math.floor(this.currency));

    const categories = {};
    const catOrder = [
      "CORE MODULES",
      "DEFENSE MATRIX",
      "ORBITAL DEFENSE",
      "ECONOMY PROTOCOLS",
      "CRITICAL SUB-ROUTINE",
      "CHAIN REACTION",
      "VOLATILE SYSTEMS",
      "TEMPORAL SYSTEMS",
    ];

    Object.values(UPGRADES).forEach((upg) => {
      if (!categories[upg.category]) categories[upg.category] = [];
      categories[upg.category].push(upg);
    });

    catOrder.forEach((catName) => {
      if (!categories[catName]) return;

      const upgrades = categories[catName];

      // Sektion Wrapper
      const section = document.createElement("div");
      section.className = "shop-section";

      // Titel
      const title = document.createElement("h3");
      title.className = "shop-section-title";
      title.innerText = catName;
      section.appendChild(title);

      // Grid
      const grid = document.createElement("div");
      grid.className = "shop-grid";

      upgrades.forEach((upg) => {
        const currentLvl = this.upgradeLevels[upg.id];
        const cost = Math.floor(upg.baseCost * Math.pow(upg.costMult, currentLvl));

        const currentVal = upg.defaultValue + currentLvl * upg.increment;
        const nextVal = currentVal + upg.increment;

        // Formatierung der Werte (damit 1.5 nicht 1.500000002 ist)
        const fCurr = Number.isInteger(currentVal) ? currentVal : Number.parseFloat(currentVal.toFixed(1));
        const fNext = Number.isInteger(nextVal) ? nextVal : Number.parseFloat(nextVal.toFixed(1));

        const isMaxed = upg.maxLevel && currentLvl >= upg.maxLevel;
        const canAfford = this.currency >= cost;

        const card = document.createElement("div");
        card.className = "upgrade-card";
        card.style.borderLeftColor = upg.color || "#fff";

        card.innerHTML = `
                <div class="upgrade-header" style="color:${upg.color}">
                    <span>${upg.name}</span>
                    <span style="font-size:0.8em; opacity:0.7">LVL ${currentLvl}</span>
                </div>
                
                <div class="upgrade-desc" style="font-size:0.8rem; color:#888; min-height:35px">
                    ${upg.desc}
                </div>

                <div class="upgrade-stats">
                    <span>${fCurr}</span>
                    <span class="stat-arrow">➜</span>
                    <span style="color:${upg.color}">${isMaxed ? "MAX" : fNext}</span>
                </div>

                <button class="btn-primary upgrade-btn" 
                    style="${canAfford && !isMaxed ? "" : "opacity:0.5; cursor:not-allowed; background:#333; border-color:#444"}"
                    ${!canAfford || isMaxed ? "disabled" : ""}>
                    
                    <span>${isMaxed ? "COMPLETED" : "UPGRADE"}</span>
                    <span>${isMaxed ? "" : formatNumber(cost) + " $"}</span>
                </button>
            `;

        const btn = card.querySelector("button");
        if (!isMaxed && canAfford) {
          btn.onclick = () => {
            this.buyUpgrade(upg.id, cost);
          };
        }

        grid.appendChild(card);
      });

      section.appendChild(grid);
      container.appendChild(section);
    });
  }

  buyUpgrade(id, cost) {
    if (this.currency >= cost) {
      this.currency -= cost;
      this.upgradeLevels[id]++;
      this.renderShop(); // Refresh UI
      this.updateMenuUI(); // Wichtig: UI Update auch hier
      SaveSystem.save(this);
    }
  }

  // --- GAME LOGIC HELPER (STATS & FEATURES) ---

  // Berechnet aktuelle Stats basierend auf Upgrades
  getStat(key) {
    const upg = UPGRADES[key];
    const lvl = this.upgradeLevels[key];
    return upg.defaultValue + lvl * upg.increment;
  }

  // --- Chain Lightning Logic ---

  tryChainLightning(originEnemy) {
    const chance = this.getStat("chainChance");

    if (chance <= 0) return;

    if (Math.random() * 100 > chance) return;

    const damage = this.getStat("chainDamage");
    const jumps = this.getStat("chainJumps");

    this.propagateChain(originEnemy, damage, jumps);
  }

  propagateChain(originEnemy, damage, jumpsRemaining) {
    if (jumpsRemaining <= 0) return;

    // nächstes Ziel suchen (nächstgelegener lebender Gegner)
    let closest = null;
    let closestDist = Infinity;

    this.enemies.forEach((enemy) => {
      if (enemy === originEnemy) return;
      if (enemy.isDying) return;

      const dist = MathUtils.getDistance(originEnemy, enemy);
      if (dist < closestDist) {
        closestDist = dist;
        closest = enemy;
      }
    });

    if (!closest) return;

    this.lightningEffects.push(new LightningEffect(originEnemy.x, originEnemy.y, closest.x, closest.y));

    // Schaden anwenden
    closest.hp -= damage;
    closest.hitFlashTimer = closest.flashDuration;

    this.combatTexts.push(
      new CombatText(closest.x, closest.y, `⚡${damage}`, {
        color: "#00e5ff",
        size: 18,
        speedY: 80,
      }),
    );

    if (closest.hp <= 0 && !closest.isDying) {
      this.handleEnemyDeath(closest);
    }

    // Rekursiv weiter
    this.propagateChain(closest, damage, jumpsRemaining - 1);
  }

  // --- GAME LOOP ---

  spawnSystem(dt) {
    const progress = 1 - this.waveTime / CONFIG.WAVE_DURATION;
    const currentSpawnInterval = CONFIG.SPAWN_RATE_START - (CONFIG.SPAWN_RATE_START - 0.2) * (progress * progress);

    this.spawnTimer += dt;

    if (this.spawnTimer >= currentSpawnInterval) {
      this.spawnTimer = 0;

      const pos = MathUtils.getSpawnPoint(this.worldWidth, this.worldHeight);

      const distribution = getSpawnDistributionForLevel(this.waveIndex);

      const type = this.pickEnemyFromDistribution(distribution);

      this.enemies.push(new Enemy(pos.x, pos.y, type));
    }
  }

  auraSystem(dt) {
    this.auraTickTimer += dt;

    const tickRate = this.getStat("tickRate");
    const radius = this.getStat("auraRadius");
    const stasisSlow = this.getStat("stasisField");
    const baseDamage = this.getStat("auraDamage"); // Umbenannt zu baseDamage für Klarheit

    // Krit Werte abrufen
    const critChance = this.getStat("critChance");
    const critFactor = this.getStat("critFactor");

    const damageTextLifeTime = Math.max(0.5, 1 / tickRate);

    this.enemies.forEach((enemy) => {
      const dist = MathUtils.getDistance(this.mouse, enemy);

      if (dist < radius + enemy.radius) {
        if (stasisSlow > 0) {
          enemy.speed = enemy.baseSpeed * (1 - stasisSlow / 100);
        }
      } else {
        enemy.speed = enemy.baseSpeed;
      }
    });

    if (this.auraTickTimer >= 1 / tickRate) {
      this.enemies.forEach((enemy) => {
        const dist = MathUtils.getDistance(this.mouse, enemy);
        if (dist < radius + enemy.radius) {
          // --- KRIT BERECHNUNG ---
          const isCrit = Math.random() * 100 < critChance;
          const finalDamage = isCrit ? baseDamage * critFactor : baseDamage;
          enemy.hp -= finalDamage;
          enemy.hitFlashTimer = enemy.flashDuration;

          // Damage Text

          if (isCrit) {
            this.combatTexts.push(
              new CombatText(enemy.x, enemy.y - 10, `${Math.ceil(finalDamage)}!`, {
                color: "#ff0055",
                size: 24,
                lifeTime: 0.8,
                speedY: 80,
              }),
            );
          } else {
            this.combatTexts.push(
              new CombatText(enemy.x, enemy.y, `${Math.ceil(finalDamage)}`, {
                color: "#ff3b3b",
                size: 14,
                lifeTime: damageTextLifeTime,
              }),
            );
          }

          if (enemy.hp <= 0 && !enemy.isDying) {
            this.handleEnemyDeath(enemy);
            this.tryChainLightning(enemy);
          }
        }
      });
      this.auraTickTimer = 0;
    }
  }

  applyCoreRegen(dt) {
    const regen = this.getStat("coreRegen");
    if (regen <= 0) return;

    const tickInterval = 1; // alle 0.5 Sekunden ein Heal-Tick
    this.regenTickTimer += dt;

    if (this.regenTickTimer >= tickInterval) {
      this.regenTickTimer = 0;

      if (this.core.hp < this.core.maxHp) {
        const healAmount = regen * tickInterval;

        this.core.hp += healAmount;
        if (this.core.hp > this.core.maxHp) {
          this.core.hp = this.core.maxHp;
        }

        // >>> VISUELLER PULSE
        this.healPulses.push(new HealPulse(this.core.x, this.core.y, this.core.radius));

        // Optional CombatText
        this.combatTexts.push(
          new CombatText(this.core.x, this.core.y - 40, `+${healAmount.toFixed(1)}`, {
            color: "#00ff88",
            size: 16,
            lifeTime: 0.6,
          }),
        );
      }
    }
  }

  handleEnemyDeath(enemy) {
    const greedMult = this.getStat("salvageScanner"); // Startet bei 1.0
    const rawReward = Math.floor(enemy.maxHp * 0.4);
    const reward = Math.floor(rawReward * greedMult);
    this.currency += reward;

    this.combatTexts.push(
      new CombatText(enemy.x, enemy.y - 10, `+${reward}`, {
        color: "#ffd700",
        size: 20,
      }),
    );
    this.tryExplosion(enemy);
    enemy.startDeath();
  }

  tryExplosion(originEnemy) {
    const chance = this.getStat("explodeChance");
    if (chance <= 0) return;

    // Würfeln
    if (Math.random() * 100 < chance) {
      const radius = this.getStat("explodeRadius");
      const dmgPercent = this.getStat("explodeDamage");
      const damage = originEnemy.maxHp * dmgPercent; // Skaliert mit Gegnerstärke!

      // VISUAL: In das neue Array pushen
      this.explosions.push(new ExplosionEffect(originEnemy.x, originEnemy.y, radius, "#e17055"));

      // LOGIC: Flächenschaden
      this.enemies.forEach((target) => {
        if (target === originEnemy) return; // Nicht den Ursprung treffen (ist eh tot)

        const dist = MathUtils.getDistance(originEnemy, target);
        if (dist <= radius + target.radius) {
          target.hp -= damage;
          target.hitFlashTimer = target.flashDuration;

          // Eigener Text für Explosionen
          this.combatTexts.push(
            new CombatText(target.x, target.y, `💥${Math.ceil(damage)}`, {
              color: "#ff7675", // Helles Orange/Rot
              size: 16,
              speedY: 100,
            }),
          );

          // Kettenreaktion ermöglichen? Ja!
          if (target.hp <= 0 && !target.isDying) {
            this.handleEnemyDeath(target);
          }
        }
      });
    }
  }

  update(dt) {
    this.waveTime -= dt;
    if (this.waveTime <= 0) {
      // Wave Complete Logic (Simple loop for now)
      this.waveIndex++;
      this.currency += 100; // Bonus
      SaveSystem.save(this);
      this.closeShop(); // Zurück zum Menü mit neuer Wave Nummer
    }

    this.spawnSystem(dt);
    this.auraSystem(dt);
    this.applyCoreRegen(dt);
    if (this.healPulse > 0) {
      this.healPulse -= dt;
      if (this.healPulse < 0) {
        this.healPulse = 0;
      }
    }

    // Entities Update
    this.enemies.forEach((e) => {
      e.update(dt, this.core);
      const dist = MathUtils.getDistance(e, this.core);
      if (dist < e.radius + this.core.radius) {
        this.core.hp -= e.damage;
        e.markedForDeletion = true;
        if (this.core.hp <= 0) this.closeShop();
      }
    });

    this.combatTexts.forEach((ct) => ct.update(dt));

    // 1. Anzahl der Orbitals synchronisieren
    const targetCount = this.getStat("orbitalCount");
    if (this.orbitals.length !== targetCount) {
      this.orbitals = []; // Array leeren
      for (let i = 0; i < targetCount; i++) {
        this.orbitals.push(new Orbital(i));
      }
    }

    // 2. Orbitals updaten
    this.orbitals.forEach((orb) => orb.update(dt, this, targetCount));

    // Cleanup
    this.enemies = this.enemies.filter((e) => !e.markedForDeletion);
    this.combatTexts = this.combatTexts.filter((ct) => !ct.isExpired);
    this.lightningEffects.forEach((l) => l.update(dt));
    this.lightningEffects = this.lightningEffects.filter((l) => !l.isExpired);
    this.explosions.forEach((ex) => ex.update(dt));
    this.explosions = this.explosions.filter((ex) => !ex.isExpired);
    this.healPulses.forEach((p) => p.update(dt));
    this.healPulses = this.healPulses.filter((p) => !p.isExpired);

    // UI Update
    this.ui.hp.innerText = Math.ceil(this.core.hp) + " HP";
    this.ui.currency.innerText = Math.floor(this.currency);
    const m = Math.floor(this.waveTime / 60);
    const s = Math.floor(this.waveTime % 60);
    this.ui.timer.innerText = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  draw() {
    // Background
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = "#111";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Core & Enemies (zeichnen wir auch im Hintergrund des Menüs, wenn sie da sind)
    if (this.core) this.core.draw(this.ctx);
    this.orbitals.forEach((orb) => orb.draw(this.ctx));
    this.healPulses.forEach((p) => p.draw(this.ctx));
    this.enemies.forEach((e) => e.draw(this.ctx));
    this.explosions.forEach((ex) => ex.draw(this.ctx));
    this.lightningEffects.forEach((l) => l.draw(this.ctx));
    this.combatTexts.forEach((ct) => ct.draw(this.ctx));

    // Aura Radius Visuell (dynamisch basierend auf Upgrade)
    if (this.state === GAME_STATE.PLAYING) {
      const currentRadius = this.getStat("auraRadius");
      this.ctx.beginPath();
      this.ctx.arc(this.mouse.x, this.mouse.y, currentRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      this.ctx.fill();
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }
  }

  loop(timestamp) {
    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    if (this.state === GAME_STATE.PLAYING) {
      // Nur updaten wenn nicht pausiert/im Menü
      if (dt < 0.1) this.update(dt);
    }

    this.draw(); // Immer zeichnen (damit man im Menü nicht Blackscreen hat)
    requestAnimationFrame((t) => this.loop(t));
  }
}

globalThis.onload = () => new Game();
