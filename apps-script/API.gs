/**
 * API.gs
 * Capa de acceso para el frontend.
 *
 * El frontend no debería necesitar conocer cómo están
 * organizadas internamente las hojas de cálculo.
 */


/**
 * Devuelve todo el estado necesario para pintar la aplicación.
 */
function apiGetState() {
  return getState();
}


/**
 * Marca una habitación como limpia.
 */
function apiMarkClean(room, who) {
  return markClean(room, who);
}


/**
 * Completa la revisión de una habitación.
 */
function apiCompleteReview(room, who, missingLabels, notes) {
  return completeReview(room, who, missingLabels, notes);
}


/**
 * Marca una habitación como sucia / pendiente de limpieza.
 */
function apiResetRoom(room, who) {
  return resetRoom(room, who);
}


/**
 * Devuelve la configuración básica de la aplicación.
 */
function apiGetConfig() {
  return {
    name: APP_CONFIG.name,
    version: APP_CONFIG.version,
    timezone: APP_CONFIG.timezone,
    pollingSeconds: APP_CONFIG.pollingSeconds,
    rooms: ROOMS,
    statuses: ROOM_STATUS
  };
}


/**
 * Inicializa la estructura de la hoja de cálculo.
 *
 * Puede ejecutarse manualmente desde Apps Script.
 */
function apiSetup() {
  setupSpreadsheet();

  return {
    ok: true,
    message: 'Estructura de la aplicación inicializada correctamente.'
  };
}


/**
 * Comprueba que la configuración básica funciona.
 */
function apiTest() {
  return testConfiguration();
}
