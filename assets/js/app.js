const root = document.documentElement;
const storageKey = "link-bio-theme";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* =========================================================
   Tema
   ========================================================= */
const themeToggle = document.getElementById("themeToggle");

function setThemeIcon(theme) {
  themeToggle.innerHTML = theme === "light"
    ? '<i class="fa-solid fa-sun" aria-hidden="true"></i>'
    : '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
}

function applyTheme(theme) {
  root.dataset.theme = theme;
  setThemeIcon(theme);
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute("content", theme === "light" ? "#f4f7fc" : "#060a14");
  });
  window.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
}

applyTheme(root.dataset.theme === "light" ? "light" : "dark");

themeToggle.addEventListener("click", () => {
  const next = root.dataset.theme === "light" ? "dark" : "light";
  themeToggle.classList.add("is-switching");
  window.setTimeout(() => {
    applyTheme(next);
    themeToggle.classList.remove("is-switching");
  }, reducedMotion ? 0 : 180);
  try {
    localStorage.setItem(storageKey, next);
  } catch (error) {
    /* modo privado: ignora */
  }
});

/* =========================================================
   Marquee da stack: duplica os itens para o loop infinito
   ========================================================= */
const stackTrack = document.getElementById("stackTrack");
if (stackTrack) {
  [...stackTrack.children].forEach((item) => {
    const clone = item.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    stackTrack.appendChild(clone);
  });
}

/* =========================================================
   Brilho dos links seguindo o cursor
   ========================================================= */
document.querySelectorAll(".link").forEach((link) => {
  link.addEventListener("pointermove", (event) => {
    const rect = link.getBoundingClientRect();
    link.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    link.style.setProperty("--my", `${event.clientY - rect.top}px`);
  });
});


/* =========================================================
   Fundo animado: rede de partículas azuis
   - partículas flutuam devagar e se ligam quando estão perto
   - o cursor puxa as partículas e cria ligações com elas
   - clique/toque solta uma onda que empurra as partículas
   ========================================================= */
const canvas = document.getElementById("bgCanvas");
const ctx = canvas.getContext("2d");
const LINK_DIST = 140;
const MOUSE_DIST = 200;

let width = 0;
let height = 0;
let dpr = 1;
let particles = [];
let running = !document.hidden;
let rafId = 0;
let lastTime = 0;
let colors = readColors();

const pointer = { x: -9999, y: -9999, active: false };
const ripples = [];

function readColors() {
  const light = root.dataset.theme === "light";
  return light
    ? { dot: [37, 99, 235], line: [37, 99, 235], lineAlpha: 0.22, dotAlpha: 0.55 }
    : { dot: [96, 165, 250], line: [59, 130, 246], lineAlpha: 0.32, dotAlpha: 0.8 };
}

// Ajusta a quantidade sem recriar as que já existem (evita "pulos" no resize)
function createParticles() {
  const count = Math.round(Math.min(110, Math.max(36, (width * height) / 13000)));
  if (particles.length > count) particles.length = count;
  while (particles.length < count) particles.push(makeParticle());
}

function makeParticle() {
  const angle = Math.random() * Math.PI * 2;
  const speed = 8 + Math.random() * 14; // px por segundo
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    baseVx: Math.cos(angle) * speed,
    baseVy: Math.sin(angle) * speed,
    r: 1 + Math.random() * 1.6,
    phase: Math.random() * Math.PI * 2,
  };
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  createParticles();
  // Mudar o tamanho limpa o canvas: redesenha na hora para não piscar
  draw(performance.now() * 0.001);
}

