/* =========================================================
   BALCÓN AL MAR · HABITACIONES
   CONFIGURACIÓN GENERAL
   ========================================================= */


/* ---------------------------------------------------------
   INFORMACIÓN DE LA APLICACIÓN
   --------------------------------------------------------- */

const APP_CONFIG = {

  name: "Balcón al Mar · Habitaciones",

  version: "1.0.0",

  timezone: "Europe/Madrid",

  pollingInterval: 20000

};


/* ---------------------------------------------------------
   HABITACIONES ACTIVAS
   --------------------------------------------------------- */

const ROOMS = [
  "101",
  "102",
  "103",
  "104",
  "105",
  "106",

  "21",
  "22",
  "23",
  "24",
  "25",
  "26",

  "B7"
];


/* ---------------------------------------------------------
   ESTADOS DE HABITACIÓN
   --------------------------------------------------------- */

const ROOM_STATUS = {

  DIRTY: "sucia",

  READY: "lista",

  REVIEWED: "revisada"

};


/* ---------------------------------------------------------
   NOMBRES DE LAS HOJAS DE GOOGLE SHEETS
   --------------------------------------------------------- */

const SHEETS = {

  ROOMS: "Habitaciones",

  HISTORY: "Historial",

  CHECKLIST: "Checklist",

  USERS: "Usuarios",

  CONFIG: "Configuración"

};


/* ---------------------------------------------------------
   COLUMNAS DE LA HOJA HABITACIONES
   --------------------------------------------------------- */

const ROOMS_COLUMNS = [

  "ID",

  "Habitación",

  "Estado",

  "Limpiada por",

  "Revisada por",

  "Última actualización"

];


/* ---------------------------------------------------------
   COLUMNAS DE LA HOJA HISTORIAL
   --------------------------------------------------------- */

const HISTORY_COLUMNS = [

  "Fecha/hora",

  "Habitación",

  "Acción",

  "Usuario",

  "Incidencias",

  "Observaciones"

];


/* ---------------------------------------------------------
   COLUMNAS DE LA HOJA CHECKLIST
   --------------------------------------------------------- */

const CHECKLIST_COLUMNS = [

  "ID",

  "Categoría",

  "Elemento",

  "Habitaciones específicas",

  "Activo"

];


/* ---------------------------------------------------------
   COLUMNAS DE LA HOJA USUARIOS
   --------------------------------------------------------- */

const USERS_COLUMNS = [

  "ID",

  "Nombre",

  "PIN",

  "Rol",

  "Activo"

];


/* ---------------------------------------------------------
   COLUMNAS DE LA HOJA CONFIGURACIÓN
   --------------------------------------------------------- */

const CONFIG_COLUMNS = [

  "Clave",

  "Valor",

  "Descripción"

];


/* ---------------------------------------------------------
   ROLES DE USUARIO
   --------------------------------------------------------- */

const USER_ROLES = {

  CLEANING: "limpieza",

  RECEPTION: "recepcion",

  ADMIN: "administrador"

};


/* ---------------------------------------------------------
   CONFIGURACIÓN INICIAL
   --------------------------------------------------------- */

const DEFAULT_CONFIG = {

  appName: "Balcón al Mar · Habitaciones",

  pollingInterval: 20000,

  timezone: "Europe/Madrid",

  activeRooms: ROOMS.join(",")

};
