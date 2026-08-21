(() => {
  const STORAGE='ees-sm-preseleccion-v1';
  const F=['clave','escuela','localidad','categoria','turnos','desfavorabilidad','secciones','matricula','pct_nbi','tercil_nbi','pct_hacinamiento','ivse','tercil_ivse','renabap250','pct_renabap250','encuesta2011','encuesta2021','pct_trabaja_2021','pct_cerca_2021','n_evidencias','perfil_convergencia','lat','lon'];
  const rows=Array.isArray(window.SELECTION_ROWS)?window.SELECTION_ROWS:[];
  const DATA=rows.map(r=>Object.fromEntries(F.map((k,i)=>[k,r[i]])));
  const byClave=new Map(DATA.map(d=>[d.clave,d]));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pct01=v=>v==null||v===''?'S/D':`${(Number(v)*100).toFixed(1).replace('.',',')}%`;
  const pct=v=>v==null||v===''?'S/D':`${Number(v).toFixed(1).replace('.',',')}%`;
  const ivse=v=>v==null||v===''?'S/D':Number(v).toFixed(3).replace('.',',');
  const selected=()=>new Set(JSON.parse(localStorage.getItem(STORAGE)||'[]'));

  const style=document.createElement('style');
  style.textContent=`.se-modal-bg{position:fixed;inset:0;background:rgba(2,8,16,.76);z-index:7000;display:flex;align-items:center;justify-content:center;padding:18px}.se-modal{width:min(1180px,97vw);max-height:88vh;overflow:auto;background:#0d1b2a;border:1px solid #2a4055;border-radius:14px;padding:16px;color:#eef6ff}.se-modal h2{margin:0 0 10px;font-size:16px}.se-modal table{border-collapse:collapse;width:100%;font-size:11px}.se-modal th,.se-modal td{border:1px solid #294156;padding:7px;text-align:left}.se-modal th{background:#142a3d;position:sticky;top:0}.se-modal .actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.se-modal button,.detail-btn{border:1px solid #35516a;background:#0b1b2c;color:#eef6ff;border-radius:7px;padding:6px 8px;cursor:pointer;font-size:10.5px}.detail-btn{margin-left:6px}.se-note{font-size:10.5px;color:#9fb4c8;margin:4px 0 12px}.se-chip{display:inline-block;border:1px solid #3b566d;border-radius:999px;padding:2px 6px;margin-right:4px}`;
  document.head.appendChild(style);

  function modal(title,html){
    const bg=document.createElement('div'); bg.className='se-modal-bg';
    bg.innerHTML=`<div class="se-modal"><h2>${esc(title)}</h2>${html}<div class="actions"><button data-close>Cerrar</button></div></div>`;
    bg.addEventListener('click',e=>{if(e.target===bg||e.target.matches('[data-close]'))bg.remove();});
    document.body.appendChild(bg);
  }

  function compareSelected(){
    const ids=[...selected()];
    const items=ids.map(id=>byClave.get(id)).filter(Boolean);
    if(!items.length){alert('Todavía no preseleccionaste escuelas.');return;}
    const body=items.map(d=>`<tr><td>${esc(d.escuela)}</td><td>${esc(d.localidad)}</td><td>${Number(d.matricula||0).toLocaleString('es-AR')}</td><td>${esc(d.categoria)}</td><td>${esc(d.turnos)}</td><td>${esc(d.desfavorabilidad)}</td><td>${esc(d.tercil_nbi||'S/D')}</td><td>${esc(d.tercil_ivse||'S/D')}</td><td>${esc(d.renabap250)}</td><td>${pct(d.pct_renabap250)}</td><td>${esc(d.encuesta2011)}</td><td>${esc(d.encuesta2021)}</td><td>${pct01(d.pct_trabaja_2021)}</td><td>${pct01(d.pct_cerca_2021)}</td></tr>`).join('');
    modal('Comparar preseleccionadas',`<p class="se-note">Comparación lado a lado para decidir la composición final de la muestra. No produce un ranking.</p><table><thead><tr><th>Escuela</th><th>Localidad</th><th>Matrícula</th><th>Cat.</th><th>Turnos</th><th>Desfav.</th><th>NBI</th><th>IVSE</th><th>RENABAP</th><th>% REN.</th><th>2011</th><th>2021</th><th>% trabaja</th><th>% &lt;10 cuadras</th></tr></thead><tbody>${body}</tbody></table>`);
  }

  function showDetail(d){
    if(!d)return;
    modal(d.escuela,`<p class="se-note">Ficha completa de la escuela para apoyar la decisión de campo.</p><table><tbody>
      <tr><th>Localidad</th><td>${esc(d.localidad)}</td><th>Matrícula</th><td>${Number(d.matricula||0).toLocaleString('es-AR')}</td></tr>
      <tr><th>Categoría</th><td>${esc(d.categoria)}</td><th>Secciones</th><td>${esc(d.secciones)}</td></tr>
      <tr><th>Turnos</th><td>${esc(d.turnos)}</td><th>Desfavorabilidad</th><td>${esc(d.desfavorabilidad)}</td></tr>
      <tr><th>NBI</th><td>${esc(d.tercil_nbi)} (${pct(d.pct_nbi)})</td><th>Hacinamiento crítico</th><td>${pct(d.pct_hacinamiento)}</td></tr>
      <tr><th>IVSE</th><td>${esc(d.tercil_ivse)} (${ivse(d.ivse)})</td><th>RENABAP 250 m</th><td>${esc(d.renabap250)} · ${pct(d.pct_renabap250)}</td></tr>
      <tr><th>Encuesta 2011</th><td>${esc(d.encuesta2011)}</td><th>Encuesta 2021</th><td>${esc(d.encuesta2021)}</td></tr>
      <tr><th>% estudiantes que trabajan (2021)</th><td>${pct01(d.pct_trabaja_2021)}</td><th>% vive a &lt;10 cuadras (2021)</th><td>${pct01(d.pct_cerca_2021)}</td></tr>
      <tr><th>Evidencias convergentes</th><td>${esc(d.n_evidencias)}</td><th>Perfil de convergencia</th><td>${esc(d.perfil_convergencia||'—')}</td></tr>
    </tbody></table>`);
  }

  function enhanceToolbar(){
    const tb=document.querySelector('#selectorView .sm-toolbar');
    if(!tb||document.getElementById('compareSelected'))return;
    const b=document.createElement('button'); b.id='compareSelected'; b.textContent='Comparar preseleccionadas'; b.addEventListener('click',compareSelected); tb.insertBefore(b,tb.lastElementChild);
  }

  function enhanceRows(){
    document.querySelectorAll('#selectorView .sel-table tbody tr').forEach(tr=>{
      if(tr.querySelector('.detail-btn'))return;
      const schoolCell=tr.querySelector('td.school'); if(!schoolCell)return;
      const text=schoolCell.textContent.trim();
      const d=DATA.find(x=>x.escuela===text); if(!d)return;
      const b=document.createElement('button'); b.className='detail-btn'; b.textContent='Ficha'; b.type='button'; b.addEventListener('click',e=>{e.stopPropagation();showDetail(d);});
      schoolCell.appendChild(b);
    });
  }

  function run(){enhanceToolbar();enhanceRows();}
  const obs=new MutationObserver(run); obs.observe(document.body,{childList:true,subtree:true});
  run();
})();
