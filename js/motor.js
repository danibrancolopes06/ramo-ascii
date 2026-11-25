// Motor de letras: convierte un "lienzo de color" (color + brillo por casilla)
// en una cuadrícula de caracteres dibujada en un <canvas>.

// Caracteres ordenados de menos a más "tinta"
export const RAMPA = " .:-=+*#%@";

// Proporción alto/ancho de cada casilla (las letras son más altas que anchas)
export const ASPECTO = 1.8;

// Máximo de casillas para que vaya fluido también en ordenadores grandes
const MAX_CASILLAS = 14000;
// Tamaño mínimo de letra en píxeles de ancho (para que se lea en el móvil)
const CELDA_MIN = 4.5;
const COLS_MIN = 40;

const limitar = (v, a, b) => Math.min(b, Math.max(a, v));

// Devuelve el carácter de la rampa que corresponde a un brillo entre 0 y 1
export function caracterPorBrillo(b) {
  const i = Math.round(limitar(b, 0, 1) * (RAMPA.length - 1));
  return RAMPA[i];
}

// Devuelve el trazo que mejor dibuja una línea con esa dirección (en radianes).
// En pantalla la y crece hacia abajo.
export function caracterDeBorde(angulo) {
  const a = ((angulo % Math.PI) + Math.PI) % Math.PI; // dirección sin sentido: 0..π
  const o = Math.PI / 8;
  if (a < o || a >= 7 * o) return "-";
  if (a < 3 * o) return "\\";
  if (a < 5 * o) return "|";
  return "/";
}

// Calcula cuántas columnas y filas caben en la pantalla
export function tamanoCuadricula(anchoPx, altoPx) {
  // Algunos navegadores dan tamaño 0 un instante al cargar: usamos un mínimo
  anchoPx = Math.max(anchoPx, COLS_MIN);
  altoPx = Math.max(altoPx, COLS_MIN);
  let celda = Math.sqrt((anchoPx * altoPx) / (MAX_CASILLAS * ASPECTO));
  celda = Math.max(celda, CELDA_MIN);
  celda = Math.min(celda, anchoPx / COLS_MIN); // como mínimo 40 columnas
  let cols = Math.ceil(anchoPx / celda);
  let filas = Math.ceil(altoPx / (celda * ASPECTO));
  // Por redondeos podríamos pasarnos un poco: agrandamos la casilla si hace falta
  while (cols * filas > MAX_CASILLAS) {
    celda *= 1.02;
    cols = Math.ceil(anchoPx / celda);
    filas = Math.ceil(altoPx / (celda * ASPECTO));
  }
  return { cols, filas, celdaPx: celda, altoPx: celda * ASPECTO };
}

// Mezcla dos colores [r,g,b]; t=0 da a, t=1 da b
export function mezclar(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Lienzo de color: guarda, por cada casilla, su color, su brillo y (opcional) un carácter fijo
export class Lienzo {
  constructor(cols, filas) {
    this.cols = cols;
    this.filas = filas;
    const n = cols * filas;
    this.r = new Float64Array(n);
    this.g = new Float64Array(n);
    this.b = new Float64Array(n);
    this.brillo = new Float64Array(n);
    this.caracter = new Array(n).fill("");
  }

  limpiar() {
    this.brillo.fill(0);
    this.caracter.fill("");
  }

  // Pinta una casilla. Si ya había algo más brillante, se queda lo que había.
  poner(x, y, rgb, brillo, caracter = "") {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.cols || y >= this.filas) return;
    const i = y * this.cols + x;
    if (brillo <= this.brillo[i]) return;
    this.brillo[i] = brillo;
    this.r[i] = rgb[0];
    this.g[i] = rgb[1];
    this.b[i] = rgb[2];
    this.caracter[i] = caracter;
  }

  // Pinta una casilla siempre, tapando lo que hubiera (para dibujar por capas)
  fijar(x, y, rgb, brillo, caracter = "") {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.cols || y >= this.filas) return;
    const i = y * this.cols + x;
    this.brillo[i] = brillo;
    this.r[i] = rgb[0];
    this.g[i] = rgb[1];
    this.b[i] = rgb[2];
    this.caracter[i] = caracter;
  }
}

// Crea el motor que anima una escena en el canvas.
// Una escena es { iniciar(cols, filas), dibujar(lienzo, t) } con t en segundos.
export function crearMotor(canvas) {
  const ctx = canvas.getContext("2d");
  let escena = null;
  let lienzo = null;
  let rejilla = null;
  let t = 0;
  let ultimo = 0;
  let idBucle = 0;
  let tamFuente = 10;

  function redimensionar() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rejilla = tamanoCuadricula(w, h);
    // Ajustamos la fuente para que cada letra mida justo una casilla de ancho
    ctx.font = "100px Menlo, Consolas, 'Courier New', monospace";
    const anchoLetra = ctx.measureText("M").width / 100;
    tamFuente = rejilla.celdaPx / anchoLetra;
    ctx.font = `bold ${tamFuente}px Menlo, Consolas, 'Courier New', monospace`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    lienzo = new Lienzo(rejilla.cols, rejilla.filas);
    if (escena) escena.iniciar(rejilla.cols, rejilla.filas);
  }

  function pintar() {
    const { cols, filas, celdaPx, altoPx } = rejilla;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let estiloActual = "";
    for (let y = 0; y < filas; y++) {
      const py = (y + 0.5) * altoPx;
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const br = lienzo.brillo[i];
        if (br < 0.03) continue;
        const ch = lienzo.caracter[i] || caracterPorBrillo(br);
        if (ch === " ") continue;
        // El color se oscurece un poco con el brillo para dar volumen.
        // Se redondea a pasos de 8 para reutilizar estilos y dibujar más rápido.
        const k = 0.35 + 0.65 * Math.min(br, 1);
        const r = (lienzo.r[i] * k) & 0xf8;
        const g = (lienzo.g[i] * k) & 0xf8;
        const b = (lienzo.b[i] * k) & 0xf8;
        const estilo = `rgb(${r},${g},${b})`;
        if (estilo !== estiloActual) {
          ctx.fillStyle = estilo;
          estiloActual = estilo;
        }
        ctx.fillText(ch, (x + 0.5) * celdaPx, py);
      }
    }
  }

  function bucle(ahora) {
    idBucle = requestAnimationFrame(bucle);
    if (ahora - ultimo < 1000 / 31) return; // como mucho ~30 fotogramas por segundo
    const delta = Math.min((ahora - ultimo) / 1000, 0.1); // tope para pestañas en segundo plano
    ultimo = ahora;
    t += delta;
    lienzo.limpiar();
    escena.dibujar(lienzo, t);
    pintar();
  }

  function iniciar(nuevaEscena) {
    cancelAnimationFrame(idBucle); // nunca dos bucles a la vez
    escena = nuevaEscena;
    t = 0;
    if (!rejilla) redimensionar();
    else escena.iniciar(rejilla.cols, rejilla.filas);
    ultimo = performance.now();
    idBucle = requestAnimationFrame(bucle);
  }

  window.addEventListener("resize", redimensionar);
  window.addEventListener("orientationchange", redimensionar);

  return { iniciar, redimensionar };
}
