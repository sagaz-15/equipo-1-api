
/**
 * RUTAS · los endpoints de la API (PARTES 2 y 4 de la guía)
 *
 * Los manejadores son el CONTROLADOR del servidor:
 * traducen las solicitudes HTTP en órdenes para el Modelo
 * y los resultados del Modelo en respuestas HTTP.
 *
 * No contienen reglas de negocio: esas pertenecen al Modelo.
 */

import { ErrorDeReglas } from './modelo.js';
import { ErrorHttp, leerEntero, paraVersiones } from './nucleo.mjs';
import {
  representarEvaluacion,
  representarResumen,
  tipoDeProblema,
} from './representaciones.mjs';

// ---------------------------------------------------------------
// 2B · De regla del Modelo a estado HTTP

const ESTADO_POR_CODIGO = {
  NO_EXISTE: 404,
  NOMBRE_OBLIGATORIO: 422,
  NOMBRE_LARGO: 422,
  PESO_FUERA_DE_RANGO: 422,
  NOTA_FUERA_DE_RANGO: 422,
  PESOS_EXCEDEN_100: 409,
  NOMBRE_DUPLICADO: 409,
};

/**
 * Traduce los errores del Modelo a errores HTTP.
 * Los demás errores quedan a cargo del núcleo.
 */
export function traducirError(error) {
  if (!(error instanceof ErrorDeReglas)) {
    return error;
  }

  const estado = ESTADO_POR_CODIGO[error.codigo] ?? 422;

  return new ErrorHttp(
    estado,
    error.message,
    tipoDeProblema(error.codigo),
  );
}

// ---------------------------------------------------------------
// Fechas del ciclo de vida de la v1 (Parte 4B)

const DEPRECIADA_DESDE = new Date('2026-10-01T00:00:00Z');
const SE_RETIRA_EN = new Date('2027-12-31T23:59:59Z');

// Valores permitidos de ?orden= y ?estado= en la v2 (Parte 4A)

const ORDENES = ['id', 'nombre', '-nombre', 'peso', '-peso'];
const ESTADOS = ['pendiente', 'calificada'];

/**
 * Ordena una lista de evaluaciones por id, nombre o peso.
 * Un guion delante del campo invierte el orden.
 */
function ordenar(lista, orden) {
  const campo = orden.replace('-', '');
  const sentido = orden.startsWith('-') ? -1 : 1;

  return [...lista].sort((a, b) =>
    sentido *
    (
      typeof a[campo] === 'string'
        ? a[campo].localeCompare(b[campo], 'es')
        : a[campo] - b[campo]
    )
  );
}

// ---------------------------------------------------------------
// Creación de las rutas

