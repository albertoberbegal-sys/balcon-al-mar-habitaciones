/**
 * api.js — Capa de comunicación frontend ⇄ backend (Google Apps Script).
 * =====================================================================
 * ESTADO: INTEGRADO (paso 8 de la migración).
 *
 * Este fichero se carga en index.html ANTES de js/app.js y sustituye
 * todas las llamadas `google.script.run` de la app (ya no se usan).
 * Comunicación desde GitHub Pages hacia el Web App de Apps Script.
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

/* URL de la aplicación web de Apps Script YA DESPLEGADA.
   Si algún día se redespliega con otra URL, hay que pegarla aquí y
   volver a subir js/api.js a GitHub Pages. */
var API_BASE = 'https://script.google.com/macros/s/AKfycbw3wVF12qi5xnOIXdPWQlJIuchQjjiUE2ra-R_UbRQ0FOmXic4gzRtidbeSeGsnIG8/exec';

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
    redirect: 'follow'
  };

  var url = API_BASE;
  if (payload.action === 'getState') {
    // GET con ?action=getState y SIN cabeceras adicionales: así el
    // navegador lo trata como petición "simple" y no lanza preflight.
    url += (API_BASE.indexOf('?') === -1 ? '?' : '&') + 'action=getState';
  } else {
    // 'text/plain' en lugar de 'application/json' para NO disparar el
    // preflight OPTIONS (Apps Script no puede devolver cabeceras CORS).
    // El cuerpo viaja igual: JSON.stringify(payload); el servidor lo lee
    // con e.postData.contents y hace JSON.parse(...).
    options.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
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
 *  El backend exige y registra "who" (quién marca la salida).
 *  Sustituye a: google.script.run.resetRoom(room) */
function resetRoom(room, who) {
  return apiRequest_({ action: 'resetRoom', room: room, who: who });
}
