/* =========================================================
   BALCÓN AL MAR · HABITACIONES
   Lógica principal de la aplicación
   ========================================================= */


/* ---------------------------------------------------------
   CONFIGURACIÓN
   --------------------------------------------------------- */

const CONFIG = {

  // Habitaciones activas
  rooms: [
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
  ],

  // Intervalo de actualización automática
  pollingInterval: 20000,
   apiUrl: "https://script.google.com/macros/s/AKfycbw3wVF12qi5xnOIXdPWQlJIuchQjjiUE2ra-R_UbRQ0FOmXic4gzRtidbeSeGsnIG8/exec",

  // Clave utilizada para guardar el nombre
  storageUserKey: "balconAlMar_user"
};


/* ---------------------------------------------------------
   CHECKLIST GENERAL
   --------------------------------------------------------- */

const CHECKLIST = [

  {
    category: "Amenities de baño",
    items: [
      "Papel higiénico",
      "Toallas",
      "Jabón de manos",
      "Gel de ducha"
    ]
  },

  {
    category: "Ropa de cama y limpieza",
    items: [
      "Sábanas",
      "Fundas de almohada",
      "Suelo limpio",
      "Papelera vacía",
      "Superficies sin polvo"
    ]
  },

  {
    category: "Equipamiento",
    items: [
      "Perchas",
      "Secador",
      "Mando de A/C",
      "Bombillas"
    ]
  },

  {
    category: "Últimos detalles",
    items: [
      "Ambientador / buen olor",
      "Aire acondicionado apagado",
      "TV encendida con bienvenida al cliente"
    ]
  }

];


/* ---------------------------------------------------------
   ELEMENTOS ESPECÍFICOS POR HABITACIÓN
   --------------------------------------------------------- */

const ROOM_EXTRA_ITEMS = {

  "22": [
    "Aguas de cortesía"
  ],

  "23": [
    "Aguas de cortesía",
    "Bolsitas de té y tazas"
  ],

  "24": [
    "Aguas de cortesía"
  ],

  "25": [
    "Aguas de cortesía",
    "Bolsitas de té y tazas"
  ]

};


/* ---------------------------------------------------------
   ESTADO LOCAL
   --------------------------------------------------------- */

let currentMode = "cleaning";

let roomsState = {};

let activityState = [];

let refreshTimer = null;


/* ---------------------------------------------------------
   INICIO
   --------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {

  initializeUser();

  initializeEvents();

  renderInitialRooms();

  loadState();

  startPolling();

});


/* ---------------------------------------------------------
   USUARIO
   --------------------------------------------------------- */

function initializeUser() {

  const input = document.getElementById("userName");

  if (!input) {
    return;
  }

  const savedUser =
    localStorage.getItem(CONFIG.storageUserKey);

  if (savedUser) {
    input.value = savedUser;
  }

  input.addEventListener("input", () => {

    const name = input.value.trim();

    localStorage.setItem(
      CONFIG.storageUserKey,
      name
    );

  });

}


/* ---------------------------------------------------------
   EVENTOS
   --------------------------------------------------------- */

function initializeEvents() {

  const refreshBtn =
    document.getElementById("refreshBtn");

  const printBtn =
    document.getElementById("printBtn");

  const cleaningModeBtn =
    document.getElementById("cleaningModeBtn");

  const receptionModeBtn =
    document.getElementById("receptionModeBtn");


  if (refreshBtn) {

    refreshBtn.addEventListener(
      "click",
      () => loadState(true)
    );

  }


  if (printBtn) {

    printBtn.addEventListener(
      "click",
      () => window.print()
    );

  }


  if (cleaningModeBtn) {

    cleaningModeBtn.addEventListener(
      "click",
      () => setMode("cleaning")
    );

  }


  if (receptionModeBtn) {

    receptionModeBtn.addEventListener(
      "click",
      () => setMode("reception")
    );

  }

}


/* ---------------------------------------------------------
   CAMBIO DE MODO
   --------------------------------------------------------- */

