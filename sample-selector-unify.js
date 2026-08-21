(() => {
  const style = document.createElement('style');
  style.textContent = `
    .sample-modebar{display:flex;gap:8px;align-items:center;padding:10px 12px;background:#0b1928;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:30}
    .sample-modebar button{border:1px solid var(--line);background:#0b1b2c;color:var(--text);border-radius:9px;padding:9px 13px;cursor:pointer;font-size:13px;font-weight:700}
    .sample-modebar button.active{background:var(--state);color:#041018;border-color:var(--state)}
    .sample-mode-note{font-size:11px;color:var(--muted);margin-left:4px}
  `;
  document.head.appendChild(style);

  function setup(){
    const sampleView = document.getElementById('sampleView');
    const selectorView = document.getElementById('selectorView');
    const tabs = document.querySelector('.tabs');
    if (!sampleView || !selectorView || !tabs || document.getElementById('sampleUnifiedModebar')) return false;

    const sampleTopBtn = [...tabs.querySelectorAll('.tabbtn')].find(b => b.dataset.view === 'sampleView');
    const selectorTopBtn = [...tabs.querySelectorAll('.tabbtn')].find(b => b.dataset.customTarget === 'selectorView' || b.textContent.trim() === 'Seleccionar escuelas');
    if (sampleTopBtn) sampleTopBtn.textContent = 'Diseñar muestra';
    if (selectorTopBtn) selectorTopBtn.style.display = 'none';

    const bar = document.createElement('div');
    bar.id = 'sampleUnifiedModebar';
    bar.className = 'sample-modebar';
    bar.innerHTML = `
      <button id="modePreselect" class="active">1. Preseleccionar por criterios</button>
      <button id="modeProject">2. Proyectar muestra</button>
      <span class="sample-mode-note">Dos pasos de una misma sección: primero elegís escuelas; después definís cuántos estudiantes encuestar.</span>`;

    sampleView.prepend(bar.cloneNode(true));
    selectorView.prepend(bar);

    function setMode(mode){
      const showSelector = mode === 'selector';
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      (showSelector ? selectorView : sampleView).classList.add('active');
      document.querySelectorAll('.tabbtn').forEach(b => b.classList.toggle('active', b === sampleTopBtn));
      document.querySelectorAll('#modePreselect').forEach(b => b.classList.toggle('active', showSelector));
      document.querySelectorAll('#modeProject').forEach(b => b.classList.toggle('active', !showSelector));
      if (showSelector && typeof renderResults === 'function') setTimeout(renderResults, 20);
      if (!showSelector && typeof renderSampleRows === 'function') setTimeout(renderSampleRows, 20);
    }

    document.querySelectorAll('#modePreselect').forEach(b => b.addEventListener('click', () => setMode('selector')));
    document.querySelectorAll('#modeProject').forEach(b => b.addEventListener('click', () => setMode('sample')));

    if (sampleTopBtn) sampleTopBtn.addEventListener('click', () => setMode('selector'));
    return true;
  }

  if (!setup()) {
    const obs = new MutationObserver(() => { if (setup()) obs.disconnect(); });
    obs.observe(document.body, {childList:true, subtree:true});
    setTimeout(() => { setup(); obs.disconnect(); }, 5000);
  }
})();
