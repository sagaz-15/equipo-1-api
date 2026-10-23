# Entrega · Laboratorio API · Notas del semestre

**Equipo:** ______________________  
**Integrantes:** ______________________  
**Repositorio:** ______________________

> Completa este archivo a medida que avanzas (cada sección dice en qué parte de la guía se llena).
> Escribe con tus palabras: las respuestas copiadas de la guía o de otro equipo no cuentan.

---

## 1. El contrato que diseñé (Parte 1 · ANTES de programar)

La app de Notas necesita estas seis operaciones. Para cada una decide **el método HTTP, la URI y los estados** que
devolverá (el éxito y los errores posibles). Reglas del juego: la URI nombra un **recurso** (sustantivo, plural,
minúsculas, con versión `/v1`) y el **método** es la acción. No pongas verbos en la URI.

| Operación | Método | URI | Éxito (estado + qué devuelve) | Errores posibles (estado → cuándo) |
|---|---|---|---|---|
| Listar todas las evaluaciones | | | | |
| Ver una evaluación | | | | |
| Crear una evaluación | | | | |
| Poner o quitar la nota de una evaluación | | | | |
| Eliminar una evaluación | | | | |
| Ver el resumen (acumulado, nota necesaria, estado) | | | | |
Método del Modelo	¿Cambia el estado?	Recurso	Verbo	Ruta	Éxito
evaluaciones (lista)	No	La colección de evaluaciones	GET	/evaluaciones	200
obtener(id)	No	Una evaluación	GET	/evaluaciones/:id	200
agregar({ nombre, peso, nota })	Sí: crea	La colección (el servidor decide el id)	POST	/evaluaciones	201
calificar(id, nota)	Sí: modifica solo la nota	Una evaluación	PATCH	/evaluaciones/:id	200
eliminar(id)	Sí: borra	Una evaluación	DELETE	/evaluaciones/:id	204
resumen()	No: se calcula	El resumen (recurso que no es una fila de datos)	GET	/resumen	200

### 1b. Critica estas direcciones

Alguien diseñó estas direcciones. Escribe qué está mal en cada una y cómo la reescribirías.

| Diseño original | Qué está mal | Cómo la reescribo |
|---|---|---|
| `POST /crearEvaluacion` | | |
| `GET /getAllEvaluaciones?format=json` | | |
| `GET /eliminar?id=3` | | |
| `POST /evaluacion/3/calificar` (responde `200 { "ok": false, "error": "..." }` si la nota es inválida) | | |
| `GET /v1/Evaluaciones/` | | |
| `PUT /evaluaciones` con **toda** la lista de evaluaciones en el cuerpo, cada vez que algo cambia | | |
###  Las seis operaciones

| Operación | Método | URI | Éxito | Errores posibles |
|---|---|---|---|---|
| Listar evaluaciones | GET | `/v1/evaluaciones` | 200 con la lista (puede venir vacía) | Ninguno de negocio |
| Obtener una evaluación | GET | `/v1/evaluaciones/{id}` | 200 con la evaluación | 404: el id no existe |
| Agregar una evaluación | POST | `/v1/evaluaciones` | 201 con la evaluación creada y su dirección en `Location` | 422: nombre vacío o de más de 40 caracteres, peso fuera de 1-100, nota fuera de 0-5, o pesos que suman más de 100. 409: ya existe una con ese nombre |
| Calificar una evaluación | PATCH | `/v1/evaluaciones/{id}` (cuerpo: `{ "nota": 4.5 }`) | 200 con la evaluación actualizada | 404: el id no existe. 422: nota fuera de 0-5 |
| Eliminar una evaluación | DELETE | `/v1/evaluaciones/{id}` | 204 sin cuerpo | 404: el id no existe |
| Ver el resumen | GET | `/v1/resumen` | 200 con el resumen calculado | Ninguno de negocio |

###  Critica estas direcciones

| Diseño original | Qué está mal | Cómo la reescribo |
|---|---|---|
| `POST /crearEvaluacion` | Rompe la regla 1 (el verbo "crear" está en la URI, y el método ya es la acción), la 2 (singular) y la 3 (camelCase) | `POST /v1/evaluaciones` |
| `GET /getAllEvaluaciones?format=json` | Rompe la regla 1 (`getAll` repite el GET), la 3 (camelCase) y la 4 (sin versión). El formato no es un filtro, se pide con la cabecera `Accept` | `GET /v1/evaluaciones` |
| `GET /eliminar?id=3` | Rompe la regla 1 (verbo en la URI) y la 2 (el id va en la ruta). Además un GET debe ser seguro y este borra: un navegador o un rastreador podría eliminar datos solo por visitar el enlace | `DELETE /v1/evaluaciones/3` |
| `POST /evaluacion/3/calificar` (responde `200 { "ok": false, ... }`) | Rompe la regla 1 (verbo "calificar"), la 2 (singular), la 6 (el fallo se dice con un campo `ok` y un 200 en vez del estado HTTP) y la 7 (error sin formato estándar) | `PATCH /v1/evaluaciones/3` con `{ "nota": 4.5 }`. Éxito 200; nota inválida 422 y id inexistente 404, ambos con `application/problem+json` |
| `GET /v1/Evaluaciones/` | Rompe la regla 3 (mayúscula y barra final) | `GET /v1/evaluaciones` |
| `PUT /evaluaciones` con toda la lista en el cuerpo | Rompe la regla 2 (cada elemento debe colgar de su colección con su propia URI) y la 4 (sin versión). PUT reemplaza un recurso completo, y acá se reenvía y se reemplaza la colección entera por cada cambio | `POST /v1/evaluaciones` para crear, `PATCH /v1/evaluaciones/{id}` para cambiar y `DELETE /v1/evaluaciones/{id}` para borrar |
## 2. Mis decisiones de estado (Parte 2)

