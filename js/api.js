/**
 * api.js — Capa de comunicación frontend ⇄ backend (Google Apps Script).
 * =====================================================================
 * ESTADO: PREPARADO, TODAVÍA SIN INTEGRARSE.
 *
 * Este fichero NO está incluido todavía en index.html y NO se ejecuta.
 * Su integración (sustituir las 4 llamadas `google.script.run` de
 * js/app.js por estas funciones) se hará en el paso 8 del plan de
 * migración, cuando la API ya haya sido probada por separado (paso 7).
 *
 * Diseño de la API (HTTP/JSON):
 *
 *   Lectura   GET  {API_BASE}?action=getState
 *   Escritura POST {API_BASE}   cuerpo JSON:
 *             { "action": "markClean",      "room": "101", "who": "María" }
 *             { "action": "completeReview", "room": "101", "who": "Juan",
 *               "missingLabels": ["Toallas"], "notes": "Falta secador" }
 *             { "action": "resetRoom",      "room": "101" }
 *
 * Toda respuesta es JSON:
 *   Éxito  → objeto de estado completo: { rooms, activity, roomsOrder }
 *   Error  → { "error": "mensaje visible para el usuario" }
 *
 * IMPORTANTE: las funciones se llaman IGUAL que los métodos de
 * `google.script.run` que ya usa js/app.js (getState, markClean,
 * completeReview, resetRoom), para que el cambio en app.js sea una
 * sustitución mecánica de llamada y no una reescritura de lógica.
 * Todas devuelven una Promesa con el mismo formato de estado que
 * devuelve hoy el servidor de Apps Script.
 */

/* URL de la aplicación web de Apps Script.
   Se rellenará en el paso 5/7 de la migración (cuando se despliegue),
   por ejemplo:
   'https://script.google.com/macros/s/AKfycb.../exec'          */
var API_BASE = '';

/* Tiempo máximo de espera antes de dar por fallida una llamada (ms). */
var API_TIMEOUT_MS = 30000;

/** Traduce un fallo de red/HTTP/JSON en un Error con mensaje legible,
 *  con el mismo formato que usa hoy js/app.js: err.message. */
function apiError_(message) {
  var err = new Error(message);
  err.name = 'ApiError';
  return err;
}

/** Núcleo común: lanza la petición y devuelve la respuesta en JSON. */
function apiRequest_(payload) {
  if (!API_BASE) {
    return Promise.reject(apiError_(
      '⚠️ API no configurada: falta la URL de Google Apps Script en js/api.js (API_BASE).'
    ));
  }

  var options = {
    method: payload.action === 'getState' ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    redirect: 'follow'
  };

  var url = API_BASE;
  if (payload.action === 'getState') {
    url += (API_BASE.indexOf('?') === -1 ? '?' : '&') + 'action=getState';
  } else {
    options.body = JSON.stringify(payload);
  }

  var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  if (controller) options.signal = controller.signal;
  var timer = setTimeout(function () { if (controller) controller.abort(); }, API_TIMEOUT_MS);

  return fetch(url, options)
    .then(function (res) { return res.json().catch(function () {
      throw apiError_('Respuesta no válida del servidor (no es JSON).');
    }); })
    .then(function (data) {
      clearTimeout(timer);
      if (data && typeof data.error === 'string') throw apiError_(data.error);
      return data;
    })
    .catch(function (e) {
      clearTimeout(timer);
      if (e && e.name === 'AbortError') {
        throw apiError_('Tiempo de espera agotado al contactar con el servidor. Vuelve a intentarlo.');
      }
      if (e && e.name === 'ApiError') throw e;
      throw apiError_('No se pudo contactar con el servidor: ' + (e && e.message ? e.message : e));
    });
}

/** Lectura del estado completo del panel.
 *  Sustituye a: google.script.run.getState() */
function getState() {
  return apiRequest_({ action: 'getState' });
}

/** Limpieza: marca la habitación como lista para revisar.
 *  Sustituye a: google.script.run.markClean(room, who) */
function markClean(room, who) {
  return apiRequest_({ action: 'markClean', room: room, who: who });
}

/** Recepción: completa la revisión con incidencias y notas.
 *  Sustituye a: google.script.run.completeReview(room, who, missingLabels, notes) */
function completeReview(room, who, missingLabels, notes) {
  return apiRequest_({
    action: 'completeReview',
    room: room,
    who: who,
    missingLabels: missingLabels || [],
    notes: notes || ''
  });
}

/** Registro de salida: la habitación vuelve a "sucia".
 *  Sustituye a: google.script.run.resetRoom(room) */
function resetRoom(room) {
  return apiRequest_({ action: 'resetRoom', room: room });
}
