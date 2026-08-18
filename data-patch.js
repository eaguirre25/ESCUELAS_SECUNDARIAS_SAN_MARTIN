(() => {
  const turnosPorNumero = {
    1:'MAÑANA,TARDE,VESPERTINO',2:'VESPERTINO',3:'MAÑANA,TARDE,VESPERTINO',4:'MAÑANA,NOCHE,TARDE',5:'MAÑANA',6:'MAÑANA,TARDE',7:'MAÑANA,TARDE,VESPERTINO',8:'MAÑANA,TARDE',10:'MAÑANA,TARDE,VESPERTINO',12:'VESPERTINO',13:'MAÑANA,TARDE,VESPERTINO',21:'MAÑANA,TARDE',22:'MAÑANA,TARDE',23:'MAÑANA,TARDE',24:'MAÑANA,TARDE',54:'MAÑANA,TARDE',45:'TARDE',56:'MAÑANA,TARDE',49:'MAÑANA,TARDE',46:'MAÑANA,TARDE',33:'MAÑANA,TARDE',26:'MAÑANA,TARDE',25:'MAÑANA,TARDE',35:'MAÑANA,TARDE',30:'MAÑANA,TARDE',55:'MAÑANA,TARDE',31:'MAÑANA,TARDE',53:'MAÑANA,TARDE',28:'MAÑANA,TARDE',40:'MAÑANA',52:'MAÑANA,TARDE',44:'MAÑANA,TARDE',32:'MAÑANA,TARDE',48:'MAÑANA,TARDE',51:'MAÑANA,TARDE',57:'MAÑANA,TARDE',39:'MAÑANA,TARDE',47:'MAÑANA,TARDE',38:'MAÑANA,TARDE',27:'MAÑANA,TARDE',42:'MAÑANA,TARDE',50:'MAÑANA,TARDE',29:'MAÑANA,TARDE',37:'MAÑANA,TARDE',43:'MAÑANA,TARDE',36:'MAÑANA,TARDE',11:'TARDE',20:'MAÑANA',58:'MAÑANA,TARDE'
  };

  const numeroEscuela = nombre => {
    const t = String(nombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/N[º°]/gi,'N');
    const m = t.match(/SECUNDARIA\s+N\s*([0-9]+)/i) || t.match(/SECUNDARIA\s+N?\s*([0-9]+)/i);
    return m ? Number(m[1]) : null;
  };

  const apply = arr => {
    if (!Array.isArray(arr)) return;
    arr.forEach(s => {
      const n = numeroEscuela(s.nombre);
      if (n && turnosPorNumero[n]) s.turnos = turnosPorNumero[n];
      if (n === 38) {
        s.matricula = 280;
        s.varones = 133;
        s.mujeres = 147;
        s.secciones = 13;
      }
    });
  };

  try { if (typeof ORIGINAL !== 'undefined') apply(ORIGINAL); } catch (_) {}
  try { if (typeof schools !== 'undefined') apply(schools); } catch (_) {}

  try {
    if (typeof renderTable === 'function') renderTable();
    if (typeof renderMap === 'function') renderMap();
    if (typeof renderSampleRows === 'function') renderSampleRows();
    if (typeof updateSampleSummary === 'function') updateSampleSummary();
  } catch (_) {}
})();
