(() => {
  const colors={Estatal:'#28b9d6',Privada:'#e95f8d'}, format=v=>Number(v||0).toLocaleString('es-AR');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[c]);
  const fields=['clave','escuela','localidad','categoria','turnos','desfavorabilidad','secciones','matricula','pct_nbi','nbi','pct_hacinamiento','ivse','ivseTercil','renabap','pct_renabap','encuesta2011','encuesta2021','pct_trabaja','pct_cerca','evidencias','perfil','lat','lon'];
  const contextRows=(window.SELECTION_ROWS||[]).map(row=>Object.fromEntries(fields.map((field,index)=>[field,row[index]])));
  const key=(lat,lon)=>`${Number(lat).toFixed(5)},${Number(lon).toFixed(5)}`;
  const contextByPosition=new Map(contextRows.map(row=>[key(row.lat,row.lon),row]));
  const schools=(window.SCHOOLS_DATA||[]).filter(s=>Number.isFinite(Number(s.lat))&&Number.isFinite(Number(s.lon))&&Number(s.lat)!==0&&Number(s.lon)!==0).map(s=>({...s,context:contextByPosition.get(key(s.lat,s.lon))||null}));

  const tercilBuffer=value=>{const n=Number(value||0);return n===0?'Sin RENABAP':n<=1.88?'Bajo':n<16.07?'Medio':'Alto'};
  const tercilTrabajo=value=>value==null?'S/D':Number(value)<=.159?'Bajo':Number(value)<.2067?'Medio':'Alto';
  const score={Bajo:1,Medio:2,Alto:3,'Sin RENABAP':1,No:1,Sí:3};
  const contexto=row=>{if(!row)return null;const values=[row.nbi,row.ivseTercil,tercilBuffer(row.pct_renabap),tercilTrabajo(row.pct_trabaja),row.desfavorabilidad?'Sí':'No'].map(v=>score[v]).filter(Number.isFinite);const mean=values.reduce((a,b)=>a+b,0)/values.length;return mean<1.67?'Bajo':mean<2.34?'Medio':'Alto'};
  const dimensions=[
    {id:'nbi',label:'NBI',values:['Bajo','Medio','Alto','S/D'],get:r=>r?.nbi||'S/D'},
    {id:'ivse',label:'IVSE',values:['Bajo','Medio','Alto','S/D'],get:r=>r?.ivseTercil||'S/D'},
    {id:'renabap',label:'RENABAP a 250 m',values:['Sin RENABAP','Bajo','Medio','Alto'],get:r=>r?tercilBuffer(r.pct_renabap):null},
    {id:'trabajo',label:'Estudiantes que trabajan',values:['Bajo','Medio','Alto','S/D'],get:r=>r?tercilTrabajo(r.pct_trabaja):null},
    {id:'desfav',label:'Desfavorabilidad',values:['No','Sí'],get:r=>r?(r.desfavorabilidad?'Sí':'No'):null},
    {id:'contexto',label:'Contexto de desigualdades',values:['Bajo','Medio','Alto'],get:r=>contexto(r)}
  ];
  const activeManagement=new Set(['Estatal','Privada']);
  const activeDimensions=new Map(dimensions.map(d=>[d.id,new Set()]));

  const map=L.map('map',{preferCanvas:true});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
  const renderer=L.canvas({padding:.25}), pointLayer=L.layerGroup().addTo(map), bounds=[];
  const markers=schools.map(s=>{const coords=[Number(s.lat),Number(s.lon)], enrollment=Math.max(0,Number(s.matricula||0));bounds.push(coords);const marker=L.circleMarker(coords,{renderer,radius:Math.max(4,Math.min(18,3+Math.sqrt(enrollment)/2.7)),color:'#07111f',weight:1.25,fillColor:colors[s.gestion]||'#8da2b5',fillOpacity:.84});marker.bindPopup(`<div class="popup"><h2>${esc(s.nombre)}</h2><p>${esc(s.localidad)} · ${esc(s.gestion)}</p><p><strong>${format(enrollment)}</strong> estudiantes</p>${s.context?`<p>NBI ${esc(s.context.nbi||'S/D')} · IVSE ${esc(s.context.ivseTercil||'S/D')}</p>`:''}</div>`);return {school:s,marker}});
  if(bounds.length)map.fitBounds(bounds,{padding:[24,24],maxZoom:14,animate:false});

  function matches(school){if(!activeManagement.has(school.gestion))return false;for(const dimension of dimensions){const selected=activeDimensions.get(dimension.id);if(selected.size&&!selected.has(dimension.get(school.context)))return false}return true}
  function refresh(){pointLayer.clearLayers();let count=0;markers.forEach(({school,marker})=>{if(matches(school)){marker.addTo(pointLayer);count++}});document.getElementById('visibleCount').textContent=count;document.getElementById('emptyMessage').style.display=count?'none':'block'}
  function button(label,value,className,onClick,active=false){const el=document.createElement('button');el.type='button';el.className=`filter-button ${className}${active?' active':''}`;el.textContent=label;el.dataset.value=value;el.addEventListener('click',()=>{onClick(el);refresh()});return el}
  const management=document.getElementById('managementFilters');['Estatal','Privada'].forEach(value=>management.appendChild(button(value,value,'management',el=>{activeManagement.has(value)?activeManagement.delete(value):activeManagement.add(value);el.classList.toggle('active',activeManagement.has(value))},true)));
  const container=document.getElementById('dimensionFilters');dimensions.forEach(d=>{const section=document.createElement('section');section.className='filter-section';section.innerHTML=`<h2>${esc(d.label)}</h2>`;const buttons=document.createElement('div');buttons.className='buttons';d.values.forEach(value=>buttons.appendChild(button(value,value,'dimension',el=>{const set=activeDimensions.get(d.id);set.has(value)?set.delete(value):set.add(value);el.classList.toggle('active',set.has(value))})));section.appendChild(buttons);container.appendChild(section)});
  document.getElementById('resetFilters').addEventListener('click',()=>{activeManagement.clear();activeManagement.add('Estatal');activeManagement.add('Privada');activeDimensions.forEach(set=>set.clear());document.querySelectorAll('.filter-button').forEach(el=>el.classList.toggle('active',el.classList.contains('management')));refresh()});
  refresh();
})();
