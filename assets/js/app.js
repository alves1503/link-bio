const canvas = document.getElementById("bgCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

class Circle {
  constructor(x, y, radius, speedX, speedY) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.speedX = speedX;
    this.speedY = speedY;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fill();
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    // rebote simples
    if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
    if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
  }
}

const circles = [];
for (let i = 0; i < 50; i++) {
  let radius = Math.random() * 4 + 2;
  let x = Math.random() * canvas.width;
  let y = Math.random() * canvas.height;
  let speedX = (Math.random() - 0.5) * 0.5;
  let speedY = (Math.random() - 0.5) * 0.5;
  circles.push(new Circle(x, y, radius, speedX, speedY));
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  circles.forEach(circle => {
    circle.update();
    circle.draw();
  });
  requestAnimationFrame(animate);
}

animate();
