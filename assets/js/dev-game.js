import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const container = document.getElementById("gameScene");
const canvas = document.getElementById("devGameCanvas");

if (container && canvas) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-4, 4, 3.35, -3.35, 0.1, 100);
  const viewHeight = 7.3;
  const period = 18;
  const segmentCopies = [-1, 0, 1, 2];
  const repeatedDetails = [];
  const codeBlocks = [];
  const tokens = [];
  const bursts = [];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let visible = true;
  let lastFrame = 0;
  let viewWidth = 8;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const palette = {
    hillBack: 0x334c7b,
    hillFront: 0x286d76,
    grass: 0x57d08b,
    grassLight: 0x8cf27b,
    earth: 0x7d4a6b,
    earthDark: 0x4c365d,
    mint: 0x6cf5cf,
    aqua: 0x49bfd1,
    gold: 0xffd66e,
    coral: 0xff718d,
    violet: 0xb69aff,
    cloud: 0xe9e3ff,
    white: 0xf6f3ff,
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
    violet: standard(palette.violet, 0.34, palette.violet),
    block: standard(0xe98e70),
    blockSide: standard(0xa45571),
    blockTop: standard(0xffc478),
    server: standard(0x28566f),
    serverFace: standard(0x152d4d),
    serverLight: standard(palette.mint, 0.3, palette.mint),
  };

  const addBox = (parent, size, position, surface, castShadow = false) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), surface);
    mesh.position.set(...position);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = false;
    parent.add(mesh);
    return mesh;
  };

  const makeTexture = (size, draw) => {
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = size;
    textureCanvas.height = size;
    const context = textureCanvas.getContext("2d");
    draw(context, size);
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  };

  const groundFace = new THREE.MeshStandardMaterial({
    map: makeTexture(128, (context, size) => {
      context.fillStyle = "#573956";
      context.fillRect(0, 0, size, size);
      for (let row = 0; row < 4; row += 1) {
        const offset = row % 2 ? 18 : 0;
        for (let column = 0; column < 4; column += 1) {
          const x = column * 36 + offset;
          const y = row * 32;
          context.fillStyle = (row + column) % 3 ? "#87506f" : "#a25c78";
          context.fillRect(x + 2, y + 2, 30, 25);
          context.fillStyle = "rgba(255,215,203,.13)";
          context.fillRect(x + 4, y + 4, 25, 3);
          context.fillStyle = "rgba(28,27,56,.2)";
          context.fillRect(x + 3, y + 23, 28, 3);
        }
      }
      context.fillStyle = "#b36b82";
      context.fillRect(12, 12, 9, 7);
      context.fillRect(88, 79, 8, 8);
      context.fillStyle = "#55d9b0";
      context.fillRect(48, 47, 8, 8);
    }),
    roughness: 0.92,
  });

  const grassFace = new THREE.MeshStandardMaterial({
    map: makeTexture(128, (context, size) => {
      context.fillStyle = "#297b6c";
      context.fillRect(0, 0, size, size);
      context.fillStyle = "#61d28b";
      context.fillRect(0, 0, size, 22);
      context.fillStyle = "#a3f07b";
      context.fillRect(0, 0, size, 7);
      for (let index = 0; index < 18; index += 1) {
        const x = (index * 47 + 13) % size;
        context.fillStyle = index % 3 ? "#4ab985" : "#b2f182";
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
      context.strokeStyle = "rgba(108,245,207,.45)";
      context.lineWidth = 3;
      for (let row = 0; row < 3; row += 1) {
        const y = 31 + row * 32;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(31, y);
        context.lineTo(31, y + 9);
        context.lineTo(68, y + 9);
        context.stroke();
        context.fillStyle = row % 2 ? "#b69aff" : "#6cf5cf";
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

  const makeGlyphTexture = (glyph, color, background = "#f4a96b") =>
    makeTexture(128, (context, size) => {
      context.fillStyle = background;
      context.fillRect(0, 0, size, size);
      context.fillStyle = "rgba(255,255,255,.24)";
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
      context.fillStyle = "#dfffee";
      context.font = "bold 28px monospace";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, size / 2, size / 2 + 7);
      context.fillStyle = "#65f0cd";
      for (let index = 0; index < 3; index += 1) {
        context.fillRect(23 + index * 30, 101, 12, 8);
      }
    });

  const makeTokenTexture = (text) =>
    makeTexture(128, (context, size) => {
      context.clearRect(0, 0, size, size);
      context.beginPath();
      context.arc(size / 2, size / 2, 54, 0, Math.PI * 2);
      context.fillStyle = "#09253a";
      context.fill();
      context.strokeStyle = "#83ffe0";
      context.lineWidth = 8;
      context.stroke();
      context.fillStyle = "#b8ffea";
      context.font = "bold 38px monospace";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, size / 2, size / 2 + 2);
    });

  function makeBurst(parent, color, position) {
    const group = new THREE.Group();
    group.visible = false;
    group.position.set(...position);
    const sparkleMaterial = standard(color, 0.3, color);
    const particles = [];
    for (let index = 0; index < 7; index += 1) {
      const particle = addBox(group, [0.1, 0.1, 0.1], [0, 0, 0], sparkleMaterial);
      particles.push({
        particle,
        direction: new THREE.Vector3(
          Math.cos((index / 7) * Math.PI * 2),
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
      hair: "#332747",
      hairLight: "#58405c",
      skin: "#f5bd8a",
      skinShade: "#d98670",
      eye: "#17213c",
      hoodie: "#43cbb0",
      hoodieLight: "#8bf0d0",
      hoodieShade: "#248d88",
      purple: "#9b79d0",
      purpleShade: "#654f9a",
      pants: "#35476f",
      pantsLight: "#536c93",
      shoe: "#f4bd57",
      shoeLight: "#ffdf83",
      sole: "#ec806e",
      screen: "#c5fff0",
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

      pixel(6, 19, colors.outline, 5, 11);
      pixel(7, 20, colors.purpleShade, 3, 8);
      pixel(7, 20, colors.purple, 2, 6);
      pixel(8, 21, colors.purple, 2, 1);
      pixel(6, 29, colors.outline, 5, 2);

      pixel(10, 5, colors.outline, 13, 13);
      pixel(11, 4, colors.outline, 10, 2);
      pixel(12, 5, colors.hair, 9, 3);
      pixel(10, 8, colors.hair, 4, 4);
      pixel(11, 9, colors.skin, 10, 8);
      pixel(12, 8, colors.skin, 9, 1);
      pixel(20, 10, colors.skinShade, 2, 5);
      pixel(19, 11, colors.eye, 1, 2);
      pixel(21, 14, colors.skinShade, 2, 2);
      pixel(17, 16, colors.outlineLight, 3, 1);
      pixel(11, 15, colors.skinShade, 2, 2);
      pixel(10, 10, colors.hair, 2, 5);
      pixel(12, 6, colors.hairLight, 4, 1);

      pixel(11, 17, colors.skinShade, 5, 3);
      pixel(10, 18, colors.outline, 13, 13);
      pixel(9, 19, colors.outline, 15, 9);
      pixel(10, 19, colors.hoodie, 13, 10);
      pixel(10, 20, colors.hoodieLight, 5, 1);
      pixel(11, 21, colors.hoodieLight, 1, 6);
      pixel(19, 20, colors.hoodieShade, 3, 8);
      pixel(10, 28, colors.outline, 14, 3);
      pixel(11, 28, colors.hoodieShade, 11, 2);

      pixel(14, 19, colors.outlineLight, 2, 5);
      pixel(14, 20, colors.screen, 1, 1);
      pixel(15, 21, colors.screen, 1, 1);
      pixel(14, 22, colors.screen, 1, 1);
      pixel(17, 20, colors.gold, 2, 2);
      pixel(17, 24, colors.outline, 4, 3);
      pixel(18, 25, colors.screen, 2, 1);

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
    hero.add(sprite);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.25, 20),
      new THREE.MeshBasicMaterial({ color: 0x182043, transparent: true, opacity: 0.28 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0.02, 0.018, 0);
    hero.add(shadow);
    scene.add(hero);
    return { group: hero, sprite, texture, frameCount, shadow, frame: -1 };
  }

  const hero = createHero();

  scene.add(new THREE.HemisphereLight(0xc9dcff, 0x25354b, 2.2));
  const sun = new THREE.DirectionalLight(0xffdda1, 2.3);
  sun.position.set(-4, 8, 8);
  scene.add(sun);
  const glow = new THREE.PointLight(palette.mint, 18, 12, 2);
  glow.position.set(1, 4, 4);
  scene.add(glow);

  const skyTexture = makeTexture(512, (context, size) => {
    const gradient = context.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, "#222851");
    gradient.addColorStop(0.52, "#405079");
    gradient.addColorStop(0.79, "#d17c91");
    gradient.addColorStop(1, "#f5b477");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    context.fillStyle = "rgba(255,224,177,.28)";
    context.fillRect(0, size * 0.72, size, size * 0.035);
    context.fillStyle = "rgba(116,242,219,.1)";
    context.fillRect(0, size * 0.78, size, size * 0.025);
  });
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 10),
    new THREE.MeshBasicMaterial({ map: skyTexture, depthWrite: false }),
  );
  sky.position.set(8, 3.3, -6);
  scene.add(sky);

  camera.position.set(0, 4.1, 14);
  camera.lookAt(0, 2.45, 0);

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

  function addPixelPeak(parent, x, z, layers, phase) {
    const peak = new THREE.Group();
    const cell = 0.47;
    for (let row = 0; row < layers; row += 1) {
      const count = layers * 2 - 1 - row * 2;
      const y = row * 0.36;
      for (let column = 0; column < count; column += 1) {
        const xPosition = (column - (count - 1) / 2) * cell;
        const snow = row >= layers - 2 && Math.abs(xPosition) < (layers - row) * 0.28;
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
    repeatedDetails.push({
      mesh: peak,
      baseY: -0.08,
      phase,
      bob: 0.025,
    });
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
    repeatedDetails.push({
      mesh: tree,
      baseY: tree.position.y,
      phase: variant * 1.2,
      bob: 0.018,
    });
  }

  function addPixelFlower(parent, x, z, color, phase) {
    const flower = new THREE.Group();
    const petalMaterial = color === palette.gold ? material.gold : color === palette.coral ? material.coral : material.violet;
    addBox(flower, [0.045, 0.24, 0.05], [0, 0.12, 0], material.grassLight);
    addBox(flower, [0.19, 0.07, 0.07], [0, 0.29, 0], petalMaterial);
    addBox(flower, [0.07, 0.18, 0.07], [0, 0.29, 0], petalMaterial);
    addBox(flower, [0.065, 0.065, 0.075], [0, 0.29, 0.04], material.white);
    addBox(flower, [0.13, 0.06, 0.06], [0.07, 0.07, 0], material.grass);
    flower.position.set(x, 0.44, z);
    parent.add(flower);
    repeatedDetails.push({ mesh: flower, baseY: flower.position.y, phase, bob: 0.035 });
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

  function addHills(parent, z, surface, amplitude, phase) {
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
    hill.position.z = z;
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
    addBox(parent, [period, 0.2, 0.82], [period / 2, -0.84, 0], material.earthDark);
  }

  function addCodeBlock(parent, x, y, glyph, tint, phase) {
    const frontTexture = makeGlyphTexture(glyph, "#18213d", tint);
    const front = new THREE.MeshStandardMaterial({ map: frontTexture, roughness: 0.55 });
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.58, 0.58),
      [material.blockSide, material.blockSide, material.blockTop, material.blockSide, front, material.blockSide],
    );
    block.position.set(x, y, 0.42);
    parent.add(block);
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(block.geometry),
      new THREE.LineBasicMaterial({ color: 0x4c365d, transparent: true, opacity: 0.76 }),
    );
    block.add(outline);
    repeatedDetails.push({
      mesh: block,
      baseY: y,
      phase,
      bob: 0.07,
      rotate: false,
    });
    codeBlocks.push({
      mesh: block,
      worldX: parent.position.x + x,
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
        [
          material.server,
          material.server,
          material.aqua,
          material.serverFace,
          platformFace,
          material.server,
        ],
      );
      addBox(
        parent,
        [0.58, 0.07, 0.64],
        [x + index * 0.62, y + 0.18, 0.1],
        index % 2 ? material.mint : material.grassLight,
      );
      addBox(
        parent,
        [0.1, 0.09, 0.035],
        [x + index * 0.62 - 0.14, y - 0.02, 0.425],
        material.violet,
      );
      addBox(
        parent,
        [0.16, 0.035, 0.04],
        [x + index * 0.62 + 0.11, y - 0.1, 0.43],
        index % 2 ? material.aqua : material.mint,
      );
      if (index === 0 || index === count - 1) {
        addBox(parent, [0.07, 0.42, 0.7], [x + index * 0.62, y - 0.03, 0.11], material.violet);
      }
    }
  }

  function addToken(parent, x, y, glyph, phase) {
    const token = new THREE.Group();
    token.position.set(x, y, 0.52);
    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.19, 0.08, 8),
      new THREE.MeshStandardMaterial({
        color: palette.gold,
        emissive: palette.gold,
        emissiveIntensity: 0.65,
        roughness: 0.28,
        metalness: 0.2,
      }),
    );
    coin.rotation.x = Math.PI / 2;
    token.add(coin);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.28),
      new THREE.MeshBasicMaterial({
        map: makeTokenTexture(glyph),
        transparent: true,
        toneMapped: false,
      }),
    );
    face.position.z = 0.052;
    token.add(face);
    parent.add(token);
    repeatedDetails.push({
      mesh: token,
      baseY: y,
      phase,
      bob: 0.12,
      rotate: true,
    });
    tokens.push({
      mesh: token,
      worldX: parent.position.x + x,
      baseY: y,
      burst: makeBurst(parent, palette.mint, [x, y, 0.52]),
      collectedAt: -Infinity,
    });
  }

  function addServer(parent, x, height, label, phase) {
    const server = new THREE.Group();
    server.position.set(x, 0.42, 0.36);
    addBox(server, [0.92, height, 0.62], [0, height / 2, 0], material.server);
    const faceMaterial = new THREE.MeshStandardMaterial({
      map: makeLabelTexture(label, "#51e7c4"),
      roughness: 0.6,
    });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.72), faceMaterial);
    face.position.set(0, height * 0.61, 0.32);
    server.add(face);
    addBox(server, [1.08, 0.14, 0.74], [0, height, 0], material.aqua);
    for (let index = 0; index < 3; index += 1) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.06), material.serverLight);
      lamp.position.set(-0.31 + index * 0.22, 0.18, 0.34);
      server.add(lamp);
      repeatedDetails.push({
        mesh: lamp,
        baseY: lamp.position.y,
        phase: phase + index,
        bob: 0,
        rotate: false,
        pulse: true,
      });
    }
    parent.add(server);
  }

  function addPixelStar(parent, x, y, size, phase) {
    const star = addBox(parent, [size, size, 0.045], [x, y, -4.3], material.white);
    repeatedDetails.push({ mesh: star, baseY: y, phase, bob: 0, rotate: false, pulse: true });
  }

  function buildSegment(offset) {
    const segment = new THREE.Group();
    segment.position.x = offset;

    addHills(segment, -3.9, material.hillBack, 0.85, 0.6);
    addHills(segment, -2.8, material.hillFront, 0.55, 2.1);
    addPixelPeak(segment, 2.7, -4.55, 7, 0.7);
    addPixelPeak(segment, 8.6, -4.6, 8, 1.8);
    addPixelPeak(segment, 15.5, -4.5, 6, 2.6);
    addVoxelGround(segment);

    const sun = new THREE.Group();
    sun.position.set(12.1, 4.65, -4.25);
    for (let row = 0; row < 5; row += 1) {
      const count = 5 + Math.min(row, 4 - row) * 2;
      const width = 0.22;
      for (let column = 0; column < count; column += 1) {
        addBox(
          sun,
          [width, 0.2, 0.12],
          [(column - (count - 1) / 2) * width, (2 - row) * 0.2, 0],
          row === 0 || row === 4 ? material.coral : material.gold,
        );
      }
    }
    segment.add(sun);
    repeatedDetails.push({ mesh: sun, baseY: sun.position.y, phase: 0.8, bob: 0.06 });

    const cloudA = addCloud(segment, 2.1, 4.4, -3.4, 0.9);
    const cloudB = addCloud(segment, 8.9, 5.05, -3.5, 0.72);
    const cloudC = addCloud(segment, 15.1, 4.1, -3.4, 1.04);
    [cloudA, cloudB, cloudC].forEach((cloud, index) => {
      repeatedDetails.push({
        mesh: cloud,
        baseY: cloud.position.y,
        phase: index * 1.7,
        bob: 0.11,
        drift: 0.12,
        baseX: cloud.position.x,
      });
    });

    for (const [index, x] of [0.7, 5.25, 10.85, 16.25].entries()) {
      addPixelTree(segment, x, -1.35, index);
    }
    for (const [index, x] of [1.75, 4.55, 7.3, 10.05, 13.75, 17.1].entries()) {
      addPixelFlower(segment, x, 0.62, [palette.gold, palette.coral, palette.violet][index % 3], index);
    }
    addCodeShrub(segment, 3.75, -0.75, 0);
    addCodeShrub(segment, 8.1, -0.78, 1);
    addCodeShrub(segment, 14.85, -0.72, 0);

    addPlatform(segment, 1.6, 1.72, 2.55);
    addPlatform(segment, 8.2, 2.35, 2.45);
    addPlatform(segment, 13.15, 1.82, 2.5);

    addCodeBlock(segment, 3.25, 2.9, "{ }", "#ffbe71", 0.2);
    addCodeBlock(segment, 4.75, 2.9, "?", "#8df1c0", 1.1);
    addCodeBlock(segment, 9.1, 3.5, "</>", "#d0a6ff", 2.4);
    addCodeBlock(segment, 14.15, 2.95, "{ }", "#83e6dc", 3.2);

    addToken(segment, 2.15, 2.65, "<>", 0.3);
    addToken(segment, 5.35, 3.15, "{}", 1.4);
    addToken(segment, 8.55, 3.28, "$_", 2.2);
    addToken(segment, 10.1, 3.06, "</>", 3.1);
    addToken(segment, 13.3, 2.6, "01", 4.1);
    addToken(segment, 15.15, 3.2, "{}", 5.2);

    addServer(segment, 6.55, 1.42, "API", 0);
    addServer(segment, 12.15, 1.13, "DB", 0);
    addServer(segment, 17.0, 1.65, "GIT", 0);

    for (let index = 0; index < 11; index += 1) {
      const x = 0.5 + index * 1.62;
      addPixelStar(segment, x, 3.1 + (index % 3) * 0.72, index % 4 === 0 ? 0.12 : 0.07, index * 0.4);
    }

    scene.add(segment);
  }

  segmentCopies.forEach((copy) => buildSegment(copy * period));

  const scanlines = document.createElement("canvas");
  scanlines.width = 8;
  scanlines.height = 8;
  const scanContext = scanlines.getContext("2d");
  scanContext.fillStyle = "rgba(15, 18, 42, .08)";
  scanContext.fillRect(0, 0, 8, 1);
  const scanTexture = new THREE.CanvasTexture(scanlines);
  scanTexture.wrapS = THREE.RepeatWrapping;
  scanTexture.wrapT = THREE.RepeatWrapping;
  scanTexture.repeat.set(100, 54);
  const scanOverlay = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 8),
    new THREE.MeshBasicMaterial({
      map: scanTexture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  scanOverlay.position.set(8, 2.7, 1.15);
  scene.add(scanOverlay);

  function resizeRenderer() {
    const bounds = container.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const aspect = bounds.width / bounds.height;
    viewWidth = viewHeight * aspect;
    camera.left = -viewWidth / 2;
    camera.right = viewWidth / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(bounds.width, bounds.height, false);
    renderer.render(scene, camera);
  }

  function getJumpHeight(distance) {
    let height = 0;
    for (const [start, duration] of [[0.55, 1.05], [3, 1.35], [8.85, 1.35], [16.9, 1.1]]) {
      const progress = (distance - start + period) % period;
      if (progress < duration) {
        height = Math.max(height, Math.sin((progress / duration) * Math.PI) * 1.2);
      }
    }
    return height;
  }

  function renderFrame(now) {
    window.requestAnimationFrame(renderFrame);
    if (!visible || (reducedMotion && lastFrame > 0) || now - lastFrame < 32) return;

    const elapsed = now * 0.001;
    const scroll = reducedMotion ? 0 : (elapsed * 0.72) % period;
    const jumpHeight = reducedMotion ? 0 : getJumpHeight(scroll);
    const runCycle = reducedMotion ? 0 : elapsed * 11;
    const heroOffset = Math.min(2.2, Math.max(0.55, viewWidth * 0.27));
    camera.position.set(scroll, 4.1, 14);
    camera.lookAt(scroll, 2.45, 0);

    hero.group.position.x = scroll + heroOffset;
    hero.group.position.y = 0.42 + jumpHeight + (jumpHeight ? 0 : Math.abs(Math.sin(runCycle * 2)) * 0.018);

    const isStriking = jumpHeight > 0.88 && codeBlocks.some((block) =>
      Math.abs(block.worldX - (scroll + heroOffset)) < 0.43 && elapsed - block.lastHit < 0.5);
    const spriteFrame = jumpHeight > 0.16 ? 3 : isStriking ? 2 : 1 + Math.floor(elapsed * 8) % 2;
    if (hero.frame !== spriteFrame) {
      hero.texture.offset.x = spriteFrame / hero.frameCount;
      hero.frame = spriteFrame;
    }
    hero.shadow.scale.setScalar(Math.max(0.42, 1 - jumpHeight * 0.28));
    hero.shadow.material.opacity = Math.max(0.13, 0.36 - jumpHeight * 0.12);

    repeatedDetails.forEach((detail) => {
      if (detail.bob) {
        detail.mesh.position.y = detail.baseY + Math.sin(elapsed * 1.7 + detail.phase) * detail.bob;
      }
      if (detail.drift) {
        detail.mesh.position.x = detail.baseX + Math.sin(elapsed * 0.23 + detail.phase) * detail.drift;
      }
      if (detail.rotate) {
        detail.mesh.rotation.y = Math.sin(elapsed * 1.5 + detail.phase) * 0.36;
      }
      if (detail.pulse) {
        detail.mesh.visible = Math.sin(elapsed * 2.3 + detail.phase) > -0.65;
      }
    });

    codeBlocks.forEach((block) => {
      const bumpAge = elapsed - block.lastHit;
      if (jumpHeight > 0.88 && Math.abs(block.worldX - (scroll + heroOffset)) < 0.43 && bumpAge > 1.2) {
        block.lastHit = elapsed;
        block.burst.start = elapsed;
      }

      const age = elapsed - block.lastHit;
      if (age >= 0 && age < 0.55) {
        block.mesh.position.y += Math.sin((age / 0.55) * Math.PI) * 0.24;
      }
    });

    tokens.forEach((token) => {
      const collectedAge = elapsed - token.collectedAt;
      if (
        jumpHeight > 0.18 &&
        Math.abs(token.worldX - (scroll + heroOffset)) < 0.4 &&
        collectedAge > 2.8
      ) {
        token.collectedAt = elapsed;
        token.burst.start = elapsed;
      }

      const age = elapsed - token.collectedAt;
      if (age >= 0 && age < 0.45) {
        token.mesh.position.y = token.baseY + Math.sin(age / 0.45 * Math.PI) * 0.55;
        token.mesh.scale.setScalar(1 - age / 0.45);
      } else if (age >= 0.45 && age < 2) {
        token.mesh.visible = false;
      } else {
        token.mesh.visible = true;
        token.mesh.scale.setScalar(1);
        token.mesh.position.y = token.baseY + Math.sin(elapsed * 1.7 + token.worldX) * 0.12;
      }
    });

    bursts.forEach((burst) => {
      const age = elapsed - burst.start;
      burst.group.visible = age >= 0 && age < burst.duration;
      if (!burst.group.visible) return;
      const progress = age / burst.duration;
      burst.particles.forEach(({ particle, direction }) => {
        const distance = progress * 0.75;
        particle.position.copy(direction).multiplyScalar(distance);
        particle.scale.setScalar(1 - progress);
        particle.rotation.set(progress * 4, progress * 3, progress * 2);
      });
    });

    renderer.render(scene, camera);
    lastFrame = now;
  }

  if ("ResizeObserver" in window) {
    new ResizeObserver(resizeRenderer).observe(container);
  } else {
    window.addEventListener("resize", resizeRenderer);
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    }).observe(container);
  }

  document.addEventListener("visibilitychange", () => {
    visible = !document.hidden;
  });

  resizeRenderer();
  window.requestAnimationFrame(renderFrame);
}
