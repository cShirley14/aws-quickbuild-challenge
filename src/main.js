import * as THREE from 'three';

// =============================================================
// THREE.JS — Ambient floating dust particles (stage light motes)
// =============================================================
const canvas = document.getElementById('stage-fx');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 5;

// Particles — floating motes catching stage light
const COUNT = 120;
const positions = new Float32Array(COUNT * 3);
const sizes = new Float32Array(COUNT);
const speeds = new Float32Array(COUNT);

for (let i = 0; i < COUNT; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 12;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 3 - 1;
  sizes[i] = Math.random() * 6 + 3;
  speeds[i] = Math.random() * 0.3 + 0.1;
}

const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

const mat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: `
    attribute float aSize;
    varying float vAlpha;
    void main() {
      vAlpha = aSize / 9.0;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (8.0 / -mv.z);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float alpha = smoothstep(0.5, 0.0, d) * vAlpha * 0.7;
      gl_FragColor = vec4(1.0, 0.92, 0.7, alpha);
    }
  `,
});

const particles = new THREE.Points(geo, mat);
scene.add(particles);

// Animation
let animId;
const clock = new THREE.Clock();

function animate() {
  const t = clock.getElapsedTime();
  const pos = geo.attributes.position.array;
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3 + 1] += speeds[i] * 0.008;
    pos[i * 3] += Math.sin(t * 0.3 + i * 0.5) * 0.002;
    if (pos[i * 3 + 1] > 6) {
      pos[i * 3 + 1] = -6;
      pos[i * 3] = (Math.random() - 0.5) * 12;
    }
  }
  geo.attributes.position.needsUpdate = true;
  renderer.render(scene, camera);
  animId = requestAnimationFrame(animate);
}

const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
function handleMotion() {
  if (mq.matches) {
    if (animId) cancelAnimationFrame(animId);
    renderer.render(scene, camera);
  } else {
    animate();
  }
}
handleMotion();
mq.addEventListener('change', handleMotion);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// =============================================================
// SCROLL REVEAL — IntersectionObserver
// =============================================================
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);
reveals.forEach((el) => observer.observe(el));

// =============================================================
// PACKAGE AUTO-SELECT — clicking Reserve pre-fills the dropdown
// =============================================================
const packageSelect = document.getElementById('package-select');
document.querySelectorAll('.card-btn[data-package]').forEach((btn) => {
  btn.addEventListener('click', () => {
    packageSelect.value = btn.dataset.package;
  });
});

// =============================================================
// FORM SUBMISSION — validation, guitar chord + stage light flash
// =============================================================
const form = document.getElementById('signup-form');
const confirmation = document.getElementById('confirmation');
const emailInput = document.getElementById('email');
const emailError = document.getElementById('email-error');

// Email regex — standard RFC-ish pattern
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateEmail() {
  const value = emailInput.value.trim();
  if (!value || !EMAIL_RE.test(value)) {
    emailInput.classList.add('invalid');
    emailError.classList.remove('hidden');
    return false;
  }
  emailInput.classList.remove('invalid');
  emailError.classList.add('hidden');
  return true;
}

// Clear error on input
emailInput.addEventListener('input', () => {
  if (emailInput.classList.contains('invalid')) {
    validateEmail();
  }
});

// Create stage flash overlay element
const flashEl = document.createElement('div');
flashEl.className = 'stage-flash';
document.body.appendChild(flashEl);

// Guitar chord — synthesized with Web Audio API (short open E power chord)
function playGuitarChord() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const now = ctx.currentTime;
  const duration = 1.8;

  // Frequencies: E2, B2, E3 (power chord feel)
  const notes = [82.41, 123.47, 164.81];

  notes.forEach((freq, i) => {
    // Oscillator (sawtooth for guitar-ish timbre)
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    // Quick distortion via waveshaper
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let j = 0; j < 256; j++) {
      const x = (j * 2) / 256 - 1;
      curve[j] = Math.tanh(x * 2);
    }
    shaper.curve = curve;

    // Envelope
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12 - i * 0.02, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Low-pass to mellow it out
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;

    osc.connect(shaper);
    shaper.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  });

  // Close context after sound finishes
  setTimeout(() => ctx.close(), (duration + 0.5) * 1000);
}

// Stage light flash
function triggerFlash() {
  flashEl.classList.remove('active');
  // Force reflow
  void flashEl.offsetWidth;
  flashEl.classList.add('active');
  setTimeout(() => flashEl.classList.remove('active'), 1300);
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = form.elements.name.value.trim();
  const email = form.elements.email.value.trim();
  const pkg = form.elements.package.value;

  if (!name || !pkg) return;

  // Validate email
  if (!validateEmail()) return;

  // Fire effects
  playGuitarChord();
  triggerFlash();

  // Show confirmation after flash peaks
  setTimeout(() => {
    form.classList.add('hidden');
    confirmation.classList.remove('hidden');
  }, 400);
});
