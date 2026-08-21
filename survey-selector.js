(() => {
  const raw = Array.isArray(window.SELECTION_ROWS) ? window.SELECTION_ROWS : [];
  if (!raw.length || typeof L === 'undefined') return;

  const F = ['clave','escuela','localidad','categoria','turnos','desfavorabilidad','secciones','matricula','pct_nbi','tercil_nbi','pct_hacinamiento','ivse','tercil_ivse','renabap250','pct_renabap250','encuesta2011','encuesta2021','pct_trabaja_2021','pct_cerca_2021','n_evidencias','perfil_convergencia','lat','lon'];
  const DATA = raw.map(row => Object.fromEntries(F.map((k,i)=>[k,row[i]])));
  const STORAGE = 'ees-sm-preseleccion-v1';
  let selected;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) || '[]');
    selected = new Set(Array.isArray(saved) ? saved : []);
  } catch (_) {
    selected = new Set();
  }
  let currentFiltered = DATA.slice();
  let socioMap = null;
  let socioLayer = null;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pct = v => v == null || v === '' ? 'S/D' : `${Number(v).toFixed(1).replace('.',',')}%`;
  const pct01 = v => v == null || v === '' ? 'S/D' : `${(Number(v)*100).toFixed(1).replace('.',',')}%`;
  const ivse = v => v == null || v === '' ? 'S/D' : Number(v).toFixed(3).replace('.',',');
  const num = v => Number(v || 0).toLocaleString('es-AR');
  const uniq = key => [...new Set(DATA.map(d=>d[key]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'es'));

  const style = document.createElement('style');
  style.textContent = `
    .sel-layout{height:100%;min-height:0;display:grid;grid-template-columns:330px 1fr;background:#081421}
    .sel-panel{overflow:auto;padding:14px;border-right:1px solid var(--line);background:#091827}
    .sel-main{min-width:0;display:grid;grid-template-rows:auto 1fr;overflow:hidden}
    .sel-panel h2,.sm-head h2{margin:0 0 5px;font-size:15px}.sel-help{font-size:10.5px;color:var(--muted);line-height:1.45;margin:0 0 12px}
    .sel-block{border-top:1px solid var(--line);padding-top:10px;margin-top:10px}.sel-block h3{margin:0 0 8px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#c8d9e8}
    .sel-grid2{display:grid;grid-template-columns:1fr 1fr;gap:7px}.sel-field label{font-size:9.5px;color:var(--muted);display:block;margin-bottom:4px}
    .sel-field select,.sel-field input{padding:7px 8px;font-size:11px}.sel-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
    .sel-actions button,.sm-toolbar button{border:1px solid var(--line);background:#0b1b2c;color:var(--text);border-radius:8px;padding:7px 9px;cursor:pointer;font-size:11px}
    .sel-actions button.primary,.sm-toolbar button.primary{background:var(--state);color:#041018;border-color:var(--state);font-weight:800}
    .logic-toggle{display:grid;grid-template-columns:1fr 1fr;gap:6px}.logic-toggle label{border:1px solid var(--line);border-radius:8px;padding:7px;font-size:10px;cursor:pointer;background:#0b1b2c}
    .logic-toggle input{width:auto;margin-right:5px}
    .sm-head{padding:11px 13px;border-bottom:1px solid var(--line);background:#0b1928;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
    .sm-kpis{display:flex;gap:7px;flex-wrap:wrap}.sm-kpi{border:1px solid var(--line);background:#10243a;border-radius:9px;padding:6px 9px}.sm-kpi b{font-size:16px;display:block}.sm-kpi span{font-size:9px;color:var(--muted);text-transform:uppercase}
    .sm-toolbar{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap}.sel-table-wrap{overflow:auto}.sel-table{border-collapse:separate;border-spacing:0;width:max-content;min-width:100%;font-size:11px}
    .sel-table th,.sel-table td{border-right:1px solid #20364a;border-bottom:1px solid #20364a;padding:7px 8px;white-space:nowrap;background:#0a1725}
    .sel-table th{position:sticky;top:0;z-index:2;background:#10243a;color:#c8d9e8;font-size:9.5px;text-transform:uppercase}
    .sel-table td.school{font-weight:750;white-space:normal;min-width:220px}.sel-table tr.pre td{background:#122b31}.sel-table input[type=checkbox]{width:auto}
    .chip{display:inline-block;padding:2px 6px;border-radius:999px;border:1px solid #36516b;font-size:9px}.chip.alto{border-color:#ef6a6a;color:#ffb3b3}.chip.medio{border-color:#c9a94a;color:#ffe49a}.chip.bajo{border-color:#4e9970;color:#a8e6c0}
    .socio-layout{height:100%;display:grid;grid-template-columns:310px 1fr;min-height:0}.socio-side{padding:14px;overflow:auto;background:#091827;border-right:1px solid var(--line)}
    #socioMapCanvas{height:100%;min-height:400px;background:#dbe7ef}.socio-side h2{font-size:15px;margin:0 0 6px}.legend-box{margin-top:12px;border-top:1px solid var(--line);padding-top:10px;font-size:10.5px;color:var(--muted)}
    .legend-item{display:flex;align-items:center;gap:7px;margin:6px 0}.legend-swatch{width:13px;height:13px;border-radius:50%}
    .socio-card{font-size:11px;line-height:1.45}.socio-card h3{font-size:14px;margin:0 0 5px}.socio-card .mini{color:#b7c9d8;margin-bottom:7px}.socio-card table{width:100%;border-collapse:collapse}.socio-card td{padding:2px 4px;border-bottom:1px solid #20364a}.socio-card td:first-child{color:#9fb4c8}
    @media(max-width:900px){.sel-layout,.socio-layout{grid-template-columns:1fr;grid-template-rows:auto minmax(500px,1fr)}.sel-panel,.socio-side{border-right:0;border-bottom:1px solid var(--line);max-height:52vh}}
  `;
  document.head.appendChild(style);

  function injectViews(){
    const tabs = document.querySelector('.tabs');
    if (!tabs || document.getElementById('socioMapView')) return;

    const mapBtn = document.createElement('button');
    mapBtn.className = 'tabbtn';
    mapBtn.textContent = 'Mapa socioeconómico';
    mapBtn.dataset.customTarget = 'socioMapView';

    const selBtn = document.createElement('button');
    selBtn.className = 'tabbtn';
    selBtn.textContent = 'Seleccionar escuelas';
    selBtn.dataset.customTarget = 'selectorView';

    tabs.append(mapBtn, selBtn);

    const shell = document.querySelector('.shell');
    const mapView = document.createElement('section');
    mapView.id='socioMapView'; mapView.className='view';
    mapView.innerHTML = `
      <div class="socio-layout">
        <aside class="socio-side">
          <h2>Mapa socioeconómico</h2>
          <p class="sel-help">49 escuelas secundarias estatales provinciales. El tamaño del punto representa la matrícula.</p>
          <div class="sel-field"><label>Colorear según</label>
            <select id="socioMetric">
              <option value="tercil_nbi">NBI</option>
              <option value="tercil_ivse">IVSE</option>
              <option value="renabap250">RENABAP a 250 m</option>
              <option value="desfavorabilidad">Desfavorabilidad</option>
              <option value="encuesta2021">Encuesta 2021</option>
              <option value="perfil_convergencia">Perfil de convergencia</option>
            </select>
          </div>
          <div class="sel-field" style="margin-top:8px"><label>Mostrar</label>
            <select id="socioSubset"><option value="all">Todas las escuelas</option><option value="filtered">Resultado actual de filtros</option><option value="selected">Solo preseleccionadas</option></select>
          </div>
          <div id="socioLegend" class="legend-box"></div>
        </aside>
        <main id="socioMapCanvas"></main>
      </div>`;
    shell.appendChild(mapView);

    const selView = document.createElement('section');
    selView.id='selectorView'; selView.className='view';
    selView.innerHTML = selectorHTML();
    shell.appendChild(selView);

    [mapBtn, selBtn].forEach(btn => btn.addEventListener('click', ()=>{
      document.querySelectorAll('.tabbtn').forEach(b=>b.classList.toggle('active', b===btn));
      document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active', v.id===btn.dataset.customTarget));
      if (btn===mapBtn) setTimeout(initOrRefreshSocioMap,60);
      if (btn===selBtn) setTimeout(renderResults,20);
    }));

    bindSelector();
  }

  function selectorHTML(){
    const opts = (arr)=>arr.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
    return `
    <div class="sel-layout">
      <aside class="sel-panel">
        <h2>Preseleccionar escuelas</h2>
        <p class="sel-help">Combiná criterios de la grilla. Por defecto se muestran las escuelas que cumplen <b>todos</b> los criterios activos.</p>
        <div class="sel-block"><h3>Lógica de combinación</h3>
          <div class="logic-toggle">
            <label><input type="radio" name="selLogic" value="AND" checked>Todos (AND)</label>
            <label><input type="radio" name="selLogic" value="OR">Alguno (OR)</label>
          </div>
        </div>
        <div class="sel-block"><h3>Territorio y condición socioeconómica</h3>
          <div class="sel-field"><label>Localidad</label><select id="fLocalidad"><option value="">Todas</option>${opts(uniq('localidad'))}</select></div>
          <div class="sel-grid2" style="margin-top:7px">
            <div class="sel-field"><label>NBI</label><select id="fNbi"><option value="">Todos</option><option>Bajo</option><option>Medio</option><option>Alto</option></select></div>
            <div class="sel-field"><label>IVSE</label><select id="fIvse"><option value="">Todos</option><option>Bajo</option><option>Medio</option><option>Alto</option><option value="S/D">S/D</option></select></div>
            <div class="sel-field"><label>RENABAP 250 m</label><select id="fRen"><option value="">Todos</option><option>Sí</option><option>No</option></select></div>
            <div class="sel-field"><label>Desfavorabilidad</label><select id="fDesf"><option value="">Todas</option><option value="1">1</option><option value="0">0</option></select></div>
          </div>
          <div class="sel-field" style="margin-top:7px"><label>% mínimo del buffer ocupado por RENABAP</label><input id="fRenMin" type="number" min="0" max="100" step="1" placeholder="Ej.: 10"></div>
        </div>
        <div class="sel-block"><h3>Características institucionales</h3>
          <div class="sel-grid2">
            <div class="sel-field"><label>Categoría</label><select id="fCat"><option value="">Todas</option>${opts(uniq('categoria'))}</select></div>
            <div class="sel-field"><label>Turno</label><select id="fTurno"><option value="">Todos</option><option>MAÑANA</option><option>TARDE</option><option>VESPERTINO</option><option>NOCHE</option></select></div>
            <div class="sel-field"><label>Matrícula mínima</label><input id="fMatMin" type="number" min="0" step="25"></div>
            <div class="sel-field"><label>Matrícula máxima</label><input id="fMatMax" type="number" min="0" step="25"></div>
            <div class="sel-field"><label>Secciones mín.</label><input id="fSecMin" type="number" min="0"></div>
            <div class="sel-field"><label>Secciones máx.</label><input id="fSecMax" type="number" min="0"></div>
          </div>
        </div>
        <div class="sel-block"><h3>Antecedentes de encuesta</h3>
          <div class="sel-grid2">
            <div class="sel-field"><label>Encuesta 2011</label><select id="f2011"><option value="">Todas</option><option>Sí</option><option>No</option></select></div>
            <div class="sel-field"><label>Encuesta 2021</label><select id="f2021"><option value="">Todas</option><option>Sí</option><option>No</option></select></div>
            <div class="sel-field"><label>% mínimo que trabaja</label><input id="fWorkMin" type="number" min="0" max="100" step="1"></div>
            <div class="sel-field"><label>% mínimo a &lt;10 cuadras</label><input id="fNearMin" type="number" min="0" max="100" step="1"></div>
          </div>
        </div>
        <div class="sel-actions">
          <button id="applyFilters" class="primary">Aplicar criterios</button>
          <button id="clearFilters">Limpiar</button>
        </div>
      </aside>
      <main class="sel-main">
        <div class="sm-head">
          <div><h2>Escuelas que cumplen los criterios</h2><div class="sel-help" id="criteriaText" style="margin:0">Sin filtros activos.</div></div>
          <div class="sm-kpis"><div class="sm-kpi"><b id="matchCount">49</b><span>cumplen filtros</span></div><div class="sm-kpi"><b id="preCount">0</b><span>preseleccionadas</span></div><div class="sm-kpi"><b id="preEnrollment">0</b><span>matrícula preseleccionada</span></div></div>
          <div class="sm-toolbar"><button id="mapFilteredBtn">Ver en mapa</button><button id="exportSelected" class="primary">Exportar preselección</button></div>
        </div>
        <div class="sel-table-wrap"><table class="sel-table"><thead><tr>
          <th>✓</th><th>Escuela</th><th>Localidad</th><th>Matrícula</th><th>Cat.</th><th>Turnos</th><th>Desfav.</th><th>NBI</th><th>IVSE</th><th>RENABAP</th><th>% REN.</th><th>2011</th><th>2021</th><th>% trabaja</th><th>% &lt;10 cuadras</th>
        </tr></thead><tbody id="selResults"></tbody></table></div>
      </main>
    </div>`;
  }

  const filterDefs = [
    ['fLocalidad', d=>d.localidad, 'Localidad'],
    ['fNbi', d=>d.tercil_nbi, 'NBI'],
    ['fIvse', d=>d.tercil_ivse || 'S/D', 'IVSE'],
    ['fRen', d=>d.renabap250, 'RENABAP'],
    ['fDesf', d=>String(d.desfavorabilidad), 'Desfavorabilidad'],
    ['fCat', d=>d.categoria, 'Categoría'],
    ['fTurno', d=>d.turnos, 'Turno'],
    ['f2011', d=>d.encuesta2011, 'Encuesta 2011'],
    ['f2021', d=>d.encuesta2021, 'Encuesta 2021']
  ];

  function activeTests(){
    const tests=[], labels=[];
    filterDefs.forEach(([id,get,label])=>{
      const el=document.getElementById(id); if(!el || !el.value) return;
      const val=el.value;
      if(id==='fTurno') tests.push(d=>String(get(d)||'').includes(val));
      else tests.push(d=>String(get(d)??'')===val);
      labels.push(`${label}: ${val}`);
    });
    const numeric = [
      ['fRenMin',d=>d.pct_renabap250,'RENABAP ≥',1],
      ['fMatMin',d=>d.matricula,'Matrícula ≥',1],
      ['fMatMax',d=>d.matricula,'Matrícula ≤',-1],
      ['fSecMin',d=>d.secciones,'Secciones ≥',1],
      ['fSecMax',d=>d.secciones,'Secciones ≤',-1],
      ['fWorkMin',d=>d.pct_trabaja_2021,'% trabaja ≥',100],
      ['fNearMin',d=>d.pct_cerca_2021,'% <10 cuadras ≥',100]
    ];
    numeric.forEach(([id,get,label,scale])=>{
      const el=document.getElementById(id); if(!el || el.value==='') return;
      const raw=Number(el.value), threshold=(scale===100?raw/100:raw);
      if(id.endsWith('Max')) tests.push(d=>Number(get(d)||0)<=threshold);
      else tests.push(d=>get(d)!=null && Number(get(d))>=threshold);
      labels.push(`${label} ${raw}${scale===100||id==='fRenMin'?'%':''}`);
    });
    return {tests,labels};
  }

  function applyFilters(){
    const {tests,labels}=activeTests();
    const logic=document.querySelector('input[name="selLogic"]:checked')?.value || 'AND';
    currentFiltered = !tests.length ? DATA.slice() : DATA.filter(d => logic==='AND' ? tests.every(t=>t(d)) : tests.some(t=>t(d)));
    document.getElementById('criteriaText').textContent = labels.length ? `${logic==='AND'?'Todos':'Alguno'}: ${labels.join(' · ')}` : 'Sin filtros activos.';
    renderResults();
  }

  function renderResults(){
    const body=document.getElementById('selResults'); if(!body) return;
    body.innerHTML='';
    currentFiltered.forEach(d=>{
      const tr=document.createElement('tr'); if(selected.has(d.clave)) tr.classList.add('pre');
      tr.innerHTML=`<td><input type="checkbox" ${selected.has(d.clave)?'checked':''}></td>
      <td class="school">${esc(d.escuela)}</td><td>${esc(d.localidad)}</td><td style="text-align:right">${num(d.matricula)}</td><td>${esc(d.categoria)}</td><td>${esc(d.turnos)}</td><td style="text-align:center">${d.desfavorabilidad}</td>
      <td><span class="chip ${String(d.tercil_nbi||'').toLowerCase()}">${esc(d.tercil_nbi||'S/D')}</span></td><td><span class="chip ${String(d.tercil_ivse||'').toLowerCase()}">${esc(d.tercil_ivse||'S/D')}</span></td>
      <td>${esc(d.renabap250)}</td><td style="text-align:right">${pct(d.pct_renabap250)}</td><td>${esc(d.encuesta2011)}</td><td>${esc(d.encuesta2021)}</td><td style="text-align:right">${pct01(d.pct_trabaja_2021)}</td><td style="text-align:right">${pct01(d.pct_cerca_2021)}</td>`;
      tr.querySelector('input').addEventListener('change',e=>{
        if(e.target.checked) selected.add(d.clave); else selected.delete(d.clave);
        localStorage.setItem(STORAGE,JSON.stringify([...selected]));
        tr.classList.toggle('pre',e.target.checked); updateKpis();
      });
      body.appendChild(tr);
    });
    updateKpis();
  }

  function updateKpis(){
    document.getElementById('matchCount').textContent=currentFiltered.length;
    const picked=DATA.filter(d=>selected.has(d.clave));
    document.getElementById('preCount').textContent=picked.length;
    document.getElementById('preEnrollment').textContent=num(picked.reduce((s,d)=>s+Number(d.matricula||0),0));
  }

  function clearFilters(){
    document.querySelectorAll('#selectorView select').forEach(el=>el.value='');
    document.querySelectorAll('#selectorView input[type="number"]').forEach(el=>el.value='');
    const and=document.querySelector('input[name="selLogic"][value="AND"]'); if(and) and.checked=true;
    currentFiltered=DATA.slice();
    const t=document.getElementById('criteriaText'); if(t)t.textContent='Sin filtros activos.';
    renderResults();
  }

  function exportSelected(){
    const picked=DATA.filter(d=>selected.has(d.clave));
    if(!picked.length){alert('No hay escuelas preseleccionadas.');return;}
    const cols=['escuela','localidad','matricula','categoria','turnos','desfavorabilidad','tercil_nbi','tercil_ivse','renabap250','pct_renabap250','encuesta2011','encuesta2021','pct_trabaja_2021','pct_cerca_2021'];
    const labels=['Escuela','Localidad','Matrícula','Categoría','Turnos','Desfavorabilidad','NBI','IVSE','RENABAP 250m','% RENABAP','Encuesta 2011','Encuesta 2021','% trabaja 2021','% <10 cuadras 2021'];
    const quote=v=>`"${String(v??'').replace(/"/g,'""')}"`;
    const csv=[labels.map(quote).join(';'),...picked.map(d=>cols.map(k=>quote(d[k])).join(';'))].join('\n');
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='preseleccion_escuelas_encuesta.csv';a.click();URL.revokeObjectURL(a.href);
  }

  function bindSelector(){
    document.getElementById('applyFilters')?.addEventListener('click',applyFilters);
    document.getElementById('clearFilters')?.addEventListener('click',clearFilters);
    document.getElementById('exportSelected')?.addEventListener('click',exportSelected);
    document.getElementById('mapFilteredBtn')?.addEventListener('click',()=>{
      const mapBtn=[...document.querySelectorAll('.tabbtn')].find(b=>b.dataset.customTarget==='socioMapView');
      if(mapBtn){document.getElementById('socioSubset').value='filtered';mapBtn.click();}
    });
    document.getElementById('socioMetric')?.addEventListener('change',refreshSocioMap);
    document.getElementById('socioSubset')?.addEventListener('change',refreshSocioMap);
    renderResults();
  }

  const palette = {
    Bajo:'#52b788', Medio:'#ffd166', Alto:'#ef476f', 'S/D':'#8da2b5',
    Sí:'#ef476f', No:'#52b788', '1':'#ff9f1c','0':'#52b788',
    Baja:'#52b788', Media:'#ffd166', Alta:'#ef476f','':'#8da2b5'
  };

  function metricInfo(d,metric){
    if(metric==='tercil_nbi') return [d.tercil_nbi||'S/D',d.tercil_nbi||'S/D'];
    if(metric==='tercil_ivse') return [d.tercil_ivse||'S/D',d.tercil_ivse||'S/D'];
    if(metric==='renabap250') return [d.renabap250,d.renabap250];
    if(metric==='desfavorabilidad') return [String(d.desfavorabilidad),`Desfav. ${d.desfavorabilidad}`];
    if(metric==='encuesta2021') return [d.encuesta2021,d.encuesta2021];
    return [d.perfil_convergencia||'S/D',d.perfil_convergencia||'S/D'];
  }

  function subsetData(){
    const val=document.getElementById('socioSubset')?.value||'all';
    if(val==='filtered') return currentFiltered;
    if(val==='selected') return DATA.filter(d=>selected.has(d.clave));
    return DATA;
  }

  function initOrRefreshSocioMap(){
    if(!socioMap){
      socioMap=L.map('socioMapCanvas');
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(socioMap);
      socioLayer=L.layerGroup().addTo(socioMap);
    }
    setTimeout(()=>socioMap.invalidateSize(),10);
    refreshSocioMap();
  }

  function refreshSocioMap(){
    if(!socioMap||!socioLayer)return;
    socioLayer.clearLayers();
    const metric=document.getElementById('socioMetric')?.value||'tercil_nbi';
    const items=subsetData();
    const bounds=[];
    const present=new Map();
    items.forEach(d=>{
      if(!Number.isFinite(Number(d.lat))||!Number.isFinite(Number(d.lon)))return;
      const [key,label]=metricInfo(d,metric); present.set(key,label);
      const radius=Math.max(5,Math.min(17,4+Math.sqrt(Number(d.matricula||0))/3.2));
      const color=palette[key]||'#48cae4';
      const marker=L.circleMarker([d.lat,d.lon],{radius,color:'#06101c',weight:1.3,fillColor:color,fillOpacity:.9});
      marker.bindPopup(`<div class="socio-card"><h3>${esc(d.escuela)}</h3><div class="mini">${esc(d.localidad)} · ${num(d.matricula)} estudiantes · ${esc(d.turnos)}</div><table>
        <tr><td>NBI</td><td>${esc(d.tercil_nbi||'S/D')} (${pct(d.pct_nbi)})</td></tr>
        <tr><td>IVSE</td><td>${esc(d.tercil_ivse||'S/D')} (${ivse(d.ivse)})</td></tr>
        <tr><td>Hacinamiento</td><td>${pct(d.pct_hacinamiento)}</td></tr>
        <tr><td>RENABAP 250 m</td><td>${esc(d.renabap250)} · ${pct(d.pct_renabap250)}</td></tr>
        <tr><td>Desfavorabilidad</td><td>${d.desfavorabilidad}</td></tr>
        <tr><td>Encuesta 2011 / 2021</td><td>${esc(d.encuesta2011)} / ${esc(d.encuesta2021)}</td></tr>
        <tr><td>Trabaja 2021</td><td>${pct01(d.pct_trabaja_2021)}</td></tr>
        <tr><td>&lt;10 cuadras 2021</td><td>${pct01(d.pct_cerca_2021)}</td></tr>
      </table></div>`).addTo(socioLayer);
      bounds.push([d.lat,d.lon]);
    });
    if(bounds.length) socioMap.fitBounds(bounds,{padding:[18,18],maxZoom:15});
    const leg=document.getElementById('socioLegend');
    if(leg){
      leg.innerHTML=`<b>Leyenda</b>${[...present.entries()].map(([k,l])=>`<div class="legend-item"><span class="legend-swatch" style="background:${palette[k]||'#48cae4'}"></span>${esc(l)}</div>`).join('')}<p class="sel-help" style="margin-top:9px">Puntos más grandes = mayor matrícula.</p>`;
    }
  }

  injectViews();
})();
