import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const container = document.getElementById("gameScene");
const canvas = document.getElementById("devGameCanvas");
const scoreEl = document.getElementById("gameScore");

if (container && canvas) {
  const root = document.documentElement;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-4, 4, 3.35, -3.35, 0.1, 100);
  const viewHeight = 7.3;
  const period = 18;
  const speed = 0.78;
  const segmentCopies = [-1, 0, 1, 2];
  const repeatedDetails = [];
  const codeBlocks = [];
  const tokens = [];
  const bursts = [];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let inView = true;
  let pageVisible = !document.hidden;
  let viewWidth = 8;
  let elapsed = 0;
  let lastTime = 0;
  let score = 0;
  let manualJumpAt = -Infinity;
  let prevJump = 0;
  let landedAt = -Infinity;
  let hintShown = true;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  /* -------------------------------------------------------
     Paleta azul (harmonizada com o site)
     ------------------------------------------------------- */
  const palette = {
    hillBack: 0x1a2c5e,
    hillFront: 0x1f4a8a,
    grass: 0x4fd08f,
    grassLight: 0x9cf27f,
    earth: 0x2a3a5c,
    earthDark: 0x18233d,
    mint: 0x60a5fa,
    aqua: 0x38bdf8,
    gold: 0xffd66e,
    coral: 0x60a5fa,
    pink: 0x3b82f6,
    violet: 0x93c5fd,
    cloud: 0xe3ecff,
    white: 0xf5f8ff,
  };

  const standard = (color, roughness = 0.7, emissive = 0x000000) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness,
      emissive,
      emissiveIntensity: emissive ? 0.55 : 0,
    });

  const material = {
    soil: standard(palette.earth),
    soilDark: standard(palette.earthDark),
    grass: standard(palette.grass),
    grassLight: standard(palette.grassLight),
    hillBack: standard(palette.hillBack),
    hillFront: standard(palette.hillFront),
    cloud: standard(palette.cloud),
    white: standard(palette.white),
    mint: standard(palette.mint, 0.32, palette.mint),
    aqua: standard(palette.aqua, 0.32, palette.aqua),
    gold: standard(palette.gold, 0.28, palette.gold),
    coral: standard(palette.coral, 0.34, palette.coral),
    pink: standard(palette.pink, 0.34, palette.pink),
    violet: standard(palette.violet, 0.34, palette.violet),
    blockSide: standard(0x1e40af),
    blockTop: standard(0x93c5fd),
    server: standard(0x1e3a6e),
    serverFace: standard(0x0f1f40),
    serverLight: standard(palette.mint, 0.3, palette.mint),
    star: new THREE.MeshBasicMaterial({ color: palette.white, toneMapped: false }),
  };

  const geometryCache = new Map();
  const boxGeometry = (size) => {
    const key = size.join(",");
    if (!geometryCache.has(key)) geometryCache.set(key, new THREE.BoxGeometry(...size));
    return geometryCache.get(key);
  };

  const addBox = (parent, size, position, surface) => {
    const mesh = new THREE.Mesh(boxGeometry(size), surface);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  };

  const makeTexture = (size, draw, height = size) => {
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = size;
    textureCanvas.height = height;
    const context = textureCanvas.getContext("2d");
    draw(context, size, height);
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    return texture;
  };

  /* -------------------------------------------------------
     Texturas
     ------------------------------------------------------- */
  const groundFace = new THREE.MeshStandardMaterial({
    map: makeTexture(128, (context, size) => {
      context.fillStyle = "#16213a";
      context.fillRect(0, 0, size, size);
      for (let row = 0; row < 4; row += 1) {
        const offset = row % 2 ? 18 : 0;
        for (let column = 0; column < 4; column += 1) {
          const x = column * 36 + offset;
          const y = row * 32;
          context.fillStyle = (row + column) % 3 ? "#26375c" : "#30457a";
          context.fillRect(x + 2, y + 2, 30, 25);
          context.fillStyle = "rgba(200,220,255,.12)";
          context.fillRect(x + 4, y + 4, 25, 3);
          context.fillStyle = "rgba(28,27,56,.22)";
          context.fillRect(x + 3, y + 23, 28, 3);
        }
      }
      context.fillStyle = "#46609a";
      context.fillRect(12, 12, 9, 7);
      context.fillRect(88, 79, 8, 8);
      context.fillStyle = "#60a5fa";
      context.fillRect(48, 47, 8, 8);
    }),
    roughness: 0.92,
  });

  const grassFace = new THREE.MeshStandardMaterial({
    map: makeTexture(128, (context, size) => {
      context.fillStyle = "#287a6b";
      context.fillRect(0, 0, size, size);
      context.fillStyle = "#5bd08b";
      context.fillRect(0, 0, size, 22);
      context.fillStyle = "#a8f283";
      context.fillRect(0, 0, size, 7);
      for (let index = 0; index < 18; index += 1) {
        const x = (index * 47 + 13) % size;
        context.fillStyle = index % 3 ? "#46b985" : "#b2f182";
        context.fillRect(x, 12 + (index % 3) * 8, 5 + (index % 4) * 2, 3);
        if (index % 4 === 0) context.fillRect(x + 4, 7, 3, 7);
      }
    }),
    roughness: 0.78,
  });

  const platformFace = new THREE.MeshStandardMaterial({
    map: makeTexture(128, (context, size) => {
      context.fillStyle = "#173b56";
      context.fillRect(0, 0, size, size);
      context.fillStyle = "#235878";
      context.fillRect(0, 0, size, 13);
      context.strokeStyle = "rgba(96,165,250,.55)";
      context.lineWidth = 3;
      for (let row = 0; row < 3; row += 1) {
        const y = 31 + row * 32;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(31, y);
        context.lineTo(31, y + 9);
        context.lineTo(68, y + 9);
        context.stroke();
        context.fillStyle = row % 2 ? "#93c5fd" : "#60a5fa";
        context.fillRect(79, y - 5, 9, 9);
      }
    }),
    roughness: 0.46,
    emissive: palette.mint,
    emissiveIntensity: 0.12,
  });

  const stoneMaterials = [
    material.soilDark,
    material.soilDark,
    material.grass,
    material.soil,
    groundFace,
    material.soilDark,
  ];

  const grassTileMaterials = [
    material.soilDark,
    material.soilDark,
    material.grassLight,
    material.soil,
    grassFace,
    material.grass,
  ];

  const makeGlyphTexture = (glyph, color, background) =>
    makeTexture(128, (context, size) => {
      context.fillStyle = background;
      context.fillRect(0, 0, size, size);
      context.fillStyle = "rgba(255,255,255,.26)";
      context.fillRect(8, 8, size - 16, 8);
      context.strokeStyle = "rgba(50,30,72,.72)";
      context.lineWidth = 7;
      context.strokeRect(4, 4, size - 8, size - 8);
      context.fillStyle = color;
      context.font = "bold 62px monospace";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(glyph, size / 2, size / 2 + 3);
    });

  const makeLabelTexture = (text, accent) =>
    makeTexture(128, (context, size) => {
      context.fillStyle = "#132b49";
      context.fillRect(0, 0, size, size);
      context.fillStyle = accent;
      context.fillRect(10, 10, size - 20, 7);
      context.fillStyle = "#e6f0ff";
      context.font = "bold 28px monospace";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, size / 2, size / 2 + 7);
      context.fillStyle = "#60a5fa";
      for (let index = 0; index < 3; index += 1) {
        context.fillRect(23 + index * 30, 101, 12, 8);
      }
    });

  const makeTokenTexture = (text) =>
    makeTexture(128, (context, size) => {
      context.clearRect(0, 0, size, size);
      context.beginPath();
      context.arc(size / 2, size / 2, 54, 0, Math.PI * 2);
      context.fillStyle = "#0b1a3a";
      context.fill();
      context.strokeStyle = "#93c5fd";
      context.lineWidth = 8;
      context.stroke();
      context.fillStyle = "#dbeafe";
      context.font = "bold 38px monospace";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, size / 2, size / 2 + 2);
    });

  const makePopupTexture = (text, color) =>
    makeTexture(128, (context, width, height) => {
      context.clearRect(0, 0, width, height);
      context.font = "bold 40px monospace";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.lineWidth = 8;
      context.strokeStyle = "#0a1430";
      context.strokeText(text, width / 2, height / 2 + 2);
      context.fillStyle = color;
      context.fillText(text, width / 2, height / 2 + 2);
    }, 64);

  /* -------------------------------------------------------
     Partículas de impacto
     ------------------------------------------------------- */
  function makeBurst(parent, color, position) {
    const group = new THREE.Group();
    group.visible = false;
    group.position.set(...position);
    const sparkleMaterial = standard(color, 0.3, color);
    const particles = [];
    for (let index = 0; index < 8; index += 1) {
      const particle = addBox(group, [0.1, 0.1, 0.1], [0, 0, 0], sparkleMaterial);
      particles.push({
        particle,
        direction: new THREE.Vector3(
          Math.cos((index / 8) * Math.PI * 2),
          0.75 + (index % 3) * 0.25,
          (index % 2 ? 1 : -1) * 0.2,
        ),
      });
    }
    parent.add(group);
    const burst = { group, particles, start: -Infinity, duration: 0.75 };
    bursts.push(burst);
    return burst;
  }

  /* -------------------------------------------------------
     Personagem (sprite em pixel art)
     ------------------------------------------------------- */
  function createHero() {
    const hero = new THREE.Group();
    hero.position.z = 1.08;
    const frameWidth = 32;
    const frameHeight = 40;
    const frameCount = 4;
    const spriteCanvas = document.createElement("canvas");
    spriteCanvas.width = frameWidth * frameCount;
    spriteCanvas.height = frameHeight;
    const context = spriteCanvas.getContext("2d");
    context.imageSmoothingEnabled = false;

    const colors = {
      outline: "#17213c",
      outlineLight: "#293653",
      hair: "#2e2238",
      hairLight: "#55405c",
      skin: "#f5bd8a",
      skinShade: "#d98670",
      eye: "#17213c",
      glasses: "#dfe6ff",
      hoodie: "#24212f",
      hoodieLight: "#3c3850",
      hoodieShade: "#16141f",
      accent: "#3b82f6",
      accentShade: "#1d4ed8",
      pants: "#35476f",
      pantsLight: "#536c93",
      shoe: "#f4f1ff",
      shoeLight: "#ffffff",
      sole: "#3b82f6",
      screen: "#93c5fd",
      gold: "#ffd66e",
    };

    for (let frame = 0; frame < frameCount; frame += 1) {
      context.save();
      context.translate(frame * frameWidth, 0);
      context.clearRect(0, 0, frameWidth, frameHeight);
      const pixel = (x, y, color, width = 1, height = 1) => {
        context.fillStyle = color;
        context.fillRect(x, y, width, height);
      };

      const jumpFrame = frame === 3;
      const stride = frame === 1 ? 2 : frame === 2 ? -2 : 0;
      const bootY = jumpFrame ? -2 : 0;

      // Mochila
      pixel(6, 19, colors.outline, 5, 11);
      pixel(7, 20, colors.accentShade, 3, 8);
      pixel(7, 20, colors.accent, 2, 6);
      pixel(6, 29, colors.outline, 5, 2);

      // Cabeça
      pixel(10, 5, colors.outline, 13, 13);
      pixel(11, 4, colors.outline, 10, 2);
      pixel(12, 5, colors.hair, 9, 3);
      pixel(10, 8, colors.hair, 4, 4);
      pixel(11, 9, colors.skin, 10, 8);
      pixel(12, 8, colors.skin, 9, 1);
      pixel(20, 10, colors.skinShade, 2, 5);
      pixel(17, 11, colors.glasses, 4, 1);
      pixel(17, 13, colors.glasses, 4, 1);
      pixel(19, 12, colors.eye, 1, 1);
      pixel(21, 14, colors.skinShade, 2, 2);
      pixel(16, 15, colors.hair, 4, 1);
      pixel(15, 16, colors.hair, 6, 1);
      pixel(11, 15, colors.skinShade, 2, 2);
      pixel(10, 10, colors.hair, 2, 5);
      pixel(12, 6, colors.hairLight, 4, 1);

      // Moletom
      pixel(11, 17, colors.skinShade, 5, 3);
      pixel(10, 18, colors.outline, 13, 13);
      pixel(9, 19, colors.outline, 15, 9);
      pixel(10, 19, colors.hoodie, 13, 10);
      pixel(10, 20, colors.hoodieLight, 5, 1);
      pixel(11, 21, colors.hoodieLight, 1, 6);
      pixel(19, 20, colors.hoodieShade, 3, 8);
      pixel(10, 28, colors.outline, 14, 3);
      pixel(11, 28, colors.hoodieShade, 11, 2);

      // Logo "</>" no peito
      pixel(14, 21, colors.screen, 1, 1);
      pixel(13, 22, colors.screen, 1, 1);
      pixel(14, 23, colors.screen, 1, 1);
      pixel(16, 21, colors.accent, 1, 3);
      pixel(18, 21, colors.screen, 1, 1);
      pixel(19, 22, colors.screen, 1, 1);
      pixel(18, 23, colors.screen, 1, 1);

      if (jumpFrame) {
        pixel(8, 19, colors.outline, 3, 4);
        pixel(8, 20, colors.hoodie, 2, 2);
        pixel(9, 17, colors.skin, 2, 2);
        pixel(19, 18, colors.outline, 3, 3);
        pixel(20, 16, colors.skin, 2, 3);
      } else {
        pixel(7, 20, colors.outline, 3, 5);
        pixel(8, 21, colors.hoodie, 2, 3);
        pixel(8, 24, colors.skin, 2, 2);
        pixel(21, 20, colors.outline, 3, 5);
        pixel(21, 24, colors.skin, 2, 2);
      }

      const drawLeg = (x, offset, front) => {
        const legY = 29 + offset;
        pixel(x, legY, colors.outline, 5, 6);
        pixel(x + 1, legY + 1, front ? colors.pantsLight : colors.pants, 3, 5);
        pixel(x + 2, legY + 3, colors.pants, 2, 1);
        const footY = Math.min(35, legY + 5) + bootY;
        pixel(x - (front ? 0 : 1), footY, colors.outline, 7, 4);
        pixel(x, footY, colors.shoe, 5, 2);
        pixel(x + 1, footY, colors.shoeLight, 3, 1);
        pixel(x, footY + 3, colors.sole, 5, 1);
      };
      if (jumpFrame) {
        drawLeg(10, 0, false);
        drawLeg(17, -1, true);
      } else {
        drawLeg(10, stride, false);
        drawLeg(17, -stride, true);
      }

      context.restore();
    }

    const texture = new THREE.CanvasTexture(spriteCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.repeat.set(1 / frameCount, 1);
    texture.needsUpdate = true;

    // O "pivot" fica nos pés para o squash & stretch parecer natural
    const body = new THREE.Group();
    hero.add(body);
    const sprite = new THREE.Mesh(
      new THREE.PlaneGeometry(0.94, 1.18),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.05,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    sprite.position.set(0, 0.59, 0.04);
    body.add(sprite);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.25, 20),
      new THREE.MeshBasicMaterial({ color: 0x0a1224, transparent: true, opacity: 0.3 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0.02, 0.018, 0);
    hero.add(shadow);
    scene.add(hero);
    return { group: hero, body, texture, frameCount, shadow, frame: -1 };
  }

  const hero = createHero();

  /* -------------------------------------------------------
     Luz e céu (dois climas: entardecer / dia)
     ------------------------------------------------------- */
  const hemi = new THREE.HemisphereLight(0xc9dcff, 0x25354b, 2.1);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xbcd4ff, 2.3);
  sunLight.position.set(-4, 8, 8);
  scene.add(sunLight);
  const glow = new THREE.PointLight(palette.mint, 16, 12, 2);
  glow.position.set(1, 4, 4);
  scene.add(glow);

  const skyTextures = {
    dark: makeTexture(512, (context, size) => {
      const gradient = context.createLinearGradient(0, 0, 0, size);
      gradient.addColorStop(0, "#040915");
      gradient.addColorStop(0.45, "#0b1a3d");
      gradient.addColorStop(0.78, "#16357a");
      gradient.addColorStop(1, "#3b6fd1");
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
      context.fillStyle = "rgba(147,197,253,.16)";
      context.fillRect(0, size * 0.72, size, size * 0.03);
      context.fillStyle = "rgba(96,165,250,.1)";
      context.fillRect(0, size * 0.79, size, size * 0.02);
    }),
    light: makeTexture(512, (context, size) => {
      const gradient = context.createLinearGradient(0, 0, 0, size);
      gradient.addColorStop(0, "#2f7fe0");
      gradient.addColorStop(0.55, "#7fbdf5");
      gradient.addColorStop(0.85, "#cfe6ff");
      gradient.addColorStop(1, "#e8f3ff");
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
      context.fillStyle = "rgba(255,255,255,.25)";
      context.fillRect(0, size * 0.7, size, size * 0.03);
    }),
  };

  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 10),
    new THREE.MeshBasicMaterial({ map: skyTextures.dark, depthWrite: false, toneMapped: false }),
  );
  sky.position.set(0, 3.3, -6);
  scene.add(sky);

  camera.position.set(0, 4.1, 14);
  camera.lookAt(0, 2.45, 0);

  /* -------------------------------------------------------
     Camadas com parallax (speed = fração da velocidade do chão)
     ------------------------------------------------------- */
  const layers = {};
  const makeLayer = (name, layerSpeed) => {
    const group = new THREE.Group();
    const copies = segmentCopies.map((copy) => {
      const segment = new THREE.Group();
      segment.position.x = copy * period;
      group.add(segment);
      return segment;
    });
    scene.add(group);
    layers[name] = { group, copies, speed: layerSpeed };
    return layers[name];
  };

  makeLayer("sky", 0.03);
  makeLayer("clouds", 0.12);
  makeLayer("peaks", 0.22);
  makeLayer("hillsBack", 0.38);
  makeLayer("hillsFront", 0.58);
  makeLayer("trees", 0.82);
  makeLayer("ground", 1);

  function addCloud(parent, x, y, z, scale = 1) {
    const cloud = new THREE.Group();
    cloud.position.set(x, y, z);
    cloud.scale.setScalar(scale);
    addBox(cloud, [1.35, 0.12, 0.1], [0.02, -0.18, -0.015], material.hillBack);
    addBox(cloud, [1.25, 0.34, 0.12], [0, 0, 0], material.cloud);
    addBox(cloud, [0.48, 0.34, 0.12], [-0.32, 0.22, 0], material.cloud);
    addBox(cloud, [0.56, 0.44, 0.12], [0.15, 0.28, 0], material.white);
    addBox(cloud, [0.46, 0.26, 0.12], [0.57, 0.1, 0], material.cloud);
    parent.add(cloud);
    return cloud;
  }

  function addPixelPeak(parent, x, z, levels, phase) {
    const peak = new THREE.Group();
    const cell = 0.47;
    for (let row = 0; row < levels; row += 1) {
      const count = levels * 2 - 1 - row * 2;
      const y = row * 0.36;
      for (let column = 0; column < count; column += 1) {
        const xPosition = (column - (count - 1) / 2) * cell;
        const snow = row >= levels - 2 && Math.abs(xPosition) < (levels - row) * 0.28;
        addBox(
          peak,
          [cell + 0.015, 0.38, 0.3],
          [xPosition, y, 0],
          snow ? material.white : row % 2 ? material.hillBack : material.hillFront,
        );
      }
    }
    peak.position.set(x, -0.08, z);
    parent.add(peak);
    repeatedDetails.push({ mesh: peak, baseY: -0.08, phase, bob: 0.02 });
  }

  function addPixelTree(parent, x, z, variant) {
    const tree = new THREE.Group();
    const canopy = [material.hillFront, material.grass, material.aqua][variant % 3];
    addBox(tree, [0.2, 0.67, 0.22], [0, 0.34, 0], material.blockSide);
    addBox(tree, [0.84, 0.28, 0.28], [0, 0.76, 0], canopy);
    addBox(tree, [0.64, 0.3, 0.28], [0, 1.02, 0], canopy);
    addBox(tree, [0.42, 0.27, 0.28], [0, 1.27, 0], variant % 2 ? material.grassLight : canopy);
    addBox(tree, [0.08, 0.08, 0.035], [-0.2, 0.83, 0.16], material.white);
    addBox(tree, [0.08, 0.08, 0.035], [0.18, 1.09, 0.16], material.gold);
    addBox(tree, [0.07, 0.07, 0.035], [-0.02, 1.36, 0.16], material.coral);
    tree.position.set(x, 0.38, z);
    parent.add(tree);
    // Balanço leve como se houvesse vento
    repeatedDetails.push({ mesh: tree, baseY: tree.position.y, phase: variant * 1.2, bob: 0.015, sway: 0.03 });
  }

  function addPixelFlower(parent, x, z, petalMaterial, phase) {
    const flower = new THREE.Group();
    addBox(flower, [0.045, 0.24, 0.05], [0, 0.12, 0], material.grassLight);
    addBox(flower, [0.19, 0.07, 0.07], [0, 0.29, 0], petalMaterial);
    addBox(flower, [0.07, 0.18, 0.07], [0, 0.29, 0], petalMaterial);
    addBox(flower, [0.065, 0.065, 0.075], [0, 0.29, 0.04], material.white);
    addBox(flower, [0.13, 0.06, 0.06], [0.07, 0.07, 0], material.grass);
    flower.position.set(x, 0.44, z);
    parent.add(flower);
    repeatedDetails.push({ mesh: flower, baseY: flower.position.y, phase, bob: 0.03, sway: 0.12 });
  }

  function addCodeShrub(parent, x, z, variant) {
    const shrub = new THREE.Group();
    const leaf = variant % 2 ? material.aqua : material.grass;
    addBox(shrub, [0.7, 0.3, 0.3], [0, 0.15, 0], leaf);
    addBox(shrub, [0.4, 0.24, 0.3], [-0.12, 0.38, 0], variant % 2 ? material.mint : material.grassLight);
    addBox(shrub, [0.075, 0.075, 0.04], [-0.12, 0.38, 0.17], material.gold);
    addBox(shrub, [0.07, 0.07, 0.04], [0.08, 0.2, 0.17], material.violet);
    shrub.position.set(x, 0.44, z);
    parent.add(shrub);
  }

  function addHills(parent, surface, amplitude, phase) {
    const hill = new THREE.Group();
    const step = 0.6;
    for (let column = 0; column < period / step; column += 1) {
      const x = column * step + step / 2;
      const wave = Math.sin(column * 0.58 + phase) + Math.sin(column * 0.23 + phase * 2) * 0.55;
      const height = 0.75 + Math.max(0, wave + 0.45) * amplitude;
      addBox(hill, [step + 0.025, height, 0.3], [x, -0.45 + height / 2, 0], surface);
      if (column % 4 === 1) {
        addBox(hill, [0.12, 0.08, 0.04], [x - 0.12, -0.41 + height, 0.18], material.grassLight);
      }
    }
    parent.add(hill);
  }

  function addVoxelGround(parent) {
    const tileSize = 0.6;
    const gapRanges = [[5.4, 6.3], [11.4, 12]];
    for (let index = 0; index < period / tileSize; index += 1) {
      const x = index * tileSize + tileSize / 2;
      if (gapRanges.some(([start, end]) => x > start && x < end)) continue;
      addBox(parent, [tileSize, 0.98, 0.78], [x, -0.25, 0], stoneMaterials);
      addBox(parent, [tileSize, 0.18, 0.84], [x, 0.33, 0], grassTileMaterials);
      if (index % 3 === 0) {
        addBox(parent, [0.11, 0.1, 0.04], [x - 0.12, -0.13, 0.42], material.soilDark);
        addBox(parent, [0.1, 0.1, 0.04], [x + 0.17, -0.53, 0.42], material.blockSide);
      }
      if (index % 4 === 2) {
        addBox(parent, [0.1, 0.07, 0.035], [x - 0.17, -0.02, 0.43], material.grassLight);
        addBox(parent, [0.08, 0.1, 0.035], [x + 0.18, -0.42, 0.43], material.gold);
      }
    }
    addBox(parent, [period, 1.4, 0.82], [period / 2, -1.44, 0], material.soilDark);
  }

  function addCodeBlock(parent, x, y, glyph, tint, phase) {
    const front = new THREE.MeshStandardMaterial({
      map: makeGlyphTexture(glyph, "#18213d", tint),
      roughness: 0.55,
    });
    const block = new THREE.Mesh(
      boxGeometry([0.58, 0.58, 0.58]),
      [material.blockSide, material.blockSide, material.blockTop, material.blockSide, front, material.blockSide],
    );
    block.position.set(x, y, 0.42);
    parent.add(block);
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(block.geometry),
      new THREE.LineBasicMaterial({ color: 0x0f1d40, transparent: true, opacity: 0.76 }),
    );
    block.add(outline);
    repeatedDetails.push({ mesh: block, baseY: y, phase, bob: 0.07 });
    codeBlocks.push({
      mesh: block,
      worldX: parent.position.x + x,
      worldY: y,
      baseY: y,
      burst: makeBurst(parent, palette.gold, [x, y + 0.34, 0.78]),
      lastHit: -Infinity,
    });
  }

  function addPlatform(parent, x, y, length) {
    const count = Math.round(length / 0.62);
    for (let index = 0; index < count; index += 1) {
      addBox(
        parent,
        [0.6, 0.38, 0.62],
        [x + index * 0.62, y, 0.1],
        [material.server, material.server, material.aqua, material.serverFace, platformFace, material.server],
      );
      addBox(parent, [0.58, 0.07, 0.64], [x + index * 0.62, y + 0.18, 0.1], index % 2 ? material.mint : material.grassLight);
      addBox(parent, [0.1, 0.09, 0.035], [x + index * 0.62 - 0.14, y - 0.02, 0.425], material.violet);
      addBox(parent, [0.16, 0.035, 0.04], [x + index * 0.62 + 0.11, y - 0.1, 0.43], index % 2 ? material.aqua : material.mint);
      if (index === 0 || index === count - 1) {
        addBox(parent, [0.07, 0.42, 0.7], [x + index * 0.62, y - 0.03, 0.11], material.violet);
      }
    }
  }

  const coinMaterial = new THREE.MeshStandardMaterial({
    color: palette.gold,
    emissive: palette.gold,
    emissiveIntensity: 0.65,
    roughness: 0.28,
    metalness: 0.2,
  });
  const coinGeometry = new THREE.CylinderGeometry(0.19, 0.19, 0.08, 8);

  function addToken(parent, x, y, glyph, phase) {
    const token = new THREE.Group();
    token.position.set(x, y, 0.52);
    const coin = new THREE.Mesh(coinGeometry, coinMaterial);
    coin.rotation.x = Math.PI / 2;
    token.add(coin);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.28),
      new THREE.MeshBasicMaterial({ map: makeTokenTexture(glyph), transparent: true, toneMapped: false }),
    );
    face.position.z = 0.052;
    token.add(face);
    parent.add(token);
    tokens.push({
      mesh: token,
      worldX: parent.position.x + x,
      baseY: y,
      phase,
      burst: makeBurst(parent, palette.mint, [x, y, 0.52]),
      collectedAt: -Infinity,
    });
  }

  function addServer(parent, x, height, label, phase) {
    const server = new THREE.Group();
    server.position.set(x, 0.42, 0.36);
    addBox(server, [0.92, height, 0.62], [0, height / 2, 0], material.server);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.72),
      new THREE.MeshStandardMaterial({ map: makeLabelTexture(label, "#3b82f6"), roughness: 0.6 }),
    );
    face.position.set(0, height * 0.61, 0.32);
    server.add(face);
    addBox(server, [1.08, 0.14, 0.74], [0, height, 0], material.aqua);
    for (let index = 0; index < 3; index += 1) {
      const lamp = addBox(server, [0.08, 0.08, 0.06], [-0.31 + index * 0.22, 0.18, 0.34], material.serverLight);
      repeatedDetails.push({ mesh: lamp, baseY: lamp.position.y, phase: phase + index * 1.3, pulse: true });
    }
    parent.add(server);
  }

  const stars = [];
  function addPixelStar(parent, x, y, size, phase) {
    const star = addBox(parent, [size, size, 0.045], [x, y, 0], material.star);
    stars.push(star);
    repeatedDetails.push({ mesh: star, baseY: y, phase, twinkle: true, size });
  }

  /* Monta cada cópia de cada camada */
  segmentCopies.forEach((_, copyIndex) => {
    const skySeg = layers.sky.copies[copyIndex];
    const cloudSeg = layers.clouds.copies[copyIndex];
    const peakSeg = layers.peaks.copies[copyIndex];
    const hillBackSeg = layers.hillsBack.copies[copyIndex];
    const hillFrontSeg = layers.hillsFront.copies[copyIndex];
    const treeSeg = layers.trees.copies[copyIndex];
    const groundSeg = layers.ground.copies[copyIndex];

    // Céu: estrelas e sol
    skySeg.position.z = -5;
    for (let index = 0; index < 22; index += 1) {
      const x = 0.3 + index * 0.81 + ((index * 37) % 5) * 0.09;
      const y = 3.3 + ((index * 53) % 7) * 0.42;
      addPixelStar(skySeg, x, y, index % 5 === 0 ? 0.11 : 0.06, index * 0.73);
    }

    const sunGroup = new THREE.Group();
    sunGroup.position.set(3.2, 3.95, 0.1);
    for (let row = 0; row < 7; row += 1) {
      const count = 5 + Math.min(row, 6 - row) * 2;
      const cell = 0.2;
      for (let column = 0; column < count; column += 1) {
        const stripe = row >= 4 && row % 2 === 0;
        addBox(
          sunGroup,
          [cell, 0.18, 0.12],
          [(column - (count - 1) / 2) * cell, (3 - row) * 0.2, 0],
          stripe ? material.cloud : material.white,
        );
      }
    }
    skySeg.add(sunGroup);
    repeatedDetails.push({ mesh: sunGroup, baseY: sunGroup.position.y, phase: 0.8, bob: 0.05 });

    // Nuvens
    cloudSeg.position.z = -3.5;
    [[2.1, 4.6, 0.9], [8.9, 5.2, 0.72], [14.6, 4.25, 1.04]].forEach(([x, y, scale], index) => {
      const cloud = addCloud(cloudSeg, x, y, 0, scale);
      repeatedDetails.push({ mesh: cloud, baseY: y, phase: index * 1.7, bob: 0.08, drift: 0.25, baseX: x });
    });

    // Montanhas e colinas
    peakSeg.position.z = -4.55;
    addPixelPeak(peakSeg, 2.7, 0, 7, 0.7);
    addPixelPeak(peakSeg, 8.6, -0.05, 8, 1.8);
    addPixelPeak(peakSeg, 15.5, 0.05, 6, 2.6);

    hillBackSeg.position.z = -3.9;
    addHills(hillBackSeg, material.hillBack, 0.85, 0.6);
    hillFrontSeg.position.z = -2.8;
    addHills(hillFrontSeg, material.hillFront, 0.55, 2.1);

    // Árvores e arbustos
    for (const [index, x] of [0.7, 5.25, 10.85, 16.25].entries()) {
      addPixelTree(treeSeg, x, -1.35, index);
    }
    addCodeShrub(treeSeg, 3.75, -0.75, 0);
    addCodeShrub(treeSeg, 8.1, -0.78, 1);
    addCodeShrub(treeSeg, 14.85, -0.72, 0);

    // Chão jogável
    addVoxelGround(groundSeg);
    const petals = [material.gold, material.coral, material.violet];
    for (const [index, x] of [1.75, 4.55, 7.3, 10.05, 13.75, 17.1].entries()) {
      addPixelFlower(groundSeg, x, 0.62, petals[index % 3], index);
    }

    addPlatform(groundSeg, 1.6, 1.72, 2.55);
    addPlatform(groundSeg, 8.2, 2.35, 2.45);
    addPlatform(groundSeg, 13.15, 1.82, 2.5);

    addCodeBlock(groundSeg, 3.25, 2.9, "{ }", "#93c5fd", 0.2);
    addCodeBlock(groundSeg, 4.75, 2.9, "?", "#bfdbfe", 1.1);
    addCodeBlock(groundSeg, 9.1, 3.5, "</>", "#60a5fa", 2.4);
    addCodeBlock(groundSeg, 14.15, 2.95, "{ }", "#dbeafe", 3.2);

    addToken(groundSeg, 2.15, 2.65, "<>", 0.3);
    addToken(groundSeg, 5.35, 3.15, "{}", 1.4);
    addToken(groundSeg, 8.55, 3.28, "$_", 2.2);
    addToken(groundSeg, 10.1, 3.06, "</>", 3.1);
    addToken(groundSeg, 13.3, 2.6, "01", 4.1);
    addToken(groundSeg, 15.15, 3.2, "{}", 5.2);

    addServer(groundSeg, 6.55, 1.42, "API", 0);
    addServer(groundSeg, 12.15, 1.13, "DB", 2);
    addServer(groundSeg, 17.0, 1.65, "GIT", 4);
  });

  /* -------------------------------------------------------
     Efeitos: poeira, "+10" flutuante, vaga-lumes
     ------------------------------------------------------- */
  const dustMaterial = new THREE.MeshBasicMaterial({ color: 0xe0ecff, transparent: true, opacity: 0.8 });
  const dust = Array.from({ length: 8 }, (_, index) => {
    const mesh = addBox(scene, [0.07, 0.07, 0.07], [0, -10, 1.1], dustMaterial);
    return { mesh, dir: index % 2 ? 1 : -1, speed: 0.5 + (index % 4) * 0.25, lift: 0.3 + (index % 3) * 0.2 };
  });
  let dustOrigin = 0;

  const popupTextures = {
    10: makePopupTexture("+10", "#ffd66e"),
    50: makePopupTexture("+50", "#93c5fd"),
  };
  const popups = Array.from({ length: 6 }, () => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.4),
      new THREE.MeshBasicMaterial({ map: popupTextures[10], transparent: true, toneMapped: false, depthTest: false }),
    );
    mesh.visible = false;
    mesh.renderOrder = 10;
    scene.add(mesh);
    return { mesh, start: -Infinity, x: 0, y: 0 };
  });
  let popupCursor = 0;

  function spawnPopup(value, x, y) {
    const popup = popups[popupCursor];
    popupCursor = (popupCursor + 1) % popups.length;
    popup.mesh.material.map = popupTextures[value];
    popup.start = elapsed;
    popup.x = x;
    popup.y = y;
    popup.mesh.visible = true;
  }

  const fireflyGroup = new THREE.Group();
  fireflyGroup.position.z = 0.95;
  scene.add(fireflyGroup);
  const fireflyMaterials = [material.mint, material.violet, material.white];
  const fireflies = Array.from({ length: 16 }, (_, index) => {
    const mesh = addBox(fireflyGroup, [0.06, 0.06, 0.06], [0, 0, 0], fireflyMaterials[index % 3]);
    return {
      mesh,
      x: ((index * 0.618) % 1) * 16 - 8,
      y: ((index * 0.371) % 1) * 6,
      rise: 0.12 + (index % 5) * 0.05,
      phase: index * 1.37,
    };
  });

  const scanlines = document.createElement("canvas");
  scanlines.width = 8;
  scanlines.height = 8;
  const scanContext = scanlines.getContext("2d");
  scanContext.fillStyle = "rgba(15, 18, 42, .07)";
  scanContext.fillRect(0, 0, 8, 1);
  const scanTexture = new THREE.CanvasTexture(scanlines);
  scanTexture.wrapS = THREE.RepeatWrapping;
  scanTexture.wrapT = THREE.RepeatWrapping;
  scanTexture.repeat.set(60, 54);
  const scanOverlay = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 8),
    new THREE.MeshBasicMaterial({ map: scanTexture, transparent: true, depthWrite: false, toneMapped: false }),
  );
  scanOverlay.position.set(0, 2.7, 1.3);
  scene.add(scanOverlay);

  /* -------------------------------------------------------
     Tema
     ------------------------------------------------------- */
  function applySceneTheme(theme) {
    const isLight = theme === "light";
    sky.material.map = isLight ? skyTextures.light : skyTextures.dark;
    sky.material.needsUpdate = true;
    hemi.color.set(isLight ? 0xffffff : 0xc9dcff);
    hemi.groundColor.set(isLight ? 0x6b7aa0 : 0x25354b);
    hemi.intensity = isLight ? 2.5 : 2.1;
    sunLight.color.set(isLight ? 0xfff6e8 : 0xbcd4ff);
    sunLight.intensity = isLight ? 2.6 : 2.3;
    glow.intensity = isLight ? 6 : 16;
    stars.forEach((star) => {
      star.visible = !isLight;
    });
    fireflyGroup.visible = !isLight;
    scanOverlay.visible = !isLight;
    renderer.toneMappingExposure = isLight ? 1.02 : 1.08;
    if (reducedMotion || !isActive()) renderFrame(lastTime || performance.now(), true);
  }

  window.addEventListener("themechange", (event) => applySceneTheme(event.detail));

  /* -------------------------------------------------------
     Pulo manual (clique / toque / teclado)
     ------------------------------------------------------- */
  const hint = document.createElement("span");
  hint.className = "game-hint";
  hint.setAttribute("aria-hidden", "true");
  hint.textContent = window.matchMedia("(hover: none)").matches ? "toque para pular" : "clique para pular";
  if (!reducedMotion) container.appendChild(hint);

  container.tabIndex = 0;
  container.setAttribute("role", "button");
  container.setAttribute("aria-label", "Fazer o personagem pular");

  function triggerJump() {
    if (reducedMotion) return;
    if (elapsed - manualJumpAt > 0.85) manualJumpAt = elapsed;
    if (hintShown) {
      hintShown = false;
      hint.classList.add("is-hidden");
    }
  }

  container.addEventListener("pointerdown", triggerJump);
  container.addEventListener("keydown", (event) => {
    if (event.key === " " || event.key === "Enter" || event.key === "ArrowUp") {
      event.preventDefault();
      triggerJump();
    }
  });

  /* -------------------------------------------------------
     Loop
     ------------------------------------------------------- */
  function resizeRenderer() {
    const bounds = container.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    viewWidth = viewHeight * (bounds.width / bounds.height);
    camera.left = -viewWidth / 2;
    camera.right = viewWidth / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(bounds.width, bounds.height, false);
    renderFrame(lastTime || performance.now(), true);
  }

  const wrap = (value) => ((value % period) + period) % period;

  // Pulos programados nos pontos certos da fase (buracos, blocos, moedas)
  const jumpSchedule = [[2.75, 1.05], [5.2, 1.35], [11.05, 1.35], [1.1, 1.1]];
  function getScheduledJump(heroX) {
    let height = 0;
    for (const [start, duration] of jumpSchedule) {
      const progress = wrap(heroX - start);
      if (progress < duration) {
        height = Math.max(height, Math.sin((progress / duration) * Math.PI) * 1.2);
      }
    }
    return height;
  }

  function getManualJump() {
    const age = elapsed - manualJumpAt;
    const duration = 0.8;
    if (age < 0 || age > duration) return 0;
    return Math.sin((age / duration) * Math.PI) * 1.25;
  }

  function addScore(value) {
    score += value;
    if (!scoreEl) return;
    scoreEl.textContent = String(score).padStart(6, "0");
    scoreEl.classList.remove("bump");
    void scoreEl.offsetWidth;
    scoreEl.classList.add("bump");
  }

  function isActive() {
    return inView && pageVisible && !reducedMotion;
  }

  function renderFrame(now, force = false) {
    if (!force) {
      if (!isActive()) {
        lastTime = now;
        window.requestAnimationFrame(renderFrame);
        return;
      }
      window.requestAnimationFrame(renderFrame);
    }

    const dt = Math.min(0.05, Math.max(0, (now - (lastTime || now)) / 1000));
    lastTime = now;
    if (!force) elapsed += dt;

    // Câmera "infinita": distance cresce sem parar; camX volta ao início do ciclo
    const heroScreen = -Math.min(viewWidth * 0.2, 2.2);
    const distance = reducedMotion ? 3.4 : elapsed * speed;
    const cameraDistance = distance - heroScreen;
    const camX = wrap(cameraDistance);
    const heroX = camX + heroScreen;

    camera.position.set(camX, 4.1, 14);
    camera.lookAt(camX, 2.45, 0);
    sky.position.x = camX;
    scanOverlay.position.x = camX;

    Object.values(layers).forEach((layer) => {
      layer.group.position.x = camX - wrap(cameraDistance * layer.speed);
    });

    // Pulo e pose
    const jump = reducedMotion ? 0 : Math.max(getScheduledJump(heroX), getManualJump());
    const rising = jump > prevJump;
    if (prevJump > 0.04 && jump < 0.001) {
      landedAt = elapsed;
      dustOrigin = heroX;
    }

    const landAge = elapsed - landedAt;
    let scaleX = 1;
    let scaleY = 1;
    if (landAge >= 0 && landAge < 0.18) {
      const squash = Math.sin((landAge / 0.18) * Math.PI);
      scaleX = 1 + squash * 0.16;
      scaleY = 1 - squash * 0.16;
    } else if (jump > 0.02) {
      const stretch = rising ? 0.1 : 0.04;
      scaleX = 1 - stretch;
      scaleY = 1 + stretch;
    }
    hero.body.scale.set(scaleX, scaleY, 1);
    hero.body.rotation.z = jump > 0.02 ? (rising ? 0.08 : -0.05) : Math.sin(elapsed * 22) * 0.015;

    hero.group.position.x = heroX;
    hero.group.position.y = 0.42 + jump + (jump ? 0 : Math.abs(Math.sin(elapsed * 11)) * 0.02);

    const isStriking = jump > 0.88 && codeBlocks.some((block) =>
      Math.abs(block.worldX - heroX) < 0.43 && elapsed - block.lastHit < 0.5);
    const spriteFrame = reducedMotion ? 0 : jump > 0.16 ? 3 : isStriking ? 2 : 1 + (Math.floor(elapsed * 9) % 2);
    if (hero.frame !== spriteFrame) {
      hero.texture.offset.x = spriteFrame / hero.frameCount;
      hero.frame = spriteFrame;
    }
    hero.shadow.scale.setScalar(Math.max(0.42, 1 - jump * 0.3));
    hero.shadow.material.opacity = Math.max(0.12, 0.34 - jump * 0.14);
    prevJump = jump;

    // Detalhes animados
    repeatedDetails.forEach((detail) => {
      if (detail.bob) {
        detail.mesh.position.y = detail.baseY + Math.sin(elapsed * 1.7 + detail.phase) * detail.bob;
      }
      if (detail.drift) {
        detail.mesh.position.x = detail.baseX + Math.sin(elapsed * 0.2 + detail.phase) * detail.drift;
      }
      if (detail.sway) {
        detail.mesh.rotation.z = Math.sin(elapsed * 1.3 + detail.phase) * detail.sway;
      }
      if (detail.pulse) {
        detail.mesh.visible = Math.sin(elapsed * 2.6 + detail.phase) > -0.55;
      }
      if (detail.twinkle) {
        const s = 0.55 + (Math.sin(elapsed * 1.8 + detail.phase) * 0.5 + 0.5) * 0.65;
        detail.mesh.scale.set(s, s, 1);
      }
    });

    // Blocos de código
    codeBlocks.forEach((block) => {
      if (jump > 0.88 && Math.abs(block.worldX - heroX) < 0.43 && elapsed - block.lastHit > 1.2) {
        block.lastHit = elapsed;
        block.burst.start = elapsed;
        addScore(50);
        spawnPopup(50, block.worldX, block.worldY + 0.75);
      }
      const age = elapsed - block.lastHit;
      if (age >= 0 && age < 0.5) {
        const t = age / 0.5;
        block.mesh.position.y += Math.sin(t * Math.PI) * 0.26;
        const squish = 1 + Math.sin(t * Math.PI) * 0.12;
        block.mesh.scale.set(squish, 2 - squish, squish);
      } else {
        block.mesh.scale.setScalar(1);
      }
    });

    // Moedas
    tokens.forEach((token) => {
      if (jump > 0.18 && Math.abs(token.worldX - heroX) < 0.4 && elapsed - token.collectedAt > 2.8) {
        token.collectedAt = elapsed;
        token.burst.start = elapsed;
        addScore(10);
        spawnPopup(10, token.worldX, token.baseY + 0.45);
      }

      const age = elapsed - token.collectedAt;
      if (age >= 0 && age < 0.4) {
        const t = age / 0.4;
        token.mesh.visible = true;
        token.mesh.position.y = token.baseY + Math.sin(t * Math.PI) * 0.5;
        token.mesh.rotation.y = t * Math.PI * 4;
        token.mesh.scale.setScalar(1 - t);
      } else if (age >= 0.4 && age < 2) {
        token.mesh.visible = false;
      } else {
        // Reaparece com um "pop"
        const back = Math.min(1, Math.max(0, (age - 2) / 0.35));
        token.mesh.visible = true;
        token.mesh.scale.setScalar(back < 1 ? 1 - Math.cos(back * Math.PI * 1.5) * (1 - back) * 0.6 : 1);
        token.mesh.position.y = token.baseY + Math.sin(elapsed * 1.7 + token.phase) * 0.1;
        token.mesh.rotation.y = Math.sin(elapsed * 1.5 + token.phase) * 0.5;
      }
    });

    // Partículas de impacto
    bursts.forEach((burst) => {
      const age = elapsed - burst.start;
      burst.group.visible = age >= 0 && age < burst.duration;
      if (!burst.group.visible) return;
      const progress = age / burst.duration;
      const eased = 1 - (1 - progress) ** 3;
      burst.particles.forEach(({ particle, direction }) => {
        particle.position.copy(direction).multiplyScalar(eased * 0.8);
        particle.position.y -= progress * progress * 0.35;
        particle.scale.setScalar(1 - progress);
        particle.rotation.set(progress * 4, progress * 3, progress * 2);
      });
    });

    // Poeira ao aterrissar
    const dustAge = elapsed - landedAt;
    dust.forEach((particle) => {
      if (dustAge < 0 || dustAge > 0.45) {
        particle.mesh.visible = false;
        return;
      }
      const t = dustAge / 0.45;
      particle.mesh.visible = true;
      particle.mesh.position.set(
        dustOrigin + particle.dir * (0.12 + t * particle.speed * 0.6),
        0.46 + Math.sin(t * Math.PI) * particle.lift * 0.4,
        1.1,
      );
      particle.mesh.scale.setScalar(1 - t);
    });

    // "+10" / "+50"
    popups.forEach((popup) => {
      const age = elapsed - popup.start;
      if (age < 0 || age > 0.9) {
        popup.mesh.visible = false;
        return;
      }
      const t = age / 0.9;
      popup.mesh.visible = true;
      popup.mesh.position.set(popup.x, popup.y + (1 - (1 - t) ** 2) * 0.7, 1.25);
      popup.mesh.material.opacity = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.5 : 1.1 - Math.min(0.1, (t - 0.15));
      popup.mesh.scale.setScalar(pop);
    });

    // Vaga-lumes presos à câmera
    fireflyGroup.position.x = camX;
    fireflies.forEach((fly) => {
      const y = (fly.y + elapsed * fly.rise) % 6.2;
      fly.mesh.position.set(
        fly.x + Math.sin(elapsed * 0.9 + fly.phase) * 0.3,
        0.6 + y,
        0,
      );
      const flicker = 0.5 + 0.5 * Math.sin(elapsed * 3 + fly.phase);
      fly.mesh.scale.setScalar(0.4 + flicker * 0.8);
    });

    renderer.render(scene, camera);
  }

  if ("ResizeObserver" in window) {
    new ResizeObserver(resizeRenderer).observe(container);
  } else {
    window.addEventListener("resize", resizeRenderer);
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
    }).observe(container);
  }

  document.addEventListener("visibilitychange", () => {
    pageVisible = !document.hidden;
  });

  applySceneTheme(root.dataset.theme === "light" ? "light" : "dark");
  resizeRenderer();
  if (!reducedMotion) window.requestAnimationFrame(renderFrame);
}