Después de completar `ESTADO_POR_CODIGO`, responde con tus palabras.

| Situación | Estado que elegí | ¿Por qué ese y no otro? |
|---|---|---|
| El peso es 0, o la nota es 7 | | |
| El nombre ya existe, o los pesos pasarían de 100 | | |
| La evaluación no existe | | |
| El cuerpo no es JSON, o está roto | | |
| El cuerpo es JSON pero se envió como `text/plain` | | |
| Se pide `PUT /v1/evaluaciones` (no existe ese método ahí) | | |

1. ¿Por qué calificar usa `PATCH` y no `PUT`? ¿Y por qué crear usa `POST` y no `PUT`?
2. `DELETE` repetido: la primera vez responde 204 y la segunda 404. ¿Eso rompe la idempotencia? Explica qué significa en realidad «idempotente».
3. ¿Por qué el `type` de un problema es un identificador estable y no basta con el `detail`?

## 3. MVC a los dos lados del cable (Parte 3)

Dibuja (a mano y pega una foto, o con texto/Mermaid) el recorrido completo desde que el usuario presiona **Agregar**
hasta que ve la fila nueva. Marca en cada paso **el archivo y el método** que actúa, y dónde cruza el cable.

```text
(tu diagrama aquí)
```

1. ¿Qué archivos del navegador **no** tuviste que tocar al conectar la API? ¿Qué te dice eso de la arquitectura?
2. ¿Dónde viven ahora las reglas de negocio? ¿Por qué el navegador no debe validar «por su cuenta» el peso, si ya lo sabe?
3. Cuando el servidor se cae, ¿qué ve el usuario? ¿Qué pieza del MVC lo decide?

## 4. Versionado (Parte 4)

Clasifica cada cambio posible a la API como **compatible** (los clientes existentes siguen funcionando) o **rompe** a
los clientes existentes, y justifica en una frase.

| Cambio | ¿Compatible o rompe? | ¿Por qué? |
|---|---|---|
| Agregar el campo `aporte` a cada evaluación | Compatible | Es un campo nuevo y los clientes viejos lo ignoran, así que siguen leyendo lo mismo de antes. |
| Cambiar `peso` por `porcentaje` en cada evaluación | Rompe | Los clientes buscan `peso` y ya no existe, entonces les llega vacío. |
| Devolver `nota` como texto ("4.2") en vez de número | Rompe | Cambia el tipo del dato y un cliente que hace cuentas con la nota falla o junta texto. |
| Agregar el endpoint `GET /v1/evaluaciones/{id}/historial` | Compatible | Es una ruta nueva y las que ya existían no cambian. |
| Pasar la lista de un arreglo a un objeto `{ datos, paginacion }` | Rompe | El cliente espera un arreglo y recibe un objeto, así que su código para recorrer la lista falla. |
| Exigir un campo nuevo, `profesor`, al crear una evaluación | Rompe | Los clientes viejos no lo mandan y el servidor les rechaza la petición. Si fuera opcional sí sería compatible. |
| Cambiar el `porPagina` por defecto de 10 a 20 | Rompe | La forma de la respuesta es igual, pero un cliente que contaba con 10 por página recibe otra cantidad y se le descuadran las páginas. |
| Aceptar también `peso` con decimales de coma ("12,5") | Compatible | Solo aceptamos más formatos de entrada y lo que los clientes viejos mandaban sigue funcionando. |

**Plan de retiro de la v1.** Fechas que usaron en `Deprecation` y `Sunset`: ______________________.
¿Cómo se enteraría un cliente real que nunca lee tu documentación? ¿Qué pondrías en tu plan para ayudarlos a migrar?

## 5. Evidencias (Partes 2 a 5)

**Salida de `npm test`** (pega el final, donde dice cuántas pruebas pasan):

```text

```

**Captura de pantalla** de la pestaña *Network* del navegador mostrando las cabeceras `Deprecation` y `Sunset` de `GET /v1/evaluaciones`: _(pega la imagen o su enlace)_

**Fragmento de `/openapi.json`** con la operación `GET /v2/evaluaciones`:

```json

```

## 6. Reflexión

1. En la clase pasada el Modelo guardaba en `localStorage`. ¿Qué problemas concretos resolvió llevarlo a un servidor? ¿Cuáles problemas **nuevos** aparecieron (piensa en tiempo, fallos, dos aparatos)?
2. ¿Qué parte de lo que hicieron hoy es **REST de verdad** y qué parte es solo «JSON sobre HTTP»? (Pista: recursos, representaciones, métodos con significado, estados, sin estado.)
3. Elijan un principio de diseño de endpoints que les costó respetar. ¿Cuál era la tentación y qué prueba o regla los detuvo?
4. La documentación OpenAPI y el código pueden contradecirse. ¿Cómo las pruebas de la Parte 5 lo evitan? ¿Qué otra forma conocen de mantenerlas de acuerdo?
5. Si esta API la usaran 50 aplicaciones de otras personas, ¿qué cambiaría en su manera de evolucionarla?
