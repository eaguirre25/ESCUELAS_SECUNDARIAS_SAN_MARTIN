const ORIGINAL = Array.isArray(window.SCHOOLS_DATA) ? window.SCHOOLS_DATA : [];
const STORE_KEY = 'ees-sm-edits-v5';
const SAMPLE_KEY = 'ees-sm-sample-v2';
const PERCENT_KEY = 'ees-sm-percent-v1';
const managementColors = { Estatal: '#48cae4', Privada: '#ef709d' };
const fmt = value => Number(value || 0).toLocaleString('es-AR');
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character]));
const debounce = (callback, delay = 180) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
};

let schools = JSON.parse(JSON.stringify(ORIGINAL));
try {
  const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
  const sameCues = Array.isArray(saved) && saved.length === schools.length && saved.every((item, index) => item.cue === schools[index].cue);
  if (sameCues) schools = saved;
} catch (_) {}

let sample = new Set();
try {
  const saved = JSON.parse(localStorage.getItem(SAMPLE_KEY) || '[]');
  const validCues = new Set(schools.map(school => school.cue));
  sample = new Set((Array.isArray(saved) ? saved : []).filter(cue => validCues.has(cue)));
} catch (_) {}

const percentInput = document.getElementById('samplePercent');
percentInput.value = localStorage.getItem(PERCENT_KEY) || '10%';

function parsePercent() {
  const parsed = Number.parseFloat(percentInput.value.replace('%', '').replace(',', '.'));
  return Math.min(100, Math.max(0, Number.isFinite(parsed) ? parsed : 0));
}

function sampleSize(school) {
  return Math.round(Number(school.matricula || 0) * parsePercent() / 100);
}

function saveSchools() {
  localStorage.setItem(STORE_KEY, JSON.stringify(schools));
}

function saveSample() {
  localStorage.setItem(SAMPLE_KEY, JSON.stringify([...sample]));
}

function totalEnrollment(items = schools) {
  return items.reduce((total, school) => total + Number(school.matricula || 0), 0);
}

document.querySelectorAll('.tabbtn').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.tabbtn').forEach(item => item.classList.toggle('active', item === button));
  document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === button.dataset.view));
  if (button.dataset.view === 'mapView') setTimeout(() => map.invalidateSize(), 60);
  if (button.dataset.view === 'tableView') renderTable();
  if (button.dataset.view === 'sampleView') renderSampleRows();
}));

const map = L.map('map', { zoomControl: true, preferCanvas: true });
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors'
}).addTo(map);
const layer = L.layerGroup().addTo(map);
const badgeLayer = L.layerGroup().addTo(map);
let visibleMapItems = [];

function validCoordinates(school) {
  return Number.isFinite(Number(school.lat)) && Number.isFinite(Number(school.lon));
}

function boundsFor(items) {
  return L.latLngBounds(items.filter(validCoordinates).map(school => [Number(school.lat), Number(school.lon)]));
}

function fitItems(items, maxZoom = 15) {
  const bounds = boundsFor(items);
  if (bounds.isValid()) map.fitBounds(bounds.pad(.14), { maxZoom, animate: false });
}

function radius(matricula) {
  return Math.max(5, Math.min(16, 4 + Math.sqrt(Number(matricula) || 0) / 3.2));
}

function popup(school) {
  const managementClass = school.gestion === 'Estatal' ? 'state' : 'private';
  const disadvantageTag = String(school.desfavorabilidad) === '1' ? '<span class="tag disadvantage">Desfavorabilidad 1</span>' : '';
  return `<div class="pop-title">${esc(school.nombre)}</div>
    <div class="pop-sub">${esc(school.calle)} ${esc(school.nro)} · ${esc(school.localidad)}</div>
    <div class="tags"><span class="tag ${managementClass}">${esc(school.gestion)}</span><span class="tag">${esc(school.modalidad)}</span><span class="tag">Categoría ${esc(school.categoria)}</span>${disadvantageTag}</div>
    <div class="pop-grid">
      <div class="pop-kpi"><b>${fmt(school.matricula)}</b><span>Matrícula</span></div>
      <div class="pop-kpi"><b>${fmt(school.secciones)}</b><span>Secciones</span></div>
      <div class="pop-kpi"><b>${fmt(school.varones)}</b><span>Varones</span></div>
      <div class="pop-kpi"><b>${fmt(school.mujeres)}</b><span>Mujeres</span></div>
    </div><div class="cue">CUE ${esc(school.cue)} · ${esc(school.periodo)}</div>`;
}

