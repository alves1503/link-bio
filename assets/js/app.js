const canvas = document.getElementById("bgCanvas");
const ctx = canvas.getContext("2d");
const themeToggle = document.getElementById("themeToggle");
const storageKey = "link-bio-theme";

let width = window.innerWidth;
let height = window.innerHeight;
let gridCols = 0;
const mouse = { x: width / 2, y: height / 2, radius: 240, active: false };
const points = [];

function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  buildGrid();
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("mousemove", (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
  mouse.active = true;
});
window.addEventListener("mouseleave", () => {
  mouse.active = false;
});

class RayPoint {
  constructor(x, y) {
    this.baseX = x;
    this.baseY = y;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
  }

  update() {
    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const dist = Math.hypot(dx, dy);

    if (mouse.active && dist < mouse.radius) {
      const strength = (1 - dist / mouse.radius) * 5.2;
      const angle = Math.atan2(dy, dx);
      this.vx += Math.cos(angle) * strength;
      this.vy += Math.sin(angle) * strength;
    }

    this.vx *= 0.88;
    this.vy *= 0.88;
    this.vx += (this.baseX - this.x) * 0.08;
    this.vy += (this.baseY - this.y) * 0.08;

    this.x += this.vx + (Math.random() - 0.5) * 0.05;
    this.y += this.vy + (Math.random() - 0.5) * 0.05;
  }
}

function buildGrid() {
  points.length = 0;
  const cols = Math.max(6, Math.floor(width / 140));
  const rows = Math.max(5, Math.floor(height / 140));
  gridCols = cols + 1;
  const gapX = width / cols;
  const gapY = height / rows;

  for (let row = 0; row <= rows; row += 1) {
    for (let col = 0; col <= cols; col += 1) {
      points.push(new RayPoint(gapX * col + gapX / 2, gapY * row + gapY / 2));
    }
  }
}

function drawBackground() {
  const isLight = document.body.dataset.theme === "light";
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = isLight ? "#f5f7fb" : "#02020a";
  ctx.fillRect(0, 0, width, height);

  points.forEach((point) => point.update());

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  points.forEach((point, index) => {
    const colIndex = index % gridCols;
    const nextX = points[index + 1];
    const nextY = points[index + gridCols];
    const nextDR = points[index + gridCols + 1];
    const nextDL = points[index + gridCols - 1];

    if (nextX && colIndex < gridCols - 1) {
      drawRayLine(point, nextX, isLight);
    }
    if (nextY) {
      drawRayLine(point, nextY, isLight);
    }
    if (nextDR) {
      drawRayLine(point, nextDR, isLight);
    }
    if (nextDL && colIndex > 0) {
      drawRayLine(point, nextDL, isLight);
    }
  });

  points.forEach((point) => {
    ctx.fillStyle = isLight ? "rgba(15, 23, 42, 0.1)" : "rgba(255, 255, 255, 0.12)";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function drawRayLine(a, b, isLight) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const baseAlpha = Math.max(0, 0.28 - distance / 340);
  if (baseAlpha <= 0) return;

  const distA = Math.hypot(a.x - mouse.x, a.y - mouse.y);
  const distB = Math.hypot(b.x - mouse.x, b.y - mouse.y);
  const proximity = mouse.active ? Math.max(0, 1 - Math.min(distA, distB) / mouse.radius) : 0;
  const alpha = Math.min(0.9, baseAlpha + proximity * 0.45);

  ctx.strokeStyle = isLight
    ? `rgba(15, 23, 42, ${alpha})`
    : `rgba(210, 230, 255, ${alpha * 0.85})`;
  ctx.lineWidth = 1.4;

  if (!isLight) {
    ctx.shadowColor = `rgba(210,230,255,${alpha * 0.2})`;
    ctx.shadowBlur = 10;
  } else {
    ctx.shadowBlur = 0;
  }

  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function animate() {
  drawBackground();
  requestAnimationFrame(animate);
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  themeToggle.innerHTML = theme === "light"
    ? '<i class="fa-solid fa-sun"></i>'
    : '<i class="fa-solid fa-moon"></i>';
}

function loadTheme() {
  const stored = localStorage.getItem(storageKey);
  const theme = stored === "light" ? "light" : "dark";
  applyTheme(theme);
}

themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.dataset.theme === "light" ? "dark" : "light";
  applyTheme(nextTheme);
  localStorage.setItem(storageKey, nextTheme);
});

resizeCanvas();
loadTheme();
animate();