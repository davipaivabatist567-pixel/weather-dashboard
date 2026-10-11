// Visualizador 3D da ORION SMART BAND (three.js). As malhas vêm do modelo CAD (pecas.json),
// na posição real de montagem, em milímetros. Nada aqui é desenhado à mão.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const DADOS = window.ORION_PECAS;
const params = new URLSearchParams(location.search);
const SHOT = params.get("shot"); // "montado" | "explodido" (usado para gerar as imagens PNG)

const app = document.getElementById("cena");
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: !!SHOT });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02060d);
const camera = new THREE.PerspectiveCamera(30, 1, 1, 2000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.HemisphereLight(0xdfe8ee, 0x05080b, 0.55));
const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(60, 120, 90);
scene.add(key);
const rim = new THREE.DirectionalLight(0x00e5ff, 1.1);
rim.position.set(-90, 40, -80);
scene.add(rim);
const fill = new THREE.DirectionalLight(0xbfdfff, 0.35);
fill.position.set(0, -60, 60);
scene.add(fill);

// O CAD usa Z para cima; o three.js usa Y. O grupo gira o modelo inteiro.
const raiz = new THREE.Group();
raiz.rotation.x = -Math.PI / 2;
scene.add(raiz);

function geometria(item) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(item.v, 3));
  g.setIndex(item.f);
  // normais com vinco: arestas vivas ficam vivas, superfícies arredondadas ficam lisas
  return toCreasedNormals(g, (35 * Math.PI) / 180);
}

const pecas = [];
for (const p of DADOS.pecas) {
  const g = geometria(p);
  const ciano = p.id.startsWith("ORION_Botao");
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(...p.cor),
    roughness: ciano ? 0.35 : 0.82,
    metalness: 0.05,
    emissive: ciano ? new THREE.Color(0x00a8c0) : new THREE.Color(0x000000),
    emissiveIntensity: ciano ? 0.35 : 0,
    flatShading: false,
  });
  const malha = new THREE.Mesh(g, mat);
  const arestas = new THREE.LineSegments(new THREE.EdgesGeometry(g, 28), new THREE.LineBasicMaterial({ color: 0x2b4552 }));
  const grupo = new THREE.Group();
  grupo.add(malha, arestas);
  grupo.userData = { ...p, base: new THREE.Vector3(0, 0, 0) };
  g.computeBoundingBox();
  grupo.userData.centro = g.boundingBox.getCenter(new THREE.Vector3());
  raiz.add(grupo);
  pecas.push(grupo);
}

const comps = [];
const vidro = new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.12, metalness: 0.4 });
const laranja = new THREE.MeshStandardMaterial({ color: 0xff9a2e, transparent: true, opacity: 0.55, roughness: 0.6 });
let oledProduto = null;
for (const c of DADOS.componentes) {
  const g = geometria(c);
  const m = new THREE.Mesh(g, laranja);
  const grupo = new THREE.Group();
  grupo.add(m, new THREE.LineSegments(new THREE.EdgesGeometry(g, 28), new THREE.LineBasicMaterial({ color: 0xffc27a })));
  grupo.userData = c;
  grupo.visible = false;
  raiz.add(grupo);
  comps.push(grupo);
  if (c.id.startsWith("OLED")) oledProduto = new THREE.Mesh(g, vidro);
}
// No modo produto, a tela comprada aparece como vidro escuro (volume de referência, sem imagem simulada)
if (oledProduto) raiz.add(oledProduto);

// Vista explodida: cada peça se afasta na direção definida no CAD
let explode = 0;
function aplicarExplosao() {
  if (oledProduto) oledProduto.visible = explode < 0.05 && !comps[0]?.visible;
  for (const g of pecas) {
    const [x, y, z] = g.userData.explodir;
    g.position.set(x * explode, y * explode, z * explode);
  }
  for (const c of comps) c.position.set(0, 0, 0);
}

