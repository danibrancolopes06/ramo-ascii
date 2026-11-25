// Escena "Jarrón": un ramo de rosas y flores redondas que crece desde un jarrón,
// se mece y va cambiando de color poco a poco.
import { ASPECTO, caracterDeBorde, mezclar } from "./motor.js";
import { azar, limitar, suavizar, rebote, rellenarPetalo, trazarCurva } from "./formas.js";

// Cada color cambia lentamente entre dos tonos
const PALETAS = {
  rojo: [[225, 30, 55], [255, 85, 125]],
  rosa: [[245, 110, 175], [255, 165, 95]],
  azul: [[70, 115, 245], [145, 90, 235]],
  blanco: [[240, 236, 226], [255, 214, 232]],
  morado: [[165, 70, 225], [90, 125, 250]],
  amarillo: [[255, 210, 70], [255, 140, 70]],
};

// Flores: x, y (respecto a la boca del jarrón, y negativa = arriba), radio, tipo, color.
// Ordenadas de atrás hacia delante.
const FLORES = [
  [-0.3, -0.47, 0.11, "rosa", "rosa"],
  [0.29, -0.5, 0.11, "bola", "azul"],
  [0.0, -0.64, 0.12, "rosa", "rojo"],
  [-0.16, -0.68, 0.1, "rosa", "blanco"],
  [0.17, -0.69, 0.1, "rosa", "amarillo"],
  [-0.37, -0.25, 0.1, "bola", "morado"],
  [0.37, -0.27, 0.1, "rosa", "rojo"],
  [-0.13, -0.43, 0.13, "rosa", "rojo"],
  [0.14, -0.44, 0.13, "rosa", "rosa"],
  [-0.2, -0.17, 0.11, "rosa", "blanco"],
  [0.21, -0.19, 0.11, "bola", "azul"],
  [0.0, -0.27, 0.13, "rosa", "rojo"],
];

// Hojas que asoman alrededor del ramo: ángulo y largo
const HOJAS = [
  [-2.75, 0.5], [-2.3, 0.46], [-0.39, 0.5], [-0.84, 0.46],
  [-3.1, 0.4], [-0.05, 0.4], [-1.95, 0.5], [-1.2, 0.5],
];

// Forma del jarrón: medio ancho según la altura (0 = boca, 1 = base)
function anchoJarron(v) {
  if (v < 0.12) return 0.1 + 0.035 * (1 - v / 0.12); // boca un poco abierta
  const u = (v - 0.12) / 0.88;
  return 0.1 + 0.16 * Math.sin(Math.PI * Math.pow(u, 0.75)) + 0.05 * u;
}

