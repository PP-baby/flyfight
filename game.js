const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const scoreEl = document.querySelector("#score");
const livesEl = document.querySelector("#lives");
const shieldEl = document.querySelector("#shield");
const waveEl = document.querySelector("#wave");
const weaponEl = document.querySelector("#weapon");
const overlay = document.querySelector("#overlay");
const statusEl = document.querySelector("#status");
const startButton = document.querySelector("#startButton");
const fireButton = document.querySelector("#fireButton");

const keys = new Set();
const pointer = { active: false, x: 0, y: 0 };
const world = { w: 960, h: 540, scaleX: 1, scaleY: 1 };
const state = {
  running: false,
  paused: false,
  over: false,
  lastTime: 0,
  score: 0,
  wave: 1,
  enemyTimer: 0,
  powerTimer: 8,
  shake: 0,
  slowMo: 0,
};

const player = {
  x: 110,
  y: 270,
  r: 18,
  speed: 310,
  lives: 3,
  shield: 100,
  cooldown: 0,
  invincible: 0,
  weaponLevel: 1,
  overdrive: 0,
};

const bullets = [];
const enemyBullets = [];
const enemies = [];
const particles = [];
const stars = [];
const powerups = [];
const nebulae = [];
const asteroids = [];

const spaceThemes = [
  {
    name: "azure-rift",
    top: "#06101c",
    mid: "#0a1d28",
    bottom: "#15181f",
    nebula: "rgba(56, 189, 248, 0.2)",
    nebula2: "rgba(125, 219, 220, 0.14)",
    line: "rgba(125, 219, 220, 0.09)",
    star: "238, 247, 255",
    planet: "#385a76",
  },
  {
    name: "violet-nebula",
    top: "#0e0920",
    mid: "#1d1130",
    bottom: "#231522",
    nebula: "rgba(199, 125, 255, 0.22)",
    nebula2: "rgba(83, 214, 255, 0.12)",
    line: "rgba(199, 125, 255, 0.08)",
    star: "244, 232, 255",
    planet: "#5a417b",
  },
  {
    name: "ember-galaxy",
    top: "#120d10",
    mid: "#20151b",
    bottom: "#281b16",
    nebula: "rgba(232, 93, 72, 0.2)",
    nebula2: "rgba(242, 193, 78, 0.12)",
    line: "rgba(242, 193, 78, 0.08)",
    star: "255, 236, 204",
    planet: "#75513c",
  },
  {
    name: "green-void",
    top: "#061410",
    mid: "#0d211e",
    bottom: "#111b1b",
    nebula: "rgba(74, 222, 128, 0.18)",
    nebula2: "rgba(45, 212, 191, 0.12)",
    line: "rgba(74, 222, 128, 0.08)",
    star: "223, 255, 241",
    planet: "#2f665c",
  },
];

for (let i = 0; i < 120; i++) {
  stars.push({
    x: Math.random() * world.w,
    y: Math.random() * world.h,
    z: Math.random() * 2 + 0.35,
    s: Math.random() * 1.8 + 0.5,
  });
}

for (let i = 0; i < 8; i++) {
  nebulae.push({
    x: Math.random() * world.w,
    y: Math.random() * world.h,
    r: 120 + Math.random() * 180,
    drift: 4 + Math.random() * 10,
    alpha: 0.45 + Math.random() * 0.45,
  });
}

for (let i = 0; i < 22; i++) {
  asteroids.push({
    x: Math.random() * world.w,
    y: 80 + Math.random() * (world.h - 160),
    r: 5 + Math.random() * 14,
    spin: Math.random() * Math.PI,
    speed: 18 + Math.random() * 38,
  });
}

function fitCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(canvas.width / world.w, 0, 0, canvas.height / world.h, 0, 0);
  world.scaleX = world.w / rect.width;
  world.scaleY = world.h / rect.height;
}

function resetGame() {
  Object.assign(state, {
    running: true,
    paused: false,
    over: false,
    lastTime: performance.now(),
    score: 0,
    wave: 1,
    enemyTimer: 0.5,
    powerTimer: 7,
    shake: 0,
    slowMo: 0,
  });
  Object.assign(player, {
    x: 110,
    y: world.h / 2,
    lives: 3,
    shield: 100,
    cooldown: 0,
    invincible: 1.4,
    weaponLevel: 1,
    overdrive: 0,
  });
  bullets.length = 0;
  enemyBullets.length = 0;
  enemies.length = 0;
  particles.length = 0;
  powerups.length = 0;
  overlay.classList.add("hidden");
  updateHud();
}

