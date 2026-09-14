/**
 * Sheets.gs
 * Gestión de la estructura y datos de Google Sheets.
 */


/**
 * Devuelve la hoja de cálculo vinculada al proyecto.
 */
function getSpreadsheet_() {

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error(
      "No se ha encontrado la hoja de cálculo vinculada."
    );
  }

  return spreadsheet;
}


/**
 * Obtiene una hoja por su nombre.
 */
function getSheet_(sheetName) {

  const spreadsheet = getSpreadsheet_();

  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(
      'No existe la hoja "' + sheetName + '".'
    );
  }

  return sheet;
}


/**
 * Obtiene una hoja o la crea si no existe.
 */
function getOrCreateSheet_(sheetName) {

  const spreadsheet = getSpreadsheet_();

  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  return sheet;
}


/**
 * Prepara una hoja con sus encabezados.
 */
function prepareSheet_(sheetName, columns) {

  const sheet = getOrCreateSheet_(sheetName);

  if (sheet.getLastRow() === 0) {

    sheet
      .getRange(1, 1, 1, columns.length)
      .setValues([columns]);

    sheet
      .getRange(1, 1, 1, columns.length)
      .setFontWeight("bold");

    sheet.setFrozenRows(1);
  }

  return sheet;
}


/**
 * Crea y prepara todas las hojas de la aplicación.
 */
function setupSpreadsheet() {

  const spreadsheet = getSpreadsheet_();

  // Habitaciones
  prepareSheet_(
    SHEETS.ROOMS,
    ROOMS_COLUMNS
  );

  // Historial
  prepareSheet_(
    SHEETS.HISTORY,
    HISTORY_COLUMNS
  );

  // Checklist
  prepareSheet_(
    SHEETS.CHECKLIST,
    CHECKLIST_COLUMNS
  );

  // Usuarios
  prepareSheet_(
    SHEETS.USERS,
    USERS_COLUMNS
  );

  // Configuración
  prepareSheet_(
    SHEETS.CONFIG,
    CONFIG_COLUMNS
  );

  // Datos iniciales
  initializeRooms_();
  initializeChecklist_();
  initializeConfiguration_();
  initializeUsers_();

  SpreadsheetApp.flush();

  return {
    ok: true,
    spreadsheetId: spreadsheet.getId(),
    message: "Estructura inicial creada correctamente."
  };
}


/**
 * Inicializa las habitaciones.
 */
function initializeRooms_() {

  const sheet = getSheet_(SHEETS.ROOMS);

  const existingData = sheet.getDataRange().getValues();

  // Si ya hay habitaciones, no las duplicamos.
  if (existingData.length > 1) {
    return;
  }

  const now = new Date();

  const rows = ROOMS.map(function(room, index) {

    return [
      index + 1,
      room,
      ROOM_STATUS.DIRTY,
      "",
      "",
      now
    ];

  });

  if (rows.length > 0) {

    sheet
      .getRange(
        2,
        1,
        rows.length,
        ROOMS_COLUMNS.length
      )
      .setValues(rows);

  }

  // Formato de fecha/hora
  sheet
    .getRange(
      2,
      6,
      rows.length,
      1
    )
    .setNumberFormat("dd/MM/yyyy HH:mm:ss");
}


/**
 * Datos del checklist.
 */
const CHECKLIST_DATA_ = [

  ["1", "Amenities de baño", "Papel higiénico", "", true],
  ["2", "Amenities de baño", "Toallas", "", true],
  ["3", "Amenities de baño", "Jabón de manos", "", true],
  ["4", "Amenities de baño", "Gel de ducha", "", true],

  ["5", "Ropa de cama y limpieza", "Sábanas", "", true],
  ["6", "Ropa de cama y limpieza", "Fundas de almohada", "", true],
  ["7", "Ropa de cama y limpieza", "Suelo limpio", "", true],
  ["8", "Ropa de cama y limpieza", "Papelera vacía", "", true],
  ["9", "Ropa de cama y limpieza", "Superficies sin polvo", "", true],

  ["10", "Equipamiento", "Perchas", "", true],
  ["11", "Equipamiento", "Secador", "", true],
  ["12", "Equipamiento", "Mando de A/C", "", true],
  ["13", "Equipamiento", "Bombillas", "", true],

  ["14", "Últimos detalles", "Ambientador / buen olor", "", true],
  ["15", "Últimos detalles", "Aire acondicionado apagado", "", true],
  ["16", "Últimos detalles", "TV encendida con bienvenida al cliente", "", true]
];


/**
 * Elementos específicos de determinadas habitaciones.
 */
const ROOM_EXTRA_DATA_ = [

  ["17", "Extras", "Aguas de cortesía", "22", true],
  ["18", "Extras", "Aguas de cortesía", "23", true],
  ["19", "Extras", "Bolsitas de té y tazas", "23", true],
  ["20", "Extras", "Aguas de cortesía", "24", true],
  ["21", "Extras", "Aguas de cortesía", "25", true],
  ["22", "Extras", "Bolsitas de té y tazas", "25", true]
];


/**
 * Inicializa el checklist.
 */
function initializeChecklist_() {

  const sheet = getSheet_(SHEETS.CHECKLIST);

  const existingData = sheet.getDataRange().getValues();

  if (existingData.length > 1) {
    return;
  }

  const rows = CHECKLIST_DATA_.concat(
    ROOM_EXTRA_DATA_
  );

  if (rows.length === 0) {
    return;
  }

  sheet
    .getRange(
      2,
      1,
      rows.length,
      CHECKLIST_COLUMNS.length
    )
    .setValues(rows);
}


/**
 * Inicializa la configuración.
 */
function initializeConfiguration_() {

  const sheet = getSheet_(SHEETS.CONFIG);

  const existingData = sheet.getDataRange().getValues();

  if (existingData.length > 1) {
    return;
  }

  const rows = [
    [
      "appName",
      DEFAULT_CONFIG.appName,
      "Nombre de la aplicación"
    ],
    [
      "pollingInterval",
      DEFAULT_CONFIG.pollingInterval,
      "Intervalo de actualización en milisegundos"
    ],
    [
      "timezone",
      DEFAULT_CONFIG.timezone,
      "Zona horaria"
    ],
    [
      "activeRooms",
      DEFAULT_CONFIG.activeRooms,
      "Habitaciones activas separadas por comas"
    ]
  ];

  sheet
    .getRange(
      2,
      1,
      rows.length,
      CONFIG_COLUMNS.length
    )
    .setValues(rows);
}


/**
 * Inicializa la hoja de usuarios.
 */
function initializeUsers_() {

  const sheet = getSheet_(SHEETS.USERS);

  const existingData = sheet.getDataRange().getValues();

  if (existingData.length > 1) {
    return;
  }

  // Dejamos preparada la estructura.
  // Los usuarios reales se añadirán posteriormente.
  const rows = [
    [
      "1",
      "Administrador",
      "",
      USER_ROLES.ADMIN,
      true
    ]
  ];

  sheet
    .getRange(
      2,
      1,
      rows.length,
      USERS_COLUMNS.length
    )
    .setValues(rows);
}


/**
 * Comprueba si las hojas necesarias ya existen.
 */
function isSpreadsheetConfigured_() {

  const spreadsheet = getSpreadsheet_();

  const requiredSheets = [
    SHEETS.ROOMS,
    SHEETS.HISTORY,
    SHEETS.CHECKLIST,
    SHEETS.USERS,
    SHEETS.CONFIG
  ];

  return requiredSheets.every(function(sheetName) {

    return spreadsheet.getSheetByName(sheetName) !== null;

  });
}
