// Pruebas del motor de letras. Se ejecutan con: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RAMPA, caracterPorBrillo, caracterDeBorde, tamanoCuadricula, mezclar, Lienzo,
} from "../js/motor.js";

test("la rampa va de vacío a lleno", () => {
  assert.equal(RAMPA, " .:-=+*#%@");
});

test("brillo 0 es espacio y brillo 1 es @", () => {
  assert.equal(caracterPorBrillo(0), " ");
  assert.equal(caracterPorBrillo(1), "@");
});

test("el brillo fuera de 0..1 se recorta", () => {
  assert.equal(caracterPorBrillo(2), "@");
  assert.equal(caracterPorBrillo(-1), " ");
});

test("los bordes horizontales y verticales usan - y |", () => {
  assert.equal(caracterDeBorde(0), "-");
  assert.equal(caracterDeBorde(Math.PI / 2), "|");
  assert.equal(caracterDeBorde(Math.PI), "-");
});

test("las diagonales usan / y \\", () => {
  // En pantalla el eje y crece hacia abajo: ángulo negativo sube hacia la derecha
  assert.equal(caracterDeBorde(-Math.PI / 4), "/");
  assert.equal(caracterDeBorde(Math.PI / 4), "\\");
});

test("la cuadrícula tiene al menos 40 columnas en un móvil estrecho", () => {
  const g = tamanoCuadricula(320, 640);
  assert.ok(g.cols >= 40, `cols=${g.cols}`);
  assert.ok(g.filas > 0);
});

test("una pantalla grande no pasa del límite de casillas", () => {
  const g = tamanoCuadricula(2560, 1440);
  assert.ok(g.cols * g.filas <= 15000, `casillas=${g.cols * g.filas}`);
  assert.ok(g.filas >= 50, `filas=${g.filas}`);
});

test("la cuadrícula cubre toda la pantalla", () => {
  for (const [w, h] of [[375, 812], [1440, 900], [320, 568]]) {
    const g = tamanoCuadricula(w, h);
    assert.ok(g.cols * g.celdaPx >= w, `ancho ${w}`);
    assert.ok(g.filas * g.altoPx >= h, `alto ${h}`);
  }
});

test("una ventana de tamaño 0 da una cuadrícula válida", () => {
  const g = tamanoCuadricula(0, 0);
  assert.ok(Number.isInteger(g.cols) && g.cols >= 1, `cols=${g.cols}`);
  assert.ok(Number.isInteger(g.filas) && g.filas >= 1, `filas=${g.filas}`);
  assert.ok(g.celdaPx > 0);
});

test("mezclar a la mitad da el color intermedio", () => {
  assert.deepEqual(mezclar([0, 0, 0], [255, 255, 255], 0.5), [127.5, 127.5, 127.5]);
});

test("poner fuera del lienzo no da error", () => {
  const l = new Lienzo(10, 5);
  assert.doesNotThrow(() => l.poner(-1, 2, [255, 0, 0], 1));
  assert.doesNotThrow(() => l.poner(3, 99, [255, 0, 0], 1));
});

test("en la misma celda gana el brillo mayor", () => {
  const l = new Lienzo(10, 5);
  l.poner(2, 2, [255, 0, 0], 0.9);
  l.poner(2, 2, [0, 255, 0], 0.3);
  const i = 2 * 10 + 2;
  assert.equal(l.brillo[i], 0.9);
  assert.equal(l.r[i], 255);
  assert.equal(l.g[i], 0);
});

test("fijar pinta encima aunque lo de debajo brille más", () => {
  const l = new Lienzo(10, 5);
  l.poner(2, 2, [255, 0, 0], 0.9);
  l.fijar(2, 2, [0, 255, 0], 0.3, "|");
  const i = 2 * 10 + 2;
  assert.equal(l.brillo[i], 0.3);
  assert.equal(l.g[i], 255);
  assert.equal(l.caracter[i], "|");
  assert.doesNotThrow(() => l.fijar(50, 50, [0, 0, 0], 1));
});

test("limpiar deja el lienzo vacío", () => {
  const l = new Lienzo(4, 4);
  l.poner(1, 1, [255, 255, 255], 1, "*");
  l.limpiar();
  assert.equal(l.brillo[5], 0);
  assert.equal(l.caracter[5], "");
});
