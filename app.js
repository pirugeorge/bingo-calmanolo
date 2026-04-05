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

// Tonterías: archivos audio/tonterias/1.mp3, 2.mp3, etc.
const NUM_TONTERIAS = 0; // Cambiar al número de archivos de tonterías disponibles

const VELOCIDADES = {
  3000: 'Muy lento',
  2000: 'Lento',
  1200: 'Normal',
  800: 'Rápida',
  500: 'Turbo'
};

const PROB_TONTERIAS = {
  sin: 0,
  alguna: 0.15,
  muchas: 0.40
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
  tonterias: 'sin',
  puntosLinea: 1,
  puntosBingo: 3,
  jugadores: [],
  partidaEnCurso: false,
  tema: null
};

let timer = null;
let audioDesbloqueado = false;

// --- Elementos DOM ---
const $ = id => document.getElementById(id);

const els = {
  pantallaSetup: $('pantallaSetup'),
  pantallaJuego: $('pantallaJuego'),
  setupJugadores: $('setupJugadores'),
  inputNuevoJugador: $('inputNuevoJugador'),
  btnAddJugador: $('btnAddJugador'),
  btnEmpezar: $('btnEmpezar'),
  bolaActual: $('bolaActual'),
  numeroActual: $('numeroActual'),
  contadorBolas: $('contadorBolas'),
  historial: $('historial'),
  tablero: $('tablero'),
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
  selectVoz: $('selectVoz'),
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
  btnVerificacionCancel: $('btnVerificacionCancel')
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
  // Crear y reproducir un audio silencioso para desbloquear en móvil
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const buf = ctx.createBuffer(1, 1, 22050);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);
  // También inicializar speechSynthesis
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
      const audio = new Audio(`audio/${state.voz}/${num}.mp3`);
      audio.onended = resolve;
      audio.onerror = resolve;
      audio.play().catch(resolve);
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
      const audio = new Audio(`audio/${state.voz}/linia.mp3`);
      audio.onended = resolve;
      audio.onerror = resolve;
      audio.play().catch(resolve);
    }
  });
}

function hablarBingo() {
  return new Promise(resolve => {
    if (state.voz === 'default') {
      hablarTexto('Bingo!').then(resolve);
    } else {
      const audio = new Audio(`audio/${state.voz}/bingo.mp3`);
      audio.onended = resolve;
      audio.onerror = resolve;
      audio.play().catch(resolve);
    }
  });
}

