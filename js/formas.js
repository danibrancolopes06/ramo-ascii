// Formas comunes para dibujar flores en el lienzo de letras.
// Las coordenadas van en "unidades de casilla": x = columna, y = fila × ASPECTO,
// así un círculo se ve redondo aunque las letras sean más altas que anchas.
import { ASPECTO, caracterDeBorde, mezclar } from "./motor.js";

export const limitar = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// Número "aleatorio" entre 0 y 1 que siempre sale igual para los mismos datos
export function azar(a, b = 0, c = 0) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Curva suave de 0 a 1 (arranca y frena despacio)
export const suavizar = (t) => {
  t = limitar(t);
  return t * t * (3 - 2 * t);
};

// Curva que se pasa un poco y vuelve (efecto "pop" al abrirse una flor)
export const rebote = (t) => {
  t = limitar(t);
  const c = 1.7;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

// Pinta un punto dado en unidades de casilla
export function punto(lienzo, x, y, rgb, brillo, caracter = "") {
  lienzo.fijar(x, y / ASPECTO, rgb, brillo, caracter);
}

// Rellena un pétalo (o una hoja): sale de (cx, cy) en la dirección `ang`,
// mide L de largo y W de ancho máximo, estrecho en la base y en punta al final.
// El color pasa de `cBase` (junto al centro) a `cPunta`.
export function rellenarPetalo(lienzo, cx, cy, ang, L, W, cBase, cPunta, brillo, semilla = 0) {
  if (L <= 0.3 || W <= 0) return;
  const co = Math.cos(ang), si = Math.sin(ang);
  // Caja que contiene el pétalo
  const ex = cx + co * L, ey = cy + si * L;
  const x0 = Math.floor(Math.min(cx, ex) - W - 1), x1 = Math.ceil(Math.max(cx, ex) + W + 1);
  const f0 = Math.floor((Math.min(cy, ey) - W - 1) / ASPECTO);
  const f1 = Math.ceil((Math.max(cy, ey) + W + 1) / ASPECTO);
  const bordeChar = caracterDeBorde(ang);
  for (let f = f0; f <= f1; f++) {
    const dy = f * ASPECTO - cy;
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const a = dx * co + dy * si; // distancia a lo largo del pétalo
      const p = -dx * si + dy * co; // distancia al nervio central
      const u = a / L;
      if (u < 0 || u > 1) continue;
      // Ancho: crece rápido, es máximo hacia el 40 % y acaba en punta
      const hw = Math.max(0.55, W * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 0.85));
      const q = Math.abs(p) / hw;
      if (q > 1) continue;
      const color = mezclar(cBase, cPunta, Math.pow(u, 0.7));
      // Más brillo en el nervio central y un poco de textura
      let b = brillo * (0.55 + 0.45 * (1 - q * q)) * (0.85 + 0.3 * azar(x, f, semilla));
      if (q > 0.8 && hw > 2) {
        // Contorno: un trazo algo más oscuro que separa el pétalo de lo de detrás
        lienzo.fijar(x, f, [color[0] * 0.8, color[1] * 0.8, color[2] * 0.8], brillo * 0.75, bordeChar);
      } else {
        lienzo.fijar(x, f, color, b);
      }
    }
  }
}

// Punto y dirección de una curva de Bézier cuadrática (p0 → p2, tirando hacia p1)
export function puntoCurva(p0, p1, p2, t) {
  const m = 1 - t;
  const x = m * m * p0[0] + 2 * m * t * p1[0] + t * t * p2[0];
  const y = m * m * p0[1] + 2 * m * t * p1[1] + t * t * p2[1];
  const dx = 2 * m * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
  const dy = 2 * m * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
  return { x, y, ang: Math.atan2(dy, dx) };
}

// Dibuja un tallo: la curva desde p0 hasta donde marque `progreso` (0..1),
// con trazos que siguen su dirección. Devuelve el punto final.
export function trazarCurva(lienzo, p0, p1, p2, progreso, rgb, brillo, grosor = 1) {
  progreso = limitar(progreso);
  const largo = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
  const pasos = Math.max(2, Math.ceil(largo * 2.5));
  let fin = puntoCurva(p0, p1, p2, 0);
  for (let i = 0; i <= pasos * progreso; i++) {
    fin = puntoCurva(p0, p1, p2, i / pasos);
    const ch = caracterDeBorde(fin.ang);
    punto(lienzo, fin.x, fin.y, rgb, brillo, ch);
    if (grosor > 1) punto(lienzo, fin.x + 1, fin.y, rgb, brillo * 0.8, ch);
  }
  return fin;
}
