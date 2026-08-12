(() => {
  const SAMPLE_N_KEY = 'ees-sm-sample-n-v1';
  let sampleN = {};
  try { sampleN = JSON.parse(localStorage.getItem(SAMPLE_N_KEY) || '{}') || {}; } catch (_) {}

  const fmtN = n => Number(n || 0).toLocaleString('es-AR');
  const pctN = n => Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + '%';
  const saveSampleN = () => localStorage.setItem(SAMPLE_N_KEY, JSON.stringify(sampleN));

  const style = document.createElement('style');
  style.textContent = `
    .sample-row{grid-template-columns:24px minmax(220px,1fr) 82px 110px!important}
    .sample-row input[type="checkbox"]{width:auto!important}
    .sample-n{width:100%!important;padding:7px 8px!important;text-align:right}
    .sample-n:disabled{opacity:.45}
    .sample-head{display:grid;grid-template-columns:24px minmax(220px,1fr) 82px 110px;gap:8px;padding:7px 8px;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--line);background:#0a1725;position:sticky;top:0;z-index:2}
    @media(max-width:760px){.sample-row,.sample-head{grid-template-columns:24px minmax(180px,1fr) 70px 90px!important}}
  `;
  document.head.appendChild(style);

  const rowsBox = document.getElementById('sampleRows');
  if (!rowsBox) return;

  if (!document.querySelector('.sample-head')) {
    const head = document.createElement('div');
    head.className = 'sample-head';
    head.innerHTML = '<span></span><span>Escuela</span><span>Matrícula</span><span>A encuestar</span>';
    rowsBox.parentNode.insertBefore(head, rowsBox);
  }

  const grid = document.querySelector('#sampleView .metric-grid');
  if (grid) {
    grid.innerHTML = `
      <div class="metric"><div class="v" id="sampleSchools">0</div><div class="l">Escuelas</div></div>
      <div class="metric"><div class="v" id="sampleEnrollment">0</div><div class="l">Matrícula representada</div></div>
      <div class="metric"><div class="v" id="surveyStudents">0</div><div class="l">Estudiantes a encuestar</div></div>
      <div class="metric"><div class="v" id="surveyUniversePct">0%</div><div class="l">% del universo encuestado</div></div>
      <div class="metric"><div class="v" id="surveySelectedPct">0%</div><div class="l">% de matrícula seleccionada</div></div>
      <div class="metric"><div class="v" id="sampleSchoolPct">0%</div><div class="l">% de escuelas</div></div>`;
  }

  const warning = document.querySelector('#sampleView .warning');
  if (warning) warning.textContent = 'La matrícula representada indica cuántos estudiantes pertenecen a las escuelas elegidas. “Estudiantes a encuestar” es la cantidad efectiva que definís manualmente por escuela. Ese valor no puede superar la matrícula registrada.';

  function enhancedSummary() {
    const arr = schools.filter(s => sample.has(s.cue));
    const total = totalEnrollment();
    const represented = arr.reduce((a, s) => a + Number(s.matricula || 0), 0);
    const surveyed = arr.reduce((a, s) => a + Math.min(Number(sampleN[s.cue] || 0), Number(s.matricula || 0)), 0);
    const representedPct = total ? 100 * represented / total : 0;
    const schoolPct = schools.length ? 100 * arr.length / schools.length : 0;
    const universePct = total ? 100 * surveyed / total : 0;
    const selectedPct = represented ? 100 * surveyed / represented : 0;

    document.getElementById('sampleSchools').textContent = arr.length;
    document.getElementById('sampleEnrollment').textContent = fmtN(represented);
    document.getElementById('surveyStudents').textContent = fmtN(surveyed);
    document.getElementById('surveyUniversePct').textContent = pctN(universePct);
    document.getElementById('surveySelectedPct').textContent = pctN(selectedPct);
    document.getElementById('sampleSchoolPct').textContent = pctN(schoolPct);
    document.getElementById('coverageText').textContent = `${fmtN(represented)} / ${fmtN(total)}`;
    document.getElementById('coverageBar').style.width = Math.min(100, representedPct) + '%';

    const cats = ['Primera', 'Segunda', 'Tercera', 'S/Datos'];
    const bd = document.getElementById('catBreakdown');
    bd.innerHTML = '';
    cats.forEach(c => {
      const count = arr.filter(s => s.categoria === c).length;
      const cp = arr.length ? 100 * count / arr.length : 0;
      const r = document.createElement('div');
      r.className = 'cat-row';
      r.innerHTML = `<span>${c}</span><div class="catbar"><div style="width:${cp}%;background:${colors[c]}"></div></div><strong>${count}</strong>`;
      bd.appendChild(r);
    });

    const chips = document.getElementById('selectedChips');
    chips.innerHTML = arr.length
      ? arr.map(s => `<span class="selected-chip">${esc(s.nombre)} · ${fmtN(sampleN[s.cue] || 0)} a encuestar</span>`).join('')
      : '<span class="notice">Sin escuelas seleccionadas.</span>';
  }

  function enhancedRows() {
    const box = document.getElementById('sampleRows');
    box.innerHTML = '';
    sampleVisible().forEach(s => {
      const row = document.createElement('div');
      row.className = 'sample-row';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = sample.has(s.cue);
      cb.setAttribute('aria-label', 'Seleccionar ' + s.nombre);

      const mid = document.createElement('div');
      mid.innerHTML = `<div class="sample-name">${esc(s.nombre)}</div><div class="sample-meta">${esc(s.localidad)} · ${esc(s.categoria)} · CUE ${esc(s.cue)}</div>`;

      const enr = document.createElement('div');
      enr.className = 'enrollment';
      enr.innerHTML = `${fmtN(s.matricula)}<div class="sample-meta">est.</div>`;

      const nin = document.createElement('input');
      nin.className = 'sample-n';
      nin.type = 'number';
      nin.min = '0';
      nin.max = String(Number(s.matricula || 0));
      nin.step = '1';
      nin.value = sampleN[s.cue] ?? '';
      nin.placeholder = '0';
      nin.disabled = !cb.checked;
      nin.setAttribute('aria-label', 'Cantidad a encuestar en ' + s.nombre);

      cb.addEventListener('change', () => {
        if (cb.checked) sample.add(s.cue); else sample.delete(s.cue);
        nin.disabled = !cb.checked;
        saveSample();
        enhancedSummary();
      });

      nin.addEventListener('input', () => {
        const max = Number(s.matricula || 0);
        let v = Math.max(0, Math.floor(Number(nin.value || 0)));
        if (v > max) v = max;
        nin.value = v || '';
        sampleN[s.cue] = v;
        if (v > 0 && !sample.has(s.cue)) {
          sample.add(s.cue);
          cb.checked = true;
          nin.disabled = false;
        }
        saveSampleN();
        saveSample();
        enhancedSummary();
      });

      row.append(cb, mid, enr, nin);
      box.appendChild(row);
    });
    enhancedSummary();
  }

  renderSampleRows = enhancedRows;
  updateSampleSummary = enhancedSummary;

  document.getElementById('searchSample').addEventListener('input', enhancedRows);
  document.getElementById('clearSample').addEventListener('click', () => {
    sampleN = {};
    saveSampleN();
    setTimeout(enhancedRows, 0);
  });
  document.getElementById('selectVisible').addEventListener('click', () => setTimeout(enhancedRows, 0));
  document.getElementById('selectAll').addEventListener('click', () => setTimeout(enhancedRows, 0));

  enhancedRows();
})();
