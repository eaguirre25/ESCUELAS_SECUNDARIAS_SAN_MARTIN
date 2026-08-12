(() => {
  const STATE_KEY = 'ees-sm-table-state-v2';
  const HISTORY_KEY = 'ees-sm-table-history-v2';
  const MAX_HISTORY = 40;

  const fixedColumns = [
    { key: 'cod_identificacion', label: 'COD. IDENTIFICACIÓN ESCUELA' },
    { key: 'director', label: 'DIRECTOR/A' },
    { key: 'referentes', label: 'DOCENTES CONOCIDOS/ REFERENTES' },
    { key: 'fecha_encuesta', label: 'FECHA TOMA ENCUESTA' },
    { key: 'cursos_encuestados', label: 'CURSOS ENCUESTADOS' },
    { key: 'cant_est_encuestados', label: 'CANT. EST. ENCUESTADOS' },
    { key: 'encuestan_equipo', label: 'ENCUESTAN DEL EQUIPO' }
  ];

  let state = { customData: {}, customColumns: [] };
  let history = [];
  let saveTimer = null;
  let lastSignature = '';
  let restoring = false;

  const safeParse = (raw, fallback) => {
    try { return JSON.parse(raw) ?? fallback; } catch (_) { return fallback; }
  };

  state = safeParse(localStorage.getItem(STATE_KEY), state);
  history = safeParse(localStorage.getItem(HISTORY_KEY), []);
  if (!state.customData) state.customData = {};
  if (!Array.isArray(state.customColumns)) state.customColumns = [];
  if (!Array.isArray(history)) history = [];

  const style = document.createElement('style');
  style.textContent = `
    #editTable th.track-col{background:#24395f!important;color:#f2f6ff!important;border-color:#405a8a!important}
    #editTable td.track-col{background:#15243d!important;border-color:#314768!important;min-width:150px}
    #editTable td.track-col:focus{background:#1c3152!important;box-shadow:inset 0 0 0 2px #8fb3ff!important}
    #editTable th.custom-col{background:#4b315f!important;color:#fff!important;border-color:#6c4d82!important}
    #editTable td.custom-col{background:#2b1e37!important;border-color:#513b63!important;min-width:150px}
    #editTable td.custom-col:focus{background:#382748!important;box-shadow:inset 0 0 0 2px #c79ae8!important}
    .autosave-pill{display:inline-flex;align-items:center;gap:6px;padding:7px 9px;border:1px solid var(--line);border-radius:999px;font-size:10.5px;color:var(--muted);background:#0a1725}
    .autosave-pill.saved{color:#b8e4c7;border-color:#315b43}
    .table-modal-backdrop{position:fixed;inset:0;background:rgba(2,8,16,.72);z-index:5000;display:flex;align-items:center;justify-content:center;padding:18px}
    .table-modal{width:min(680px,96vw);max-height:82vh;overflow:auto;background:#0d1b2a;border:1px solid var(--line);border-radius:14px;padding:16px;color:var(--text)}
    .table-modal h2{font-size:16px;margin:0 0 12px}.table-modal p{font-size:11px;color:var(--muted);line-height:1.45}
    .history-list{display:grid;gap:7px;margin-top:10px}.history-item{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:9px;border:1px solid var(--line);border-radius:10px;background:#0a1725}
    .history-item strong{font-size:11.5px}.history-item span{font-size:10px;color:var(--muted)}
    .modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:12px;flex-wrap:wrap}
    .add-col-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end}
    @media(max-width:760px){.add-col-row{grid-template-columns:1fr}.history-item{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  function allColumns() {
    return [...fixedColumns, ...state.customColumns.map(c => ({...c, custom: true}))];
  }

  function cueForRow(tr) {
    const tds = tr.querySelectorAll('td');
    return (tds[1]?.textContent || '').trim();
  }

  function ensureCue(cue) {
    if (!state.customData[cue]) state.customData[cue] = {};
    return state.customData[cue];
  }

  function getBaseSnapshot() {
    try {
      if (typeof schools !== 'undefined' && Array.isArray(schools)) return schools.map(s => ({...s}));
    } catch (_) {}
    return [];
  }

  function currentSnapshot() {
    return {
      at: new Date().toISOString(),
      base: getBaseSnapshot(),
      customData: JSON.parse(JSON.stringify(state.customData || {})),
      customColumns: JSON.parse(JSON.stringify(state.customColumns || []))
    };
  }

  function snapshotSignature(snap) {
    return JSON.stringify({ base: snap.base, customData: snap.customData, customColumns: snap.customColumns });
  }

  function persistState() {
    localStorage.setItem(STATE_KEY, JSON.stringify({ customData: state.customData, customColumns: state.customColumns }));
  }

  function setSaveStatus(text, saved=false) {
    const el = document.getElementById('autosaveStatus');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('saved', saved);
  }

  function saveVersion(reason='Edición automática') {
    if (restoring) return;
    persistState();
    const snap = currentSnapshot();
    const sig = snapshotSignature(snap);
    if (sig === lastSignature) {
      setSaveStatus('Guardado automáticamente', true);
      return;
    }
    lastSignature = sig;
    history.unshift({ ...snap, reason });
    history = history.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    setSaveStatus('Guardado automáticamente', true);
  }

  function scheduleSave(reason='Edición automática') {
    setSaveStatus('Guardando…', false);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveVersion(reason), 1200);
  }

  function enhanceHeader() {
    const headRow = document.querySelector('#editTable thead tr');
    if (!headRow) return;
    headRow.querySelectorAll('th[data-track-key]').forEach(x => x.remove());
    allColumns().forEach(col => {
      const th = document.createElement('th');
      th.dataset.trackKey = col.key;
      th.textContent = col.label;
      th.className = col.custom ? 'custom-col' : 'track-col';
      headRow.appendChild(th);
    });
  }

  function enhanceRows() {
    document.querySelectorAll('#editTable tbody tr').forEach(tr => {
      tr.querySelectorAll('td[data-track-key]').forEach(x => x.remove());
      const cue = cueForRow(tr);
      if (!cue) return;
      const values = ensureCue(cue);
      allColumns().forEach(col => {
        const td = document.createElement('td');
        td.dataset.trackKey = col.key;
        td.dataset.cue = cue;
        td.className = col.custom ? 'custom-col' : 'track-col';
        td.contentEditable = 'true';
        td.spellcheck = false;
        td.textContent = values[col.key] ?? '';
        td.addEventListener('input', () => {
          ensureCue(cue)[col.key] = td.textContent.trim();
          scheduleSave('Edición en tabla');
        });
        tr.appendChild(td);
      });
    });
  }

  function enhanceTable() {
    enhanceHeader();
    enhanceRows();
  }

  function addToolbarControls() {
    const toolbar = document.querySelector('#tableView .toolbar');
    if (!toolbar || document.getElementById('addColumnBtn')) return;

    const oldExport = document.getElementById('exportCsv');
    if (oldExport) {
      oldExport.textContent = 'Exportar Excel';
      const replacement = oldExport.cloneNode(true);
      replacement.id = 'exportExcel';
      oldExport.replaceWith(replacement);
      replacement.addEventListener('click', exportExcel);
    }

    const addBtn = document.createElement('button');
    addBtn.id = 'addColumnBtn';
    addBtn.textContent = '+ Agregar columna';
    addBtn.addEventListener('click', openAddColumnModal);

    const historyBtn = document.createElement('button');
    historyBtn.id = 'historyBtn';
    historyBtn.textContent = 'Historial';
    historyBtn.addEventListener('click', openHistoryModal);

    const pill = document.createElement('span');
    pill.id = 'autosaveStatus';
    pill.className = 'autosave-pill saved';
    pill.textContent = 'Guardado automático activo';

    const notice = toolbar.querySelector('.notice');
    if (notice) toolbar.insertBefore(addBtn, notice);
    else toolbar.appendChild(addBtn);
    if (notice) toolbar.insertBefore(historyBtn, notice);
    else toolbar.appendChild(historyBtn);
    if (notice) toolbar.insertBefore(pill, notice);
    else toolbar.appendChild(pill);
  }

  function slugKey(label) {
    return 'custom_' + label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'') + '_' + Date.now().toString(36);
  }

  function modalShell(title, html) {
    const bd = document.createElement('div');
    bd.className = 'table-modal-backdrop';
    const modal = document.createElement('div');
    modal.className = 'table-modal';
    modal.innerHTML = `<h2>${title}</h2>${html}`;
    bd.appendChild(modal);
    bd.addEventListener('click', e => { if (e.target === bd) bd.remove(); });
    document.body.appendChild(bd);
    return { bd, modal };
  }

  function openAddColumnModal() {
    const { bd, modal } = modalShell('Agregar columna de seguimiento', `
      <p>La nueva columna se agregará al final del bloque de seguimiento y también se incluirá en el Excel y en el historial de versiones.</p>
      <div class="add-col-row"><label style="margin:0">Nombre de la columna<input id="newColumnName" type="text" placeholder="Ej.: Observaciones"></label><button id="confirmAddColumn">Agregar</button></div>
      <div class="modal-actions"><button id="closeAddColumn">Cancelar</button></div>`);
    const input = modal.querySelector('#newColumnName');
    input.focus();
    const add = () => {
      const label = input.value.trim();
      if (!label) return;
      state.customColumns.push({ key: slugKey(label), label });
      enhanceTable();
      scheduleSave('Columna agregada: ' + label);
      bd.remove();
    };
    modal.querySelector('#confirmAddColumn').addEventListener('click', add);
    modal.querySelector('#closeAddColumn').addEventListener('click', () => bd.remove());
    input.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function restoreSnapshot(item) {
    restoring = true;
    try {
      state.customData = JSON.parse(JSON.stringify(item.customData || {}));
      state.customColumns = JSON.parse(JSON.stringify(item.customColumns || []));
      if (Array.isArray(item.base) && item.base.length) {
        try {
          if (typeof schools !== 'undefined' && Array.isArray(schools)) {
            schools.splice(0, schools.length, ...item.base.map(s => ({...s})));
            if (typeof renderTable === 'function') renderTable();
            if (typeof renderMap === 'function') renderMap();
            if (typeof populateLocalities === 'function') populateLocalities();
          }
        } catch (_) {}
      }
      persistState();
      setTimeout(() => {
        enhanceTable();
        restoring = false;
        saveVersion('Restauración de versión');
      }, 0);
    } finally {
      if (restoring) setTimeout(() => { restoring = false; }, 50);
    }
  }

  function openHistoryModal() {
    const items = history.length ? history.map((h, i) => `
      <div class="history-item">
        <div><strong>${formatDate(h.at)}</strong><br><span>${h.reason || 'Versión automática'}</span></div>
        <button data-restore-index="${i}">Restaurar</button>
      </div>`).join('') : '<p>Todavía no hay versiones anteriores guardadas.</p>';
    const { bd, modal } = modalShell('Historial de versiones', `
      <p>Se conservan hasta ${MAX_HISTORY} versiones en este navegador. Restaurar una versión también crea una nueva entrada en el historial, por lo que podés volver a deshacerla.</p>
      <div class="history-list">${items}</div>
      <div class="modal-actions"><button id="closeHistory">Cerrar</button></div>`);
    modal.querySelectorAll('[data-restore-index]').forEach(btn => btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.restoreIndex);
      if (!Number.isInteger(idx) || !history[idx]) return;
      restoreSnapshot(history[idx]);
      bd.remove();
    }));
    modal.querySelector('#closeHistory').addEventListener('click', () => bd.remove());
  }

  function exportExcel() {
    if (typeof XLSX === 'undefined') {
      alert('No se pudo cargar el componente de exportación a Excel. Recargá la página e intentá nuevamente.');
      return;
    }
    let base = [];
    try { base = (typeof schools !== 'undefined' && Array.isArray(schools)) ? schools : []; } catch (_) {}
    const cols = allColumns();
    const rows = base.map(s => {
      const extra = state.customData[s.cue] || {};
      const row = {
        'Escuela': s.nombre ?? '',
        'CUE': s.cue ?? '',
        'Localidad': s.localidad ?? '',
        'Calle': s.calle ?? '',
        'Nº': s.nro ?? '',
        'Categoría': s.categoria ?? '',
        'Desfav.': s.desfavorabilidad ?? '',
        'Secciones': s.secciones ?? '',
        'Matrícula': s.matricula ?? '',
        'Varones': s.varones ?? '',
        'Mujeres': s.mujeres ?? '',
        'Período': s.periodo ?? '',
        'Latitud': s.lat ?? '',
        'Longitud': s.lon ?? ''
      };
      cols.forEach(c => { row[c.label] = extra[c.key] ?? ''; });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!freeze'] = { xSplit: 1, ySplit: 1 };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Escuelas');
    XLSX.writeFile(wb, 'escuelas_secundarias_san_martin_seguimiento.xlsx');
  }

  function loadSavedBaseIfAvailable() {
    const saved = history[0];
    if (!saved || !Array.isArray(saved.base) || !saved.base.length) return;
    try {
      if (typeof schools !== 'undefined' && Array.isArray(schools)) {
        const byCue = new Map(saved.base.map(s => [String(s.cue), s]));
        schools.forEach((s, i) => {
          const restored = byCue.get(String(s.cue));
          if (restored) schools[i] = { ...s, ...restored };
        });
        if (typeof renderTable === 'function') renderTable();
        if (typeof renderMap === 'function') renderMap();
      }
    } catch (_) {}
  }

  function attachBaseAutosave() {
    const table = document.getElementById('editTable');
    if (!table) return;
    table.addEventListener('input', e => {
      const td = e.target.closest('td[contenteditable="true"]');
      if (!td || td.dataset.trackKey) return;
      scheduleSave('Edición en datos de escuela');
    }, true);
  }

  function watchRerenders() {
    const tbody = document.querySelector('#editTable tbody');
    if (!tbody) return;
    let busy = false;
    new MutationObserver(() => {
      if (busy) return;
      busy = true;
      requestAnimationFrame(() => {
        enhanceRows();
        busy = false;
      });
    }).observe(tbody, { childList: true });
  }

  function init() {
    loadSavedBaseIfAvailable();
    addToolbarControls();
    enhanceTable();
    attachBaseAutosave();
    watchRerenders();
    const snap = currentSnapshot();
    lastSignature = snapshotSignature(snap);
    if (!history.length) saveVersion('Versión inicial');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0));
  else setTimeout(init, 0);
})();
