// ╔══════════════════════════════════════════════════╗
// ║  🎵 3D音频可视化 — Audio Visualizer               ║
// ║  Three.js · 频谱柱 · 波形环 · 节拍粒子 · 霓虹色系   ║
// ╚══════════════════════════════════════════════════╝

import * as THREE from 'three';

// ========== 场景 ==========
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 100);
camera.position.set(0, 8, 14);
camera.lookAt(0, 0, 0);

// 网格地面
const grid = new THREE.GridHelper(20, 30, 0x222244, 0x111122);
scene.add(grid);

// 中心光点
const coreGeom = new THREE.SphereGeometry(0.3, 32, 32);
const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const core = new THREE.Mesh(coreGeom, coreMat);
scene.add(core);

// ========== 频谱柱 ==========
const BAR_COUNT = 64;
const bars: THREE.Mesh[] = [];
const barGeom = new THREE.BoxGeometry(0.15, 1, 0.15);
for (let i = 0; i < BAR_COUNT; i++) {
  const angle = (i / BAR_COUNT) * Math.PI * 2;
  const radius = 4.5;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const hue = 0.55 + (i / BAR_COUNT) * 0.35; // 蓝紫→粉
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(hue % 1, 1, 0.5) });
  const bar = new THREE.Mesh(barGeom, mat);
  bar.position.set(x, 0, z);
  bar.rotation.y = -angle + Math.PI / 2;
  bar.scale.y = 0.1;
  scene.add(bar);
  bars.push(bar);
}

// ========== 波形环(线条) ==========
const wavePoints = 256;
const waveGeom = new THREE.BufferGeometry();
const wavePositions = new Float32Array(wavePoints * 3);
waveGeom.setAttribute('position', new THREE.BufferAttribute(wavePositions, 3));
const waveLine = new THREE.Line(waveGeom, new THREE.LineBasicMaterial({ color: 0x00ddff, linewidth: 1 }));
scene.add(waveLine);

// ========== 粒子(节拍爆发) ==========
const particleCount = 500;
const pGeom = new THREE.BufferGeometry();
const pPositions = new Float32Array(particleCount * 3);
const pColors = new Float32Array(particleCount * 3);
const pVels: { vx: number; vy: number; vz: number; life: number }[] = [];
for (let i = 0; i < particleCount; i++) {
  pPositions[i * 3] = pPositions[i * 3 + 1] = pPositions[i * 3 + 2] = 0;
  pColors[i * 3] = pColors[i * 3 + 1] = pColors[i * 3 + 2] = 0;
  pVels.push({ vx: 0, vy: 0, vz: 0, life: 0 });
}
pGeom.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
pGeom.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
const pMat = new THREE.PointsMaterial({ size: 0.12, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false });
const particles = new THREE.Points(pGeom, pMat);
scene.add(particles);

// ========== 频段标签环 ==========
const labelGeom = new THREE.RingGeometry(3.8, 4.2, 64);
const labelRing = new THREE.Mesh(labelGeom, new THREE.MeshBasicMaterial({ color: 0x334466, side: THREE.DoubleSide, transparent: true, opacity: 0.4 }));
labelRing.rotation.x = -Math.PI / 2;
labelRing.position.y = -2;
scene.add(labelRing);

// ========== 音频设置 ==========
let audioCtx: AudioContext;
let analyser: AnalyserNode;
let freqData: any;
let waveData: any;
let beatEnergy = 0;
let beatThreshold = 80;
const freqHistory: number[] = new Array(32).fill(0);
let currentSource: AudioBufferSourceNode | MediaStreamAudioSourceNode | null = null;

async function initAudio() {
  const overlay = document.getElementById('overlay')!;
  audioCtx = new AudioContext();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.8;
  freqData = new Uint8Array(analyser.frequencyBinCount);
  waveData = new Uint8Array(analyser.frequencyBinCount);

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const src = audioCtx.createMediaStreamSource(stream);
    src.connect(analyser);
    currentSource = src;
    overlay.classList.remove('show');
  } catch {
    // 无麦克风: 内置节拍器
    overlay.innerHTML = '🔊 演示模式 · 拖拽音频文件到页面播放<br><span style="font-size:13px;color:#888">无麦克风,使用内置节拍</span>';
    overlay.classList.add('show');
    setTimeout(() => overlay.classList.remove('show'), 3000);
    startDemoBeat();
  }
}

function startDemoBeat() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  gain.gain.value = 1;
  osc.frequency.value = 80; osc.type = 'square';
  osc.connect(gain); gain.connect(analyser);
  osc.start();
  setInterval(() => { gain.gain.value = 1; setTimeout(() => { gain.gain.value = 0.3; }, 80); }, 500);
}

// ========== 音频文件加载 ==========
function loadAudioFile(file: File) {
  if (!audioCtx) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const buffer = await audioCtx.decodeAudioData(e.target!.result as ArrayBuffer);
      playBuffer(buffer);
      const hint = document.getElementById('info')!;
      hint.textContent = `🎵 ${file.name} · 拖拽换歌`;
      hint.style.color = '#0ff';
    } catch { /* 格式不支持 */ }
  };
  reader.readAsArrayBuffer(file);
}

