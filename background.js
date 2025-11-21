// Background service worker para Manifest V3
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extensión de guardado de pestañas instalada');
});