function setMode(mode) {
  currentMode = mode;

  const cleaningBtn =
    document.getElementById("cleaningModeBtn");

  const receptionBtn =
    document.getElementById("receptionModeBtn");

  const app =
    document.getElementById("app");

  // Cambiar estado visual del botón
  if (cleaningBtn) {
    cleaningBtn.classList.toggle(
      "active",
      mode === "cleaning"
    );

    cleaningBtn.setAttribute(
      "aria-pressed",
      String(mode === "cleaning")
    );
  }

  if (receptionBtn) {
    receptionBtn.classList.toggle(
      "active",
      mode === "reception"
    );

    receptionBtn.setAttribute(
      "aria-pressed",
      String(mode === "reception")
    );
  }

  // Informar al CSS de qué modo estamos usando
  if (app) {
    const localMode =
      mode === "cleaning"
        ? "limpieza"
        : "recepcion";

    app.setAttribute(
      "data-local-mode",
      localMode
    );
  }

  // Recordar el modo elegido
  try {
    localStorage.setItem(
      "balconmar-modo",
      mode === "cleaning"
        ? "limpieza"
        : "recepcion"
    );
  } catch (error) {
    console.warn(
      "No se ha podido guardar el modo:",
      error
    );
  }

  renderRooms();
}

/* ---------------------------------------------------------
   CREACIÓN INICIAL DE HABITACIONES
   --------------------------------------------------------- */

function renderInitialRooms() {

  const container =
    document.getElementById("roomsContainer");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  CONFIG.rooms.forEach(room => {

    roomsState[room] = {

      room: room,

      status: "sucia",

      cleanedBy: "",

      reviewedBy: "",

      updatedAt: null

    };

  });

  renderRooms();

}


/* ---------------------------------------------------------
   RENDER HABITACIONES
   --------------------------------------------------------- */

function renderRooms() {

  const container =
    document.getElementById("roomsContainer");

  const template =
    document.getElementById("roomTemplate");


  if (!container || !template) {
    return;
  }


  container.innerHTML = "";


  CONFIG.rooms.forEach(room => {

    const data =
      roomsState[room] || {

        room: room,
        status: "sucia",
        cleanedBy: "",
        reviewedBy: "",
        updatedAt: null

      };


    const fragment =
      template.content.cloneNode(true);

    const card =
      fragment.querySelector(".room-card");


    card.dataset.room = room;

    card.classList.add(
      `status-${data.status}`
    );


    const roomNumber =
      fragment.querySelector(".room-number");

    const status =
      fragment.querySelector(".room-status");

    const lastUser =
      fragment.querySelector(".last-user");


    roomNumber.textContent = room;

    status.textContent =
      getStatusLabel(data.status);

    lastUser.textContent =
      getLastUser(data);


    const cleanBtn =
      fragment.querySelector(
        '[data-action="clean"]'
      );

    const reviewBtn =
      fragment.querySelector(
        '[data-action="review"]'
      );

    const resetBtn =
      fragment.querySelector(
        '[data-action="reset"]'
      );


    if (cleanBtn) {

      cleanBtn.addEventListener(
        "click",
        () => markRoomClean(room)
      );

    }


    if (reviewBtn) {

      reviewBtn.addEventListener(
        "click",
        () => openChecklist(card, room)
      );

    }


    if (resetBtn) {

      resetBtn.addEventListener(
        "click",
        () => resetRoom(room)
      );

    }


    const cancelBtn =
      fragment.querySelector(
        '[data-action="cancel-review"]'
      );

    const confirmBtn =
      fragment.querySelector(
        '[data-action="confirm-review"]'
      );


    if (cancelBtn) {

      cancelBtn.addEventListener(
        "click",
        () => closeChecklist(card)
      );

    }


    if (confirmBtn) {

      confirmBtn.addEventListener(
        "click",
        () => confirmReview(card, room)
      );

    }


    updateActionButtons(
      fragment,
      data.status
    );


    container.appendChild(fragment);

  });


  updateStatistics();

}


/* ---------------------------------------------------------
   ETIQUETAS DE ESTADO
   --------------------------------------------------------- */

function getStatusLabel(status) {

  switch (status) {

    case "sucia":
      return "Sucia";

    case "lista":
      return "Lista para revisar";

    case "revisada":
      return "Revisada";

    default:
      return status || "Desconocido";

  }

}


/* ---------------------------------------------------------
   ÚLTIMO USUARIO
   --------------------------------------------------------- */

function getLastUser(data) {

  if (data.status === "revisada") {

    return data.reviewedBy || "—";

  }

  if (data.status === "lista") {

    return data.cleanedBy || "—";

  }

  return data.cleanedBy || data.reviewedBy || "—";

}


/* ---------------------------------------------------------
   BOTONES SEGÚN ESTADO
   --------------------------------------------------------- */

function updateActionButtons(fragment, status) {

  const cleanBtn =
    fragment.querySelector(
      '[data-action="clean"]'
    );

  const reviewBtn =
    fragment.querySelector(
      '[data-action="review"]'
    );

  const resetBtn =
    fragment.querySelector(
      '[data-action="reset"]'
    );


  if (cleanBtn) {

    cleanBtn.hidden =
      status !== "sucia";

  }


  if (reviewBtn) {

    reviewBtn.hidden =
      status !== "lista";

  }


  if (resetBtn) {

    resetBtn.hidden =
      status === "sucia";

  }

}


