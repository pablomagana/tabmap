// Inicializar textos traducidos
function initializeUI() {
  document.title = t('popupTitle');
  document.getElementById('appTitle').textContent = t('appTitle');
  document.getElementById('saveTabsBtn').textContent = t('saveTabsBtn');
  document.getElementById('createGroupBtn').textContent = t('createGroupBtn');
  document.getElementById('groupsTitle').textContent = t('saveToGroupTitle');
  document.getElementById('openDashboardBtn').title = t('openDashboard');
}

// Cargar y mostrar grupos
async function loadGroups() {
  const groupsList = document.getElementById('groupsList');
  const result = await chrome.storage.local.get(['groups']);
  const groups = result.groups || [];

  if (groups.length === 0) {
    groupsList.innerHTML = `<div style="color: rgba(255,255,255,0.7); text-align: center; font-size: 12px; padding: 10px;">${t('noGroupsCreated')}</div>`;
    return;
  }

  groupsList.innerHTML = groups.map(group => `
    <button class="group-btn" data-group-id="${group.id}">${escapeHtml(group.name)}</button>
  `).join('');

  // Añadir event listeners a los botones de grupos
  document.querySelectorAll('.group-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const groupId = btn.dataset.groupId;
      saveTabsToGroup(groupId);
    });
  });
}

// Función para escapar HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Guardar pestañas en un grupo específico
async function saveTabsToGroup(groupId) {
  const statusDiv = document.getElementById('status');

  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const result = await chrome.storage.local.get(['savedTabs']);
    const existingTabs = result.savedTabs || [];
    const existingUrls = new Set(existingTabs.map(tab => tab.url));

    const excludedUrls = [
      'chrome://newtab/',
      'chrome://extensions/',
      'chrome://settings/',
      'chrome-extension://',
      'edge://newtab/',
      'about:blank'
    ];

    const newTabs = tabs
      .map(tab => ({
        title: tab.title,
        url: tab.url,
        groupId: groupId
      }))
      .filter(tab => {
        const isExcluded = excludedUrls.some(excluded => tab.url.startsWith(excluded));
        const isDuplicate = existingUrls.has(tab.url);
        return !isExcluded && !isDuplicate;
      });

    const allTabs = [...existingTabs, ...newTabs];
    await chrome.storage.local.set({ savedTabs: allTabs });

    const duplicates = tabs.length - newTabs.length;
    if (duplicates > 0) {
      statusDiv.textContent = `✓ ${t('newTabsInGroup', { count: newTabs.length, duplicates })}`;
    } else {
      statusDiv.textContent = `✓ ${t('tabsSavedInGroup', { count: newTabs.length })}`;
    }
    statusDiv.style.color = '#4ade80';

    setTimeout(() => {
      statusDiv.textContent = '';
    }, 3000);

  } catch (error) {
    statusDiv.textContent = `✗ ${t('errorSaving')}`;
    statusDiv.style.color = '#f87171';
    console.error('Error:', error);
  }
}

// Guardar pestañas sin grupo
document.getElementById('saveTabsBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');

  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const result = await chrome.storage.local.get(['savedTabs']);
    const existingTabs = result.savedTabs || [];
    const existingUrls = new Set(existingTabs.map(tab => tab.url));

    const excludedUrls = [
      'chrome://newtab/',
      'chrome://extensions/',
      'chrome://settings/',
      'chrome-extension://',
      'edge://newtab/',
      'about:blank'
    ];

    const newTabs = tabs
      .map(tab => ({
        title: tab.title,
        url: tab.url
      }))
      .filter(tab => {
        const isExcluded = excludedUrls.some(excluded => tab.url.startsWith(excluded));
        const isDuplicate = existingUrls.has(tab.url);
        return !isExcluded && !isDuplicate;
      });

    const allTabs = [...existingTabs, ...newTabs];
    await chrome.storage.local.set({ savedTabs: allTabs });

    const duplicates = tabs.length - newTabs.length;
    if (duplicates > 0) {
      statusDiv.textContent = `✓ ${t('newTabsSaved', { count: newTabs.length, duplicates })}`;
    } else {
      statusDiv.textContent = `✓ ${t('tabsSaved', { count: newTabs.length })}`;
    }
    statusDiv.style.color = '#4ade80';

    setTimeout(() => {
      statusDiv.textContent = '';
    }, 3000);

  } catch (error) {
    statusDiv.textContent = `✗ ${t('errorSaving')}`;
    statusDiv.style.color = '#f87171';
    console.error('Error:', error);
  }
});

// Crear nuevo grupo
document.getElementById('createGroupBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');
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

    statusDiv.textContent = `✓ ${t('groupCreated', { name: groupName })}`;
    statusDiv.style.color = '#4ade80';

    setTimeout(() => {
      statusDiv.textContent = '';
    }, 3000);

    loadGroups();

  } catch (error) {
    statusDiv.textContent = `✗ ${t('errorCreatingGroup')}`;
    statusDiv.style.color = '#f87171';
    console.error('Error:', error);
  }
});

// Abrir dashboard
document.getElementById('openDashboardBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'newtab.html' });
});

// Inicializar UI y cargar grupos al iniciar
initializeUI();
loadGroups();
