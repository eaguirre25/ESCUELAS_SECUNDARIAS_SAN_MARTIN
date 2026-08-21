(() => {
  const schools = (Array.isArray(window.SCHOOLS_DATA) ? window.SCHOOLS_DATA : []).filter(school => {
    const lat = Number(school.lat);
    const lon = Number(school.lon);
    return Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 && lon !== 0;
  });
  const colors = { Estatal: '#28b9d6', Privada: '#e95f8d' };
  const format = value => Number(value || 0).toLocaleString('es-AR');
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[character]);

  document.getElementById('schoolCount').textContent = format(schools.length);
  document.getElementById('enrollmentCount').textContent = format(schools.reduce((total, school) => total + Number(school.matricula || 0), 0));

  const map = L.map('map', { preferCanvas: true, zoomControl: true, attributionControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
  const renderer = L.canvas({ padding: 0.25 });
  const bounds = [];

  schools.forEach(school => {
    const coordinates = [Number(school.lat), Number(school.lon)];
    const enrollment = Math.max(0, Number(school.matricula || 0));
    const radius = Math.max(4, Math.min(18, 3 + Math.sqrt(enrollment) / 2.7));
    L.circleMarker(coordinates, {
      renderer,
      radius,
      color: '#07111f',
      weight: 1.25,
      fillColor: colors[school.gestion] || '#8da2b5',
      fillOpacity: 0.84
    }).bindPopup(`<div class="popup"><h2>${escapeHtml(school.nombre)}</h2><p>${escapeHtml(school.localidad)} · ${escapeHtml(school.gestion)}</p><p><strong>${format(enrollment)}</strong> estudiantes</p></div>`).addTo(map);
    bounds.push(coordinates);
  });

  if (bounds.length) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14, animate: false });
  else map.setView([-34.57, -58.55], 12);
})();