function categoryAbbreviation(category) {
  return { Primera: '1ª', Segunda: '2ª', Tercera: '3ª', 'S/Datos': 'S/D' }[category] || 'S/D';
}

function mapBadge(school) {
  const category = categoryAbbreviation(school.categoria);
  const disadvantage = String(school.desfavorabilidad) === '1' ? '<span class="map-badge-disadvantage">D1</span>' : '';
  return L.divIcon({
    className: 'map-badge-wrapper',
    html: `<span class="map-badge-category">${category}</span>${disadvantage}`,
    iconSize: [42, 18],
    iconAnchor: [-4, 18]
  });
}

function renderMapBadges() {
  badgeLayer.clearLayers();
  if (map.getZoom() < 14) return;
  visibleMapItems.forEach(school => {
    if (!validCoordinates(school)) return;
    L.marker([Number(school.lat), Number(school.lon)], {
      icon: mapBadge(school),
      interactive: false,
      keyboard: false
    }).addTo(badgeLayer);
  });
}

function mapFiltered() {
  const query = document.getElementById('searchMap').value.trim().toLowerCase();
  const locality = document.getElementById('localidad').value;
  const modality = document.getElementById('modalidad').value;
  const showState = document.getElementById('showState').checked;
  const showPrivate = document.getElementById('showPrivate').checked;
  return schools.filter(school => {
    const managementVisible = (showState && school.gestion === 'Estatal') || (showPrivate && school.gestion === 'Privada');
    const haystack = `${school.nombre} ${school.cue} ${school.localidad}`.toLowerCase();
    return managementVisible && haystack.includes(query) && (!locality || school.localidad === locality) && (!modality || school.modalidad === modality);
  });
}

function populateLocalities() {
  const select = document.getElementById('localidad');
  const current = select.value;
  select.innerHTML = '<option value="">Todas</option>';
  [...new Set(schools.map(school => school.localidad).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')).forEach(locality => {
    const option = document.createElement('option');
    option.value = locality;
    option.textContent = locality;
    select.appendChild(option);
  });
  if ([...select.options].some(option => option.value === current)) select.value = current;
}

function renderMap(override = null) {
  layer.clearLayers();
  const items = override || mapFiltered();
  visibleMapItems = items;
  items.forEach(school => {
    if (!validCoordinates(school)) return;
    const selected = sample.has(school.cue);
    const coordinates = [Number(school.lat), Number(school.lon)];
    L.circleMarker(coordinates, {
      radius: radius(school.matricula) + (selected ? 2 : 0),
      color: selected ? '#ffffff' : '#06101c',
      weight: selected ? 3 : 1.3,
      fillColor: managementColors[school.gestion] || '#52b788',
      fillOpacity: .88
    }).bindPopup(popup(school)).bindTooltip(`${school.nombre} · ${school.gestion} · ${fmt(school.matricula)} estudiantes · Categoría ${school.categoria}${String(school.desfavorabilidad) === '1' ? ' · Desfavorabilidad 1' : ''}`, { direction: 'top' }).addTo(layer);
  });
  renderMapBadges();
  document.getElementById('countSchools').textContent = items.length;
  document.getElementById('countStudents').textContent = fmt(totalEnrollment(items));
  document.getElementById('countState').textContent = items.filter(school => school.gestion === 'Estatal').length;
  document.getElementById('countPrivate').textContent = items.filter(school => school.gestion === 'Privada').length;
}

map.on('zoomend', renderMapBadges);

populateLocalities();
renderMap();
fitItems(schools);

const refreshMapFilters = () => {
  const items = mapFiltered();
  renderMap(items);
  if (items.length) fitItems(items);
};
const refreshMapFiltersDebounced = debounce(refreshMapFilters);

['searchMap', 'localidad', 'modalidad', 'showState', 'showPrivate'].forEach(id => {
  const element = document.getElementById(id);
  const isSearch = element.tagName === 'INPUT' && element.type === 'search';
  element.addEventListener(isSearch ? 'input' : 'change', isSearch ? refreshMapFiltersDebounced : refreshMapFilters);
});

