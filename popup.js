document.getElementById('saveTabsBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');

  try {
    // Obtener solo las pestañas de la ventana actual
    const tabs = await chrome.tabs.query({ currentWindow: true });

    // Obtener pestañas ya guardadas
    const result = await chrome.storage.local.get(['savedTabs']);
    const existingTabs = result.savedTabs || [];

    // Crear Set con URLs existentes para búsqueda rápida
    const existingUrls = new Set(existingTabs.map(tab => tab.url));

    // URLs a excluir
    const excludedUrls = [
      'chrome://newtab/',
      'chrome://extensions/',
      'chrome://settings/',
      'chrome-extension://',
      'edge://newtab/',
      'about:blank'
    ];

    // Filtrar pestañas nuevas (no duplicadas y no excluidas)
    const newTabs = tabs
      .map(tab => ({
        title: tab.title,
        url: tab.url
      }))
      .filter(tab => {
        // Verificar si la URL debe ser excluida
        const isExcluded = excludedUrls.some(excluded => tab.url.startsWith(excluded));
        // Verificar si no es duplicada
        const isDuplicate = existingUrls.has(tab.url);
        return !isExcluded && !isDuplicate;
      });

    // Combinar pestañas existentes con las nuevas
    const allTabs = [...existingTabs, ...newTabs];

    // Guardar en chrome.storage.local
    await chrome.storage.local.set({ savedTabs: allTabs });

    // Mostrar mensaje de éxito
    const duplicates = tabs.length - newTabs.length;
    if (duplicates > 0) {
      statusDiv.textContent = `✓ ${newTabs.length} nuevas (${duplicates} duplicada${duplicates > 1 ? 's' : ''} omitida${duplicates > 1 ? 's' : ''})`;
    } else {
      statusDiv.textContent = `✓ ${newTabs.length} pestañas guardadas`;
    }
    statusDiv.style.color = '#4ade80';

    // Limpiar mensaje después de 3 segundos
    setTimeout(() => {
      statusDiv.textContent = '';
    }, 3000);

  } catch (error) {
    statusDiv.textContent = '✗ Error al guardar';
    statusDiv.style.color = '#f87171';
    console.error('Error:', error);
  }
});