export const escenaJarron = {
  iniciar(cols, filas) {
    const W = cols;
    const H = filas * ASPECTO;
    const ALTO_JARRON = 0.45;
    // Toda la composición mide ~1.45 unidades (1 de ramo + 0.45 de jarrón)
    const apaisado = W > H;
    const S = Math.min((H * (apaisado ? 0.66 : 0.72)) / 1.45, W * 0.85);
    this.cols = cols;
    this.filas = filas;
    this.S = S;
    this.altoJarron = ALTO_JARRON * S;
    // Boca del jarrón: el punto desde el que salen y se mecen las flores
    this.bocaX = W / 2;
    // La base queda por encima de los botones
    this.bocaY = Math.min(H * (apaisado ? 0.82 : 0.85), H / 2 + (1.45 * S) / 2) - this.altoJarron;
    this.flores = FLORES.map(([x, y, r, tipo, color], i) => ({
      x: x * 1.15 * S, y: y * 1.25 * S, r: r * 1.12 * S, tipo, paleta: PALETAS[color],
      retraso: 0.4 + (Math.abs(y) < 0.3 ? 0.2 : 0.8) + azar(i, 1) * 0.9,
      fase: azar(i, 2) * Math.PI * 2,
      giro: azar(i, 3) * Math.PI * 2,
    }));
    this.hojas = HOJAS.map(([ang, L], i) => ({ ang, L: L * S, retraso: 0.6 + azar(i, 4) * 0.8 }));
  },

  // Gira un punto alrededor de la boca del jarrón (para el vaivén)
  mecer(x, y, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    return [this.bocaX + x * c - y * s, this.bocaY + x * s + y * c];
  },

  dibujarJarron(lienzo, t) {
    const aparecer = suavizar(t / 0.8);
    if (aparecer <= 0) return;
    const { S, bocaX, bocaY, altoJarron } = this;
    const f0 = Math.floor(bocaY / ASPECTO);
    const f1 = Math.ceil((bocaY + altoJarron) / ASPECTO);
    for (let f = f0; f <= f1; f++) {
      const v = limitar((f * ASPECTO - bocaY) / altoJarron);
      const hw = anchoJarron(v) * S;
      // Color de arriba (azul) a abajo (morado), con franjas suaves
      const color = mezclar([80, 120, 240], [150, 80, 225], v);
      const franja = 0.85 + 0.15 * Math.sin(v * 26 + t * 0.6);
      const izq = Math.ceil(bocaX - hw), der = Math.floor(bocaX + hw);
      for (let x = izq; x <= der; x++) {
        const nx = (x - bocaX) / hw; // -1 borde izquierdo, 1 borde derecho
        const luz = 0.25 + 0.75 * limitar(-nx * 0.55 + Math.sqrt(Math.max(0, 1 - nx * nx)) * 0.85);
        const b = luz * franja * aparecer;
        if (x === izq || x === der) {
          // Bordes con trazos que siguen la silueta
          const vSig = limitar(v + 0.05);
          const pend = ((anchoJarron(vSig) - anchoJarron(v)) * S) / (0.05 * altoJarron);
          const ang = Math.atan2(1, x === der ? pend : -pend);
          lienzo.fijar(x, f, color, 0.8 * aparecer, caracterDeBorde(ang));
        } else if (f === f1) {
          lienzo.fijar(x, f, color, 0.7 * aparecer, "_");
        } else {
          lienzo.fijar(x, f, color, b);
        }
      }
    }
  },

  // Rosa: un disco con una espiral de pétalos
  dibujarFlor(lienzo, fl, cx, cy, R, color, t) {
    if (R < 0.8) return;
    const f0 = Math.floor((cy - R) / ASPECTO), f1 = Math.ceil((cy + R) / ASPECTO);
    const x0 = Math.floor(cx - R), x1 = Math.ceil(cx + R);
    const oscuro = [color[0] * 0.55, color[1] * 0.55, color[2] * 0.55];
    for (let f = f0; f <= f1; f++) {
      const dy = f * ASPECTO - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        const rho = Math.hypot(dx, dy);
        if (rho > R) continue;
        const u = rho / R;
        const th = Math.atan2(dy, dx) + fl.giro;
        if (u > 0.86 && R > 3) {
          // Contorno de la flor
          lienzo.fijar(x, f, oscuro, 0.75, caracterDeBorde(Math.atan2(dy, dx) + Math.PI / 2));
          continue;
        }
        let b;
        if (fl.tipo === "bola") {
          // Flor redonda hecha de florecitas: puntos que se encienden y apagan
          const flor = Math.sin(x * 1.9 + fl.fase) * Math.sin(f * 2.6 * ASPECTO * 0.5 + fl.fase);
          b = 0.55 + 0.45 * Math.abs(flor) + 0.1 * azar(x, f, 7);
        } else {
          // Rosa: espiral que se enrosca hacia el centro
          const espiral = Math.cos(u * 16 - th * 2 - t * 0.3);
          b = 0.62 + 0.38 * espiral * (1 - u * 0.3) + 0.08 * azar(x, f, 3);
        }
        b *= 0.85 + 0.15 * (1 - u); // un poco más oscuro hacia fuera
        lienzo.fijar(x, f, mezclar(color, [255, 255, 255], (1 - u) * 0.25), limitar(b, 0.3, 1));
      }
    }
  },

  dibujar(lienzo, t) {
    const vaiven = 0.05 * Math.sin(t * 0.8) * suavizar((t - 4) / 2);
    const crecerRamo = suavizar((t - 0.3) / 5.5);

    // 1. Hojas (detrás de las flores)
    for (const h of this.hojas) {
      const p = suavizar((t - h.retraso) / 1.6);
      if (p <= 0) continue;
      const [x, y] = this.mecer(0, -0.08 * this.S, vaiven);
      rellenarPetalo(lienzo, x, y, h.ang + vaiven, h.L * p * (0.45 + 0.55 * crecerRamo), h.L * 0.17 * Math.sqrt(p),
        [60, 160, 70], [130, 210, 100], 0.8, 41);
    }

    // 2. Tallos que llevan cada flor desde la boca del jarrón
    for (const fl of this.flores) {
      const p = suavizar((t - fl.retraso + 0.4) / 1.2);
      if (p <= 0) continue;
      const k = 0.35 + 0.65 * crecerRamo;
      const p0 = this.mecer(0, 0, vaiven);
      const p2 = this.mecer(fl.x * k, fl.y * k, vaiven);
      const p1 = this.mecer(fl.x * k * 0.2, fl.y * k * 0.6, vaiven);
      trazarCurva(lienzo, p0, p1, p2, p, [70, 170, 80], 0.75);
    }

    // 3. Flores, de atrás hacia delante, con su color cambiando
    for (const fl of this.flores) {
      const p = rebote((t - fl.retraso) / 1.5);
      if (p <= 0.02) continue;
      const k = 0.35 + 0.65 * crecerRamo;
      const [cx, cy] = this.mecer(fl.x * k, fl.y * k, vaiven);
      const mezcla = 0.5 + 0.5 * Math.sin(t * 0.35 + fl.fase);
      const color = mezclar(fl.paleta[0], fl.paleta[1], mezcla);
      this.dibujarFlor(lienzo, fl, cx, cy, fl.r * p, color, t);
    }

    // 4. El jarrón va delante de los tallos
    this.dibujarJarron(lienzo, t);
  },
};