// Rótulos (vista explodida)
const rotulos = document.getElementById("rotulos");
const nomesUnicos = new Map();
for (const g of pecas) if (!nomesUnicos.has(g.userData.nome)) nomesUnicos.set(g.userData.nome, g);
const elRot = [];
for (const [nome, g] of nomesUnicos) {
  const el = document.createElement("div");
  el.className = "rotulo";
  el.textContent = nome;
  rotulos.appendChild(el);
  elRot.push({ el, g });
}
function atualizarRotulos() {
  const mostrar = explode > 0.6;
  const larg = renderer.domElement.clientWidth, alt = renderer.domElement.clientHeight;
  for (const { el, g } of elRot) {
    if (!mostrar || !g.visible) { el.style.display = "none"; continue; }
    const p = g.userData.centro.clone().add(g.position);
    raiz.localToWorld(p);
    p.project(camera);
    el.style.display = "block";
    el.style.left = `${((p.x + 1) / 2) * larg}px`;
    el.style.top = `${((1 - p.y) / 2) * alt}px`;
  }
}

let vistaAtual = "iso";
function vista(nome) {
  vistaAtual = nome;
  const explodida = nome === "explodida";
  const alvo = new THREE.Vector3(0, explodida ? -4 : 7, 0);
  const dir = new THREE.Vector3(...{
    iso: [0.5, 0.47, 0.73], frente: [0, 1, 0.0001], tras: [0, -1, 0.0001], lado: [0, 0.15, 1], usb: [0, 0.15, -1],
    explodida: [0.55, 0.42, 0.72],
  }[nome]).normalize();
  // enquadra uma esfera que contém o modelo, respeitando a largura da tela (celular em pé)
  const raio = explodida ? 52 : 36;
  const vfov = (camera.fov * Math.PI) / 180;
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  const dist = raio / Math.sin(Math.min(vfov, hfov) / 2);
  camera.position.copy(alvo).addScaledVector(dir, dist);
  controls.target.copy(alvo);
  controls.update();
}

function redimensionar() {
  const w = app.clientWidth, h = app.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  // no celular o painel ocupa a parte de baixo: desloca a imagem para cima
  if (w < 800 && !SHOT) camera.setViewOffset(w, h, 0, h * 0.2, w, h);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  if (typeof vistaAtual !== "undefined") vista(vistaAtual);
}
window.addEventListener("resize", redimensionar);
redimensionar();

// Interface
const ui = document.getElementById("ui");
const slider = document.getElementById("explodir");
slider.addEventListener("input", () => { explode = Number(slider.value); aplicarExplosao(); });
document.getElementById("refs").addEventListener("change", (e) => {
  comps.forEach((c) => (c.visible = e.target.checked));
  if (oledProduto) oledProduto.visible = !e.target.checked;
});
document.querySelectorAll("[data-vista]").forEach((b) => b.addEventListener("click", () => vista(b.dataset.vista)));
const lista = document.getElementById("lista");
for (const [nome] of nomesUnicos) {
  const id = "p" + Math.random().toString(36).slice(2);
  const linha = document.createElement("label");
  const g0 = nomesUnicos.get(nome);
  const cor = new THREE.Color(...g0.userData.cor).getHexString();
  linha.innerHTML = `<input type="checkbox" checked id="${id}"><span class="cor" style="background:#${cor}"></span>${nome}`;
  linha.querySelector("input").addEventListener("change", (e) => {
    pecas.filter((g) => g.userData.nome === nome).forEach((g) => (g.visible = e.target.checked));
  });
  lista.appendChild(linha);
}
document.getElementById("medidas").textContent =
  `Caixa ${DADOS.medidas.L} × ${DADOS.medidas.W} × ${DADOS.medidas.H} mm · gire com um dedo, aproxime com dois`;

if (SHOT) {
  ui.style.display = "none";
  explode = SHOT === "explodido" ? 1 : 0;
  vista(SHOT === "explodido" ? "explodida" : "iso");
  if (SHOT === "explodido") comps.forEach((c) => (c.visible = false));
} else {
  vista("iso");
}
aplicarExplosao();

let quadros = 0;
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
  atualizarRotulos();
  if (++quadros === 5) window.__pronto = true;
});
