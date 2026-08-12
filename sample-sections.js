(() => {
  const style = document.createElement('style');
  style.textContent = `
    .sample-head,.sample-row{grid-template-columns:24px minmax(220px,1fr) 82px 88px 110px!important}
    .sample-sections{text-align:right;font-size:11px;font-weight:700}
    @media(max-width:760px){.sample-head,.sample-row{grid-template-columns:24px minmax(170px,1fr) 68px 72px 88px!important}}
  `;
  document.head.appendChild(style);

  const numFromName = name => {
    const t = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/N[º°]/gi,'N');
    const m = t.match(/SECUNDARIA\s+N\s*([0-9]+)/i) || t.match(/SECUNDARIA\s+N?\s*([0-9]+)/i);
    return m ? Number(m[1]) : null;
  };

  function schoolForRow(row) {
    const meta = row.querySelector('.sample-meta')?.textContent || '';
    const cue = (meta.match(/CUE\s+([0-9]+)/i) || [])[1];
    try {
      if (cue && Array.isArray(schools)) return schools.find(s => String(s.cue) === String(cue));
      const n = numFromName(row.querySelector('.sample-name')?.textContent || '');
      if (n && Array.isArray(schools)) return schools.find(s => numFromName(s.nombre) === n);
    } catch (_) {}
    return null;
  }

  function enhance() {
    const head = document.querySelector('.sample-head');
    if (head && !head.querySelector('[data-sections-head]')) {
      const span = document.createElement('span');
      span.dataset.sectionsHead = '1';
      span.textContent = 'Secciones/Cursos';
      head.insertBefore(span, head.lastElementChild);
    }

    document.querySelectorAll('#sampleRows .sample-row').forEach(row => {
      if (row.querySelector('.sample-sections')) return;
      const s = schoolForRow(row);
      const cell = document.createElement('div');
      cell.className = 'sample-sections';
      cell.innerHTML = `${Number(s?.secciones || 0).toLocaleString('es-AR')}<div class="sample-meta">cursos</div>`;
      row.insertBefore(cell, row.lastElementChild);
    });
  }

  enhance();
  const box = document.getElementById('sampleRows');
  if (box) new MutationObserver(enhance).observe(box,{childList:true,subtree:true});
})();