function reproducirTonteria() {
  return new Promise(resolve => {
    if (NUM_TONTERIAS === 0) { resolve(); return; }
    const n = Math.floor(Math.random() * NUM_TONTERIAS) + 1;
    const audio = new Audio(`audio/tonterias/${n}.mp3`);
    audio.onended = resolve;
    audio.onerror = resolve;
    audio.play().catch(resolve);
  });
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
  state.jugadores.push({ nombre, puntos: 0, lineas: 0, bingos: 0 });
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
function renderClasificacion() {
  const sorted = [...state.jugadores].sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    return b.bingos - a.bingos;
  });

  els.bodyClasificacion.innerHTML = '';
  sorted.forEach((j, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${j.nombre}</td>
      <td>${j.puntos}</td>
      <td>${j.lineas}</td>
      <td>${j.bingos}</td>
    `;
    els.bodyClasificacion.appendChild(tr);
  });
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
  const prob = PROB_TONTERIAS[state.tonterias] || 0;
  if (prob > 0 && NUM_TONTERIAS > 0 && Math.random() < prob) {
    await reproducirTonteria();
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
  }

  state.jugando = true;
  state.pausado = false;
  actualizarBotones();
  guardar();

  if (esNueva) {
    if (state.voz === 'default') {
      await hablarTexto('Empezamos la partida');
    } else {
      await new Promise(resolve => {
        const audio = new Audio(`audio/${state.voz}/inicio.mp3`);
        audio.onended = resolve;
        audio.onerror = resolve;
        audio.play().catch(resolve);
      });
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
  els.contadorBolas.textContent = 'Pulsa INICIO';
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
  els.btnInicio.textContent = state.partidaEnCurso ? 'Continuar' : 'Inicio';
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

// --- Voces: cargar opciones ---
function cargarVoces() {
  // Limpiar y añadir predeterminadas
  els.selectVoz.innerHTML = '<option value="default">Predeterminada</option>';

  // Añadir voces grabadas
  VOCES_GRABADAS.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = v.nombre;
    els.selectVoz.appendChild(opt);
  });

  els.selectVoz.value = state.voz;
}

// --- Inicializar config UI ---
function syncConfigUI() {
  els.selectVoz.value = state.voz;
  els.selectVelocidad.value = state.velocidad;
  els.selectTonterias.value = state.tonterias;
  els.puntosLineaVal.textContent = state.puntosLinea;
  els.puntosBingoVal.textContent = state.puntosBingo;
}

// --- Eventos ---
function initEventos() {
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
  });

  // Controles
  els.btnInicio.addEventListener('click', iniciarJuego);
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
      abrirModal('Qui canta LINEA?', async (jugadores) => {
        jugadores.forEach(nombre => {
          const j = state.jugadores.find(x => x.nombre === nombre);
          if (j) {
            j.lineas++;
            j.puntos += state.puntosLinea;
          }
        });
        renderClasificacion();
        guardar();
        await hablarLinea();
        if (estabaJugando) iniciarJuego();
      });
    } else {
      abrirModal('Qui canta BINGO?', async (jugadores) => {
        jugadores.forEach(nombre => {
          const j = state.jugadores.find(x => x.nombre === nombre);
          if (j) {
            j.bingos++;
            j.puntos += state.puntosBingo;
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

  // Clasificación reset
  els.btnResetClasificacion.addEventListener('click', () => {
    if (!confirm('¿Resetear toda la clasificación? Los puntos de todos los jugadores se pondrán a 0.')) return;
    state.jugadores.forEach(j => {
      j.puntos = 0;
      j.lineas = 0;
      j.bingos = 0;
    });
    renderClasificacion();
    guardar();
  });

  // Config - voz
  els.selectVoz.addEventListener('change', () => {
    state.voz = els.selectVoz.value;
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

  // Config - puntos
  document.querySelectorAll('[data-puntos]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tipo = btn.dataset.puntos;
      const dir = parseInt(btn.dataset.dir);
      if (tipo === 'linea') {
        state.puntosLinea = Math.max(0, state.puntosLinea + dir);
        els.puntosLineaVal.textContent = state.puntosLinea;
      } else {
        state.puntosBingo = Math.max(0, state.puntosBingo + dir);
        els.puntosBingoVal.textContent = state.puntosBingo;
      }
      guardar();
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
      if (!confirm(`¿Eliminar a ${e.target.dataset.nombre}?`)) return;
      removeJugador(e.target.dataset.nombre);
      renderConfigJugadores();
      renderClasificacion();
    }
  });

  // Borrar datos
  els.btnBorrarDatos.addEventListener('click', () => {
    if (!confirm('¿Borrar TODOS los datos? Se perderán jugadores, clasificación y la partida actual.')) return;
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
  cargarVoces();

  if (teniaDatos && state.jugadores.length > 0) {
    // Restaurar partida
    els.pantallaSetup.classList.add('oculto');
    els.pantallaJuego.classList.remove('oculto');

    syncConfigUI();
    renderConfigJugadores();
    renderClasificacion();

    if (state.partidaEnCurso) {
      restaurarTablero();
      renderHistorial();
      if (state.cantados.length > 0) {
        els.numeroActual.textContent = state.cantados[state.cantados.length - 1];
        els.contadorBolas.textContent = `Bola ${state.indice} de 90`;
      }
      // No auto-reanudar, dejar en pausa
      state.jugando = false;
      state.pausado = true;
    }

    actualizarBotones();
  } else {
    renderSetupJugadores();
  }

  initEventos();
}

document.addEventListener('DOMContentLoaded', init);