function updateHud() {
  scoreEl.textContent = state.score.toLocaleString("zh-CN");
  livesEl.textContent = player.lives;
  shieldEl.textContent = `${Math.max(0, Math.round(player.shield))}%`;
  waveEl.textContent = state.wave;
  weaponEl.textContent = player.overdrive > 0 ? `Lv.${player.weaponLevel}+` : `Lv.${player.weaponLevel}`;
}

function spawnEnemy() {
  const level = state.wave;
  const roll = Math.random();
  let type = "scout";
  if (level > 5 && roll > 0.82) {
    type = "blade";
  } else if (level > 3 && roll > 0.64) {
    type = "heavy";
  } else if (level > 2 && roll > 0.42) {
    type = "drone";
  } else if (level > 1 && roll > 0.24) {
    type = "zig";
  }
  const base = {
    type,
    x: world.w + 50,
    y: 72 + Math.random() * (world.h - 144),
    phase: Math.random() * Math.PI * 2,
    fire: 1.1 + Math.random() * 1.2,
  };

  if (type === "heavy") {
    enemies.push({ ...base, r: 30, hp: 7 + level, speed: 65 + level * 4, score: 150 });
  } else if (type === "blade") {
    enemies.push({ ...base, r: 26, hp: 5 + Math.floor(level * 0.7), speed: 130 + level * 4, score: 130 });
  } else if (type === "drone") {
    enemies.push({ ...base, r: 19, hp: 3 + Math.floor(level / 2), speed: 100 + level * 5, score: 95 });
  } else if (type === "zig") {
    enemies.push({ ...base, r: 22, hp: 3 + Math.floor(level / 2), speed: 115 + level * 5, score: 90 });
  } else {
    enemies.push({ ...base, r: 17, hp: 2 + Math.floor(level / 3), speed: 150 + level * 6, score: 55 });
  }
}

function firePlayer() {
  if (!state.running || state.paused || player.cooldown > 0) return;
  const boosted = player.overdrive > 0;
  const level = player.weaponLevel;
  const damage = 1 + Math.floor(level / 2) + (boosted ? 2 : 0);
  const speed = boosted ? 820 : 680 + level * 28;
  const spread = [
    { y: 0, vy: 0 },
    { y: -9, vy: -24 },
    { y: 9, vy: 24 },
  ];

  if (level >= 3 || boosted) {
    spread.push({ y: -17, vy: -58 }, { y: 17, vy: 58 });
  }
  if (level >= 5) {
    spread.push({ y: -25, vy: -92 }, { y: 25, vy: 92 });
  }

  for (const shot of spread) {
    bullets.push({
      x: player.x + 24,
      y: player.y + shot.y,
      vx: speed,
      vy: shot.vy,
      r: boosted ? 6 : 4 + Math.min(2, level * 0.35),
      damage,
      pierce: boosted ? 1 : level >= 4 ? 1 : 0,
      kind: boosted ? "overdrive" : level >= 4 ? "heavy" : "normal",
    });
  }

  player.cooldown = boosted ? 0.08 : Math.max(0.08, 0.16 - level * 0.012);
  spark(player.x + 24, player.y, boosted ? "#c77dff" : "#f2c14e", boosted ? 9 : 5, boosted ? 180 : 125);
}

function enemyFire(enemy) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const len = Math.hypot(dx, dy) || 1;
  const speed = enemy.type === "heavy" ? 170 : enemy.type === "blade" ? 245 : 210;
  enemyBullets.push({
    x: enemy.x - enemy.r,
    y: enemy.y,
    vx: (dx / len) * speed - 40,
    vy: (dy / len) * speed,
    r: enemy.type === "heavy" ? 7 : enemy.type === "blade" ? 4 : 5,
    damage: enemy.type === "heavy" ? 18 : enemy.type === "blade" ? 13 : 11,
  });
}