/* ---------------------------------------------------------
   CHECKLIST
   --------------------------------------------------------- */

function buildChecklist(room) {

  const groups = [];

  CHECKLIST.forEach(group => {

    groups.push({

      category: group.category,

      items: [...group.items]

    });

  });


  const extraItems =
    ROOM_EXTRA_ITEMS[room];


  if (extraItems && extraItems.length) {

    groups.push({

      category: "Elementos específicos",

      items: [...extraItems]

    });

  }


  return groups;

}


/* ---------------------------------------------------------
   ABRIR CHECKLIST
   --------------------------------------------------------- */

function openChecklist(card, room) {

  const checklist =
    card.querySelector(".checklist");

  const itemsContainer =
    card.querySelector(".checklist-items");


  if (!checklist || !itemsContainer) {
    return;
  }


  itemsContainer.innerHTML = "";


  const groups =
    buildChecklist(room);


  groups.forEach(group => {

    const category =
      document.createElement("div");

    category.className =
      "checklist-category";


    const title =
      document.createElement("strong");

    title.textContent =
      group.category;


    category.appendChild(title);

    itemsContainer.appendChild(category);


    group.items.forEach(item => {

      const label =
        document.createElement("label");

      label.className =
        "check-item";


      const checkbox =
        document.createElement("input");

      checkbox.type = "checkbox";

      checkbox.dataset.item = item;


      const text =
        document.createElement("span");

      text.textContent = item;


      label.appendChild(checkbox);

      label.appendChild(text);

      itemsContainer.appendChild(label);

    });

  });


  checklist.hidden = false;

  card.dataset.checklistOpen = "true";

}


/* ---------------------------------------------------------
   CERRAR CHECKLIST
   --------------------------------------------------------- */

function closeChecklist(card) {

  const checklist =
    card.querySelector(".checklist");

  if (checklist) {

    checklist.hidden = true;

  }

  card.dataset.checklistOpen = "false";

}


/* ---------------------------------------------------------
   OBTENER USUARIO
   --------------------------------------------------------- */

function getCurrentUser() {

  const input =
    document.getElementById("userName");

  if (!input) {
    return "";
  }

  return input.value.trim();

}


/* ---------------------------------------------------------
   VALIDAR USUARIO
   --------------------------------------------------------- */

function requireUser() {

  const user =
    getCurrentUser();


  if (!user) {

    alert(
      "Introduce tu nombre antes de realizar esta acción."
    );

    const input =
      document.getElementById("userName");

    if (input) {
      input.focus();
    }

    return null;

  }


  return user;

}


/* ---------------------------------------------------------
   MARCAR HABITACIÓN COMO LIMPIA
   --------------------------------------------------------- */

function markRoomClean(room) {

  const user =
    requireUser();

  if (!user) {
    return;
  }


  /*
   * Actualización optimista.
   * Más adelante esta operación se enviará
   * al servidor de Google Apps Script.
   */

  if (!roomsState[room]) {
    roomsState[room] = {};
  }


  roomsState[room].status = "lista";

  roomsState[room].cleanedBy = user;

  roomsState[room].updatedAt =
    new Date().toISOString();


  addLocalActivity({

    room: room,

    action: "Limpieza completada",

    user: user

  });


  renderRooms();

  updateLastUpdate();

  saveStateToBackend(
    "markClean",
    {
      room: room,
      who: user
    }
  );

}


/* ---------------------------------------------------------
   CONFIRMAR REVISIÓN
   --------------------------------------------------------- */

function confirmReview(card, room) {

  const user =
    requireUser();

  if (!user) {
    return;
  }


  const checkboxes =
    card.querySelectorAll(
      '.check-item input[type="checkbox"]'
    );


  const missingLabels = [];


  checkboxes.forEach(checkbox => {

    if (!checkbox.checked) {

      missingLabels.push(
        checkbox.dataset.item
      );

    }

  });


  const notesElement =
    card.querySelector(".notes");


  const notes =
    notesElement
      ? notesElement.value.trim()
      : "";


  /*
   * Por seguridad, no permitimos confirmar
   * una habitación sin completar el checklist.
   */

  if (missingLabels.length > 0) {

    const continueAnyway =
      confirm(
        `Hay ${missingLabels.length} elemento(s) sin marcar.\n\n` +
        `¿Quieres registrar la revisión igualmente?`
      );

    if (!continueAnyway) {
      return;
    }

  }


  if (!roomsState[room]) {
    roomsState[room] = {};
  }


  roomsState[room].status = "revisada";

  roomsState[room].reviewedBy = user;

  roomsState[room].updatedAt =
    new Date().toISOString();


  addLocalActivity({

    room: room,

    action: "Revisión completada",

    user: user,

    missingLabels: missingLabels,

    notes: notes

  });


  closeChecklist(card);

  renderRooms();

  updateLastUpdate();


  saveStateToBackend(
    "completeReview",
    {
      room: room,
      who: user,
      missingLabels: missingLabels,
      notes: notes
    }
  );

}


