(() => {
  const KEY = 'ees-sm-turnos-edits-v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) {}

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function schoolByCue(cue) {
    try { return Array.isArray(schools) ? schools.find(s => String(s.cue) === String(cue)) : null; } catch (_) { return null; }
  }

  function cueForRow(tr) {
    const tds = tr.querySelectorAll('td');
    return (tds[1]?.textContent || '').trim();
  }

  function addTurnosColumn() {
    const head = document.querySelector('#editTable thead tr');
    if (!head) return;
    let th = head.querySelector('th[data-turnos-col]');
    if (!th) {
      th = document.createElement('th');
      th.dataset.turnosCol = '1';
      th.textContent = 'TURNOS';
      th.style.background = '#1f4f46';
      th.style.color = '#eefcf8';
      head.appendChild(th);
    }

    document.querySelectorAll('#editTable tbody tr').forEach(tr => {
      let td = tr.querySelector('td[data-turnos-col]');
      if (td) return;
      const cue = cueForRow(tr);
      const school = schoolByCue(cue);
      td = document.createElement('td');
      td.dataset.turnosCol = '1';
      td.contentEditable = 'true';
      td.spellcheck = false;
      td.style.background = '#12342f';
      td.style.borderColor = '#2c5d55';
      td.style.minWidth = '180px';
      td.textContent = saved[cue] ?? school?.turnos ?? '';
      td.addEventListener('input', () => {
        const value = td.textContent.trim();
        saved[cue] = value;
        localStorage.setItem(KEY, JSON.stringify(saved));
        if (school) school.turnos = value;
        td.classList.add('edited');
        document.getElementById('editTable')?.dispatchEvent(new Event('input', { bubbles: true }));
      });
      tr.appendChild(td);
    });
  }

  function replaceExport() {
    const btn = document.getElementById('exportExcel');
    if (!btn || btn.dataset.turnosExport === '1') return;
    const clone = btn.cloneNode(true);
    clone.dataset.turnosExport = '1';
    btn.replaceWith(clone);
    clone.addEventListener('click', () => {
      if (typeof XLSX === 'undefined') {
        alert('No se pudo cargar el componente de Excel. Recargá la página e intentá nuevamente.');
        return;
      }
      const table = document.getElementById('editTable');
      const headers = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim());
      const rows = [...table.querySelectorAll('tbody tr')].map(tr => [...tr.querySelectorAll('td')].map(td => td.textContent.trim()));
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!freeze'] = { xSplit: 1, ySplit: 1 };
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Escuelas');
      XLSX.writeFile(wb, 'escuelas_secundarias_san_martin_seguimiento.xlsx');
    });
  }

  function enhance() {
    addTurnosColumn();
    replaceExport();
  }

  enhance();
  const tbody = document.querySelector('#editTable tbody');
  if (tbody) new MutationObserver(enhance).observe(tbody, { childList: true, subtree: false });
})();
