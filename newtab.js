// Estado global para pestañas seleccionadas
let selectedIndices = new Set();
let draggedTabIndex = null;

// Inicializar textos traducidos
function initializeUI() {
  document.title = t('newTabTitle');
  document.getElementById('pageTitle').textContent = t('savedTabsTitle');
  document.getElementById('deselectBtn').textContent = t('deselectBtn');
  document.getElementById('openSelectedBtn').textContent = t('openSelected');
  document.getElementById('deleteSelectedBtn').textContent = t('deleteSelected');
  document.getElementById('tabUrlInput').placeholder = t('tabUrlPlaceholder');
  document.getElementById('addTabBtn').textContent = t('addTabBtn');
  document.getElementById('toggleAddTabBtn').textContent = t('toggleAddTab');
  document.getElementById('createGroupBtn').textContent = t('createGroup');
}

// Toggle para mostrar/ocultar el formulario de añadir pestaña
document.getElementById('toggleAddTabBtn').addEventListener('click', () => {
  const controlsSection = document.getElementById('controlsSection');
  controlsSection.classList.toggle('visible');
});

// Cargar y mostrar las pestañas guardadas agrupadas
async function loadSavedTabs() {
  const container = document.getElementById('tabsContainer');

  try {
    const result = await chrome.storage.local.get(['savedTabs', 'groups']);
    const savedTabs = result.savedTabs || [];
    const groups = result.groups || [];

    if (savedTabs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${t('emptyStateIcon')}</div>
          <div class="empty-state-text">${t('emptyStateText')}</div>
          <div class="empty-state-subtext">${t('emptyStateSubtext')}</div>
        </div>
      `;
      return;
    }

    // Agrupar pestañas
    const groupedTabs = {};
    const ungroupedTabs = [];

    savedTabs.forEach((tab, index) => {
      if (tab.groupId) {
        if (!groupedTabs[tab.groupId]) {
          groupedTabs[tab.groupId] = [];
        }
        groupedTabs[tab.groupId].push({ ...tab, index });
      } else {
        ungroupedTabs.push({ ...tab, index });
      }
    });

    let html = '';

    // Renderizar pestañas sin grupo PRIMERO
    if (ungroupedTabs.length > 0) {
      html += `
        <div class="ungrouped-section">
          <h2 class="ungrouped-title">${t('ungroupedTitle')}</h2>
          <div id="ungroupedTabsContainer">
            ${ungroupedTabs.map(tab => createTabCard(tab)).join('')}
          </div>
        </div>
      `;
    }

    // Renderizar grupos en grid de 2 columnas
    if (groups.length > 0) {
      html += '<div class="groups-wrapper">';
      html += '<div class="groups-grid">';
      groups.forEach(group => {
        const tabs = groupedTabs[group.id] || [];
        html += `
          <div class="group-container">
            <div class="group-header">
              <div class="group-title">${escapeHtml(capitalizeFirst(group.name))}</div>
              <div class="group-actions">
                <button class="open-group-btn" data-group-id="${group.id}" title="${t('openAllTabs')}">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </button>
                <button class="delete-group-btn" data-group-id="${group.id}">${t('deleteGroup')}</button>
              </div>
            </div>
            <div class="group-tabs" data-group-id="${group.id}">
              ${tabs.map(tab => createTabCard(tab)).join('')}
              ${tabs.length === 0 ? `<div style="color: #999; text-align: center; padding: 20px;">${t('noTabs')}</div>` : ''}
            </div>
          </div>
        `;
      });
      html += '</div>';
      html += '</div>';
    }

    container.innerHTML = html;
    attachEventListeners();
    setupDragAndDrop();

  } catch (error) {
    console.error('Error al cargar pestañas:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-text">${t('errorLoadingTabs')}</div>
        <div class="empty-state-subtext">${t('errorRetry')}</div>
      </div>
    `;
  }
}

// Crear HTML de tarjeta de pestaña
function createTabCard(tab) {
  return `
    <div class="tab-card" data-index="${tab.index}" draggable="true">
      <input type="checkbox" class="tab-checkbox" data-index="${tab.index}">
      <button class="delete-btn" data-index="${tab.index}" title="Eliminar">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 6h18M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M10 11v6M14 11v6"/>
        </svg>
      </button>
      <a href="${tab.url}" class="tab-card-content">
        <div class="tab-title">${escapeHtml(tab.title)}</div>
        <div class="tab-url">${escapeHtml(tab.url)}</div>
      </a>
    </div>
  `;
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

  // Botones de eliminar grupos
  document.querySelectorAll('.delete-group-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const groupId = btn.dataset.groupId;
      await deleteGroup(groupId);
    });
  });

  // Botones de abrir todas las pestañas del grupo
  document.querySelectorAll('.open-group-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const groupId = btn.dataset.groupId;
      await openGroupTabs(groupId);
    });
  });
}