/* ---------------------------------------------------------
   MARCAR SUCIA / RESET
   --------------------------------------------------------- */

function resetRoom(room) {

  const user =
    requireUser();

  if (!user) {
    return;
  }


  const confirmed =
    confirm(
      `¿Marcar la habitación ${room} como sucia?`
    );


  if (!confirmed) {
    return;
  }


  if (!roomsState[room]) {
    roomsState[room] = {};
  }


  roomsState[room].status = "sucia";

  roomsState[room].updatedAt =
    new Date().toISOString();


  addLocalActivity({

    room: room,

    action: "Habitación marcada como sucia",

    user: user

  });


  renderRooms();

  updateLastUpdate();


  saveStateToBackend(
    "resetRoom",
    {
      room: room,
      who: user
    }
  );

}


/* ---------------------------------------------------------
   ACTIVIDAD LOCAL
   --------------------------------------------------------- */

function addLocalActivity(activity) {

  activityState.unshift({

    ...activity,

    timestamp:
      new Date().toISOString()

  });


  /*
   * Limitamos la actividad local
   * para no acumular datos indefinidamente.
   */

  activityState =
    activityState.slice(0, 30);


  renderActivity();

}


/* ---------------------------------------------------------
   RENDER ACTIVIDAD
   --------------------------------------------------------- */

function renderActivity() {

  const container =
    document.getElementById("activityContainer");


  if (!container) {
    return;
  }


  container.innerHTML = "";


  if (!activityState.length) {

    const empty =
      document.createElement("div");

    empty.className =
      "empty-state";

    empty.textContent =
      "No hay actividad reciente.";

    container.appendChild(empty);

    return;

  }


  activityState.forEach(activity => {

    const item =
      document.createElement("div");

    item.className =
      "activity-item";


    const main =
      document.createElement("div");

    main.className =
      "activity-main";


    const text =
      document.createElement("div");

    text.className =
      "activity-text";


    text.textContent =
      `Habitación ${activity.room} · ` +
      `${activity.action} · ` +
      `${activity.user}`;


    main.appendChild(text);


    if (
      activity.missingLabels &&
      activity.missingLabels.length
    ) {

      const missing =
        document.createElement("div");

      missing.className =
        "activity-text";

      missing.textContent =
        `Pendientes: ${activity.missingLabels.join(", ")}`;

      main.appendChild(missing);

    }


    if (activity.notes) {

      const notes =
        document.createElement("div");

      notes.className =
        "activity-text";

      notes.textContent =
        `Observaciones: ${activity.notes}`;

      main.appendChild(notes);

    }


    const time =
      document.createElement("div");

    time.className =
      "activity-time";

    time.textContent =
      formatDate(activity.timestamp);


    item.appendChild(main);

    item.appendChild(time);

    container.appendChild(item);

  });

}


/* ---------------------------------------------------------
   ESTADÍSTICAS
   --------------------------------------------------------- */

function updateStatistics() {

  let dirty = 0;

  let ready = 0;

  let reviewed = 0;


  Object.values(roomsState).forEach(room => {

    if (room.status === "sucia") {
      dirty++;
    }

    if (room.status === "lista") {
      ready++;
    }

    if (room.status === "revisada") {
      reviewed++;
    }

  });


  const dirtyElement =
    document.getElementById("dirtyCount");

  const readyElement =
    document.getElementById("readyCount");

  const reviewedElement =
    document.getElementById("reviewedCount");


  if (dirtyElement) {
    dirtyElement.textContent = dirty;
  }

  if (readyElement) {
    readyElement.textContent = ready;
  }

  if (reviewedElement) {
    reviewedElement.textContent = reviewed;
  }

}


/* ---------------------------------------------------------
   FECHA / HORA
   --------------------------------------------------------- */

