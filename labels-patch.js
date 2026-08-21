(() => {
  const replaceText = (root, selector, from, to) => {
    root.querySelectorAll(selector).forEach(el => {
      if ((el.textContent || '').trim() === from) el.textContent = to;
    });
  };

  function patchSelector() {
    const root = document.getElementById('selectorView');
    if (!root) return;

    // Encabezados de la tabla de resultados.
    const headers = root.querySelectorAll('.sel-table thead th');
    const headerMap = {
      6: 'Desfav. (DGCyE)',
      7: 'NBI (2022)',
      8: 'IVSE (2023)',
      11: 'Encuesta 2011',
      12: 'Encuesta 2021',
      13: '% trabaja (encuesta 2021)',
      14: '% <10 cuadras (encuesta 2021)'
    };
    Object.entries(headerMap).forEach(([i, label]) => {
      if (headers[Number(i)]) headers[Number(i)].textContent = label;
    });

    // 1/0 de desfavorabilidad se muestran como Sí/No, sin alterar el dato subyacente.
    root.querySelectorAll('.sel-table tbody tr').forEach(tr => {
      const cells = tr.querySelectorAll('td');
      const cell = cells[6];
      if (!cell) return;
      const t = (cell.textContent || '').trim();
      if (t === '1') cell.textContent = 'Sí';
      if (t === '0') cell.textContent = 'No';
    });

    // Etiquetas de filtros.
    root.querySelectorAll('.sel-field label').forEach(label => {
      const t = (label.textContent || '').trim();
      if (t === 'NBI') label.textContent = 'NBI (2022)';
      if (t === 'IVSE') label.textContent = 'IVSE (2023)';
      if (t === 'Desfavorabilidad') label.textContent = 'Desfavorabilidad (DGCyE)';
      if (t === '% mínimo que trabaja') label.textContent = '% mínimo que trabaja (encuesta 2021)';
      if (t === '% mínimo a <10 cuadras') label.textContent = '% mínimo a <10 cuadras (encuesta 2021)';
    });

    const desf = root.querySelector('#fDesf');
    if (desf) {
      [...desf.options].forEach(o => {
        if (o.value === '1') o.textContent = 'Sí';
        if (o.value === '0') o.textContent = 'No';
      });
    }
  }

  function patchSocioMap() {
    const root = document.getElementById('socioMapView');
    if (!root) return;
    const metric = root.querySelector('#socioMetric');
    if (metric) {
      [...metric.options].forEach(o => {
        if (o.value === 'tercil_nbi') o.textContent = 'NBI (2022)';
        if (o.value === 'tercil_ivse') o.textContent = 'IVSE (2023)';
        if (o.value === 'desfavorabilidad') o.textContent = 'Desfavorabilidad (DGCyE)';
      });
    }

    // Fichas emergentes del mapa socioeconómico.
    root.querySelectorAll('.socio-card td:first-child').forEach(td => {
      const t = (td.textContent || '').trim();
      if (t === 'NBI') td.textContent = 'NBI (2022)';
      if (t === 'IVSE') td.textContent = 'IVSE (2023)';
      if (t === 'Desfavorabilidad' || t === 'Desfav.') td.textContent = 'Desfavorabilidad (DGCyE)';
      if (t === '% trabaja') td.textContent = '% trabaja (encuesta 2021)';
      if (t === '% <10 cuadras') td.textContent = '% <10 cuadras (encuesta 2021)';
    });
    root.querySelectorAll('.socio-card td:nth-child(2)').forEach(td => {
      const prev = td.previousElementSibling?.textContent || '';
      if (prev.includes('Desfavorabilidad')) {
        const t = (td.textContent || '').trim();
        if (t === '1') td.textContent = 'Sí';
        if (t === '0') td.textContent = 'No';
      }
    });
  }

  function patchInitialMapPopups() {
    document.querySelectorAll('.leaflet-popup-content').forEach(pop => {
      replaceText(pop, '.pop-kpi span', 'Desfav.', 'Desfav. (DGCyE)');
      pop.querySelectorAll('.tag').forEach(tag => {
        const t = (tag.textContent || '').trim();
        if (t === 'Desfavorabilidad 1') tag.textContent = 'Desfavorabilidad (DGCyE): Sí';
      });
    });
  }

  const patchAll = () => {
    patchSelector();
    patchSocioMap();
    patchInitialMapPopups();
  };

  patchAll();
  new MutationObserver(patchAll).observe(document.body, { childList: true, subtree: true });
})();
