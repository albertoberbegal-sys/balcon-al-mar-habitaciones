/**
 * Code.gs
 * Lógica principal del backend.
 */


/**
 * Sirve la aplicación web.
 */
function doGet(e) {

  ensureSpreadsheetSetup_();

  return HtmlService
    .createHtmlOutputFromFile("index")
    .setTitle(APP_CONFIG.name)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


/**
 * Comprueba si la hoja de cálculo está preparada.
 *
 * Si todavía no lo está, crea las hojas necesarias.
 */
function ensureSpreadsheetSetup_() {

  const properties = PropertiesService.getScriptProperties();

  const completed = properties.getProperty("SETUP_COMPLETED");

  if (completed === "true") {
    return;
  }

  if (!isSpreadsheetConfigured_()) {
    setupSpreadsheet();
  }

  properties.setProperty("SETUP_COMPLETED", "true");
}


/**
 * Devuelve el estado completo de la aplicación.
 */
function getState() {

  const lock = LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    return {
      rooms: getRoomsState_(),
      activity: getRecentActivity_(),
      serverTime: new Date().toISOString(),
      version: APP_CONFIG.version
    };

  } finally {

    lock.releaseLock();

  }
}


/**
 * Obtiene el estado actual de todas las habitaciones.
 */
function getRoomsState_() {

  const sheet = getSheet_(SHEETS.ROOMS);

  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return {};
  }

  const headers = values[0];

  const result = {};

  const roomIndex = headers.indexOf("Habitación");
  const statusIndex = headers.indexOf("Estado");
  const cleanedByIndex = headers.indexOf("Limpiada por");
  const reviewedByIndex = headers.indexOf("Revisada por");
  const updatedIndex = headers.indexOf("Última actualización");

  for (let i = 1; i < values.length; i++) {

    const row = values[i];

    const room = String(row[roomIndex] || "").trim();

    if (!room) {
      continue;
    }

    result[room] = {
      room: room,
      status: row[statusIndex] || ROOM_STATUS.DIRTY,
      cleanedBy: row[cleanedByIndex] || "",
      reviewedBy: row[reviewedByIndex] || "",
      updatedAt: row[updatedIndex] || ""
    };
  }

  return result;
}


/**
 * Marca una habitación como limpia.
 */
function markClean(room, who) {

  assertRoom_(room);
  assertWho_(who);

  const lock = LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    const sheet = getSheet_(SHEETS.ROOMS);

    const rowNumber = findRoomRow_(sheet, room);

    if (!rowNumber) {
      throw new Error("No se encontró la habitación " + room);
    }

    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0];

    const statusIndex = headers.indexOf("Estado") + 1;
    const cleanedByIndex = headers.indexOf("Limpiada por") + 1;
    const reviewedByIndex = headers.indexOf("Revisada por") + 1;
    const updatedIndex = headers.indexOf("Última actualización") + 1;

    const now = new Date();

    sheet.getRange(rowNumber, statusIndex).setValue(ROOM_STATUS.READY);
    sheet.getRange(rowNumber, cleanedByIndex).setValue(who);
    sheet.getRange(rowNumber, reviewedByIndex).setValue("");
    sheet.getRange(rowNumber, updatedIndex).setValue(now);

    addHistory_(
      room,
      "Limpieza completada",
      who,
      "",
      ""
    );

    return {
      ok: true,
      room: room,
      status: ROOM_STATUS.READY,
      cleanedBy: who,
      updatedAt: now.toISOString()
    };

  } finally {

    lock.releaseLock();

  }
}


/**
 * Completa la revisión de una habitación.
 */
function completeReview(room, who, missingLabels, notes) {

  assertRoom_(room);
  assertWho_(who);

  const lock = LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    const sheet = getSheet_(SHEETS.ROOMS);

    const rowNumber = findRoomRow_(sheet, room);

    if (!rowNumber) {
      throw new Error("No se encontró la habitación " + room);
    }

    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0];

    const statusIndex = headers.indexOf("Estado") + 1;
    const reviewedByIndex = headers.indexOf("Revisada por") + 1;
    const updatedIndex = headers.indexOf("Última actualización") + 1;

    const now = new Date();

    const incidents = Array.isArray(missingLabels)
      ? missingLabels.join(", ")
      : String(missingLabels || "");

    const observations = String(notes || "");

    sheet.getRange(rowNumber, statusIndex)
      .setValue(ROOM_STATUS.REVIEWED);

    sheet.getRange(rowNumber, reviewedByIndex)
      .setValue(who);

    sheet.getRange(rowNumber, updatedIndex)
      .setValue(now);

    addHistory_(
      room,
      "Revisión completada",
      who,
      incidents,
      observations
    );

    return {
      ok: true,
      room: room,
      status: ROOM_STATUS.REVIEWED,
      reviewedBy: who,
      updatedAt: now.toISOString()
    };

  } finally {

    lock.releaseLock();

  }
}


