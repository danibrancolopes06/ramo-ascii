// Escena "Lirios": tallos que crecen, hojas, lirios que se abren y estrellas.
import { ASPECTO } from "./motor.js";
import { azar, limitar, suavizar, rebote, rellenarPetalo, trazarCurva, puntoCurva, punto } from "./formas.js";

// Colores: [centro del pétalo, punta del pétalo]
const COLORES = {
  rojo: [[255, 150, 110], [230, 30, 40]],
  rosa: [[255, 215, 235], [235, 70, 175]],
  amarillo: [[255, 250, 200], [255, 205, 40]],
  blanco: [[255, 240, 200], [250, 248, 240]],
  granate: [[220, 70, 80], [140, 15, 35]],
  melocoton: [[255, 225, 180], [255, 140, 90]],
};

// Posición de cada lirio en el ramo (x: -0.5..0.5, y: 0 abajo, -1.2 arriba),
// tamaño, color y giro. Están ordenados de atrás hacia delante.
const LIRIOS = [
  [-0.12, -0.98, 0.12, "melocoton", 0.3],
  [0.15, -1.0, 0.12, "amarillo", 0.9],
  [-0.34, -0.88, 0.12, "amarillo", 1.4],
  [0.35, -0.9, 0.12, "rosa", 0.2],
  [0.0, -0.8, 0.16, "rojo", 0.55],
  [-0.22, -0.72, 0.15, "rosa", 0.1],
  [0.23, -0.73, 0.15, "blanco", 0.75],
  [-0.31, -0.55, 0.12, "amarillo", 0.4],
  [0.33, -0.56, 0.12, "granate", 1.1],
  [-0.08, -0.6, 0.15, "blanco", 1.25],
  [0.12, -0.58, 0.14, "rosa", 0.95],
];

// Capullos cerrados: x, y, inclinación
const CAPULLOS = [
  [-0.44, -0.74, -0.5],
  [0.45, -0.7, 0.45],
  [0.02, -1.13, 0.05],
  [-0.22, -1.09, -0.2],
  [0.27, -1.1, 0.25],
];

const VERDES = [[70, 170, 70], [110, 200, 90], [50, 140, 60], [140, 210, 110]];