function formatDate(value) {

  if (!value) {
    return "—";
  }


  const date =
    new Date(value);


  if (Number.isNaN(date.getTime())) {
    return "—";
  }


  return date.toLocaleString(
    "es-ES",
    {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }
  );

}


/* ---------------------------------------------------------
   ÚLTIMA ACTUALIZACIÓN
   --------------------------------------------------------- */

function updateLastUpdate() {

  const element =
    document.getElementById("lastUpdate");


  if (!element) {
    return;
  }


  element.textContent =
    `Actualizado ${formatDate(new Date())}`;

}


/* ---------------------------------------------------------
   POLLING
   --------------------------------------------------------- */

function startPolling() {

  if (refreshTimer) {

    clearInterval(refreshTimer);

  }


  refreshTimer =
    setInterval(
      () => loadState(),
      CONFIG.pollingInterval
    );

}


/* ---------------------------------------------------------
   ACTUALIZACIÓN AL VOLVER A LA PESTAÑA
   --------------------------------------------------------- */

document.addEventListener(
  "visibilitychange",
  () => {

    if (!document.hidden) {

      loadState();

    }

  }
);


/* ---------------------------------------------------------
   CARGAR ESTADO
   --------------------------------------------------------- */

function loadState(showMessage = false) {

  fetch(CONFIG.apiUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(
          `Error HTTP ${response.status}`
        );
      }

      return response.json();
    })

    .then(response => {

      if (!response) {
        return;
      }

      if (response.rooms) {
        roomsState =
          normalizeRooms(response.rooms);
      }

      if (response.activity) {
        activityState =
          response.activity;
      }

      renderRooms();
      renderActivity();
      updateLastUpdate();

    })

    .catch(error => {

      console.error(
        "Error cargando estado:",
        error
      );

      if (showMessage) {
        alert(
          "No se ha podido actualizar la información."
        );
      }

    });

}

/* ---------------------------------------------------------
   NORMALIZAR HABITACIONES
   --------------------------------------------------------- */

function normalizeRooms(rooms) {

  const result = {};


  CONFIG.rooms.forEach(room => {

    const original =
      rooms[room] || rooms.find?.(
        item => item.room === room
      );


    if (original) {

      result[room] = {

        room: room,

        status:
          original.status || "sucia",

        cleanedBy:
          original.cleanedBy || "",

        reviewedBy:
          original.reviewedBy || "",

        updatedAt:
          original.updatedAt || null

      };

    } else {

      result[room] = {

        room: room,

        status: "sucia",

        cleanedBy: "",

        reviewedBy: "",

        updatedAt: null

      };

    }

  });


  return result;

}


/* ---------------------------------------------------------
   COMUNICACIÓN CON APPS SCRIPT
   --------------------------------------------------------- */

function saveStateToBackend(action, data) {

  if (!CONFIG.apiUrl) {

    console.error(
      "No se ha configurado la URL de la API."
    );

    handleBackendError(
      new Error("API URL no configurada.")
    );

    return;
  }

  let url =
    CONFIG.apiUrl +
    "?action=" +
    encodeURIComponent(action);

  Object.keys(data || {}).forEach(key => {

    const value = data[key];

    if (value === undefined || value === null) {
      return;
    }

    let encodedValue;

    if (Array.isArray(value)) {

      encodedValue =
        JSON.stringify(value);

    } else {

      encodedValue =
        String(value);

    }

    url +=
      "&" +
      encodeURIComponent(key) +
      "=" +
      encodeURIComponent(encodedValue);

  });


  fetch(url, {
    method: "GET",
    cache: "no-store"
  })

    .then(response => {

      if (!response.ok) {

        throw new Error(
          `Error HTTP ${response.status}`
        );

      }

      return response.json();

    })

    .then(response => {

      if (!response || response.ok === false) {

        throw new Error(
          response?.error ||
          "El servidor no ha podido guardar el cambio."
        );

      }

      console.log(
        "Cambio guardado correctamente:",
        action,
        response
      );

      /*
       * Volvemos a cargar el estado real del servidor.
       * Así confirmamos que Google Sheets ha recibido
       * correctamente el cambio.
       */

      loadState();

    })

    .catch(error => {

      handleBackendError(error);

    });

}


/* ---------------------------------------------------------
   ERRORES BACKEND
   --------------------------------------------------------- */

function handleBackendError(error) {

  console.error(
    "Error de servidor:",
    error
  );


  alert(
    "Se ha producido un error al guardar los cambios."
  );


  /*
   * Si el servidor no acepta el cambio,
   * recuperamos el estado real.
   */

  loadState();

}