function playBuffer(buffer: AudioBuffer) {
  if (currentSource) { try { (currentSource as any).disconnect?.(); } catch {} }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.connect(analyser);
  analyser.connect(audioCtx.destination); // 输出到扬声器
  src.start();
  currentSource = src;
}

// 拖拽上传
document.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); });
document.addEventListener('drop', e => {
  e.preventDefault(); e.stopPropagation();
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    const f = files[0];
    if (f.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(f.name)) {
      loadAudioFile(f);
    }
  }
});

// 点击页面选文件
document.addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'audio/*';
  input.onchange = () => { if (input.files?.[0]) loadAudioFile(input.files[0]); };
  input.click();
});

initAudio();

// ========== 粒子爆发 ==========
function burstParticles(count: number, color: THREE.Color) {
  for (let i = 0; i < particleCount; i++) {
    if (pVels[i].life > 0) continue;
    const a = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.5;
    const spd = 0.1 + Math.random() * 0.3;
    pVels[i].vx = Math.cos(a) * Math.cos(phi) * spd;
    pVels[i].vy = Math.sin(phi) * spd + 0.15;
    pVels[i].vz = Math.sin(a) * Math.cos(phi) * spd;
    pVels[i].life = 1 + Math.random();
    pPositions[i * 3] = pPositions[i * 3 + 1] = pPositions[i * 3 + 2] = 0;
    pColors[i * 3] = color.r; pColors[i * 3 + 1] = color.g; pColors[i * 3 + 2] = color.b;
    if (--count <= 0) break;
  }
}

// ========== 主循环 ==========
const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(clock.getDelta(), 0.1);

  if (analyser) {
    analyser.getByteFrequencyData(freqData as any);
    analyser.getByteTimeDomainData(waveData as any);

    // 低频能量(节拍检测)
    let lowSum = 0;
    for (let i = 0; i < 8; i++) lowSum += freqData[i];
    lowSum /= 8;
    freqHistory.push(lowSum); freqHistory.shift();
    const avgHistory = freqHistory.reduce((a, b) => a + b, 0) / freqHistory.length;

    if (lowSum > avgHistory * 1.4 && lowSum > beatThreshold) {
      beatEnergy = lowSum;
      const hue = Math.random();
      burstParticles(60, new THREE.Color().setHSL(hue, 1, 0.6));
    }
    beatEnergy *= 0.9;

    // 更新频谱柱
    for (let i = 0; i < BAR_COUNT; i++) {
      const fi = Math.floor(i * freqData.length / BAR_COUNT);
      const val = freqData[fi] / 255;
      bars[i].scale.y = Math.max(0.05, val * 6);
      bars[i].position.y = bars[i].scale.y / 2;

      const hue = 0.55 + (i / BAR_COUNT) * 0.35 + (val - 0.5) * 0.15;
      const light = 0.3 + val * 0.7;
      (bars[i].material as THREE.MeshBasicMaterial).color.setHSL(hue % 1, 1, light);
    }

    // 更新波形环
    for (let i = 0; i < wavePoints; i++) {
      const fi = Math.floor(i * waveData.length / wavePoints);
      const val = (waveData[fi] - 128) / 128;
      const angle = (i / wavePoints) * Math.PI * 2;
      const radius = 3 + val * 1.5 + beatEnergy * 0.01;
      wavePositions[i * 3] = Math.cos(angle) * radius;
      wavePositions[i * 3 + 1] = val * 1.0;
      wavePositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    waveGeom.attributes.position.needsUpdate = true;
    (waveLine.material as THREE.LineBasicMaterial).color.setHSL(0.55 + beatEnergy * 0.001, 1, 0.4 + beatEnergy * 0.005);

    // 中心光球
    const coreSize = 0.3 + beatEnergy * 0.008;
    core.scale.setScalar(coreSize);
    coreMat.color.setHSL(0.6, 0.3, 0.8 + beatEnergy * 0.002);
  }

  // 更新粒子
  for (let i = 0; i < particleCount; i++) {
    if (pVels[i].life <= 0) {
      pPositions[i * 3] = pPositions[i * 3 + 1] = pPositions[i * 3 + 2] = 0;
      pColors[i * 3] = pColors[i * 3 + 1] = pColors[i * 3 + 2] = 0;
      continue;
    }
    pVels[i].life -= dt;
    pPositions[i * 3] += pVels[i].vx;
    pPositions[i * 3 + 1] += pVels[i].vy;
    pPositions[i * 3 + 2] += pVels[i].vz;
    pVels[i].vy += 0.02;
    const alpha = pVels[i].life / 2;
    pColors[i * 3] *= 0.98;
    pColors[i * 3 + 1] *= 0.98;
    pColors[i * 3 + 2] *= 0.98;
  }
  pGeom.attributes.position.needsUpdate = true;
  pGeom.attributes.color.needsUpdate = true;

  // 相机微动
  camera.position.x = Math.sin(performance.now() * 0.0002) * 3;
  camera.position.z = 14 + Math.cos(performance.now() * 0.0003) * 2;
  camera.lookAt(0, 0.5, 0);

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

requestAnimationFrame(loop);
console.log('🎵 3D音频可视化就绪 — 频谱柱+波形环+节拍粒子');