export function crearRutas(modelo) {
  /**
   * Obtiene el ID de la URL.
   * Solo acepta números positivos sin ceros a la izquierda.
   */
  const idDe = (solicitud) =>
    /^[1-9]\d*$/.test(solicitud.params.id)
      ? Number(solicitud.params.id)
      : NaN;

  // -------------------------------------------------------------
  // 2A · Leer evaluaciones

const listarV1 = () => ({
  status: 200,
  cabeceras: {
    Deprecation: `@${Math.floor(DEPRECIADA_DESDE.getTime() / 1000)}`,
    Sunset: SE_RETIRA_EN.toUTCString(),
    Link: '</v2/evaluaciones>; rel="successor-version"',
  },
  cuerpo: modelo.evaluaciones.map(representarEvaluacion),
});

  const obtener = (solicitud) => ({
    status: 200,
    cuerpo: representarEvaluacion(
      modelo.obtener(idDe(solicitud)),
    ),
  });

  // Resumen calculado de las evaluaciones.

  const resumen = () => ({
    status: 200,
    cuerpo: representarResumen(modelo.resumen()),
  });

  // -------------------------------------------------------------
  // 2B · Crear una evaluación

  const crear = ({ cuerpo, base }) => {
    const evaluacion = modelo.agregar({
      nombre: cuerpo.nombre,
      peso: cuerpo.peso,
      nota: cuerpo.nota,
    });

    return {
      status: 201,
      cabeceras: {
        Location: `${base}/evaluaciones/${evaluacion.id}`,
      },
      cuerpo: representarEvaluacion(evaluacion),
    };
  };

  // -------------------------------------------------------------
  // 2C · Modificar la nota

  const calificar = (solicitud) => {
    const evaluacion = modelo.calificar(
      idDe(solicitud),
      solicitud.cuerpo.nota,
    );

    return {
      status: 200,
      cuerpo: representarEvaluacion(evaluacion),
    };
  };

  // -------------------------------------------------------------
  // 2C · Eliminar una evaluación

  const eliminar = (solicitud) => {
    modelo.eliminar(idDe(solicitud));

    return {
      status: 204,
    };
  };

  // -------------------------------------------------------------
  // 4A · v2: lista paginada, filtrada y ordenada
  //
  // Pendiente de implementar en la Parte 4.

  const listarV2 = ({ query, ruta }) => {
    // 1. Leer y validar los parámetros de paginación.
    const pagina = leerEntero(query, 'pagina', {
      porDefecto: 1,
      min: 1,
    });

    const porPagina = leerEntero(query, 'porPagina', {
      porDefecto: 10,
      min: 1,
      max: 50,
    });

    // 2. Validar el estado.
    const estado = query.get('estado');

    if (estado !== null && !ESTADOS.includes(estado)) {
      throw new ErrorHttp(
        400,
        'El parámetro "estado" no es válido.',
      );
    }

    // 3. Validar el orden.
    const orden = query.get('orden') ?? 'id';

    if (!ORDENES.includes(orden)) {
      throw new ErrorHttp(
        400,
        'El parámetro "orden" no es válido.',
      );
    }

    // 4. Filtrar y ordenar las evaluaciones.
    let lista = modelo.evaluaciones;

    if (estado === 'pendiente') {
      lista = lista.filter((evaluacion) => evaluacion.nota == null);
    } else if (estado === 'calificada') {
      lista = lista.filter((evaluacion) => evaluacion.nota != null);
    }

    lista = ordenar(lista, orden);

    // 5. Calcular la paginación.
    const total = lista.length;
    const totalPaginas = Math.max(
      1,
      Math.ceil(total / porPagina),
    );

    const inicio = (pagina - 1) * porPagina;

    const datos = lista
      .slice(inicio, inicio + porPagina)
      .map(representarEvaluacion);

    // 6. Construir los enlaces de navegación.
    const enlaces = [];

    const crearEnlace = (numeroPagina) => {
      const parametros = new URLSearchParams({
        pagina: String(numeroPagina),
        porPagina: String(porPagina),
        orden,
      });

      if (estado !== null) {
        parametros.set('estado', estado);
      }

      return `</v2/evaluaciones?${parametros}>`;
    };

    if (pagina > 1 && pagina <= totalPaginas) {
      enlaces.push(
        `${crearEnlace(pagina - 1)}; rel="prev"`,
      );
    }

    if (pagina < totalPaginas) {
      enlaces.push(
        `${crearEnlace(pagina + 1)}; rel="next"`,
      );
    }

    const cabeceras = {};

    if (enlaces.length > 0) {
      cabeceras.Link = enlaces.join(', ');
    }

    return {
      status: 200,
      cuerpo: {
        datos,
        paginacion: {
          pagina,
          porPagina,
          total,
          totalPaginas,
        },
      },
      ...(enlaces.length > 0 ? { cabeceras } : {}),
    };
  };

  // -------------------------------------------------------------
  // Tabla de rutas
  //
  // Parte 2: rutas de la API v1.
  // La lista de la v2 y el versionado se completan en la Parte 4.

return [
  ...paraVersiones(['v1', 'v2'], [
    { metodo: 'GET', ruta: '/evaluaciones/{id}', manejador: obtener },
    { metodo: 'GET', ruta: '/resumen', manejador: resumen },
    { metodo: 'POST', ruta: '/evaluaciones', manejador: crear },
    { metodo: 'PATCH', ruta: '/evaluaciones/{id}', manejador: calificar },
    { metodo: 'DELETE', ruta: '/evaluaciones/{id}', manejador: eliminar },
  ]),
  { metodo: 'GET', ruta: '/v1/evaluaciones', manejador: listarV1 },
  { metodo: 'GET', ruta: '/v2/evaluaciones', manejador: listarV2 },
];
}
