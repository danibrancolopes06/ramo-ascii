// Arranque de la página: pantalla de inicio para elegir el ramo y botones para cambiar
import { crearMotor } from "./motor.js";
import { escenaLirios } from "./lirios.js";
import { escenaJarron } from "./jarron.js";

const escenas = { lirios: escenaLirios, jarron: escenaJarron };

const motor = crearMotor(document.getElementById("lienzo"));
const titulo = document.getElementById("titulo");
const inicio = document.getElementById("inicio");
const controles = document.querySelector(".controles");
const botones = controles.querySelectorAll("[data-escena]");
let actual = null; // todavía no se ha elegido ningún ramo

function mostrar(nombre) {
  actual = nombre;
  inicio.classList.add("oculto");
  controles.classList.remove("oculto");
  botones.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.escena === nombre)));
  titulo.classList.toggle("visible", nombre === "lirios");
  motor.iniciar(escenas[nombre]);
}

// Tarjetas de la pantalla de inicio
inicio.querySelectorAll("[data-escena]").forEach((t) =>
  t.addEventListener("click", () => mostrar(t.dataset.escena)),
);
// Botones de abajo
botones.forEach((b) => b.addEventListener("click", () => mostrar(b.dataset.escena)));
document.getElementById("repetir").addEventListener("click", () => actual && mostrar(actual));
document.getElementById("lienzo").addEventListener("click", () => actual && mostrar(actual));
