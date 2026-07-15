/* ============ NAV: scrolled state + active link + mobile toggle ============ */
(function () {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();

/* ============ SCROLL REVEAL (IntersectionObserver) ============ */
(function () {
  const targets = document.querySelectorAll('.reveal, .reveal-stagger');
  if (!targets.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  targets.forEach((t) => io.observe(t));
})();

/* ============ PROJECT CARD 3D TILT ============ */
(function () {
  const cards = document.querySelectorAll('.project-card');
  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rotateX = ((y / rect.height) - 0.5) * -8;
      const rotateY = ((x / rect.width) - 0.5) * 8;
      card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(900px) rotateX(0) rotateY(0) translateY(0)';
    });
  });
})();

/* ============ HERO 3D CONSTELLATION (Three.js) ============ */
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const wrap = canvas.parentElement;
  let width = wrap.clientWidth;
  let height = wrap.clientHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
  camera.position.z = 26;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const group = new THREE.Group();
  scene.add(group);

  // ---- Nodes representing "skills / work" scattered in a sphere ----
  const NODE_COUNT = 42;
  const radius = 10;
  const nodePositions = [];
  const nodeGeo = new THREE.SphereGeometry(0.16, 12, 12);
  const nodeMatMint = new THREE.MeshBasicMaterial({ color: 0x33e1b0 });
  const nodeMatViolet = new THREE.MeshBasicMaterial({ color: 0x6e56cf });

  for (let i = 0; i < NODE_COUNT; i++) {
    const phi = Math.acos(-1 + (2 * i) / NODE_COUNT);
    const theta = Math.sqrt(NODE_COUNT * Math.PI) * phi;
    const x = radius * Math.cos(theta) * Math.sin(phi);
    const y = radius * Math.sin(theta) * Math.sin(phi);
    const z = radius * Math.cos(phi);
    const jitter = () => (Math.random() - 0.5) * 2.2;
    const pos = new THREE.Vector3(x + jitter(), y + jitter(), z + jitter());
    nodePositions.push(pos);

    const mesh = new THREE.Mesh(nodeGeo, i % 5 === 0 ? nodeMatMint : nodeMatViolet);
    mesh.position.copy(pos);
    group.add(mesh);
  }

  // ---- Connecting lines between nearby nodes (constellation effect) ----
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x6e56cf, transparent: true, opacity: 0.25 });
  const linePositions = [];
  for (let i = 0; i < nodePositions.length; i++) {
    for (let j = i + 1; j < nodePositions.length; j++) {
      if (nodePositions[i].distanceTo(nodePositions[j]) < 6.2) {
        linePositions.push(nodePositions[i].x, nodePositions[i].y, nodePositions[i].z);
        linePositions.push(nodePositions[j].x, nodePositions[j].y, nodePositions[j].z);
      }
    }
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  const lines = new THREE.LineSegments(lineGeo, lineMaterial);
  group.add(lines);

  // ---- Outer wireframe shell ----
  const shellGeo = new THREE.IcosahedronGeometry(radius + 3, 1);
  const shellMat = new THREE.MeshBasicMaterial({ color: 0x262b38, wireframe: true, transparent: true, opacity: 0.5 });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  group.add(shell);

  let mouseX = 0, mouseY = 0;
  wrap.addEventListener('mousemove', (e) => {
    const rect = wrap.getBoundingClientRect();
    mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  });

  const clock = new THREE.Clock();
  function animate() {
    const t = clock.getElapsedTime();
    group.rotation.y = t * 0.08 + mouseX * 0.4;
    group.rotation.x = mouseY * 0.25;
    shell.rotation.y = -t * 0.04;
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    width = wrap.clientWidth;
    height = wrap.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });
})();
