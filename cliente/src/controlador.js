
/**
 * CONTROLADOR · Notas del semestre (PARTE 3B)
 *
 * Traduce los eventos de la Vista en órdenes al Modelo.
 * No conoce HTML, DOM ni HTTP.
 */

import {
  ErrorDeReglas,
  ErrorDeServicio,
} from './modelo-remoto.js';

const MENSAJE_SERVICIO =
  'No se pudo completar la operación. Revisa tu conexión e inténtalo de nuevo.';

// "" → sin nota (null); "4.2" → 4.2
const aNota = (texto) =>
  String(texto).trim() === '' ? null : Number(texto);

export class NotasControlador {
  #modelo;
  #vista;

  constructor(modelo, vista) {
    this.#modelo = modelo;
    this.#vista = vista;

    vista.alAgregar((datos) => this.#agregar(datos));

    vista.alEliminar((id) =>
      this.#intentar(() => this.#modelo.eliminar(id)),
    );

    vista.alCalificar((id, texto) =>
      this.#intentar(() =>
        this.#modelo.calificar(id, aNota(texto)),
      ),
    );
  }

  async #agregar(datos) {
    // Limpiar el formulario solo si el servidor acepta la orden.
    const acepto = await this.#intentar(() =>
      this.#modelo.agregar({
        nombre: datos.nombre,
        peso: Number(datos.peso),
        nota: aNota(datos.nota),
      }),
    );

    if (acepto) {
      this.#vista.limpiarFormulario();
    }
  }

  async #intentar(orden) {
    try {
      await orden();

      this.#vista.limpiarError();
      return true;
    } catch (error) {
      if (error instanceof ErrorDeReglas) {
        this.#vista.mostrarError(error.message);
        this.#vista.render();
        return false;
      }

      if (error instanceof ErrorDeServicio) {
        this.#vista.mostrarError(MENSAJE_SERVICIO);
        this.#vista.render();
        return false;
      }

      // No ocultar errores inesperados de programación.
      throw error;
    }
  }
}
