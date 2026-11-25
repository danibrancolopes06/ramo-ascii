// Pruebas de las formas comunes de las escenas
import { test } from "node:test";
import assert from "node:assert/strict";
import { Lienzo, ASPECTO } from "../js/motor.js";
import { azar, suavizar, rellenarPetalo, trazarCurva } from "../js/formas.js";

const celdasPintadas = (l) => {
  const out = [];
  for (let y = 0; y < l.filas; y++)
    for (let x = 0; x < l.cols; x++) if (l.brillo[y * l.cols + x] > 0) out.push([x, y]);
  return out;
};

test("azar da siempre lo mismo para los mismos datos y está entre 0 y 1", () => {
  assert.equal(azar(3, 7, 1), azar(3, 7, 1));
  assert.notEqual(azar(3, 7, 1), azar(4, 7, 1));
  for (let i = 0; i < 100; i++) {
    const v = azar(i, i * 3, 5);
    assert.ok(v >= 0 && v < 1);
  }
});

test("suavizar empieza en 0, acaba en 1 y recorta fuera", () => {
  assert.equal(suavizar(0), 0);
  assert.equal(suavizar(1), 1);
  assert.equal(suavizar(-3), 0);
  assert.equal(suavizar(5), 1);
});

test("un pétalo horizontal pinta a la derecha de su origen y no a la izquierda", () => {
  const l = new Lienzo(40, 20);
  const oy = 10 * ASPECTO;
  rellenarPetalo(l, 10, oy, 0, 20, 3, [255, 0, 0], [255, 0, 0], 0.8);
  const c = celdasPintadas(l);
  assert.ok(c.length > 10, `pintadas=${c.length}`);
  assert.ok(c.every(([x]) => x >= 10 && x <= 30));
  assert.ok(c.some(([x, y]) => x === 20 && y === 10), "el centro del pétalo está pintado");
});

test("un pétalo de longitud 0 no pinta nada", () => {
  const l = new Lienzo(20, 20);
  rellenarPetalo(l, 10, 10, 0, 0, 3, [255, 0, 0], [255, 0, 0], 0.8);
  assert.equal(celdasPintadas(l).length, 0);
});

test("trazarCurva hasta la mitad pinta solo la primera mitad", () => {
  const l = new Lienzo(40, 10);
  const y = 5 * ASPECTO;
  // Curva recta horizontal de x=0 a x=30
  trazarCurva(l, [0, y], [15, y], [30, y], 0.5, [0, 200, 0], 0.8);
  const c = celdasPintadas(l);
  assert.ok(c.length >= 12, `pintadas=${c.length}`);
  assert.ok(c.every(([x]) => x <= 16));
  // Una línea horizontal se dibuja con guiones
  assert.equal(l.caracter[5 * 40 + 5], "-");
});
