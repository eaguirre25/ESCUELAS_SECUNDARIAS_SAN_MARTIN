(() => {
  const view = document.getElementById('sampleView');
  if (!view || view.dataset.managementTabs === '1') return;
  view.dataset.managementTabs = '1';

  const grid = view.querySelector('.sample-grid');
  const lists = [...view.querySelectorAll('.management-list')];
  if (!grid || lists.length < 2) return;

  const [stateList, privateList] = lists;
  const toolbar = view.querySelector('.sample-toolbar');

  const style = document.createElement('style');
  style.textContent = `
    #sampleView .sample-grid.management-tabs-mode{grid-template-columns:minmax(0,1fr) 330px!important}
    #sampleView .management-list.management-hidden{display:none!important}
    #sampleView .management-tabs{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:8px 12px;border-bottom:1px solid var(--line);background:#091827}
    #sampleView .management-tab{border:1px solid var(--line);background:#0b1b2c;color:var(--text);border-radius:9px;padding:7px 11px;cursor:pointer;font-size:11px}
    #sampleView .management-tab.active{font-weight:800;background:var(--state);color:#041018;border-color:var(--state)}
    #sampleView .management-tab.private.active{background:var(--private);border-color:var(--private);color:#210713}
    #showSampleOnMap{border-color:var(--accent)!important;color:var(--accent)!important}
    @media(max-width:900px){#sampleView .sample-grid.management-tabs-mode{grid-template-columns:1fr!important}.summary-pane{grid-column:auto!important}}
  `;
  document.head.appendChild(style);

  const tabs = document.createElement('div');
  tabs.className = 'management-tabs';
  tabs.innerHTML = `
    <strong style="font-size:11px;margin-right:3px">Escuelas disponibles:</strong>
    <button type="button" class="management-tab active" data-mgmt-tab="state">Gestión estatal</button>
    <button type="button" class="management-tab private" data-mgmt-tab="private">Gestión privada</button>
    <span style="font-size:10px;color:var(--muted);margin-left:5px">La selección se conserva al cambiar de solapa.</span>`;

  grid.parentNode.insertBefore(tabs, grid);
  grid.classList.add('management-tabs-mode');
  privateList.classList.add('management-hidden');

  const setTab = mode => {
    const state = mode === 'state';
    stateList.classList.toggle('management-hidden', !state);
    privateList.classList.toggle('management-hidden', state);
    tabs.querySelector('[data-mgmt-tab="state"]').classList.toggle('active', state);
    tabs.querySelector('[data-mgmt-tab="private"]').classList.toggle('active', !state);
  };

  tabs.addEventListener('click', e => {
    const btn = e.target.closest('[data-mgmt-tab]');
    if (btn) setTab(btn.dataset.mgmtTab);
  });

  if (toolbar && !document.getElementById('showSampleOnMap')) {
    const btn = document.createElement('button');
    btn.id = 'showSampleOnMap';
    btn.className = 'button';
    btn.type = 'button';
    btn.textContent = 'Mostrar selección en mapa';
    btn.title = 'Ir al mapa y mostrar únicamente las escuelas preseleccionadas';
    btn.addEventListener('click', () => {
      const mapTab = document.querySelector('.tabbtn[data-view="mapView"]');
      if (mapTab) mapTab.click();
      setTimeout(() => document.getElementById('sampleOnMap')?.click(), 100);
    });
    toolbar.appendChild(btn);
  }
})();