document.getElementById('resetMap').addEventListener('click', () => {
  document.getElementById('searchMap').value = '';
  document.getElementById('localidad').value = '';
  document.getElementById('modalidad').value = '';
  document.getElementById('showState').checked = true;
  document.getElementById('showPrivate').checked = true;
  renderMap();
  fitItems(schools);
});

document.getElementById('sampleOnMap').addEventListener('click', () => {
  const selected = schools.filter(school => sample.has(school.cue));
  if (!selected.length) {
    alert('Todavía no seleccionaste escuelas en “Proyectar muestra”.');
    return;
  }
  renderMap(selected);
  fitItems(selected);
});

const tableFields = [
  ['cue', 'readonly'], ['gestion', 'readonly'], ['modalidad', 'readonly'], ['localidad', 'text'], ['calle', 'text'], ['nro', 'text'],
  ['categoria', 'text'], ['subvencion', 'text'], ['secciones', 'number'], ['matricula', 'number'], ['varones', 'number'], ['mujeres', 'number'],
  ['periodo', 'text'], ['lat', 'float'], ['lon', 'float']
];
const numericTableFields = new Set(['secciones', 'matricula', 'varones', 'mujeres', 'lat', 'lon']);
let tableSort = { key: 'nombre', direction: 'asc' };

function compareValues(left, right, key, numeric = false) {
  const direction = key.direction === 'asc' ? 1 : -1;
  if (numeric) return (Number(left || 0) - Number(right || 0)) * direction;
  return String(left ?? '').localeCompare(String(right ?? ''), 'es', { numeric: true, sensitivity: 'base' }) * direction;
}

function configureTableSorting() {
  const keys = ['nombre', ...tableFields.map(([key]) => key)];
  document.querySelectorAll('#editTable thead th').forEach((header, index) => {
    const key = keys[index];
    header.classList.add('sortable');
    header.dataset.sortKey = key;
    header.tabIndex = 0;
    const activate = () => {
      tableSort = { key, direction: tableSort.key === key && tableSort.direction === 'asc' ? 'desc' : 'asc' };
      renderTable();
    };
    header.addEventListener('click', activate);
    header.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    });
  });
}

function tableFiltered() {
  const query = document.getElementById('searchTable').value.trim().toLowerCase();
  const management = document.getElementById('tableManagement').value;
  const modality = document.getElementById('tableModality').value;
  return schools.map((school, index) => ({ school, index })).filter(({ school }) => {
    const haystack = `${school.nombre} ${school.cue} ${school.localidad} ${school.calle}`.toLowerCase();
    return haystack.includes(query) && (!management || school.gestion === management) && (!modality || school.modalidad === modality);
  }).sort((left, right) => compareValues(left.school[tableSort.key], right.school[tableSort.key], tableSort, numericTableFields.has(tableSort.key)));
}

function renderTable() {
  const body = document.querySelector('#editTable tbody');
  body.innerHTML = '';
  document.querySelectorAll('#editTable thead th').forEach(header => {
    const active = header.dataset.sortKey === tableSort.key;
    header.classList.toggle('sort-active', active);
    header.dataset.direction = active ? tableSort.direction : '';
    header.setAttribute('aria-sort', active ? (tableSort.direction === 'asc' ? 'ascending' : 'descending') : 'none');
  });
  tableFiltered().forEach(({ school, index }) => {
    const row = document.createElement('tr');
    const name = document.createElement('td');
    name.className = 'namecol';
    name.textContent = school.nombre;
    row.appendChild(name);
    tableFields.forEach(([key, type]) => {
      const cell = document.createElement('td');
      cell.dataset.index = index;
      cell.dataset.key = key;
      cell.textContent = school[key] ?? '';
      if (type === 'readonly') {
        cell.className = 'readonly';
      } else {
        cell.contentEditable = 'true';
        cell.addEventListener('blur', () => {
          let value = cell.textContent.trim();
          if (type === 'number') value = Math.max(0, Number.parseInt(value.replace(/\D/g, ''), 10) || 0);
          if (type === 'float') {
            const parsed = Number.parseFloat(value.replace(',', '.'));
            if (!Number.isFinite(parsed)) {
              cell.textContent = schools[index][key];
              return;
            }
            value = parsed;
          }
          schools[index][key] = value;
          cell.textContent = value;
          cell.classList.add('edited');
          saveSchools();
          populateLocalities();
          renderMap();
          renderSampleRows();
        });
      }
      row.appendChild(cell);
    });
    body.appendChild(row);
  });
}