// Configurar drag and drop
function setupDragAndDrop() {
  const tabCards = document.querySelectorAll('.tab-card');
  const groupContainers = document.querySelectorAll('.group-tabs');
  const ungroupedContainer = document.getElementById('ungroupedTabsContainer');

  tabCards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      draggedTabIndex = parseInt(card.dataset.index);
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', (e) => {
      card.classList.remove('dragging');
      draggedTabIndex = null;
    });
  });

  // Permitir drop en contenedores de grupos
  const allDropZones = [...groupContainers];
  if (ungroupedContainer) {
    allDropZones.push(ungroupedContainer);
  }

  allDropZones.forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', (e) => {
      zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', async (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');

      if (draggedTabIndex === null) return;

      const groupId = zone.dataset.groupId || null;
      await moveTabToGroup(draggedTabIndex, groupId);
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
    selectedCount.textContent = t('selected', { count: selectedIndices.size });
  } else {
    actionsBar.classList.remove('visible');
  }
}

// Mover pestaña a un grupo
async function moveTabToGroup(tabIndex, groupId) {
  try {
    const result = await chrome.storage.local.get(['savedTabs']);
    const savedTabs = result.savedTabs || [];

    if (savedTabs[tabIndex]) {
      if (groupId) {
        savedTabs[tabIndex].groupId = groupId;
      } else {
        delete savedTabs[tabIndex].groupId;
      }

      await chrome.storage.local.set({ savedTabs });
      await loadSavedTabs();
    }
  } catch (error) {
    console.error('Error al mover pestaña:', error);
  }
}

// Abrir todas las pestañas de un grupo
async function openGroupTabs(groupId) {
  try {
    const result = await chrome.storage.local.get(['savedTabs']);
    const savedTabs = result.savedTabs || [];

    // Filtrar pestañas del grupo
    const groupTabs = savedTabs.filter(tab => tab.groupId === groupId);

    if (groupTabs.length === 0) {
      alert(t('groupNoTabs'));
      return;
    }

    // Abrir cada URL en una nueva pestaña
    for (const tab of groupTabs) {
      await chrome.tabs.create({ url: tab.url, active: false });
    }
  } catch (error) {
    console.error('Error al abrir pestañas del grupo:', error);
  }
}

// Eliminar un grupo (las pestañas del grupo pasan a no tener grupo)
async function deleteGroup(groupId) {
  if (!confirm(t('deleteGroupConfirm'))) {
    return;
  }

  try {
    const result = await chrome.storage.local.get(['groups', 'savedTabs']);
    const groups = result.groups || [];
    const savedTabs = result.savedTabs || [];

    // Eliminar el grupo
    const updatedGroups = groups.filter(g => g.id !== groupId);

    // Quitar groupId de las pestañas de este grupo
    savedTabs.forEach(tab => {
      if (tab.groupId === groupId) {
        delete tab.groupId;
      }
    });

    await chrome.storage.local.set({ groups: updatedGroups, savedTabs });
    await loadSavedTabs();
    await loadGroupsSelect();
  } catch (error) {
    console.error('Error al eliminar grupo:', error);
  }
}

// Función para escapar HTML y prevenir XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Función para capitalizar la primera letra
function capitalizeFirst(text) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Cargar grupos en el select
async function loadGroupsSelect() {
  const select = document.getElementById('groupSelect');
  const result = await chrome.storage.local.get(['groups']);
  const groups = result.groups || [];

  select.innerHTML = `<option value="">${t('noGroup')}</option>`;
  groups.forEach(group => {
    const option = document.createElement('option');
    option.value = group.id;
    option.textContent = capitalizeFirst(group.name);
    select.appendChild(option);
  });
}

// Añadir pestaña individual
document.getElementById('addTabBtn').addEventListener('click', async () => {
  const urlInput = document.getElementById('tabUrlInput');
  const groupSelect = document.getElementById('groupSelect');
  const url = urlInput.value.trim();

  if (!url) {
    alert(t('enterUrl'));
    return;
  }

  try {
    // Obtener el título de la página
    let title = url;
    try {
      const response = await fetch(url, { method: 'HEAD' });
      title = new URL(url).hostname;
    } catch (e) {
      title = new URL(url).hostname;
    }

    const result = await chrome.storage.local.get(['savedTabs']);
    const savedTabs = result.savedTabs || [];

    const newTab = {
      title: title,
      url: url
    };

    if (groupSelect.value) {
      newTab.groupId = groupSelect.value;
    }

    savedTabs.push(newTab);
    await chrome.storage.local.set({ savedTabs });

    urlInput.value = '';
    groupSelect.value = '';
    await loadSavedTabs();
  } catch (error) {
    alert(t('errorAddingTab', { error: error.message }));
  }
});

// Crear nuevo grupo
document.getElementById('createGroupBtn').addEventListener('click', async () => {
  const groupName = prompt(t('groupNamePrompt'));

  if (!groupName || groupName.trim() === '') {
    return;
  }

  try {
    const result = await chrome.storage.local.get(['groups']);
    const groups = result.groups || [];

    const newGroup = {
      id: Date.now().toString(),
      name: groupName.trim()
    };

    groups.push(newGroup);
    await chrome.storage.local.set({ groups });

    await loadSavedTabs();
    await loadGroupsSelect();
  } catch (error) {
    alert(t('errorCreatingGroup') + ': ' + error.message);
  }
});

// Inicializar UI y cargar pestañas y grupos al cargar la página
initializeUI();
loadSavedTabs();
loadGroupsSelect();

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
  if (area === 'local' && (changes.savedTabs || changes.groups)) {
    selectedIndices.clear();
    loadSavedTabs();
    if (changes.groups) {
      loadGroupsSelect();
    }
  }
});
