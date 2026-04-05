/* ===== BINGO FAMILIAR ===== */

// --- Configuración de voces grabadas ---
// Para añadir voces grabadas, crea carpetas audio/voz1/, audio/voz2/, etc.
// Cada carpeta debe contener: 1.mp3 a 90.mp3, linea.mp3, bingo.mp3
// Luego añade las entradas aquí:
const VOCES_GRABADAS = [
  { id: 'voz1', nombre: 'Jordi' },
  // { id: 'voz2', nombre: 'Nombre' },
  // { id: 'voz3', nombre: 'Nombre' },
  // { id: 'voz4', nombre: 'Nombre' },
  // { id: 'voz5', nombre: 'Nombre' },
];

// --- Tonterías ---
// Per afegir/treure tonterías, modifica aquestes llistes:
const TONTERIAS = {
  // Sonen just després del número corresponent (sempre)
  numeros: [22, 26, 44, 57, 61, 85, 90],

  // Aleatoris: a partir de la bola 25, màxim 3 per partida
  aleatorios: ['callate', 'donde_esta_la_pelotita', 'me_aburro', 'mima_va_que_me_aburro', 'pedo'],
  maxAleatoris: 3,

  // Sonen 2 cops per partida, només quan la unitat del número coincideix
  // Excepció: unitat 5 no sona amb el 15
  unidades: [5, 8],
  unidadesExcepcions: { 5: [15] }
};

const VELOCIDADES = {
  3000: 'Muy lento',
  2000: 'Lento',
  1200: 'Normal',
  800: 'Rápida',
  500: 'Turbo'
};

// --- Estado ---
let state = {
  baraja: [],
  cantados: [],
  indice: 0,
  jugando: false,
  pausado: false,
  voz: 'default',
  velocidad: 1200,
  tonterias: 'si',
  // Descans
  descansEach: 15,     // cada X boles (0 = desactivat)
  descansDurada: 5,    // segons de barreja
  // Punts
  puntosLinea: 1,
  puntosBingo: 3,
  // Sistema de monedes
  saldoInicial: 100,
  preuCartro: 5,
  pctLinea: 30,       // % del pot per línia
  potActual: 0,       // pot de la partida en curs
  jugadores: [],
  partidaEnCurso: false,
  tema: 'claro'
};

let timer = null;
let audioDesbloqueado = false;

// Audio reutilitzable per iOS - un únic element desbloquejat amb gest d'usuari
const audioElement = new Audio();
audioElement.setAttribute('playsinline', '');
let audioCtx = null;

// --- Elementos DOM ---
const $ = id => document.getElementById(id);

const els = {
  pantallaSetup: $('pantallaSetup'),
  pantallaJuego: $('pantallaJuego'),
  setupJugadores: $('setupJugadores'),
  inputNuevoJugador: $('inputNuevoJugador'),
  btnAddJugador: $('btnAddJugador'),
  btnEmpezar: $('btnEmpezar'),
  zonaNumero: $('zonaNumero'),
  bolaActual: $('bolaActual'),
  numeroActual: $('numeroActual'),
  contadorBolas: $('contadorBolas'),
  historial: $('historial'),
  tablero: $('tablero'),
  controles: $('controles'),
  botonesEvento: $('botonesEvento'),
  btnInicio: $('btnInicio'),
  btnPausa: $('btnPausa'),
  btnReset: $('btnReset'),
  btnLinea: $('btnLinea'),
  btnBingo: $('btnBingo'),
  modalJugador: $('modalJugador'),
  modalTitulo: $('modalTitulo'),
  modalJugadores: $('modalJugadores'),
  modalConfirmar: $('modalConfirmar'),
  modalCancelar: $('modalCancelar'),
  bodyClasificacion: $('bodyClasificacion'),
  btnResetClasificacion: $('btnResetClasificacion'),
  selectVelocidad: $('selectVelocidad'),
  selectTonterias: $('selectTonterias'),
  puntosLineaVal: $('puntosLineaVal'),
  puntosBingoVal: $('puntosBingoVal'),
  configJugadores: $('configJugadores'),
  inputAddJugadorConfig: $('inputAddJugadorConfig'),
  btnAddJugadorConfig: $('btnAddJugadorConfig'),
  btnBorrarDatos: $('btnBorrarDatos'),
  btnTema: $('btnTema'),
  confeti: $('confeti'),
  barraVerificacion: $('barraVerificacion'),
  verificacionTexto: $('verificacionTexto'),
  btnVerificacionOk: $('btnVerificacionOk'),
  btnVerificacionCancel: $('btnVerificacionCancel'),
  pantallaCompra: $('pantallaCompra'),
  compraPreuCartro: $('compraPreuCartro'),
  compraJugadors: $('compraJugadors'),
  compraPot: $('compraPot'),
  compraPotLinea: $('compraPotLinea'),
  compraPotBingo: $('compraPotBingo'),
  btnCompraOk: $('btnCompraOk'),
  puntosLineaVal: $('puntosLineaVal'),
  puntosBingoVal: $('puntosBingoVal'),
  saldoInicialVal: $('saldoInicialVal'),
  preuCartroVal: $('preuCartroVal'),
  pctLineaVal: $('pctLineaVal'),
  pctBingoVal: $('pctBingoVal'),
  selectDescans: $('selectDescans'),
  selectDescansDurada: $('selectDescansDurada')
};