export const escenaLirios = {
  iniciar(cols, filas) {
    const W = cols;
    const H = filas * ASPECTO;
    // Escala del ramo: que quepa a lo ancho y deje sitio al título y los botones
    // En pantallas apaisadas el ramo es algo más bajo para no chocar con el título ni los botones
    const apaisado = W > H;
    const S = Math.min((H * (apaisado ? 0.6 : 0.68)) / 1.25, W * 0.82);
    const baseY = Math.min(H * (apaisado ? 0.82 : 0.86), H / 2 + (1.25 * S) / 2 + H * 0.06);
    const ox = W / 2;
    const aPantalla = (x, y) => [ox + x * S, baseY + y * S];

    this.cols = cols;
    this.filas = filas;
    this.S = S;

    // Tallos de lirios y capullos: salen juntos de abajo y se abren en abanico
    const tallo = (hx, hy, i) => {
      const p0 = aPantalla(hx * 0.08, 0);
      const p1 = aPantalla(hx * 0.35 + (azar(i, 1) - 0.5) * 0.06, hy * 0.45);
      const p2 = aPantalla(hx, hy);
      return { p0, p1, p2, color: VERDES[i % VERDES.length], retraso: azar(i, 2) * 0.5 };
    };

    this.lirios = LIRIOS.map(([hx, hy, r, color, giro], i) => ({
      ...tallo(hx * 1.15, hy, i),
      L: r * 0.88 * S,
      color: COLORES[color],
      giro,
      semilla: i * 7 + 3,
    }));
    this.capullos = CAPULLOS.map(([hx, hy, inclina], i) => ({
      ...tallo(hx * 1.15, hy, i + 20),
      inclina,
      L: 0.1 * S,
    }));

    // Hojas largas en la parte baja de los tallos
    this.hojas = [];
    const todos = [...this.lirios, ...this.capullos];
    for (let i = 0; i < 16; i++) {
      const t = todos[i % todos.length];
      const u = 0.12 + azar(i, 3) * 0.4;
      const pc = puntoCurva(t.p0, t.p1, t.p2, u);
      const lado = (pc.x < ox ? -1 : 1) * (azar(i, 4) < 0.25 ? -1 : 1);
      this.hojas.push({
        x: pc.x,
        y: pc.y,
        ang: -Math.PI / 2 + lado * (0.35 + azar(i, 5) * 0.55),
        L: (0.16 + azar(i, 6) * 0.14) * S,
        W: (0.025 + azar(i, 7) * 0.015) * S,
        color: VERDES[(i + 1) % VERDES.length],
        retraso: 0.8 + azar(i, 8) * 0.9,
      });
    }

    // Estrellas repartidas por toda la pantalla
    const n = Math.round(cols * filas * 0.012);
    this.estrellas = Array.from({ length: n }, (_, i) => ({
      x: Math.floor(azar(i, 9) * cols),
      f: Math.floor(azar(i, 10) * filas),
      fase: azar(i, 11) * Math.PI * 2,
      vel: 1.5 + azar(i, 12) * 3,
      ch: ".·*+'"[Math.floor(azar(i, 13) * 5)],
    }));
  },

  dibujar(lienzo, t) {
    // 1. Estrellas (van debajo de todo y aparecen al final)
    const luzEstrellas = limitar((t - 4.2) / 1.2);
    if (luzEstrellas > 0) {
      for (const e of this.estrellas) {
        const b = (0.5 + 0.5 * Math.sin(t * e.vel + e.fase)) * luzEstrellas;
        if (b > 0.35) lienzo.fijar(e.x, e.f, [235, 235, 255], b, e.ch);
      }
    }

    // 2. Tallos
    for (const l of [...this.lirios, ...this.capullos]) {
      const p = suavizar((t - l.retraso * 0.4) / 1.6);
      if (p > 0) trazarCurva(lienzo, l.p0, l.p1, l.p2, p, l.color, 0.85, this.S > 90 ? 2 : 1);
    }

    // 3. Hojas
    for (const h of this.hojas) {
      const p = suavizar((t - h.retraso) / 1.2);
      if (p > 0) {
        rellenarPetalo(lienzo, h.x, h.y, h.ang, h.L * p, h.W * Math.sqrt(p), h.color, [40, 120, 50], 0.8, 99);
      }
    }

    // 4. Capullos
    for (const c of this.capullos) {
      const p = suavizar((t - 1.6 - c.retraso) / 1.0);
      if (p > 0) {
        const ang = -Math.PI / 2 + c.inclina;
        rellenarPetalo(lienzo, c.p2[0], c.p2[1], ang, c.L * p, c.L * 0.22, [120, 190, 90], [235, 190, 200], 0.85, 5);
      }
    }

    // 5. Lirios: los pétalos salen juntos (como un capullo) y se abren en estrella
    for (const l of this.lirios) {
      const crecer = rebote((t - 1.8 - l.retraso) / 1.4);
      if (crecer <= 0.02) continue;
      const abrir = suavizar((t - 2.0 - l.retraso) / 1.3);
      const [cx, cy] = l.p2;
      const L = l.L * crecer;
      const W = l.L * 0.27 * Math.sqrt(crecer) * (0.45 + 0.55 * abrir);
      // Primero los 3 pétalos de atrás y luego los 3 de delante
      for (const k of [1, 3, 5, 0, 2, 4]) {
        const destino = l.giro + (k * Math.PI) / 3;
        const ang = -Math.PI / 2 + (destino + Math.PI / 2) * abrir;
        const ancho = k % 2 ? W * 1.1 : W * 0.9;
        rellenarPetalo(lienzo, cx, cy, ang, L, ancho, l.color[0], l.color[1], 0.95, l.semilla + k);
      }
      // Estambres: hilos claros con la punta anaranjada
      if (abrir > 0.6) {
        const largo = L * 0.55 * suavizar((abrir - 0.6) / 0.4);
        for (let k = 0; k < 6; k++) {
          const ang = l.giro + Math.PI / 6 + (k * Math.PI) / 3;
          for (let d = 1; d < largo; d += 0.8) {
            punto(lienzo, cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, [220, 240, 170], 1, "'");
          }
          punto(lienzo, cx + Math.cos(ang) * largo, cy + Math.sin(ang) * largo, [210, 100, 30], 1, "*");
        }
      }
      punto(lienzo, cx, cy, [255, 255, 210], 1, "@");
    }

    // 6. Brillo final: una banda de luz que cruza el ramo y un leve parpadeo
    const brilloFinal = t > 4.5;
    const banda = ((t - 4.5) * 0.25) % 1.6 - 0.3;
    const { cols, filas } = this;
    const fase = Math.floor(t * 10);
    for (let f = 0; f < filas; f++) {
      for (let x = 0; x < cols; x++) {
        const i = f * cols + x;
        if (lienzo.brillo[i] === 0 || lienzo.caracter[i]) continue;
        let b = lienzo.brillo[i] + (azar(x, f, fase) - 0.5) * 0.12;
        if (brilloFinal) {
          const d = (x / cols + f / filas) / 2 - banda;
          b += Math.max(0, 0.3 - Math.abs(d) * 3);
        }
        lienzo.brillo[i] = limitar(b, 0.04, 1);
      }
    }
  },
};