function spawnPowerup() {
  const roll = Math.random();
  const kind = roll > 0.78 ? "overdrive" : roll > 0.42 ? "weapon" : roll > 0.16 ? "shield" : "life";
  powerups.push({
    kind,
    x: world.w + 30,
    y: 70 + Math.random() * (world.h - 140),
    r: kind === "overdrive" ? 18 : 15,
    vx: kind === "weapon" || kind === "overdrive" ? -105 : -125,
    phase: Math.random() * Math.PI,
  });
}

function spark(x, y, color, count, force) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * force + force * 0.25;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.35 + Math.random() * 0.45,
      max: 0.8,
      color,
      size: Math.random() * 3 + 1.5,
    });
  }
}

function explode(x, y, big = false) {
  spark(x, y, "#f2c14e", big ? 34 : 18, big ? 250 : 170);
  spark(x, y, "#e85d48", big ? 22 : 10, big ? 210 : 140);
  state.shake = Math.max(state.shake, big ? 11 : 6);
}

function hitPlayer(damage) {
  if (player.invincible > 0) return;
  player.shield -= damage;
  state.shake = 8;
  spark(player.x, player.y, "#7ddbdc", 16, 180);
  if (player.shield <= 0) {
    player.lives -= 1;
    player.shield = 100;
    player.invincible = 1.8;
    explode(player.x, player.y, true);
    if (player.lives <= 0) endGame();
  }
  updateHud();
}

function endGame() {
  state.running = false;
  state.over = true;
  overlay.classList.remove("hidden");
  statusEl.textContent = `战斗结束。最终分数 ${state.score.toLocaleString("zh-CN")}，抵达第 ${state.wave} 波。`;
  startButton.textContent = "再来一局";
}

function togglePause() {
  if (!state.running || state.over) return;
  state.paused = !state.paused;
  overlay.classList.toggle("hidden", !state.paused);
  statusEl.textContent = "已暂停。调整呼吸，随时继续。";
  startButton.textContent = "继续战斗";
  state.lastTime = performance.now();
}

function update(dt) {
  if (!state.running || state.paused) return;
  const timeScale = state.slowMo > 0 ? 0.72 : 1;
  dt *= timeScale;
  state.slowMo = Math.max(0, state.slowMo - dt);
  state.shake = Math.max(0, state.shake - dt * 22);
  player.cooldown = Math.max(0, player.cooldown - dt);
  player.invincible = Math.max(0, player.invincible - dt);
  player.overdrive = Math.max(0, player.overdrive - dt);

  const mx = (keys.has("ArrowRight") || keys.has("KeyD") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("KeyA") ? 1 : 0);
  const my = (keys.has("ArrowDown") || keys.has("KeyS") ? 1 : 0) - (keys.has("ArrowUp") || keys.has("KeyW") ? 1 : 0);
  const len = Math.hypot(mx, my) || 1;
  player.x += (mx / len) * player.speed * dt;
  player.y += (my / len) * player.speed * dt;
  if (pointer.active) {
    player.x += (pointer.x - player.x) * Math.min(1, dt * 9);
    player.y += (pointer.y - player.y) * Math.min(1, dt * 9);
  }
  player.x = clamp(player.x, 34, world.w * 0.58);
  player.y = clamp(player.y, 34, world.h - 34);
  if (keys.has("Space")) firePlayer();

  state.enemyTimer -= dt;
  if (state.enemyTimer <= 0) {
    spawnEnemy();
    const rate = Math.max(0.34, 1.15 - state.wave * 0.065);
    state.enemyTimer = rate + Math.random() * 0.55;
  }

  state.powerTimer -= dt;
  if (state.powerTimer <= 0) {
    spawnPowerup();
    state.powerTimer = Math.max(5.5, 9 - state.wave * 0.25) + Math.random() * 5;
  }

  state.wave = Math.max(1, 1 + Math.floor(state.score / 900));

  for (const star of stars) {
    star.x -= (55 + state.wave * 4) * star.z * dt;
    if (star.x < -6) {
      star.x = world.w + 6;
      star.y = Math.random() * world.h;
    }
  }

  moveList(bullets, dt);
  moveList(enemyBullets, dt);

  for (const enemy of enemies) {
    enemy.phase += dt * 3;
    enemy.x -= enemy.speed * dt;
    if (enemy.type === "zig") enemy.y += Math.sin(enemy.phase) * 105 * dt;
    if (enemy.type === "drone") enemy.y += Math.sin(enemy.phase * 1.7) * 70 * dt;
    if (enemy.type === "heavy") enemy.y += Math.sin(enemy.phase * 0.8) * 38 * dt;
    if (enemy.type === "blade") {
      enemy.y += Math.sin(enemy.phase * 2.2) * 140 * dt;
      enemy.x -= Math.max(0, Math.cos(enemy.phase)) * 45 * dt;
    }
    enemy.fire -= dt;
    if (enemy.fire <= 0 && enemy.x < world.w - 80) {
      enemyFire(enemy);
      enemy.fire = enemy.type === "heavy" ? 0.8 : enemy.type === "blade" ? 0.95 : 1.35 + Math.random() * 0.45;
    }
  }

  for (const power of powerups) {
    power.phase += dt * 5;
    power.x += power.vx * dt;
    power.y += Math.sin(power.phase) * 28 * dt;
  }

  collide();
  cleanup();
  updateParticles(dt);
  updateHud();
}

