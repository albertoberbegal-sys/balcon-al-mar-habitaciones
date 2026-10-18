
(function () {
try {
  var ROOMS = ["101","102","103","104","105","106","21","22","23","24","25","26","B7"];
  var EXTRA_ITEMS = {
    "22": ["Aguas de cortesía"],
    "23": ["Aguas de cortesía", "Bolsitas de té y tazas"],
    "24": ["Aguas de cortesía"],
    "25": ["Aguas de cortesía", "Bolsitas de té y tazas"]
  };
  var CATEGORIES = [
    ["Amenities de baño", ["Papel higiénico","Toallas","Jabón de manos","Gel de ducha"]],
    ["Ropa de cama y limpieza", ["Sábanas","Fundas de almohada","Suelo limpio","Papelera vacía","Superficies sin polvo"]],
    ["Equipamiento", ["Perchas","Secador","Mando de A/C","Bombillas"]],
    ["Últimos detalles", ["Ambientador / buen olor","Aire acondicionado apagado","TV encendida con bienvenida al cliente"]]
  ];
  var STATUS_LABEL = { sucia: 'Sucia', lista: 'Lista para revisar', revisada: 'Revisada' };
  var HINT_LABEL = {
    sucia: 'Pendiente de limpieza.',
    lista: 'Lista para revisión de Recepción.',
    revisada: 'Revisada — lista para el próximo huésped.'
  };

  var state = { rooms: {}, activity: [] };
  var dirtyRooms = {};       // habitaciones con edición en curso en ESTE dispositivo
  var pendingRooms = {};     // habitaciones con una acción en curso (esperando al servidor)
  var POLL_MS = 20000;

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function checklistHtml(room) {
    var groups = CATEGORIES.slice();
    if (EXTRA_ITEMS[room]) groups = groups.concat([["Habitación superior", EXTRA_ITEMS[room]]]);
    return groups.map(function (g) {
      var title = g[0], items = g[1];
      var rows = items.map(function (item) {
        return '<label class="checklist-row"><input type="checkbox" class="checklist-item" data-label="' + esc(item) + '"><span>' + esc(item) + '</span></label>';
      }).join('');
      return '<fieldset class="checklist-group"><legend>' + esc(title) + '</legend>' + rows + '</fieldset>';
    }).join('');
  }

  function roomCardHtml(room, r) {
    var historyItems = (r.history || []).map(function (t) {
      return '<li class="history-entry">' + esc(t) + '</li>';
    }).join('');
    var busy = pendingRooms[room];
    return '<article class="room-card" data-room="' + esc(room) + '" data-status="' + esc(r.status) + '">' +
      '<header class="room-card-header"><span class="room-number">' + esc(room) + '</span>' +
      '<span class="status-badge">' + STATUS_LABEL[r.status] + '</span></header>' +
      '<p class="hint">' + HINT_LABEL[r.status] + '</p>' +
      '<p class="who-line who-clean-line"' + (r.cleanedBy ? '' : ' hidden') + '>Limpiada por: <span class="who-name">' + esc(r.cleanedBy) + '</span></p>' +
      '<p class="who-line who-review-line"' + (r.reviewedBy ? '' : ' hidden') + '>Revisada por: <span class="who-name">' + esc(r.reviewedBy) + '</span></p>' +
      '<p class="card-error" hidden></p>' +
      '<div class="action-clean"><button type="button" class="btn btn-accent btn-clean"' + (busy ? ' disabled' : '') + '>' + (busy ? 'Guardando…' : 'Marcar habitación limpia') + '</button></div>' +
      '<div class="action-checklist">' + checklistHtml(room) +
      '<label class="notes-label">Incidencias u observaciones (opcional)<textarea class="notes-input" rows="2" placeholder="Ej.: falta secador, mancha en la moqueta…"></textarea></label>' +
      '<button type="button" class="btn btn-accent btn-complete"' + (busy ? ' disabled' : '') + '>' + (busy ? 'Guardando…' : 'Completar revisión') + '</button></div>' +
      '<div class="action-reset"><button type="button" class="btn btn-ghost btn-reset"' + (busy ? ' disabled' : '') + '>' + (busy ? 'Guardando…' : 'Registrar salida (marcar sucia)') + '</button></div>' +
      '<details class="history"><summary>Historial (<span class="history-count">' + (r.history || []).length + '</span>)</summary>' +
      '<ul class="history-list">' + historyItems + '</ul></details>' +
      '</article>';
  }

  function activityHtml(activity) {
    return (activity || []).slice(0, 8).map(function (t) {
      return '<li class="activity-item">' + esc(t) + '</li>';
    }).join('');
  }

  function statsOf(st) {
    var c = { sucia: 0, lista: 0, revisada: 0 };
    ROOMS.forEach(function (room) {
      var s = st.rooms[room] && st.rooms[room].status;
      if (c.hasOwnProperty(s)) c[s]++;
    });
    return c;
  }

  function updateStats(st) {
    var s = statsOf(st);
    document.getElementById('stat-sucia').textContent = s.sucia;
    document.getElementById('stat-lista').textContent = s.lista;
    document.getElementById('stat-revisada').textContent = s.revisada;
  }

  function updateActivity(st) {
    document.getElementById('activity-list').innerHTML = activityHtml(st.activity);
  }

  function setSaveStatus(text, isError) {
    var el = document.getElementById('save-status');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('save-status-error', !!isError);
  }

  function fullRenderGrid(st) {
    var grid = document.getElementById('room-grid');
    grid.innerHTML = ROOMS.map(function (room) {
      return roomCardHtml(room, st.rooms[room] || { status: 'sucia', cleanedBy: '', reviewedBy: '', history: [] });
    }).join('');
  }

  function partialRenderGrid(st) {
    ROOMS.forEach(function (room) {
      if (dirtyRooms[room]) return; // no tocar tarjetas con edición en curso en este dispositivo
      var oldCard = document.querySelector('.room-card[data-room="' + room + '"]');
      if (!oldCard) return;
      var wrapper = document.createElement('div');
      wrapper.innerHTML = roomCardHtml(room, st.rooms[room] || { status: 'sucia', cleanedBy: '', reviewedBy: '', history: [] });
      oldCard.replaceWith(wrapper.firstElementChild);
    });
  }

  function applyState(newState, full) {
    state = newState;
    if (full) fullRenderGrid(state); else partialRenderGrid(state);
    updateStats(state);
    updateActivity(state);
    setSaveStatus('Actualizado: ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
  }

  function loadInitial() {
    getState()
      .then(function (st) { applyState(st, true); })
      .catch(function (err) {
        setSaveStatus('⚠️ No se pudo cargar el panel: ' + (err && err.message ? err.message : err), true);
      });
  }

  function refresh() {
    return getState()
      .then(function (st) { applyState(st, false); })
      .catch(function (err) {
        setSaveStatus('⚠️ No se pudo actualizar: ' + (err && err.message ? err.message : err), true);
      });
  }

  var app = document.getElementById('app');

  // ---- preferencias locales por dispositivo (modo y nombre) ----
  try {
    var savedMode = localStorage.getItem('balconmar-modo');
    if (savedMode === 'limpieza' || savedMode === 'recepcion') {
      app.setAttribute('data-local-mode', savedMode);
      document.querySelectorAll('.mode-btn').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === savedMode));
      });
    }
  } catch (e) {}

  var whoInput = document.getElementById('who-input');
  var whoRow = whoInput ? whoInput.closest('.who-row') : null;
  var whoErrorMsg = document.getElementById('who-error-msg');
  try {
    var savedWho = localStorage.getItem('balconmar-quien');
    if (savedWho && whoInput) whoInput.value = savedWho;
  } catch (e) {}

  function getWho() {
    var name = whoInput ? whoInput.value.trim() : '';
    if (!name) {
      if (whoRow) whoRow.classList.add('who-error');
      if (whoErrorMsg) whoErrorMsg.hidden = false;
      if (whoInput) whoInput.focus();
      return null;
    }
    return name;
  }

  function showCardError(card, msg) {
    var p = card.querySelector('.card-error');
    if (p) { p.textContent = msg; p.hidden = false; }
  }
  function clearCardError(card) {
    var p = card.querySelector('.card-error');
    if (p) { p.hidden = true; p.textContent = ''; }
  }

  function reRenderRoom(room, st) {
    delete dirtyRooms[room];
    delete pendingRooms[room];
    var oldCard = document.querySelector('.room-card[data-room="' + room + '"]');
    if (oldCard) {
      var wrapper = document.createElement('div');
      wrapper.innerHTML = roomCardHtml(room, st.rooms[room]);
      oldCard.replaceWith(wrapper.firstElementChild);
    }
  }

  // ---- delegación de eventos: sobrevive a que las tarjetas se reconstruyan ----
  document.addEventListener('click', function (e) {
    var btn;

    if (btn = e.target.closest('.mode-btn')) {
      var mode = btn.getAttribute('data-mode');
      app.setAttribute('data-local-mode', mode);
      document.querySelectorAll('.mode-btn').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      try { localStorage.setItem('balconmar-modo', mode); } catch (e2) {}
      return;
    }

    if (btn = e.target.closest('#print-btn')) { window.print(); return; }
    if (btn = e.target.closest('#refresh-btn')) {
      var b = btn, txt = b.textContent;
      b.disabled = true; b.textContent = 'Actualizando…';
      refresh().then(function () { b.disabled = false; b.textContent = txt; })
               .catch(function () { b.disabled = false; b.textContent = txt; });
      return;
    }

    if (btn = e.target.closest('.btn-clean')) {
      var who = getWho();
      if (!who) return;
      var card = btn.closest('.room-card');
      var room = card.getAttribute('data-room');
      clearCardError(card);
      pendingRooms[room] = true;
      btn.disabled = true; btn.textContent = 'Guardando…';
      markClean(room, who)
        .then(function () { delete pendingRooms[room]; return refresh(); })
        .catch(function (err) {
          delete pendingRooms[room];
          btn.disabled = false; btn.textContent = 'Marcar habitación limpia';
          showCardError(card, '⚠️ ' + (err && err.message ? err.message : err));
        });
      return;
    }

    if (btn = e.target.closest('.btn-complete')) {
      var who2 = getWho();
      if (!who2) return;
      var card2 = btn.closest('.room-card');
      var room2 = card2.getAttribute('data-room');
      var checkboxes = card2.querySelectorAll('.checklist-item');
      var missing = [];
      checkboxes.forEach(function (cb) { if (!cb.checked) missing.push(cb.getAttribute('data-label')); });
      var notesInput = card2.querySelector('.notes-input');
      var notes = notesInput ? notesInput.value.trim() : '';
      clearCardError(card2);
      pendingRooms[room2] = true;
      btn.disabled = true; btn.textContent = 'Guardando…';
      completeReview(room2, who2, missing, notes)
        .then(function () { delete pendingRooms[room2]; return refresh(); })
        .catch(function (err) {
          delete pendingRooms[room2];
          btn.disabled = false; btn.textContent = 'Completar revisión';
          showCardError(card2, '⚠️ ' + (err && err.message ? err.message : err));
        });
      return;
    }

    if (btn = e.target.closest('.btn-reset')) {
      var who3 = getWho();
      if (!who3) return;
      var card3 = btn.closest('.room-card');
      var room3 = card3.getAttribute('data-room');
      clearCardError(card3);
      pendingRooms[room3] = true;
      btn.disabled = true; btn.textContent = 'Guardando…';
      resetRoom(room3, who3)
        .then(function () { delete pendingRooms[room3]; return refresh(); })
        .catch(function (err) {
          delete pendingRooms[room3];
          btn.disabled = false; btn.textContent = 'Registrar salida (marcar sucia)';
          showCardError(card3, '⚠️ ' + (err && err.message ? err.message : err));
        });
      return;
    }
  });

  document.addEventListener('input', function (e) {
    if (e.target.id === 'who-input') {
      if (whoRow) whoRow.classList.remove('who-error');
      if (whoErrorMsg) whoErrorMsg.hidden = true;
      try { localStorage.setItem('balconmar-quien', whoInput.value.trim()); } catch (e2) {}
      return;
    }
    if (e.target.closest && e.target.closest('.action-checklist')) {
      var card = e.target.closest('.room-card');
      if (card) dirtyRooms[card.getAttribute('data-room')] = true;
    }
  });

  var todayLabel = document.getElementById('today-label');
  if (todayLabel) {
    todayLabel.textContent = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  var reopenAfterPrint = [];
  window.addEventListener('beforeprint', function () {
    var printDate = document.getElementById('print-date');
    if (printDate) {
      printDate.textContent = new Date().toLocaleString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    }
    reopenAfterPrint = [];
    document.querySelectorAll('details').forEach(function (d) {
      if (!d.open) { reopenAfterPrint.push(d); d.open = true; }
    });
  });
  window.addEventListener('afterprint', function () {
    reopenAfterPrint.forEach(function (d) { d.open = false; });
    reopenAfterPrint = [];
  });

  loadInitial();
  setInterval(refresh, POLL_MS);
  window.addEventListener('focus', refresh);

} catch (fatalErr) {
  try {
    var errEl = document.getElementById('save-status');
    if (!errEl) { errEl = document.createElement('p'); errEl.id = 'save-status'; document.body.appendChild(errEl); }
    errEl.textContent = '⚠️ Error crítico al iniciar la app: ' + (fatalErr && fatalErr.message ? fatalErr.message : String(fatalErr));
    errEl.classList.add('save-status-error');
    errEl.style.fontSize = '0.9rem';
  } catch (e2) {}
}
})();
