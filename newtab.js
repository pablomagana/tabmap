// Estado global para pestañas seleccionadas
let selectedIndices = new Set();

// Cargar y mostrar las pestañas guardadas
async function loadSavedTabs() {
  const container = document.getElementById('tabsContainer');

  try {
    // Leer savedTabs de chrome.storage.local
    const result = await chrome.storage.local.get(['savedTabs']);
    const savedTabs = result.savedTabs || [];

    if (savedTabs.length === 0) {
      // Mostrar estado vacío
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📑</div>
          <div class="empty-state-text">No hay pestañas guardadas</div>
          <div class="empty-state-subtext">Haz clic en el icono de la extensión y guarda tus pestañas abiertas</div>
        </div>
      `;
      return;
    }

    // Crear tarjetas para cada pestaña guardada
    container.innerHTML = savedTabs.map((tab, index) => `
      <div class="tab-card" data-index="${index}">
        <input type="checkbox" class="tab-checkbox" data-index="${index}">
        <button class="delete-btn" data-index="${index}" title="Eliminar">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6h18M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M10 11v6M14 11v6"/>
          </svg>
        </button>
        <a href="${tab.url}" class="tab-card-content">
          <div class="tab-title">${escapeHtml(tab.title)}</div>
          <div class="tab-url">${escapeHtml(tab.url)}</div>
        </a>
      </div>
    `).join('');

    // Agregar event listeners
    attachEventListeners();

  } catch (error) {
    console.error('Error al cargar pestañas:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-text">Error al cargar pestañas</div>
        <div class="empty-state-subtext">Por favor, intenta de nuevo</div>
      </div>
    `;
  }
}

// Agregar event listeners a los elementos
function attachEventListeners() {
  // Botones de eliminar individuales
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const button = e.currentTarget;
      const index = parseInt(button.dataset.index);
      await deleteSingleTab(index);
    });
  });

  // Checkboxes para selección
  document.querySelectorAll('.tab-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.index);
      const card = document.querySelector(`.tab-card[data-index="${index}"]`);

      if (e.target.checked) {
        selectedIndices.add(index);
        card.classList.add('selected');
      } else {
        selectedIndices.delete(index);
        card.classList.remove('selected');
      }

      updateActionsBar();
    });
  });

  // Prevenir navegación al hacer click en el checkbox
  document.querySelectorAll('.tab-card-content').forEach(link => {
    link.addEventListener('click', (e) => {
      // Permitir navegación normal
    });
  });
}

// Eliminar una sola pestaña
async function deleteSingleTab(index) {
  try {
    const result = await chrome.storage.local.get(['savedTabs']);
    const savedTabs = result.savedTabs || [];
    savedTabs.splice(index, 1);
    await chrome.storage.local.set({ savedTabs });
    selectedIndices.clear();
    await loadSavedTabs();
  } catch (error) {
    console.error('Error al eliminar pestaña:', error);
  }
}

// Eliminar pestañas seleccionadas
async function deleteSelectedTabs() {
  try {
    const result = await chrome.storage.local.get(['savedTabs']);
    const savedTabs = result.savedTabs || [];

    // Filtrar pestañas no seleccionadas
    const newTabs = savedTabs.filter((_, index) => !selectedIndices.has(index));

    await chrome.storage.local.set({ savedTabs: newTabs });
    selectedIndices.clear();
    await loadSavedTabs();
  } catch (error) {
    console.error('Error al eliminar pestañas:', error);
  }
}

// Abrir pestañas seleccionadas
async function openSelectedTabs() {
  try {
    const result = await chrome.storage.local.get(['savedTabs']);
    const savedTabs = result.savedTabs || [];

    // Obtener URLs de las pestañas seleccionadas
    const urlsToOpen = Array.from(selectedIndices)
      .map(index => savedTabs[index]?.url)
      .filter(url => url);

    // Abrir cada URL en una nueva pestaña
    for (const url of urlsToOpen) {
      await chrome.tabs.create({ url, active: false });
    }

    // Limpiar selección
    selectedIndices.clear();
    await loadSavedTabs();
  } catch (error) {
    console.error('Error al abrir pestañas:', error);
  }
}

// Actualizar barra de acciones
function updateActionsBar() {
  const actionsBar = document.getElementById('actionsBar');
  const selectedCount = document.getElementById('selectedCount');

  if (selectedIndices.size > 0) {
    actionsBar.classList.add('visible');
    selectedCount.textContent = `${selectedIndices.size} seleccionada${selectedIndices.size > 1 ? 's' : ''}`;
  } else {
    actionsBar.classList.remove('visible');
  }
}

// Función para escapar HTML y prevenir XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Cargar pestañas al cargar la página
loadSavedTabs();

// Deseleccionar todas las pestañas
function deselectAllTabs() {
  selectedIndices.clear();
  document.querySelectorAll('.tab-checkbox:checked').forEach(checkbox => {
    checkbox.checked = false;
  });
  document.querySelectorAll('.tab-card.selected').forEach(card => {
    card.classList.remove('selected');
  });
  updateActionsBar();
}

// Event listeners para botones de acciones
document.getElementById('openSelectedBtn').addEventListener('click', openSelectedTabs);
document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedTabs);
document.getElementById('deselectBtn').addEventListener('click', deselectAllTabs);

// Escuchar cambios en el storage para actualizar automáticamente
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.savedTabs) {
    selectedIndices.clear();
    loadSavedTabs();
  }
});
