
/**
 * MODELO REMOTO · Notas del semestre (PARTE 3A)
 *
 * Pide el estado a la API, envía cambios y avisa a sus suscriptores.
 * Las reglas de negocio pertenecen al servidor.
 */

import { ErrorApi, ErrorDeRed } from './cliente-api.js';

export class ErrorDeReglas extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorDeReglas';
  }
}

export class ErrorDeServicio extends Error {
  constructor(mensaje, causa) {
    super(mensaje);
    this.name = 'ErrorDeServicio';
    this.cause = causa;
  }
}


function traducir(error) {
  if (error instanceof ErrorApi) {
    const estado = error.estado ?? error.status;

    if ([404, 409, 422].includes(estado)) {
      return new ErrorDeReglas(
        error.problema?.detail ?? 'La operación no fue aceptada.',
      );
    }

    return new ErrorDeServicio(
      'El servidor no pudo completar la operación.',
      error,
    );
  }

  if (error instanceof ErrorDeRed) {
    return new ErrorDeServicio(
      'No hay conexión con el servidor.',
      error,
    );
  }

  return error;
}


export class NotasModeloRemoto {
  #api;
  #evaluaciones = [];
  #resumen = null;
  #suscriptores = new Set();

  constructor(api) {
    this.#api = api;
  }

  async sincronizar() {
    let evaluaciones;
    let resumen;

    try {
      [evaluaciones, resumen] = await Promise.all([
        this.#api.listarEvaluaciones(),
        this.#api.obtenerResumen(),
      ]);
    } catch (error) {
      throw traducir(error);
    }

    this.#evaluaciones = evaluaciones;
    this.#resumen = resumen;

    for (const suscriptor of this.#suscriptores) {
      suscriptor();
    }
  }

  get evaluaciones() {
    return this.#evaluaciones.map((e) => ({ ...e }));
  }

  resumen() {
    return { ...this.#resumen };
  }

  suscribir(suscriptor) {
    this.#suscriptores.add(suscriptor);
    return () => this.#suscriptores.delete(suscriptor);
  }

  // -------------------------------------------------------------
  // 3A · Enviar órdenes a la API

  async agregar({ nombre, peso, nota = null }) {
    return this.#ordenar(() =>
      this.#api.solicitar('POST', '/evaluaciones', {
        nombre,
        peso,
        nota,
      }),
    );
  }

  async calificar(id, nota) {
    return this.#ordenar(() =>
      this.#api.solicitar('PATCH', `/evaluaciones/${id}`, {
        nota,
      }),
    );
  }

  async eliminar(id) {
    return this.#ordenar(() =>
      this.#api.solicitar('DELETE', `/evaluaciones/${id}`),
    );
  }

  // -------------------------------------------------------------
  // Ejecutar la orden y sincronizar con el servidor.

  async #ordenar(orden) {
    try {
      await orden();
    }catch (error) {
  if (error instanceof ErrorApi && (error.estado ?? error.status) === 404) {
    await this.sincronizar().catch(() => {});
  }

  throw traducir(error);
}

    // El servidor es la fuente de verdad.
    await this.sincronizar();
  }
}
