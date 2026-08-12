(() => {
  const style = document.createElement('style');
  style.textContent = `
    #editTable th,#editTable td{border-right:1px solid rgba(255,255,255,.82)!important;border-bottom:1px solid rgba(255,255,255,.82)!important}
    #editTable th.track-col,#editTable th.custom-col{background:#275c46!important;color:#f4fff9!important;border-color:rgba(255,255,255,.82)!important}
    #editTable td.track-col,#editTable td.custom-col{background:#173b2d!important;border-color:rgba(255,255,255,.82)!important}
    #editTable td.track-col:focus,#editTable td.custom-col:focus{background:#20513e!important;box-shadow:inset 0 0 0 2px #9ee7c5!important}
    #editTable th[data-turnos-col]{background:#10243a!important;color:#c8d9e8!important;border-color:rgba(255,255,255,.82)!important}
    #editTable td[data-turnos-col]{background:#0c1b2b!important;border-color:rgba(255,255,255,.82)!important;min-width:180px}
    #editTable td[data-turnos-col]:focus{background:#10263b!important;box-shadow:inset 0 0 0 2px var(--accent)!important}
    .tabbtn[data-view="tableView"]{font-weight:800!important;border:2px solid var(--accent)!important;padding:9px 15px!important;box-shadow:0 0 0 2px rgba(72,202,228,.16)!important}
    .tabbtn[data-view="tableView"]::before{content:'✎ ';font-weight:900}
    .tabbtn[data-view="tableView"]:not(.active){background:#123149!important;color:#f4fbff!important}
  `;
  document.head.appendChild(style);

  function normalizeText(s){return String(s||'').trim().toLowerCase();}

  function polishTable(){
    const table = document.getElementById('editTable');
    if(!table) return;
    const headRow = table.querySelector('thead tr');
    if(!headRow) return;

    let headers = [...headRow.children];
    const periodoIndex = headers.findIndex(th => normalizeText(th.textContent) === 'período' || normalizeText(th.textContent) === 'periodo');
    if(periodoIndex >= 0){
      headers[periodoIndex].remove();
      table.querySelectorAll('tbody tr').forEach(tr => {
        const cells = [...tr.children];
        if(cells[periodoIndex]) cells[periodoIndex].remove();
      });
    }

    headers = [...headRow.children];
    const turnosTh = headRow.querySelector('th[data-turnos-col]');
    const latTh = headers.find(th => normalizeText(th.textContent) === 'latitud');
    if(turnosTh && latTh && turnosTh !== latTh.previousElementSibling){
      const turnosIndex = headers.indexOf(turnosTh);
      const latIndex = headers.indexOf(latTh);
      headRow.insertBefore(turnosTh, latTh);
      table.querySelectorAll('tbody tr').forEach(tr => {
        const cells = [...tr.children];
        const turnosTd = tr.querySelector('td[data-turnos-col]');
        const target = cells[latIndex];
        if(turnosTd && target && turnosIndex !== latIndex-1) tr.insertBefore(turnosTd, target);
      });
    }

    headers = [...headRow.children];
    const lonIndex = headers.findIndex(th => normalizeText(th.textContent) === 'longitud');
    if(lonIndex >= 0){
      headers.forEach((th,i) => {
        if(i > lonIndex){
          th.classList.add('track-col');
          if(!th.dataset.turnosCol) th.style.background = '#275c46';
        }
      });
      table.querySelectorAll('tbody tr').forEach(tr => {
        [...tr.children].forEach((td,i) => {
          if(i > lonIndex && !td.dataset.turnosCol) td.classList.add('track-col');
        });
      });
    }
  }

  function makeTableTabVisible(){
    const btn = document.querySelector('.tabbtn[data-view="tableView"]');
    if(btn){
      btn.textContent = 'TABLA EDITABLE';
      btn.title = 'Abrir tabla editable y seguimiento';
    }
  }

  function enhance(){
    makeTableTabVisible();
    polishTable();
  }

  enhance();
  const table = document.getElementById('editTable');
  if(table){
    new MutationObserver(() => requestAnimationFrame(enhance)).observe(table,{childList:true,subtree:true});
  }
})();
