const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const scoreEl = document.querySelector("#score");
const livesEl = document.querySelector("#lives");
const shieldEl = document.querySelector("#shield");
const waveEl = document.querySelector("#wave");
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
};

const bullets = [];
const enemyBullets = [];
const enemies = [];
const particles = [];
const stars = [];
const powerups = [];

for (let i = 0; i < 120; i++) {
  stars.push({
    x: Math.random() * world.w,
    y: Math.random() * world.h,
    z: Math.random() * 2 + 0.35,
    s: Math.random() * 1.8 + 0.5,
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
}

function spawnEnemy() {
  const level = state.wave;
  const roll = Math.random();
  const type = level > 3 && roll > 0.72 ? "heavy" : level > 1 && roll > 0.48 ? "zig" : "scout";
  const base = {
    type,
    x: world.w + 50,
    y: 72 + Math.random() * (world.h - 144),
    phase: Math.random() * Math.PI * 2,
    fire: 1.1 + Math.random() * 1.2,
  };

  if (type === "heavy") {
    enemies.push({ ...base, r: 30, hp: 7 + level, speed: 65 + level * 4, score: 150 });
  } else if (type === "zig") {
    enemies.push({ ...base, r: 22, hp: 3 + Math.floor(level / 2), speed: 115 + level * 5, score: 90 });
  } else {
    enemies.push({ ...base, r: 17, hp: 2 + Math.floor(level / 3), speed: 150 + level * 6, score: 55 });
  }
}

function firePlayer() {
  if (!state.running || state.paused || player.cooldown > 0) return;
  bullets.push({ x: player.x + 24, y: player.y - 7, vx: 650, vy: -18, r: 4, damage: 1 });
  bullets.push({ x: player.x + 24, y: player.y + 7, vx: 650, vy: 18, r: 4, damage: 1 });
  player.cooldown = 0.14;
  spark(player.x + 24, player.y, "#f2c14e", 4, 120);
}

function enemyFire(enemy) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const len = Math.hypot(dx, dy) || 1;
  const speed = enemy.type === "heavy" ? 170 : 210;
  enemyBullets.push({
    x: enemy.x - enemy.r,
    y: enemy.y,
    vx: (dx / len) * speed - 40,
    vy: (dy / len) * speed,
    r: enemy.type === "heavy" ? 7 : 5,
    damage: enemy.type === "heavy" ? 18 : 11,
  });
}

function spawnPowerup() {
  const kind = Math.random() > 0.45 ? "shield" : "life";
  powerups.push({
    kind,
    x: world.w + 30,
    y: 70 + Math.random() * (world.h - 140),
    r: 15,
    vx: -125,
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
    state.powerTimer = 10 + Math.random() * 8;
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
    if (enemy.type === "heavy") enemy.y += Math.sin(enemy.phase * 0.8) * 38 * dt;
    enemy.fire -= dt;
    if (enemy.fire <= 0 && enemy.x < world.w - 80) {
      enemyFire(enemy);
      enemy.fire = enemy.type === "heavy" ? 0.8 : 1.35 + Math.random() * 0.45;
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
        bullets.splice(j, 1);
        enemy.hp -= bullet.damage;
        spark(bullet.x, bullet.y, "#f2c14e", 5, 90);
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
      if (power.kind === "life") {
        player.lives = Math.min(5, player.lives + 1);
      } else {
        player.shield = Math.min(150, player.shield + 45);
      }
      state.score += 120;
      spark(power.x, power.y, power.kind === "life" ? "#e85d48" : "#7ddbdc", 22, 155);
    }
  }
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
  const gradient = ctx.createLinearGradient(0, 0, world.w, world.h);
  gradient.addColorStop(0, "#07121a");
  gradient.addColorStop(0.55, "#0b1820");
  gradient.addColorStop(1, "#161a1d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, world.w, world.h);

  ctx.strokeStyle = "rgba(125, 219, 220, 0.08)";
  ctx.lineWidth = 1;
  for (let x = (performance.now() * -0.025) % 64; x < world.w; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 160, world.h);
    ctx.stroke();
  }

  for (const star of stars) {
    ctx.fillStyle = `rgba(238, 247, 255, ${0.24 + star.z * 0.22})`;
    ctx.fillRect(star.x, star.y, star.s * star.z, star.s * star.z);
  }
}

function drawPlayer() {
  const flicker = player.invincible > 0 && Math.floor(performance.now() / 90) % 2 === 0;
  if (flicker) return;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = "#7ddbdc";
  ctx.beginPath();
  ctx.moveTo(26, 0);
  ctx.lineTo(-18, -18);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-18, 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#eef7ff";
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-7, -7);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-7, 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f2c14e";
  ctx.fillRect(-27, -5, 12 + Math.random() * 10, 10);
  ctx.strokeStyle = `rgba(125, 219, 220, ${0.22 + player.shield / 220})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawEnemies() {
  for (const enemy of enemies) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.fillStyle = enemy.type === "heavy" ? "#b8503d" : enemy.type === "zig" ? "#c36b4d" : "#e85d48";
    ctx.beginPath();
    ctx.moveTo(-enemy.r, 0);
    ctx.lineTo(enemy.r * 0.75, -enemy.r * 0.75);
    ctx.lineTo(enemy.r * 0.35, 0);
    ctx.lineTo(enemy.r * 0.75, enemy.r * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#19100e";
    ctx.fillRect(enemy.r * 0.05, -4, enemy.r * 0.45, 8);
    ctx.restore();
  }
}

function drawBullets() {
  for (const b of bullets) {
    ctx.fillStyle = "#f2c14e";
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, 11, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
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
    ctx.fillStyle = p.kind === "life" ? "#e85d48" : "#7ddbdc";
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-p.r, -p.r, p.r * 2, p.r * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    if (p.kind === "life") {
      ctx.fillRect(-3, -9, 6, 18);
      ctx.fillRect(-9, -3, 18, 6);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.stroke();
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