function moveList(list, dt) {
  for (const item of list) {
    item.x += item.vx * dt;
    item.y += item.vy * dt;
  }
}

function collide() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    if (distance(player, enemy) < player.r + enemy.r) {
      enemies.splice(i, 1);
      hitPlayer(enemy.type === "heavy" ? 36 : 22);
      explode(enemy.x, enemy.y, enemy.type === "heavy");
      continue;
    }

    for (let j = bullets.length - 1; j >= 0; j--) {
      const bullet = bullets[j];
      if (distance(enemy, bullet) < enemy.r + bullet.r) {
        const hitDamage = bullet.damage;
        if (bullet.pierce > 0) {
          bullet.pierce -= 1;
          bullet.damage = Math.max(1, bullet.damage - 1);
        } else {
          bullets.splice(j, 1);
        }
        enemy.hp -= hitDamage;
        spark(bullet.x, bullet.y, bullet.kind === "overdrive" ? "#c77dff" : "#f2c14e", 5, 90);
        if (enemy.hp <= 0) {
          enemies.splice(i, 1);
          state.score += enemy.score;
          state.slowMo = 0.05;
          explode(enemy.x, enemy.y, enemy.type === "heavy");
        }
        break;
      }
    }
  }

  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i];
    if (distance(player, bullet) < player.r + bullet.r) {
      enemyBullets.splice(i, 1);
      hitPlayer(bullet.damage);
    }
  }

  for (let i = powerups.length - 1; i >= 0; i--) {
    const power = powerups[i];
    if (distance(player, power) < player.r + power.r) {
      powerups.splice(i, 1);
      collectPowerup(power);
      state.score += 120;
    }
  }
}

function collectPowerup(power) {
  const color = powerColor(power.kind);
  if (power.kind === "life") {
    player.lives = Math.min(5, player.lives + 1);
  } else if (power.kind === "shield") {
    player.shield = Math.min(150, player.shield + 45);
  } else if (power.kind === "weapon") {
    player.weaponLevel = Math.min(5, player.weaponLevel + 1);
    player.cooldown = 0;
  } else if (power.kind === "overdrive") {
    player.overdrive = Math.min(12, player.overdrive + 7);
    player.cooldown = 0;
    state.slowMo = 0.12;
  }
  spark(power.x, power.y, color, power.kind === "overdrive" ? 34 : 24, power.kind === "overdrive" ? 230 : 165);
  updateHud();
}

function powerColor(kind) {
  if (kind === "life") return "#e85d48";
  if (kind === "shield") return "#7ddbdc";
  if (kind === "weapon") return "#f2c14e";
  return "#c77dff";
}

function cleanup() {
  removeOffscreen(bullets, 40);
  removeOffscreen(enemyBullets, 90);
  removeOffscreen(enemies, 120);
  removeOffscreen(powerups, 80);
}

