(() => {
  if (typeof L === 'undefined' || typeof map === 'undefined' || typeof schools === 'undefined') return;

  const style = document.createElement('style');
  style.textContent = `
    .map-options{margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}
    .map-options h3{font-size:13px;margin:0 0 8px;color:#d9e8f5}
    .map-option-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
    .map-option{display:flex;align-items:center;gap:7px;padding:8px 9px;border:1px solid var(--line);border-radius:8px;background:#0b1b2c;font-size:12px;line-height:1.2;cursor:pointer}
    .map-option input{width:auto;margin:0;accent-color:var(--state)}
    .locality-label{background:rgba(7,17,31,.82);color:#fff;border:1px solid rgba(255,255,255,.55);border-radius:7px;padding:3px 6px;font-weight:800;font-size:11px;white-space:nowrap;box-shadow:0 1px 5px #0008}
    .map-fullscreen{width:100%;margin-top:8px;font-weight:750}
    .pop-grid-wide{display:grid;grid-template-columns:1fr;gap:4px;margin-top:7px}
    .pop-line{display:flex;justify-content:space-between;gap:14px;border-bottom:1px solid #20364a;padding:4px 0;font-size:12px}
    .pop-line span:first-child{color:#9fb4c8}.pop-line strong{text-align:right}
    #mapView:fullscreen{background:#07111f}.leaflet-container:fullscreen{height:100%!important}
  `;
  document.head.appendChild(style);

  const sidebar = document.querySelector('#mapView .sidebar');
  if (!sidebar) return;

  // Quitar del mapa inicial las referencias visuales a categoría y desfavorabilidad.
  sidebar.querySelectorAll('.legend-row').forEach(row => {
    const t = row.textContent || '';
    if (t.includes('Categoría') || t.includes('Desfavorabilidad')) row.remove();
  });
  const help = sidebar.querySelector('.legend .help');
  if (help) help.textContent = 'El tamaño de la burbuja representa la matrícula.';

  const fieldDefs = [
    ['gestion','Gestión'],['modalidad','Modalidad'],['localidad','Localidad'],['secciones','Secciones'],
    ['nbi','NBI (2022)'],['ivse','IVSE (2023)'],['renabap','RENABAP 250 m'],
    ['encuesta2011','Encuesta 2011'],['encuesta2021','Encuesta 2021'],['trabaja','% trabaja (encuesta 2021)'],['cerca','% <10 cuadras (encuesta 2021)']
  ];
  const defaults = new Set(['gestion','modalidad','localidad','secciones']);

  const panel = document.createElement('div');
  panel.className = 'map-options';
  panel.innerHTML = `<h3>Información al hacer clic en una escuela</h3><div class="map-option-grid" id="mapFieldOptions"></div><label class="map-option" style="margin-top:8px"><input id="showLocalityPolygons" type="checkbox" checked> Mostrar límites y nombres de localidades</label><button class="button map-fullscreen" id="mapFullscreenBtn">Pantalla completa</button>`;
  sidebar.appendChild(panel);
  const grid = panel.querySelector('#mapFieldOptions');
  fieldDefs.forEach(([key,label]) => {
    const lab = document.createElement('label');
    lab.className='map-option';
    lab.innerHTML=`<input type="checkbox" data-map-field="${key}" ${defaults.has(key)?'checked':''}> ${label}`;
    grid.appendChild(lab);
  });

  const selectedFields = () => new Set([...document.querySelectorAll('[data-map-field]:checked')].map(x=>x.dataset.mapField));
  const pct = v => v == null || v === '' ? 'S/D' : `${Number(v).toFixed(1).replace('.',',')}%`;
  const pct01 = v => v == null || v === '' ? 'S/D' : `${(Number(v)*100).toFixed(1).replace('.',',')}%`;
  const ivseFmt = v => v == null || v === '' ? 'S/D' : Number(v).toFixed(3).replace('.',',');

  function numeroEscuela(nombre){
    const t=String(nombre||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const m=t.match(/(?:SECUNDARIA|ES)\s*(?:N[º°]?\s*)?(\d+)/i);
    return m?Number(m[1]):null;
  }
  function socioFor(s){
    const rows=Array.isArray(window.SELECTION_ROWS)?window.SELECTION_ROWS:[];
    const n=numeroEscuela(s.nombre);
    const r=rows.find(x=>numeroEscuela(x[1])===n);
    if(!r) return null;
    return {nbi:r[8],tercilNbi:r[9],ivse:r[11],tercilIvse:r[12],ren:r[13],renPct:r[14],e2011:r[15],e2021:r[16],trabaja:r[17],cerca:r[18]};
  }
  function line(label,value){ return `<div class="pop-line"><span>${label}</span><strong>${esc(value)}</strong></div>`; }

  popup = function(school){
    const f=selectedFields();
    const socio=socioFor(school);
    let rows='';
    if(f.has('gestion')) rows+=line('Gestión',school.gestion||'S/D');
    if(f.has('modalidad')) rows+=line('Modalidad',school.modalidad||'S/D');
    if(f.has('localidad')) rows+=line('Localidad',school.localidad||'S/D');
    if(f.has('secciones')) rows+=line('Secciones',fmt(school.secciones));
    if(f.has('nbi')) rows+=line('NBI (2022)',socio?`${socio.tercilNbi} · ${pct(socio.nbi)}`:'S/D');
    if(f.has('ivse')) rows+=line('IVSE (2023)',socio?`${socio.tercilIvse} · ${ivseFmt(socio.ivse)}`:'S/D');
    if(f.has('renabap')) rows+=line('RENABAP 250 m',socio?`${socio.ren} · ${pct(socio.renPct)}`:'S/D');
    if(f.has('encuesta2011')) rows+=line('Encuesta 2011',socio?socio.e2011:'S/D');
    if(f.has('encuesta2021')) rows+=line('Encuesta 2021',socio?socio.e2021:'S/D');
    if(f.has('trabaja')) rows+=line('% trabaja (encuesta 2021)',socio?pct01(socio.trabaja):'S/D');
    if(f.has('cerca')) rows+=line('% <10 cuadras (encuesta 2021)',socio?pct01(socio.cerca):'S/D');
    return `<div class="pop-title">${esc(school.nombre)}</div><div class="pop-sub">${esc(school.calle||'')} ${esc(school.nro||'')} · ${esc(school.localidad||'')}</div><div class="pop-grid-wide">${rows||'<div class="notice">Elegí información en el panel izquierdo.</div>'}</div><div class="cue">CUE ${esc(school.cue||'')} · ${esc(school.periodo||'')}</div>`;
  };

  // Render liviano: un solo layer por escuela; sin badges 1ª/2ª/3ª ni D1.
  renderMap = function(override = null) {
    layer.clearLayers();
    const items = override || mapFiltered();
    items.forEach(school => {
      if (!validCoordinates(school)) return;
      const isSelected = sample.has(school.cue);
      const coordinates = [Number(school.lat), Number(school.lon)];
      L.circleMarker(coordinates, {
        radius: radius(school.matricula) + (isSelected ? 2 : 0),
        color: isSelected ? '#ffffff' : '#06101c',
        weight: isSelected ? 3 : 1.3,
        fillColor: managementColors[school.gestion] || '#52b788',
        fillOpacity: .88
      }).bindPopup(() => popup(school))
        .bindTooltip(`${school.nombre} · ${school.gestion} · ${school.localidad || ''}`, { direction: 'top' })
        .addTo(layer);
    });
    document.getElementById('countSchools').textContent = items.length;
    document.getElementById('countStudents').textContent = fmt(totalEnrollment(items));
    document.getElementById('countState').textContent = items.filter(school => school.gestion === 'Estatal').length;
    document.getElementById('countPrivate').textContent = items.filter(school => school.gestion === 'Privada').length;
  };

  document.querySelectorAll('[data-map-field]').forEach(cb=>cb.addEventListener('change',()=>renderMap()));
  document.getElementById('mapFullscreenBtn').addEventListener('click', async()=>{
    const target=document.getElementById('mapView');
    try {
      if(!document.fullscreenElement) await target.requestFullscreen(); else await document.exitFullscreen();
      setTimeout(()=>map.invalidateSize(),120);
    } catch(_){ }
  });
  document.addEventListener('fullscreenchange',()=>setTimeout(()=>map.invalidateSize(),100));

  const localityLayer=L.layerGroup().addTo(map);
  let localityData=null;

  function pointInRing(lon,lat,ring){
    let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const xi=ring[i][0], yi=ring[i][1], xj=ring[j][0], yj=ring[j][1];
      const intersect=((yi>lat)!=(yj>lat)) && (lon < (xj-xi)*(lat-yi)/((yj-yi)||1e-12)+xi);
      if(intersect) inside=!inside;
    }
    return inside;
  }
  function pointInGeom(lon,lat,g){
    if(!g) return false;
    if(g.type==='Polygon') return pointInRing(lon,lat,g.coordinates[0]);
    if(g.type==='MultiPolygon') return g.coordinates.some(poly=>pointInRing(lon,lat,poly[0]));
    return false;
  }
  function assignLocalities(){
    if(!localityData) return;
    schools.forEach(s=>{
      const lon=Number(s.lon), lat=Number(s.lat);
      if(!Number.isFinite(lon)||!Number.isFinite(lat)) return;
      const feat=localityData.features.find(ft=>pointInGeom(lon,lat,ft.geometry));
      if(feat?.properties?.Localidad) s.localidad=feat.properties.Localidad;
    });
    try{ populateLocalities(); }catch(_){ }
    // Evitamos recalcular tablas y muestra durante la carga inicial: era trabajo innecesario.
    renderMap();
  }
  function drawLocalities(){
    localityLayer.clearLayers();
    const toggle=document.getElementById('showLocalityPolygons');
    if(!localityData || !toggle?.checked) return;
    L.geoJSON(localityData,{style:()=>({color:'#ffd166',weight:2,fillColor:'#ffd166',fillOpacity:.035}),onEachFeature:(ft,lyr)=>{
      const name=ft.properties?.Localidad||'';
      const c=lyr.getBounds().getCenter();
      L.marker(c,{interactive:false,icon:L.divIcon({className:'',html:`<div class="locality-label">${esc(name)}</div>`,iconSize:null})}).addTo(localityLayer);
    }}).addTo(localityLayer);
  }
  document.getElementById('showLocalityPolygons').addEventListener('change',drawLocalities);

  fetch('data/localidades.geojson',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(g=>{
    localityData=g;
    assignLocalities();
    drawLocalities();
    try{fitItems(schools,14);}catch(_){ }
  }).catch(()=>{});

  renderMap();
})();