/**
 * Marca una habitación como sucia.
 */
function resetRoom(room, who) {

  assertRoom_(room);
  assertWho_(who);

  const lock = LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    const sheet = getSheet_(SHEETS.ROOMS);

    const rowNumber = findRoomRow_(sheet, room);

    if (!rowNumber) {
      throw new Error("No se encontró la habitación " + room);
    }

    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0];

    const statusIndex = headers.indexOf("Estado") + 1;
    const cleanedByIndex = headers.indexOf("Limpiada por") + 1;
    const reviewedByIndex = headers.indexOf("Revisada por") + 1;
    const updatedIndex = headers.indexOf("Última actualización") + 1;

    const now = new Date();

    sheet.getRange(rowNumber, statusIndex)
      .setValue(ROOM_STATUS.DIRTY);

    sheet.getRange(rowNumber, cleanedByIndex)
      .setValue(who);

    sheet.getRange(rowNumber, reviewedByIndex)
      .setValue("");

    sheet.getRange(rowNumber, updatedIndex)
      .setValue(now);

    addHistory_(
      room,
      "Habitación marcada como sucia",
      who,
      "",
      ""
    );

    return {
      ok: true,
      room: room,
      status: ROOM_STATUS.DIRTY,
      updatedAt: now.toISOString()
    };

  } finally {

    lock.releaseLock();

  }
}


/**
 * Busca una habitación dentro de la hoja.
 */
function findRoomRow_(sheet, room) {

  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return null;
  }

  const headers = values[0];

  const roomIndex = headers.indexOf("Habitación");

  if (roomIndex === -1) {
    throw new Error(
      'No existe la columna "Habitación" en la hoja.'
    );
  }

  for (let i = 1; i < values.length; i++) {

    if (String(values[i][roomIndex]).trim() === String(room).trim()) {
      return i + 1;
    }

  }

  return null;
}


/**
 * Añade una entrada al historial.
 */
function addHistory_(
  room,
  action,
  user,
  incidents,
  notes
) {

  const sheet = getSheet_(SHEETS.HISTORY);

  sheet.appendRow([
    new Date(),
    room,
    action,
    user,
    incidents || "",
    notes || ""
  ]);
}


/**
 * Obtiene las últimas actividades.
 */
function getRecentActivity_() {

  const sheet = getSheet_(SHEETS.HISTORY);

  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return [];
  }

  const start = Math.max(1, values.length - 20);

  const result = [];

  for (let i = values.length - 1; i >= start; i--) {

    result.push({
      timestamp: values[i][0] || "",
      room: values[i][1] || "",
      action: values[i][2] || "",
      user: values[i][3] || "",
      incidents: values[i][4] || "",
      notes: values[i][5] || ""
    });

  }

  return result;
}


/**
 * Comprueba que la habitación existe.
 */
function assertRoom_(room) {

  const value = String(room || "").trim();

  if (!ROOMS.includes(value)) {
    throw new Error(
      "Habitación no válida: " + value
    );
  }
}


/**
 * Comprueba que se ha indicado un usuario.
 */
function assertWho_(who) {

  const value = String(who || "").trim();

  if (!value) {
    throw new Error(
      "Debes indicar quién realiza la operación."
    );
  }

  if (value.length > 100) {
    throw new Error(
      "El nombre de usuario es demasiado largo."
    );
  }
}


/**
 * Normaliza una lista.
 */
function normalizeArray_(value) {

  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value];
}


/**
 * Función de prueba.
 */
function testConfiguration() {

  return {
    ok: true,
    app: APP_CONFIG.name,
    version: APP_CONFIG.version,
    rooms: ROOMS,
    sheets: SHEETS
  };
}