// --- LocalStorage ---
function guardar() {
  localStorage.setItem('bingo_state', JSON.stringify(state));
}

function cargar() {
  const data = localStorage.getItem('bingo_state');
  if (data) {
    const saved = JSON.parse(data);
    Object.assign(state, saved);
    return true;
  }
  return false;
}

// --- Tema ---
function initTema() {
  if (!state.tema) {
    state.tema = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
  }
  document.documentElement.setAttribute('data-tema', state.tema);
}

function toggleTema() {
  state.tema = state.tema === 'oscuro' ? 'claro' : 'oscuro';
  document.documentElement.setAttribute('data-tema', state.tema);
  guardar();
}

// --- Fisher-Yates shuffle ---
function barajar() {
  const arr = [];
  for (let i = 1; i <= 90; i++) arr.push(i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// --- Tablero ---
function crearTablero() {
  els.tablero.innerHTML = '';
  // Columnes: 1-10, Files: per desenes (1,11,21... / 2,12,22... / ... / 10,20,30...)
  for (let fila = 0; fila < 9; fila++) {
    for (let col = 1; col <= 10; col++) {
      const n = fila * 10 + col;
      const celda = document.createElement('div');
      celda.className = 'celda';
      celda.textContent = n;
      celda.dataset.num = n;
      els.tablero.appendChild(celda);
    }
  }
}

function marcarTablero(num) {
  // Quitar clase ultima de la anterior
  const prev = els.tablero.querySelector('.ultima');
  if (prev) prev.classList.remove('ultima');

  const celda = els.tablero.querySelector(`[data-num="${num}"]`);
  if (celda) {
    celda.classList.add('marcada', 'ultima');
  }
}

function restaurarTablero() {
  state.cantados.forEach(num => {
    const celda = els.tablero.querySelector(`[data-num="${num}"]`);
    if (celda) celda.classList.add('marcada');
  });
  if (state.cantados.length > 0) {
    const ultimo = state.cantados[state.cantados.length - 1];
    const celda = els.tablero.querySelector(`[data-num="${ultimo}"]`);
    if (celda) celda.classList.add('ultima');
  }
}

// --- Audio ---
function desbloquearAudio() {
  if (audioDesbloqueado) return;
  // Desbloquear AudioContext
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const buf = audioCtx.createBuffer(1, 1, 22050);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  src.connect(audioCtx.destination);
  src.start(0);
  if (audioCtx.state === 'suspended') audioCtx.resume();
  // Desbloquear l'element Audio reutilitzable (iOS requereix play() dins gest d'usuari)
  audioElement.muted = true;
  audioElement.src = `audio/voz1/1.mp3`;
  audioElement.play().then(() => {
    audioElement.pause();
    audioElement.currentTime = 0;
    audioElement.muted = false;
  }).catch(() => { audioElement.muted = false; });
  // Inicialitzar speechSynthesis
  if (window.speechSynthesis) {
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    speechSynthesis.speak(u);
  }
  audioDesbloqueado = true;
}

function hablarNumero(num) {
  return new Promise(resolve => {
    if (state.voz === 'default') {
      if (!window.speechSynthesis) { resolve(); return; }
      const u = new SpeechSynthesisUtterance(String(num));
      u.lang = 'es-ES';
      u.rate = 0.9;
      const voces = speechSynthesis.getVoices();
      const vozES = voces.find(v => v.lang.startsWith('es'));
      if (vozES) u.voice = vozES;
      u.onend = resolve;
      u.onerror = resolve;
      speechSynthesis.speak(u);
    } else {
      playAudio(`audio/${state.voz}/${num}.mp3`).then(resolve);
    }
  });
}

function hablarTexto(texto) {
  return new Promise(resolve => {
    if (state.voz === 'default') {
      if (!window.speechSynthesis) { resolve(); return; }
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = 'es-ES';
      u.rate = 0.9;
      const voces = speechSynthesis.getVoices();
      const vozES = voces.find(v => v.lang.startsWith('es'));
      if (vozES) u.voice = vozES;
      u.onend = resolve;
      u.onerror = resolve;
      speechSynthesis.speak(u);
    } else {
      resolve();
    }
  });
}

function hablarLinea() {
  return new Promise(resolve => {
    if (state.voz === 'default') {
      hablarTexto('Jugamos para Bingo!').then(resolve);
    } else {
      playAudio(`audio/${state.voz}/linia.mp3`).then(resolve);
    }
  });
}

function hablarBingo() {
  return new Promise(resolve => {
    if (state.voz === 'default') {
      hablarTexto('Bingo!').then(resolve);
    } else {
      playAudio(`audio/${state.voz}/bingo.mp3`).then(resolve);
    }
  });
}

function generarWavBarreja(duration) {
  const sr = 22050;
  const len = Math.floor(sr * duration);
  const samples = new Float32Array(len);

  // Pre-generar events de xoc
  const xocs = [];
  let t = 0.05;
  while (t < duration - 0.3) {
    const velocitat = 0.6 + 0.4 * Math.sin(t * Math.PI * 2 / duration * 3);
    const gap = (0.01 + Math.random() * 0.06) / velocitat;
    xocs.push({
      t, pitch: 800 + Math.random() * 2000,
      vol: 0.15 + Math.random() * 0.35,
      decay: 0.003 + Math.random() * 0.008
    });
    t += gap;
  }

  for (let i = 0; i < len; i++) {
    const t = i / sr;
    let s = 0;
    const fraccio = 0.6 + 0.4 * Math.sin(t * Math.PI * 2 / duration * 3);
    s += (Math.random() * 2 - 1) * 0.04 * fraccio;
    for (const x of xocs) {
      const dt = t - x.t;
      if (dt < 0 || dt > 0.03) continue;
      const env = Math.exp(-dt / x.decay);
      s += (Math.random() * 2 - 1) * env * x.vol;
      s += Math.sin(dt * x.pitch * Math.PI * 2) * env * x.vol * 0.3;
    }
    let vol = 1;
    if (t < 0.15) vol = t / 0.15;
    if (t > duration - 0.3) vol = (duration - t) / 0.3;
    samples[i] = Math.max(-1, Math.min(1, s * vol * 2.5));
  }

  // Codificar com WAV
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const writeStr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

function reproducirDescans() {
  const wavUrl = generarWavBarreja(state.descansDurada);
  return playAudio(wavUrl).then(() => URL.revokeObjectURL(wavUrl));
}

// --- Sistema de tonterías ---
let tonteriasUsadas = {}; // { 'ruta': vegadesUsades }

function resetTonterias() {
  tonteriasUsadas = {};
}

function playAudio(src) {
  return new Promise(resolve => {
    audioElement.onended = () => { audioElement.onended = null; audioElement.onerror = null; resolve(); };
    audioElement.onerror = () => { audioElement.onended = null; audioElement.onerror = null; resolve(); };
    audioElement.src = src;
    audioElement.currentTime = 0;
    audioElement.play().catch(resolve);
  });
}

async function executarTonterias(num) {
  if (state.tonterias !== 'si') return;

  // Excepció 44: sona numeros/44 + miguel_callate (únic cas amb 2 àudios)
  if (num === 44) {
    await playAudio('audio/tonterias/numeros/44.mp3');
    await playAudio('audio/tonterias/aleatorios/miguel_callate.mp3');
    return;
  }

  // Per la resta: màxim 1 àudio de tonteria per número

  // 1. Número exacte (prioritat màxima)
  if (TONTERIAS.numeros.includes(num)) {
    await playAudio(`audio/tonterias/numeros/${num}.mp3`);
    return;
  }

  // 2. Unidades: 2 cops per partida, quan la unitat coincideix (amb excepcions)
  const unitat = num % 10;
  for (const u of TONTERIAS.unidades) {
    if (unitat !== u) continue;
    const excepcions = TONTERIAS.unidadesExcepcions[u] || [];
    if (excepcions.includes(num)) continue;
    const key = `unidades/${u}`;
    const usat = tonteriasUsadas[key] || 0;
    if (usat < 2 && Math.random() < 0.25) {
      tonteriasUsadas[key] = usat + 1;
      await playAudio(`audio/tonterias/unidades/${u}.mp3`);
      return;
    }
  }

  // 3. Aleatoris: a partir de la bola 25, màxim 3 per partida, mínim 8 boles entre ells
  const aleatorisUsats = tonteriasUsadas._aleatorisTotal || 0;
  const ultimaBolaAleatori = tonteriasUsadas._ultimaBolaAleatori || 0;
  if (state.indice >= 25 && aleatorisUsats < TONTERIAS.maxAleatoris && (state.indice - ultimaBolaAleatori) >= 8 && Math.random() < 0.25) {
    const disponibles = TONTERIAS.aleatorios.filter(nom => !tonteriasUsadas[`aleatorios/${nom}`]);
    if (disponibles.length > 0) {
      const escollit = disponibles[Math.floor(Math.random() * disponibles.length)];
      tonteriasUsadas[`aleatorios/${escollit}`] = 1;
      tonteriasUsadas._aleatorisTotal = aleatorisUsats + 1;
      tonteriasUsadas._ultimaBolaAleatori = state.indice;
      await playAudio(`audio/tonterias/aleatorios/${escollit}.mp3`);
    }
  }
}

// --- Historial ---
function renderHistorial() {
  els.historial.innerHTML = '';
  // Mostrar últimos 10 (sin el actual que se muestra en la bola)
  const ultimos = state.cantados.slice(-10);
  ultimos.forEach(num => {
    const bola = document.createElement('div');
    bola.className = 'historial-bola';
    bola.textContent = num;
    els.historial.appendChild(bola);
  });
}

// --- Jugadores ---
function addJugador(nombre) {
  nombre = nombre.trim();
  if (!nombre) return false;
  if (state.jugadores.find(j => j.nombre.toLowerCase() === nombre.toLowerCase())) return false;
  state.jugadores.push({ nombre, puntos: 0, saldo: state.saldoInicial, lineas: 0, bingos: 0, cartrons: 0 });
  guardar();
  return true;
}

function removeJugador(nombre) {
  state.jugadores = state.jugadores.filter(j => j.nombre !== nombre);
  guardar();
}

function renderSetupJugadores() {
  els.setupJugadores.innerHTML = '';
  state.jugadores.forEach(j => {
    const chip = document.createElement('div');
    chip.className = 'chip-jugador';
    chip.innerHTML = `${j.nombre} <button class="chip-remove" data-nombre="${j.nombre}">&times;</button>`;
    els.setupJugadores.appendChild(chip);
  });
  els.btnEmpezar.disabled = state.jugadores.length === 0;
}

function renderConfigJugadores() {
  els.configJugadores.innerHTML = '';
  state.jugadores.forEach(j => {
    const chip = document.createElement('div');
    chip.className = 'chip-jugador';
    chip.innerHTML = `${j.nombre} <button class="chip-remove" data-nombre="${j.nombre}">&times;</button>`;
    els.configJugadores.appendChild(chip);
  });
}

// --- Clasificación ---
let ordenClasificacion = 'saldo'; // 'saldo' o 'puntos'

function renderClasificacion() {
  const sorted = [...state.jugadores].sort((a, b) => {
    if (ordenClasificacion === 'saldo') {
      if (b.saldo !== a.saldo) return b.saldo - a.saldo;
    } else {
      if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    }
    return b.bingos - a.bingos;
  });

  els.bodyClasificacion.innerHTML = '';
  sorted.forEach((j, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${j.nombre}</td>
      <td>${j.puntos}</td>
      <td>${Math.round(j.saldo * 100) / 100}</td>
      <td>${j.lineas}</td>
      <td>${j.bingos}</td>
    `;
    els.bodyClasificacion.appendChild(tr);
  });

  // Actualitzar botons d'ordre
  const btnSaldo = document.getElementById('btnOrdenSaldo');
  const btnPuntos = document.getElementById('btnOrdenPuntos');
  if (btnSaldo && btnPuntos) {
    btnSaldo.className = 'btn btn-small ' + (ordenClasificacion === 'saldo' ? 'btn-primary' : 'btn-secondary');
    btnPuntos.className = 'btn btn-small ' + (ordenClasificacion === 'puntos' ? 'btn-primary' : 'btn-secondary');
  }
}

// --- Modal jugador ---
let modalCallback = null;

function abrirModal(titulo, callback) {
  els.modalTitulo.textContent = titulo;
  els.modalJugadores.innerHTML = '';

  state.jugadores.forEach(j => {
    const btn = document.createElement('button');
    btn.className = 'modal-jugador';
    btn.textContent = j.nombre;
    btn.dataset.nombre = j.nombre;
    btn.addEventListener('click', () => {
      btn.classList.toggle('seleccionado');
      const seleccionados = els.modalJugadores.querySelectorAll('.seleccionado');
      els.modalConfirmar.disabled = seleccionados.length === 0;
    });
    els.modalJugadores.appendChild(btn);
  });

  els.modalConfirmar.disabled = true;
  modalCallback = callback;
  els.modalJugador.classList.remove('oculto');
}

function cerrarModal() {
  els.modalJugador.classList.add('oculto');
  modalCallback = null;
}

function confirmarModal() {
  const seleccionados = Array.from(els.modalJugadores.querySelectorAll('.seleccionado'))
    .map(btn => btn.dataset.nombre);
  const cb = modalCallback;
  cerrarModal();
  if (cb) cb(seleccionados);
}

// --- Confeti ---
function lanzarConfeti() {
  els.confeti.classList.remove('oculto');
  els.confeti.innerHTML = '';
  const colores = ['#e94560', '#ff9800', '#4caf50', '#2196f3', '#9c27b0', '#ffeb3b'];

  for (let i = 0; i < 80; i++) {
    const pieza = document.createElement('div');
    pieza.className = 'confeti-pieza';
    pieza.style.left = Math.random() * 100 + '%';
    pieza.style.background = colores[Math.floor(Math.random() * colores.length)];
    pieza.style.animationDelay = Math.random() * 2 + 's';
    pieza.style.animationDuration = (2 + Math.random() * 2) + 's';
    pieza.style.width = (6 + Math.random() * 8) + 'px';
    pieza.style.height = (6 + Math.random() * 8) + 'px';
    pieza.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    els.confeti.appendChild(pieza);
  }

  setTimeout(() => {
    els.confeti.classList.add('oculto');
    els.confeti.innerHTML = '';
  }, 4000);
}

// --- Lógica del juego ---
async function cantarSiguiente() {
  if (state.indice >= 90) {
    detenerJuego();
    return;
  }

  const num = state.baraja[state.indice];
  state.cantados.push(num);
  state.indice++;

  // Actualizar UI
  els.numeroActual.textContent = num;
  els.contadorBolas.textContent = `Bola ${state.indice} de 90`;

  // Animación
  els.bolaActual.classList.remove('pulso');
  void els.bolaActual.offsetWidth; // reflow
  els.bolaActual.classList.add('pulso');

  marcarTablero(num);
  renderHistorial();
  guardar();

  // Hablar número
  await hablarNumero(num);

  // Tonterías
  await executarTonterias(num);

  // Mini descans cada X boles
  if (state.descansEach > 0 && state.indice > 0 && state.indice % state.descansEach === 0 && state.indice < 90) {
    await reproducirDescans();
  }

  // Programar siguiente
  if (state.jugando && !state.pausado) {
    timer = setTimeout(cantarSiguiente, state.velocidad);
  }
}

async function iniciarJuego() {
  desbloquearAudio();

  const esNueva = !state.partidaEnCurso;

  if (esNueva) {
    // Nueva partida
    state.baraja = barajar();
    state.cantados = [];
    state.indice = 0;
    state.partidaEnCurso = true;

    // Limpiar tablero
    els.tablero.querySelectorAll('.celda').forEach(c => {
      c.classList.remove('marcada', 'ultima');
    });
    els.historial.innerHTML = '';
    els.numeroActual.textContent = '--';
    resetTonterias();
  }

  state.jugando = true;
  state.pausado = false;
  actualizarBotones();
  guardar();

  if (esNueva) {
    if (state.voz === 'default') {
      await hablarTexto('Empezamos la partida');
    } else {
      await playAudio(`audio/${state.voz}/inicio.mp3`);
    }
  }

  cantarSiguiente();
}

function pausarJuego() {
  state.pausado = true;
  state.jugando = false;
  clearTimeout(timer);
  actualizarBotones();
  guardar();
}

function detenerJuego() {
  state.jugando = false;
  state.pausado = false;
  state.partidaEnCurso = false;
  clearTimeout(timer);
  actualizarBotones();
  guardar();
}

function resetPartida() {
  if (state.partidaEnCurso || state.cantados.length > 0) {
    if (!confirm('¿Resetear la partida actual?')) return;
  }

  clearTimeout(timer);
  state.baraja = [];
  state.cantados = [];
  state.indice = 0;
  state.jugando = false;
  state.pausado = false;
  state.partidaEnCurso = false;

  els.numeroActual.textContent = '--';
  els.contadorBolas.textContent = 'Prem INICI';
  els.historial.innerHTML = '';
  els.tablero.querySelectorAll('.celda').forEach(c => {
    c.classList.remove('marcada', 'ultima');
  });

  actualizarBotones();
  guardar();
}

function actualizarBotones() {
  const enJuego = state.jugando && !state.pausado;
  const enPausa = state.partidaEnCurso && state.pausado;

  els.btnInicio.disabled = enJuego;
  els.btnInicio.textContent = state.partidaEnCurso ? 'Continuar' : 'Inici';
  els.btnPausa.disabled = !enJuego;
  els.btnLinea.disabled = !state.partidaEnCurso;
  els.btnBingo.disabled = !state.partidaEnCurso;
}

// --- Tabs ---
function cambiarTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.add('oculto'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('activa'));
  document.getElementById(tabId).classList.remove('oculto');
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('activa');
}


// --- Inicializar config UI ---
function syncConfigUI() {
  els.selectVelocidad.value = state.velocidad;
  els.selectTonterias.value = state.tonterias;
  els.puntosLineaVal.textContent = state.puntosLinea;
  els.puntosBingoVal.textContent = state.puntosBingo;
  els.saldoInicialVal.textContent = state.saldoInicial;
  els.preuCartroVal.textContent = state.preuCartro;
  els.pctLineaVal.textContent = state.pctLinea + '%';
  els.pctBingoVal.textContent = (100 - state.pctLinea) + '%';
  els.selectDescans.value = state.descansEach;
  els.selectDescansDurada.value = state.descansDurada;
}

// --- Compra de cartrons ---
let compraCartrons = {}; // { nombre: numCartrons }

function ocultarZonaJoc(amagar) {
  const zones = [els.zonaNumero, els.historial, els.tablero, els.controles, els.botonesEvento];
  zones.forEach(el => { if (el) el.classList.toggle('oculto', amagar); });
}

function mostrarPantallaCompra() {
  compraCartrons = {};
  state.jugadores.forEach(j => { compraCartrons[j.nombre] = 0; });

  els.compraPreuCartro.textContent = state.preuCartro;
  renderCompra();
  ocultarZonaJoc(true);
  els.pantallaCompra.classList.remove('oculto');
  els.btnInicio.disabled = true;
}

function renderCompra() {
  els.compraJugadors.innerHTML = '';
  let potTotal = 0;

  state.jugadores.forEach(j => {
    const n = compraCartrons[j.nombre] || 0;
    const cost = n * state.preuCartro;
    potTotal += cost;
    const maxCartrons = Math.floor(j.saldo / state.preuCartro);

    const div = document.createElement('div');
    div.className = 'compra-jugador';
    div.innerHTML = `
      <span class="compra-jugador-nom">${j.nombre}</span>
      <span class="compra-jugador-saldo">${j.saldo} mon.</span>
      <div class="compra-jugador-controls">
        <button class="btn btn-small" data-compra="${j.nombre}" data-dir="-1" ${n <= 0 ? 'disabled' : ''}>-</button>
        <span>${n}</span>
        <button class="btn btn-small" data-compra="${j.nombre}" data-dir="1" ${n >= maxCartrons ? 'disabled' : ''}>+</button>
      </div>
    `;
    els.compraJugadors.appendChild(div);
  });

  els.compraPot.textContent = potTotal;
  els.compraPotLinea.textContent = Math.round(potTotal * state.pctLinea / 100 * 100) / 100;
  els.compraPotBingo.textContent = Math.round(potTotal * (100 - state.pctLinea) / 100 * 100) / 100;
  els.btnCompraOk.disabled = potTotal === 0;
}

function confirmarCompra() {
  let potTotal = 0;
  state.jugadores.forEach(j => {
    const n = compraCartrons[j.nombre] || 0;
    const cost = n * state.preuCartro;
    j.saldo -= cost;
    j.cartrons = n;
    potTotal += cost;
  });
  state.potActual = potTotal;
  els.pantallaCompra.classList.add('oculto');
  ocultarZonaJoc(false);
  guardar();
  iniciarJuego();
}

// --- Eventos ---
function initEventos() {
  // Desbloquejar àudio amb el primer toc/clic (iOS ho requereix)
  const desbloquearAlToc = () => {
    desbloquearAudio();
    document.removeEventListener('touchstart', desbloquearAlToc);
    document.removeEventListener('click', desbloquearAlToc);
  };
  document.addEventListener('touchstart', desbloquearAlToc, { once: true });
  document.addEventListener('click', desbloquearAlToc, { once: true });

  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => cambiarTab(tab.dataset.tab));
  });

  // Tema
  els.btnTema.addEventListener('click', toggleTema);

  // Setup - añadir jugador
  function addJugadorSetup() {
    if (addJugador(els.inputNuevoJugador.value)) {
      els.inputNuevoJugador.value = '';
      renderSetupJugadores();
    }
  }
  els.btnAddJugador.addEventListener('click', addJugadorSetup);
  els.inputNuevoJugador.addEventListener('keydown', e => {
    if (e.key === 'Enter') addJugadorSetup();
  });

  // Setup - eliminar jugador
  els.setupJugadores.addEventListener('click', e => {
    if (e.target.classList.contains('chip-remove')) {
      removeJugador(e.target.dataset.nombre);
      renderSetupJugadores();
    }
  });

  // Setup - empezar
  els.btnEmpezar.addEventListener('click', () => {
    els.pantallaSetup.classList.add('oculto');
    els.pantallaJuego.classList.remove('oculto');
    renderClasificacion();
    renderConfigJugadores();
    guardar();
    if (!state.partidaEnCurso) {
      mostrarPantallaCompra();
    }
  });

  // Controles
  els.btnInicio.addEventListener('click', () => {
    if (!state.partidaEnCurso) {
      mostrarPantallaCompra();
    } else {
      iniciarJuego();
    }
  });

  // Compra cartrons
  els.compraJugadors.addEventListener('click', e => {
    const btn = e.target.closest('[data-compra]');
    if (!btn || btn.disabled) return;
    const nombre = btn.dataset.compra;
    const dir = parseInt(btn.dataset.dir);
    compraCartrons[nombre] = Math.max(0, (compraCartrons[nombre] || 0) + dir);
    renderCompra();
  });

  els.btnCompraOk.addEventListener('click', confirmarCompra);
  els.btnPausa.addEventListener('click', pausarJuego);
  els.btnReset.addEventListener('click', resetPartida);

  // --- Verificació en 2 passos ---
  let verificacionTipo = null;
  let verificacionEstabaJugando = false;

  function mostrarVerificacion(tipo) {
    verificacionTipo = tipo;
    verificacionEstabaJugando = state.jugando;
    if (state.jugando) pausarJuego();

    els.verificacionTexto.textContent = tipo === 'linea'
      ? 'LINEA! Verifica els numeros a la quadricula'
      : 'BINGO! Verifica els numeros a la quadricula';
    els.barraVerificacion.classList.remove('oculto');
    els.btnLinea.disabled = true;
    els.btnBingo.disabled = true;
  }

  function tancarVerificacio() {
    els.barraVerificacion.classList.add('oculto');
    verificacionTipo = null;
    actualizarBotones();
  }

  els.btnLinea.addEventListener('click', () => mostrarVerificacion('linea'));
  els.btnBingo.addEventListener('click', () => mostrarVerificacion('bingo'));

  els.btnVerificacionOk.addEventListener('click', () => {
    const tipo = verificacionTipo;
    const estabaJugando = verificacionEstabaJugando;
    tancarVerificacio();

    if (tipo === 'linea') {
      const premiLinea = state.potActual * state.pctLinea / 100;
      abrirModal('Qui canta LINEA?', async (jugadores) => {
        const saldoPerPersona = premiLinea / jugadores.length;
        const puntsPerPersona = state.puntosLinea / jugadores.length;
        jugadores.forEach(nombre => {
          const j = state.jugadores.find(x => x.nombre === nombre);
          if (j) {
            j.lineas++;
            j.saldo += saldoPerPersona;
            j.puntos += puntsPerPersona;
          }
        });
        renderClasificacion();
        guardar();
        await hablarLinea();
        if (estabaJugando) iniciarJuego();
      });
    } else {
      const premiBingo = state.potActual * (100 - state.pctLinea) / 100;
      abrirModal('Qui canta BINGO?', async (jugadores) => {
        const saldoPerPersona = premiBingo / jugadores.length;
        const puntsPerPersona = state.puntosBingo / jugadores.length;
        jugadores.forEach(nombre => {
          const j = state.jugadores.find(x => x.nombre === nombre);
          if (j) {
            j.bingos++;
            j.saldo += saldoPerPersona;
            j.puntos += puntsPerPersona;
          }
        });
        renderClasificacion();
        guardar();
        lanzarConfeti();
        detenerJuego();
      });
    }
  });

  els.btnVerificacionCancel.addEventListener('click', () => {
    const estabaJugando = verificacionEstabaJugando;
    tancarVerificacio();
    if (estabaJugando) iniciarJuego();
  });

  // Modal
  els.modalConfirmar.addEventListener('click', confirmarModal);
  els.modalCancelar.addEventListener('click', () => {
    cerrarModal();
    // Si estaba jugando, reanudar
    if (state.partidaEnCurso && !state.jugando) {
      // No reanudar automáticamente al cancelar
    }
  });

  // Clasificación - orden
  document.getElementById('btnOrdenSaldo').addEventListener('click', () => {
    ordenClasificacion = 'saldo';
    renderClasificacion();
  });
  document.getElementById('btnOrdenPuntos').addEventListener('click', () => {
    ordenClasificacion = 'puntos';
    renderClasificacion();
  });

  // Clasificación reset
  els.btnResetClasificacion.addEventListener('click', () => {
    if (!confirm('Resetear classificació? Tots els jugadors tornaran al saldo inicial i 0 punts.')) return;
    state.jugadores.forEach(j => {
      j.saldo = state.saldoInicial;
      j.puntos = 0;
      j.lineas = 0;
      j.bingos = 0;
    });
    renderClasificacion();
    guardar();
  });

  // Config - descans
  els.selectDescans.addEventListener('change', () => {
    state.descansEach = parseInt(els.selectDescans.value);
    guardar();
  });

  els.selectDescansDurada.addEventListener('change', () => {
    state.descansDurada = parseInt(els.selectDescansDurada.value);
    guardar();
  });

  // Config - velocidad
  els.selectVelocidad.addEventListener('change', () => {
    state.velocidad = parseInt(els.selectVelocidad.value);
    guardar();
  });

  // Config - tonterías
  els.selectTonterias.addEventListener('change', () => {
    state.tonterias = els.selectTonterias.value;
    guardar();
  });

  // Config - monedes
  document.querySelectorAll('[data-config]').forEach(btn => {
    btn.addEventListener('click', () => {
      const camp = btn.dataset.config;
      const dir = parseInt(btn.dataset.dir);
      if (camp === 'saldoInicial') {
        state.saldoInicial = Math.max(10, state.saldoInicial + dir);
        els.saldoInicialVal.textContent = state.saldoInicial;
        if (!state.partidaEnCurso) {
          state.jugadores.forEach(j => { j.saldo = state.saldoInicial; });
        }
      } else if (camp === 'puntosLinea') {
        state.puntosLinea = Math.max(0, state.puntosLinea + dir);
        els.puntosLineaVal.textContent = state.puntosLinea;
      } else if (camp === 'puntosBingo') {
        state.puntosBingo = Math.max(0, state.puntosBingo + dir);
        els.puntosBingoVal.textContent = state.puntosBingo;
      } else if (camp === 'preuCartro') {
        state.preuCartro = Math.max(1, state.preuCartro + dir);
        els.preuCartroVal.textContent = state.preuCartro;
      } else if (camp === 'pctLinea') {
        state.pctLinea = Math.max(0, Math.min(100, state.pctLinea + dir));
        els.pctLineaVal.textContent = state.pctLinea + '%';
        els.pctBingoVal.textContent = (100 - state.pctLinea) + '%';
      }
      guardar();
      if (!els.pantallaCompra.classList.contains('oculto')) {
        els.compraPreuCartro.textContent = state.preuCartro;
        compraCartrons = {};
        state.jugadores.forEach(j => { compraCartrons[j.nombre] = 0; });
        renderCompra();
      }
    });
  });

  // Config - añadir jugador
  function addJugadorConfig() {
    if (addJugador(els.inputAddJugadorConfig.value)) {
      els.inputAddJugadorConfig.value = '';
      renderConfigJugadores();
      renderClasificacion();
    }
  }
  els.btnAddJugadorConfig.addEventListener('click', addJugadorConfig);
  els.inputAddJugadorConfig.addEventListener('keydown', e => {
    if (e.key === 'Enter') addJugadorConfig();
  });

  // Config - eliminar jugador
  els.configJugadores.addEventListener('click', e => {
    if (e.target.classList.contains('chip-remove')) {
      if (!confirm(`Eliminar ${e.target.dataset.nombre}?`)) return;
      removeJugador(e.target.dataset.nombre);
      renderConfigJugadores();
      renderClasificacion();
    }
  });

  // Borrar datos
  els.btnBorrarDatos.addEventListener('click', () => {
    if (!confirm('Esborrar TOTES les dades? Es perdran jugadors, classificació i la partida actual.')) return;
    localStorage.removeItem('bingo_state');
    location.reload();
  });

  // Precargar voces del sistema
  if (window.speechSynthesis) {
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
    speechSynthesis.getVoices();
  }
}

// --- Init ---
function init() {
  const teniaDatos = cargar();
  initTema();
  crearTablero();

  if (teniaDatos && state.jugadores.length > 0) {
    // Restaurar partida
    els.pantallaSetup.classList.add('oculto');
    els.pantallaJuego.classList.remove('oculto');

    syncConfigUI();
    renderConfigJugadores();
    renderClasificacion();

    if (state.partidaEnCurso) {
      ocultarZonaJoc(false);
      restaurarTablero();
      renderHistorial();
      if (state.cantados.length > 0) {
        els.numeroActual.textContent = state.cantados[state.cantados.length - 1];
        els.contadorBolas.textContent = `Bola ${state.indice} de 90`;
      }
      // No auto-reanudar, dejar en pausa
      state.jugando = false;
      state.pausado = true;
    } else {
      mostrarPantallaCompra();
    }

    actualizarBotones();
  } else {
    renderSetupJugadores();
  }

  initEventos();
}

document.addEventListener('DOMContentLoaded', init);