['searchTable', 'tableManagement', 'tableModality'].forEach(id => {
  const element = document.getElementById(id);
  element.addEventListener(element.tagName === 'INPUT' ? 'input' : 'change', element.tagName === 'INPUT' ? debounce(renderTable) : renderTable);
});

document.getElementById('resetEdits').addEventListener('click', () => {
  if (!confirm('¿Descartar los cambios locales y volver a los datos de las fuentes?')) return;
  schools = JSON.parse(JSON.stringify(ORIGINAL));
  localStorage.removeItem(STORE_KEY);
  populateLocalities();
  renderTable();
  renderMap();
  renderSampleRows();
});

function csvCell(value) {
  const string = String(value ?? '');
  return /[;"\n]/.test(string) ? `"${string.replace(/"/g, '""')}"` : string;
}

document.getElementById('exportCsv').addEventListener('click', () => {
  const headers = ['nombre', 'cue', 'cueanexo', 'gestion', 'modalidad', 'localidad', 'calle', 'nro', 'categoria', 'subvencion', 'dependencia', 'secciones', 'matricula', 'varones', 'mujeres', 'periodo', 'latitud', 'longitud'];
  const lines = [headers.join(';'), ...schools.map(school => [school.nombre, school.cue, school.cueanexo, school.gestion, school.modalidad, school.localidad, school.calle, school.nro, school.categoria, school.subvencion, school.dependencia, school.secciones, school.matricula, school.varones, school.mujeres, school.periodo, school.lat, school.lon].map(csvCell).join(';'))];
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = 'escuelas_secundarias_san_martin_estatales_privadas.csv';
  anchor.click();
  URL.revokeObjectURL(anchor.href);
});

function sampleVisible(management) {
  const query = document.getElementById('searchSample').value.trim().toLowerCase();
  return schools.filter(school => school.gestion === management && `${school.nombre} ${school.cue} ${school.localidad}`.toLowerCase().includes(query));
}

const sampleSort = {
  Estatal: { key: 'nombre', direction: 'asc' },
  Privada: { key: 'nombre', direction: 'asc' }
};

function sampleSortValue(school, key) {
  if (key === 'share') return totalEnrollment() ? Number(school.matricula || 0) / totalEnrollment() : 0;
  if (key === 'sample') return sampleSize(school);
  return school[key];
}

function sortedSampleVisible(management) {
  const sort = sampleSort[management];
  return sampleVisible(management).sort((left, right) => compareValues(sampleSortValue(left, sort.key), sampleSortValue(right, sort.key), sort, sort.key !== 'nombre'));
}

function sampleHeader(management) {
  const header = document.createElement('div');
  header.className = 'sample-head';
  header.appendChild(document.createElement('span'));
  [
    ['nombre', 'Escuela'],
    ['matricula', 'Matrícula'],
    ['share', '% del total'],
    ['sample', 'A encuestar']
  ].forEach(([key, label]) => {
    const button = document.createElement('button');
    const active = sampleSort[management].key === key;
    const direction = active ? sampleSort[management].direction : '';
    button.type = 'button';
    button.className = `sort-button${active ? ' active' : ''}`;
    button.innerHTML = `${label}<span aria-hidden="true">${direction === 'asc' ? '▲' : direction === 'desc' ? '▼' : '↕'}</span>`;
    button.title = `Ordenar ${label.toLowerCase()} de ${direction === 'asc' ? 'mayor a menor' : 'menor a mayor'}`;
    button.setAttribute('aria-label', button.title);
    button.addEventListener('click', () => {
      sampleSort[management] = { key, direction: active && direction === 'asc' ? 'desc' : 'asc' };
      renderSampleRows();
    });
    header.appendChild(button);
  });
  return header;
}

function renderManagementRows(management, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  container.appendChild(sampleHeader(management));
  const universeEnrollment = totalEnrollment();
  sortedSampleVisible(management).forEach(school => {
    const row = document.createElement('label');
    row.className = `sample-row${sample.has(school.cue) ? ' selected' : ''}`;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = sample.has(school.cue);
    checkbox.addEventListener('change', () => {
      checkbox.checked ? sample.add(school.cue) : sample.delete(school.cue);
      saveSample();
      row.classList.toggle('selected', checkbox.checked);
      updateSampleSummary();
      renderMap();
    });
    const identity = document.createElement('div');
    identity.innerHTML = `<div class="sample-name">${esc(school.nombre)}</div><div class="sample-meta">${esc(school.modalidad)} · ${esc(school.localidad)} · CUE ${esc(school.cue)}</div>`;
    const enrollment = document.createElement('div');
    enrollment.className = 'enrollment';
    enrollment.textContent = fmt(school.matricula);
    const enrollmentShare = document.createElement('div');
    enrollmentShare.className = 'enrollment-share';
    const share = universeEnrollment ? (Number(school.matricula || 0) / universeEnrollment) * 100 : 0;
    enrollmentShare.textContent = `${share.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
    enrollmentShare.title = 'Porcentaje sobre la matrícula total de todas las escuelas';
    const automatic = document.createElement('div');
    automatic.className = 'auto-sample';
    automatic.textContent = fmt(sampleSize(school));
    row.append(checkbox, identity, enrollment, enrollmentShare, automatic);
    container.appendChild(row);
  });
}

function renderSampleRows() {
  renderManagementRows('Estatal', 'stateRows');
  renderManagementRows('Privada', 'privateRows');
  const state = schools.filter(school => school.gestion === 'Estatal');
  const privateSchools = schools.filter(school => school.gestion === 'Privada');
  document.getElementById('stateUniverse').textContent = `${state.length} escuelas · ${fmt(totalEnrollment(state))} estudiantes`;
  document.getElementById('privateUniverse').textContent = `${privateSchools.length} escuelas · ${fmt(totalEnrollment(privateSchools))} estudiantes`;
  updateSampleSummary();
}

function groupSummary(management) {
  const selected = schools.filter(school => school.gestion === management && sample.has(school.cue));
  return {
    count: selected.length,
    enrollment: totalEnrollment(selected),
    sample: selected.reduce((total, school) => total + sampleSize(school), 0)
  };
}

function updateSampleSummary() {
  const state = groupSummary('Estatal');
  const privateSummary = groupSummary('Privada');
  const count = state.count + privateSummary.count;
  const enrollment = state.enrollment + privateSummary.enrollment;
  const sampleStudents = state.sample + privateSummary.sample;
  const coverage = totalEnrollment() ? 100 * enrollment / totalEnrollment() : 0;
  document.getElementById('sampleSchools').textContent = count;
  document.getElementById('sampleStudents').textContent = fmt(sampleStudents);
  document.getElementById('sampleEnrollment').textContent = fmt(enrollment);
  document.getElementById('stateSelected').textContent = state.count;
  document.getElementById('stateEnrollment').textContent = fmt(state.enrollment);
  document.getElementById('stateSample').textContent = fmt(state.sample);
  document.getElementById('privateSelected').textContent = privateSummary.count;
  document.getElementById('privateEnrollment').textContent = fmt(privateSummary.enrollment);
  document.getElementById('privateSample').textContent = fmt(privateSummary.sample);
  document.getElementById('coverageText').textContent = coverage.toLocaleString('es-AR', { maximumFractionDigits: 1 }) + '%';
  document.getElementById('coverageBar').style.width = Math.min(100, coverage) + '%';
}

document.getElementById('searchSample').addEventListener('input', debounce(renderSampleRows));
percentInput.addEventListener('input', () => {
  localStorage.setItem(PERCENT_KEY, percentInput.value);
  debounceRenderSampleRows();
});
percentInput.addEventListener('change', () => {
  const normalized = parsePercent().toLocaleString('es-AR', { maximumFractionDigits: 2 });
  percentInput.value = normalized + '%';
  localStorage.setItem(PERCENT_KEY, percentInput.value);
  renderSampleRows();
});

document.querySelectorAll('[data-select]').forEach(button => button.addEventListener('click', () => {
  sampleVisible(button.dataset.select).forEach(school => sample.add(school.cue));
  saveSample();
  renderSampleRows();
  renderMap();
}));

document.querySelectorAll('[data-clear]').forEach(button => button.addEventListener('click', () => {
  schools.filter(school => school.gestion === button.dataset.clear).forEach(school => sample.delete(school.cue));
  saveSample();
  renderSampleRows();
  renderMap();
}));

configureTableSorting();
const debounceRenderSampleRows = debounce(renderSampleRows);