function update(dt, t) {
  for (const p of particles) {
    // Atração suave pelo cursor
    if (pointer.active) {
      const dx = pointer.x - p.x;
      const dy = pointer.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < MOUSE_DIST && dist > 1) {
        const force = (1 - dist / MOUSE_DIST) * 60;
        p.vx += (dx / dist) * force * dt;
        p.vy += (dy / dist) * force * dt;
      }
    }

    // Ondas de clique empurram para fora
    for (const ripple of ripples) {
      const dx = p.x - ripple.x;
      const dy = p.y - ripple.y;
      const dist = Math.hypot(dx, dy) || 1;
      const front = Math.abs(dist - ripple.radius);
      if (front < 40) {
        const force = (1 - front / 40) * 420 * (1 - ripple.age / ripple.life);
        p.vx += (dx / dist) * force * dt;
        p.vy += (dy / dist) * force * dt;
      }
    }

    // Volta aos poucos para a velocidade de cruzeiro
    p.vx += (p.baseVx - p.vx) * Math.min(1, dt * 1.2);
    p.vy += (p.baseVy - p.vy) * Math.min(1, dt * 1.2);

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Atravessa as bordas
    const m = 20;
    if (p.x < -m) p.x = width + m;
    else if (p.x > width + m) p.x = -m;
    if (p.y < -m) p.y = height + m;
    else if (p.y > height + m) p.y = -m;
  }

  for (let i = ripples.length - 1; i >= 0; i -= 1) {
    const ripple = ripples[i];
    ripple.age += dt;
    ripple.radius += dt * 520;
    if (ripple.age > ripple.life) ripples.splice(i, 1);
  }
}

// Deixa a rede mais fraca atrás da coluna de conteúdo para não atrapalhar a leitura
function contentFade(x) {
  if (width < 700) return 0.55;
  const dist = Math.abs(x - width / 2);
  return Math.min(1, Math.max(0.22, (dist - 200) / 140));
}

function draw(t) {
  ctx.clearRect(0, 0, width, height);
  const [lr, lg, lb] = colors.line;
  const [dr, dg, db] = colors.dot;

  // Ligações entre partículas
  ctx.lineWidth = 1;
  for (let i = 0; i < particles.length; i += 1) {
    const a = particles[i];
    for (let j = i + 1; j < particles.length; j += 1) {
      const b = particles[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > LINK_DIST * LINK_DIST) continue;
      const alpha = (1 - Math.sqrt(distSq) / LINK_DIST) * colors.lineAlpha * contentFade((a.x + b.x) / 2);
      ctx.strokeStyle = `rgba(${lr},${lg},${lb},${alpha})`;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  // Ligações com o cursor
  if (pointer.active) {
    for (const p of particles) {
      const dist = Math.hypot(p.x - pointer.x, p.y - pointer.y);
      if (dist > MOUSE_DIST) continue;
      const alpha = (1 - dist / MOUSE_DIST) * (colors.lineAlpha + 0.25);
      ctx.strokeStyle = `rgba(${dr},${dg},${db},${alpha})`;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(pointer.x, pointer.y);
      ctx.stroke();
    }
  }

  // Partículas (piscam de leve)
  for (const p of particles) {
    const twinkle = reducedMotion ? 1 : 0.65 + Math.sin(t * 1.6 + p.phase) * 0.35;
    ctx.fillStyle = `rgba(${dr},${dg},${db},${colors.dotAlpha * twinkle * contentFade(p.x)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Anéis das ondas de clique
  for (const ripple of ripples) {
    const alpha = (1 - ripple.age / ripple.life) * 0.35;
    ctx.strokeStyle = `rgba(${dr},${dg},${db},${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function loop(time) {
  if (!running) return;
  const dt = Math.min(0.05, Math.max(0, (time - (lastTime || time)) / 1000));
  lastTime = time;
  update(dt, time * 0.001);
  draw(time * 0.001);
  rafId = window.requestAnimationFrame(loop);
}

function start() {
  if (reducedMotion) return;
  window.cancelAnimationFrame(rafId);
  running = true;
  lastTime = 0;
  rafId = window.requestAnimationFrame(loop);
}

window.addEventListener("resize", resize);
window.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.active = true;
});
document.addEventListener("pointerout", (event) => {
  if (!event.relatedTarget) pointer.active = false;
});
window.addEventListener("blur", () => {
  pointer.active = false;
});
window.addEventListener("pointerdown", (event) => {
  if (reducedMotion || event.target.closest("a, button, #gameScene")) return;
  ripples.push({ x: event.clientX, y: event.clientY, radius: 0, age: 0, life: 1.1 });
});
window.addEventListener("themechange", () => {
  colors = readColors();
  if (reducedMotion) draw(0);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    running = false;
    window.cancelAnimationFrame(rafId);
  } else {
    start();
  }
});

resize();
start();