function removeOffscreen(list, margin) {
  for (let i = list.length - 1; i >= 0; i--) {
    const item = list[i];
    if (item.x < -margin || item.x > world.w + margin || item.y < -margin || item.y > world.h + margin) {
      list.splice(i, 1);
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - dt * 1.7;
    p.vy *= 1 - dt * 1.7;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function draw() {
  ctx.save();
  ctx.clearRect(0, 0, world.w, world.h);
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawBackground();
  drawPowerups();
  drawBullets();
  drawEnemies();
  drawPlayer();
  drawParticles();
  ctx.restore();
}

function drawBackground() {
  const theme = currentTheme();
  const gradient = ctx.createLinearGradient(0, 0, world.w, world.h);
  gradient.addColorStop(0, theme.top);
  gradient.addColorStop(0.55, theme.mid);
  gradient.addColorStop(1, theme.bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, world.w, world.h);

  drawNebulas(theme);
  drawDistantPlanet(theme);

  ctx.strokeStyle = theme.line;
  ctx.lineWidth = 1;
  for (let x = (performance.now() * -0.025) % 64; x < world.w; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 160, world.h);
    ctx.stroke();
  }

  for (const star of stars) {
    ctx.fillStyle = `rgba(${theme.star}, ${0.24 + star.z * 0.22})`;
    ctx.fillRect(star.x, star.y, star.s * star.z, star.s * star.z);
  }

  if (state.wave >= 4) drawAsteroidBelt(theme);
}

function currentTheme() {
  return spaceThemes[Math.floor((state.wave - 1) / 2) % spaceThemes.length];
}

function drawNebulas(theme) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (const cloud of nebulae) {
    const x = (cloud.x - performance.now() * 0.002 * cloud.drift + world.w) % (world.w + cloud.r) - cloud.r * 0.35;
    const glow = ctx.createRadialGradient(x, cloud.y, 0, x, cloud.y, cloud.r);
    glow.addColorStop(0, theme.nebula);
    glow.addColorStop(0.42, theme.nebula2);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.globalAlpha = cloud.alpha;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, cloud.y, cloud.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawDistantPlanet(theme) {
  const index = Math.floor((state.wave - 1) / 2);
  const x = world.w - 120 - (index % 3) * 155;
  const y = 86 + (index % 4) * 54;
  const r = 42 + (index % 3) * 12;
  const planet = ctx.createRadialGradient(x - r * 0.35, y - r * 0.38, 4, x, y, r);
  planet.addColorStop(0, "#d8f7ff");
  planet.addColorStop(0.12, theme.planet);
  planet.addColorStop(1, "rgba(6, 9, 15, 0.18)");
  ctx.save();
  ctx.globalAlpha = 0.36;
  ctx.fillStyle = planet;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = theme.line;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y + 4, r * 1.65, r * 0.28, -0.22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawAsteroidBelt(theme) {
  ctx.save();
  ctx.fillStyle = `rgba(${theme.star}, 0.35)`;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
  for (const rock of asteroids) {
    const x = (rock.x - performance.now() * 0.018 * rock.speed + world.w + 120) % (world.w + 160) - 80;
    const y = rock.y + Math.sin(performance.now() * 0.001 + rock.spin) * 16;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rock.spin + performance.now() * 0.0008);
    ctx.beginPath();
    ctx.moveTo(-rock.r, -rock.r * 0.2);
    ctx.lineTo(-rock.r * 0.45, -rock.r * 0.85);
    ctx.lineTo(rock.r * 0.65, -rock.r * 0.55);
    ctx.lineTo(rock.r, rock.r * 0.1);
    ctx.lineTo(rock.r * 0.32, rock.r * 0.85);
    ctx.lineTo(-rock.r * 0.7, rock.r * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawPlayer() {
  const flicker = player.invincible > 0 && Math.floor(performance.now() / 90) % 2 === 0;
  if (flicker) return;
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.overdrive > 0) {
    ctx.strokeStyle = "rgba(199, 125, 255, 0.62)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 32 + Math.sin(performance.now() * 0.018) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  const hull = ctx.createLinearGradient(-28, 0, 32, 0);
  hull.addColorStop(0, "#2b7f94");
  hull.addColorStop(0.46, "#bdf9ff");
  hull.addColorStop(1, "#eef7ff");
  ctx.shadowColor = "rgba(125, 219, 220, 0.55)";
  ctx.shadowBlur = 18;

  ctx.fillStyle = "rgba(36, 132, 154, 0.92)";
  ctx.beginPath();
  ctx.moveTo(4, -5);
  ctx.lineTo(-28, -27);
  ctx.lineTo(-15, -5);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-15, 5);
  ctx.lineTo(-28, 27);
  ctx.lineTo(4, 5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#7ddbdc";
  ctx.beginPath();
  ctx.moveTo(18, -9);
  ctx.lineTo(-18, -17);
  ctx.lineTo(-8, -4);
  ctx.lineTo(8, 0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(18, 9);
  ctx.lineTo(-18, 17);
  ctx.lineTo(-8, 4);
  ctx.lineTo(8, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(34, 0);
  ctx.lineTo(6, -14);
  ctx.lineTo(-24, -8);
  ctx.lineTo(-12, 0);
  ctx.lineTo(-24, 8);
  ctx.lineTo(6, 14);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(238, 247, 255, 0.75)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#eef7ff";
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-8, -5);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-8, 5);
  ctx.closePath();
  ctx.fill();

  const cockpit = ctx.createRadialGradient(8, -3, 1, 8, 0, 9);
  cockpit.addColorStop(0, "#ffffff");
  cockpit.addColorStop(0.35, "#8ff3ff");
  cockpit.addColorStop(1, "#236071");
  ctx.fillStyle = cockpit;
  ctx.beginPath();
  ctx.ellipse(8, 0, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f2c14e";
  ctx.fillRect(-32, -4, 10 + Math.random() * 12, 8);
  ctx.fillStyle = "rgba(232, 93, 72, 0.72)";
  ctx.fillRect(-35, -2, 8 + Math.random() * 16, 4);
  ctx.strokeStyle = `rgba(125, 219, 220, ${0.22 + player.shield / 220})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 31, 25, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawEnemies() {
  for (const enemy of enemies) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    if (enemy.type === "heavy") {
      drawHeavyEnemy(enemy);
    } else if (enemy.type === "blade") {
      drawBladeEnemy(enemy);
    } else if (enemy.type === "drone") {
      drawDroneEnemy(enemy);
    } else if (enemy.type === "zig") {
      drawZigEnemy(enemy);
    } else {
      drawScoutEnemy(enemy);
    }
    ctx.restore();
  }
}

function drawScoutEnemy(enemy) {
  const r = enemy.r;
  ctx.fillStyle = "#e85d48";
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r * 0.85, -r * 0.72);
  ctx.lineTo(r * 0.32, 0);
  ctx.lineTo(r * 0.85, r * 0.72);
  ctx.closePath();
  ctx.fill();
  drawEnemyCore(r * 0.1, 0, r * 0.42, "#ffb09e");
}

function drawZigEnemy(enemy) {
  const r = enemy.r;
  ctx.fillStyle = "#c36b4d";
  ctx.beginPath();
  ctx.moveTo(-r * 1.1, 0);
  ctx.lineTo(r * 0.7, -r);
  ctx.lineTo(r * 0.25, -r * 0.18);
  ctx.lineTo(r, 0);
  ctx.lineTo(r * 0.25, r * 0.18);
  ctx.lineTo(r * 0.7, r);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 220, 180, 0.38)";
  ctx.stroke();
  drawEnemyCore(r * 0.05, 0, r * 0.36, "#ffd0a3");
}

function drawDroneEnemy(enemy) {
  const r = enemy.r;
  ctx.rotate(enemy.phase * 0.15);
  ctx.fillStyle = "#d85e7f";
  ctx.strokeStyle = "rgba(255, 210, 230, 0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = "#7b263e";
    ctx.fillRect(r * 0.62, -3, r * 0.78, 6);
  }
  drawEnemyCore(0, 0, r * 0.34, "#ffadc7");
}

function drawHeavyEnemy(enemy) {
  const r = enemy.r;
  const armor = ctx.createLinearGradient(-r, 0, r, 0);
  armor.addColorStop(0, "#5c2020");
  armor.addColorStop(0.45, "#b8503d");
  armor.addColorStop(1, "#ff9b73");
  ctx.fillStyle = armor;
  ctx.beginPath();
  ctx.moveTo(-r * 1.22, -r * 0.4);
  ctx.lineTo(-r * 0.25, -r);
  ctx.lineTo(r * 0.92, -r * 0.58);
  ctx.lineTo(r * 1.05, 0);
  ctx.lineTo(r * 0.92, r * 0.58);
  ctx.lineTo(-r * 0.25, r);
  ctx.lineTo(-r * 1.22, r * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 209, 166, 0.45)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#2a0d0d";
  ctx.fillRect(-r * 0.65, -r * 0.14, r * 1.05, r * 0.28);
  drawEnemyCore(r * 0.32, 0, r * 0.28, "#ffd2a0");
}

function drawBladeEnemy(enemy) {
  const r = enemy.r;
  ctx.rotate(Math.sin(enemy.phase) * 0.18);
  ctx.fillStyle = "#f0566f";
  ctx.beginPath();
  ctx.moveTo(-r * 1.3, 0);
  ctx.lineTo(r * 0.2, -r * 1.05);
  ctx.lineTo(r * 0.95, -r * 0.16);
  ctx.lineTo(r * 0.35, 0);
  ctx.lineTo(r * 0.95, r * 0.16);
  ctx.lineTo(r * 0.2, r * 1.05);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 230, 240, 0.55)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  drawEnemyCore(-r * 0.05, 0, r * 0.3, "#ffe2ea");
}

function drawEnemyCore(x, y, r, color) {
  ctx.fillStyle = "#19080b";
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.32, 0, Math.PI * 2);
  ctx.fill();
}

function drawBullets() {
  for (const b of bullets) {
    ctx.fillStyle = b.kind === "overdrive" ? "#c77dff" : b.kind === "heavy" ? "#ffdc73" : "#f2c14e";
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, b.kind === "overdrive" ? 16 : 11, b.r, 0, 0, Math.PI * 2);
    ctx.fill();
    if (b.kind === "overdrive") {
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  for (const b of enemyBullets) {
    ctx.fillStyle = "#e85d48";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPowerups() {
  for (const p of powerups) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.phase * 0.4);
    ctx.fillStyle = powerColor(p.kind);
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (p.kind === "overdrive") {
      ctx.moveTo(0, -p.r - 3);
      ctx.lineTo(p.r + 3, 0);
      ctx.lineTo(0, p.r + 3);
      ctx.lineTo(-p.r - 3, 0);
      ctx.closePath();
    } else {
      ctx.rect(-p.r, -p.r, p.r * 2, p.r * 2);
    }
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    if (p.kind === "life") {
      ctx.fillRect(-3, -9, 6, 18);
      ctx.fillRect(-9, -3, 18, 6);
    } else if (p.kind === "shield") {
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.kind === "weapon") {
      ctx.beginPath();
      ctx.moveTo(-8, -7);
      ctx.lineTo(0, -1);
      ctx.lineTo(8, -7);
      ctx.moveTo(-8, 3);
      ctx.lineTo(0, 9);
      ctx.lineTo(8, 3);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(2, -12);
      ctx.lineTo(-5, 1);
      ctx.lineTo(2, 1);
      ctx.lineTo(-1, 12);
      ctx.lineTo(8, -2);
      ctx.lineTo(1, -2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function loop(now) {
  const dt = Math.min(0.033, (now - state.lastTime) / 1000 || 0);
  state.lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * world.scaleX,
    y: (event.clientY - rect.top) * world.scaleY,
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

window.addEventListener("resize", fitCanvas);
window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "Space") event.preventDefault();
  if (event.code === "KeyP") togglePause();
});
window.addEventListener("keyup", (event) => keys.delete(event.code));

canvas.addEventListener("pointerdown", (event) => {
  if (!state.running) return;
  pointer.active = true;
  const point = canvasPoint(event);
  pointer.x = point.x;
  pointer.y = point.y;
  firePlayer();
});
canvas.addEventListener("pointermove", (event) => {
  if (!pointer.active) return;
  const point = canvasPoint(event);
  pointer.x = point.x;
  pointer.y = point.y;
});
window.addEventListener("pointerup", () => {
  pointer.active = false;
});

startButton.addEventListener("click", () => {
  if (state.paused) {
    state.paused = false;
    overlay.classList.add("hidden");
    state.lastTime = performance.now();
  } else {
    resetGame();
  }
});
fireButton.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
  firePlayer();
});

fitCanvas();
updateHud();
requestAnimationFrame(loop);
