(() => {
  function patchDesfavorabilidad() {
    const select = document.getElementById('fDesf');
    if (!select) return false;

    const field = select.closest('.sel-field');
    const label = field?.querySelector('label');
    if (label) label.textContent = 'Desfav. (DGCyE)';

    const all = select.querySelector('option[value=""]');
    const yes = select.querySelector('option[value="1"]');
    const no = select.querySelector('option[value="0"]');
    if (all) all.textContent = 'Todas';
    if (yes) yes.textContent = 'Sí';
    if (no) no.textContent = 'No';
    return true;
  }

  if (patchDesfavorabilidad()) return;
  const observer = new MutationObserver(() => {
    if (patchDesfavorabilidad()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
