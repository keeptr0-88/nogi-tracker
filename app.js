/**
 * SUB-LOG | No-Gi Tap Tracker
 * Modern vanilla JS application logic with LocalStorage & PWA support
 */

// --- Base Data & Constants ---
const TECHNIQUES = [
  // Chokes / Strangolamenti
  { id: 'rnc', name: 'Rear Naked Choke', category: 'chokes', tag: 'Strangolamento' },
  { id: 'guillotine_he', name: 'Ghigliottina High-Elbow', category: 'chokes', tag: 'Strangolamento' },
  { id: 'guillotine_ai', name: 'Ghigliottina Arm-In', category: 'chokes', tag: 'Strangolamento' },
  { id: 'darce', name: "D'Arce Choke", category: 'chokes', tag: 'Strangolamento' },
  { id: 'anaconda', name: 'Anaconda Choke', category: 'chokes', tag: 'Strangolamento' },
  { id: 'triangle', name: 'Triangolo (Frontale)', category: 'chokes', tag: 'Strangolamento' },
  { id: 'arm_triangle', name: 'Arm Triangle (Kata Gatame)', category: 'chokes', tag: 'Strangolamento' },
  { id: 'north_south', name: 'North-South Choke', category: 'chokes', tag: 'Strangolamento' },
  { id: 'ezekiel', name: 'Ezekiel Choke', category: 'chokes', tag: 'Strangolamento' },
  { id: 'ezekiel_one_arm', name: 'One-Arm Ezekiel Choke', category: 'chokes', tag: 'Strangolamento' },
  { id: 'buggy', name: 'Buggy Choke', category: 'chokes', tag: 'Strangolamento' },
  { id: 'von_flue', name: 'Von Flue Choke', category: 'chokes', tag: 'Strangolamento' },

  // Leg Locks
  { id: 'inside_heel_hook', name: 'Inside Heel Hook', category: 'leglocks', tag: 'Leg Lock' },
  { id: 'outside_heel_hook', name: 'Outside Heel Hook', category: 'leglocks', tag: 'Leg Lock' },
  { id: 'straight_ankle', name: 'Straight Ankle Lock', category: 'leglocks', tag: 'Leg Lock' },
  { id: 'kneebar', name: 'Kneebar (Leva al Ginocchio)', category: 'leglocks', tag: 'Leg Lock' },
  { id: 'toe_hold', name: 'Toe Hold', category: 'leglocks', tag: 'Leg Lock' },
  { id: 'calf_slicer', name: 'Calf Slicer', category: 'leglocks', tag: 'Leg Lock' },

  // Armlocks & Other
  { id: 'armbar', name: 'Armbar (Leva a Braccio)', category: 'armlocks', tag: 'Leva Articolare' },
  { id: 'kimura', name: 'Kimura', category: 'armlocks', tag: 'Leva Articolare' },
  { id: 'americana', name: 'Americana', category: 'armlocks', tag: 'Leva Articolare' },
  { id: 'wristlock', name: 'Wristlock', category: 'armlocks', tag: 'Leva Articolare' },
  { id: 'twister', name: 'Twister / Spine Lock', category: 'armlocks', tag: 'Spine Lock' }
];

const BELTS = [
  { id: 'white', name: 'Bianca', label: '⚪ Bianca', color: '#F1F5F9' },
  { id: 'blue', name: 'Blu', label: '🔵 Blu', color: '#3B82F6' },
  { id: 'purple', name: 'Viola', label: '🟣 Viola', color: '#A855F7' },
  { id: 'brown', name: 'Marrone', label: '🟤 Marrone', color: '#D97706' },
  { id: 'black', name: 'Nera', label: '⚫ Nera', color: '#111827' }
];

// Distinct training days (UTC) + longest consecutive-day streak.
// Invalid timestamps are ignored so corrupt records can't break badges.
function getDistinctDayKeys(logs) {
  const days = new Set();
  logs.forEach(l => {
    const d = new Date(l.timestamp);
    if (!isNaN(d.getTime())) {
      days.add(d.getUTCFullYear() + '-' + d.getUTCMonth() + '-' + d.getUTCDate());
    }
  });
  return days;
}

function getMaxDayStreak(logs) {
  const keys = [...getDistinctDayKeys(logs)];
  if (keys.length === 0) return 0;
  const nums = keys.map(k => {
    const [y, m, dd] = k.split('-').map(Number);
    return Date.UTC(y, m, dd) / 86400000;
  }).sort((a, b) => a - b);
  let best = 1, run = 1;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] === nums[i - 1] + 1) {
      run++;
      if (run > best) best = run;
    } else if (nums[i] !== nums[i - 1]) {
      run = 1;
    }
  }
  return best;
}

const BADGES_CONFIG = [
  {
    id: 'first_kill',
    icon: '🎯',
    title: 'Prima Kill',
    desc: 'Registra la tua prima sottomissione.',
    check: (logs) => logs.length >= 1
  },
  {
    id: 'black_belt',
    icon: '👑',
    title: 'David vs Goliath',
    desc: 'Sottometti una cintura Nera.',
    check: (logs) => logs.some(l => l.belt === 'black')
  },
  {
    id: 'brown_buster',
    icon: '🟤',
    title: 'Brown Buster',
    desc: 'Sottometti una cintura Marrone.',
    check: (logs) => logs.some(l => l.belt === 'brown')
  },
  {
    id: 'purple_slayer',
    icon: '🟣',
    title: 'Purple Slayer',
    desc: 'Sottometti una cintura Viola.',
    check: (logs) => logs.some(l => l.belt === 'purple')
  },
  {
    id: 'leg_locker',
    icon: '🦵',
    title: 'Leg Lock Terror',
    desc: '5 sottomissioni alle gambe (Heel Hook, Kneebar...).',
    check: (logs) => logs.filter(l => l.category === 'leglocks').length >= 5
  },
  {
    id: 'darce_knight',
    icon: '🥷',
    title: "D'Arce Knight",
    desc: "5 strangolamenti frontali (D'Arce, Anaconda, Ghigliottina).",
    check: (logs) => logs.filter(l => ['darce', 'anaconda', 'guillotine_he', 'guillotine_ai'].includes(l.techId)).length >= 5
  },
  {
    id: 'back_taker',
    icon: '🎒',
    title: 'Back Taker',
    desc: '5 Rear Naked Choke messi a segno.',
    check: (logs) => logs.filter(l => l.techId === 'rnc').length >= 5
  },
  {
    id: 'rainbow',
    icon: '🌈',
    title: 'Rainbow Grappler',
    desc: 'Hai finalizzato almeno un avversario per ogni colore di cintura.',
    check: (logs) => {
      const belts = new Set(logs.map(l => l.belt));
      return ['white', 'blue', 'purple', 'brown', 'black'].every(b => belts.has(b));
    }
  },
  {
    id: 'volume_10',
    icon: '⚡',
    title: 'Tap Machine',
    desc: '10 sottomissioni totali registrate.',
    check: (logs) => logs.length >= 10
  },
  {
    id: 'volume_25',
    icon: '🥋',
    title: 'Mat Assassin',
    desc: '25 sottomissioni totali registrate.',
    check: (logs) => logs.length >= 25
  },
  {
    id: 'centurion',
    icon: '💯',
    title: 'Centurion',
    desc: '100 sottomissioni totali nel tuo carniere.',
    check: (logs) => logs.length >= 100
  },
  // --- Volumi extra ---
  {
    id: 'volume_50',
    icon: '🛡️',
    title: 'Veterano del Tatami',
    desc: '50 sottomissioni totali registrate.',
    check: (logs) => logs.length >= 50
  },
  {
    id: 'volume_200',
    icon: '🐐',
    title: 'GOAT del Tatami',
    desc: '200 sottomissioni totali registrate. Leggendario.',
    check: (logs) => logs.length >= 200
  },
  // --- Cacciatori di cinture ---
  {
    id: 'white_washer',
    icon: '🧼',
    title: 'White Washer',
    desc: '5 sottomissioni contro cinture Bianche.',
    check: (logs) => logs.filter(l => l.belt === 'white').length >= 5
  },
  {
    id: 'blue_hunter',
    icon: '🦈',
    title: 'Blue Hunter',
    desc: '5 sottomissioni contro cinture Blu.',
    check: (logs) => logs.filter(l => l.belt === 'blue').length >= 5
  },
  {
    id: 'purple_reign',
    icon: '💜',
    title: 'Purple Reign',
    desc: '5 sottomissioni contro cinture Viola.',
    check: (logs) => logs.filter(l => l.belt === 'purple').length >= 5
  },
  {
    id: 'brown_nightmare',
    icon: '🐻',
    title: 'Incubo delle Marroni',
    desc: '3 sottomissioni contro cinture Marroni.',
    check: (logs) => logs.filter(l => l.belt === 'brown').length >= 3
  },
  {
    id: 'black_hunter',
    icon: '⚔️',
    title: 'Cacciatore di Nere',
    desc: '3 sottomissioni contro cinture Nere.',
    check: (logs) => logs.filter(l => l.belt === 'black').length >= 3
  },
  // --- Specialisti di tecnica ---
  {
    id: 'triangle_master',
    icon: '🔺',
    title: 'Triangolo Mortale',
    desc: '5 Triangoli messi a segno.',
    check: (logs) => logs.filter(l => l.techId === 'triangle').length >= 5
  },
  {
    id: 'armbar_artist',
    icon: '💪',
    title: 'Armbreaker',
    desc: '5 Armbar messi a segno.',
    check: (logs) => logs.filter(l => l.techId === 'armbar').length >= 5
  },
  {
    id: 'kimura_king',
    icon: '🔑',
    title: 'Kimura King',
    desc: '5 Kimura messe a segno.',
    check: (logs) => logs.filter(l => l.techId === 'kimura').length >= 5
  },
  {
    id: 'heel_hook_horror',
    icon: '🪝',
    title: 'Heel Hook Horror',
    desc: '5 Heel Hook (inside o outside) messi a segno.',
    check: (logs) => logs.filter(l => ['inside_heel_hook', 'outside_heel_hook'].includes(l.techId)).length >= 5
  },
  {
    id: 'guillotine_boia',
    icon: '🗡️',
    title: 'Boia della Ghigliottina',
    desc: '5 Ghigliottine (high-elbow o arm-in) messe a segno.',
    check: (logs) => logs.filter(l => ['guillotine_he', 'guillotine_ai'].includes(l.techId)).length >= 5
  },
  // --- Maestri di categoria ---
  {
    id: 'python',
    icon: '🐍',
    title: 'Pitone',
    desc: '10 strangolamenti registrati.',
    check: (logs) => logs.filter(l => l.category === 'chokes').length >= 10
  },
  {
    id: 'armlock_ace',
    icon: '🦾',
    title: 'Armlock Ace',
    desc: '10 leve articolari registrate.',
    check: (logs) => logs.filter(l => l.category === 'armlocks').length >= 10
  },
  // --- Varietà e costanza ---
  {
    id: 'arsenal',
    icon: '🧰',
    title: 'Arsenale',
    desc: 'Finalizza con 10 tecniche diverse.',
    check: (logs) => new Set(logs.map(l => l.techId)).size >= 10
  },
  {
    id: 'encyclopedia',
    icon: '📚',
    title: 'Enciclopedia',
    desc: 'Finalizza con 15 tecniche diverse.',
    check: (logs) => new Set(logs.map(l => l.techId)).size >= 15
  },
  {
    id: 'on_fire',
    icon: '🔥',
    title: 'On Fire',
    desc: 'Registra tap in 3 giorni consecutivi.',
    check: (logs) => getMaxDayStreak(logs) >= 3
  },
  {
    id: 'regular',
    icon: '📅',
    title: 'Tatami Regular',
    desc: 'Registra tap in 10 giorni diversi.',
    check: (logs) => getDistinctDayKeys(logs).size >= 10
  },
  // --- Meta ---
  {
    id: 'historian',
    icon: '📝',
    title: 'Storico del Tatami',
    desc: 'Aggiungi note a 10 sottomissioni.',
    check: (logs) => logs.filter(l => l.notes && l.notes.trim()).length >= 10
  },
  {
    id: 'innovator',
    icon: '🧪',
    title: 'Innovatore',
    desc: 'Crea la tua prima mossa personalizzata.',
    check: () => customTechs.length >= 1
  }
];

const VALID_BELTS = new Set(['white', 'blue', 'purple', 'brown', 'black']);
const VALID_CATEGORIES = new Set(['chokes', 'leglocks', 'armlocks', 'custom']);

// --- State Management ---
const STORAGE_KEY = 'sublog_nogi_logs_v1';
const CUSTOM_TECH_KEY = 'sublog_custom_techs_v1';
const MAX_SYNC_URL_LENGTH = 6000;

function generateId(prefix) {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return prefix + '_' + crypto.randomUUID();
    }
  } catch (_) { /* fall through */ }
  return prefix + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e9).toString(36);
}

function sanitizeLog(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const id = typeof entry.id === 'string' && entry.id ? entry.id : generateId('log');
  const belt = VALID_BELTS.has(entry.belt) ? entry.belt : null;
  if (!belt) return null;
  const techId = typeof entry.techId === 'string' && entry.techId ? entry.techId : 'unknown';
  const techName = typeof entry.techName === 'string' && entry.techName.trim() ? entry.techName.trim().slice(0, 80) : 'Tecnica sconosciuta';
  const category = VALID_CATEGORIES.has(entry.category) ? entry.category : 'custom';
  let timestamp = entry.timestamp;
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) timestamp = new Date().toISOString();
  const notes = typeof entry.notes === 'string' ? entry.notes.slice(0, 280) : '';
  return { id, timestamp, belt, techId, techName, category, notes };
}

function sanitizeCustomTech(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const id = typeof entry.id === 'string' && entry.id.startsWith('custom_') ? entry.id : null;
  if (!id) return null;
  const name = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim().slice(0, 80) : null;
  if (!name) return null;
  const category = VALID_CATEGORIES.has(entry.category) ? entry.category : 'custom';
  const tag = typeof entry.tag === 'string' && entry.tag ? entry.tag.slice(0, 30) : 'Custom';
  return { id, name, category, tag };
}

let logs = [];
let customTechs = [];
let currentCategory = 'all';
let selectedBelt = null;
let selectedTech = null;
let editingLogId = null;

// --- Initialize App ---
function init() {
  loadData();
  checkUrlForSyncData();
  setupEventListeners();
  renderTechniques();
  renderStats();
  renderBadges();
  renderFeed();
  updateTotalHeader();
  registerServiceWorker();
}

function loadData() {
  // Parse logs and custom techs independently so one corrupt key
  // doesn't wipe out the other. Sanitize everything from storage.
  try {
    const savedLogs = localStorage.getItem(STORAGE_KEY);
    const parsedLogs = savedLogs ? JSON.parse(savedLogs) : [];
    logs = Array.isArray(parsedLogs)
      ? parsedLogs.map(sanitizeLog).filter(Boolean)
      : [];
  } catch (e) {
    console.error('Error loading logs from LocalStorage:', e);
    logs = [];
  }

  try {
    const savedCustom = localStorage.getItem(CUSTOM_TECH_KEY);
    const parsedCustom = savedCustom ? JSON.parse(savedCustom) : [];
    customTechs = Array.isArray(parsedCustom)
      ? parsedCustom.map(sanitizeCustomTech).filter(Boolean)
      : [];
  } catch (e) {
    console.error('Error loading custom techs from LocalStorage:', e);
    customTechs = [];
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    localStorage.setItem(CUSTOM_TECH_KEY, JSON.stringify(customTechs));
  } catch (e) {
    console.error('Error saving LocalStorage:', e);
    if (e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      showToast('⚠️ Memoria piena: impossibile salvare. Esporta un backup!');
    }
  }
}

function refreshAll() {
  updateTotalHeader();
  renderStats();
  renderBadges();
  renderFeed();
  renderTechniques();
}

// --- Event Listeners ---
function setupEventListeners() {
  // Tab navigation
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.dataset.view;
      switchTab(targetView);
    });
  });

  // Belt selector buttons
  const beltButtons = document.querySelectorAll('.belt-btn');
  beltButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      beltButtons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedBelt = btn.dataset.belt;
      triggerHaptic();
    });
  });

  // Category filter chips
  const catChips = document.querySelectorAll('.cat-chip');
  catChips.forEach(chip => {
    chip.addEventListener('click', () => {
      catChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentCategory = chip.dataset.category;
      renderTechniques();
    });
  });

  // Submit button
  const submitBtn = document.getElementById('submitTapBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', handleLogSubmission);
  }

  // Custom technique quick add & clear
  const addCustomBtn = document.getElementById('addCustomTechBtn');
  if (addCustomBtn) {
    addCustomBtn.addEventListener('click', handleAddCustomTechnique);
  }

  const customTechInput = document.getElementById('customTechInput');
  if (customTechInput) {
    customTechInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddCustomTechnique();
      }
    });
  }

  // Notes field: Enter submits the tap
  const notesInput = document.getElementById('rollNotesInput');
  if (notesInput) {
    notesInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleLogSubmission();
      }
    });
  }

  const clearAllCustomBtn = document.getElementById('clearAllCustomBtn');
  if (clearAllCustomBtn) {
    clearAllCustomBtn.addEventListener('click', handleClearAllCustomTechniques);
  }

  // Backup actions
  const exportBtn = document.getElementById('exportDataBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportDataToFile);
  }

  const importFileInput = document.getElementById('importFileInput');
  if (importFileInput) {
    importFileInput.addEventListener('change', importDataFromFile);
  }

  const clearDataBtn = document.getElementById('clearDataBtn');
  if (clearDataBtn) {
    clearDataBtn.addEventListener('click', handleClearData);
  }

  // Sync Modal actions
  const openSyncBtn = document.getElementById('openSyncModalBtn');
  if (openSyncBtn) {
    openSyncBtn.addEventListener('click', openSyncModal);
  }

  const openSyncCardBtn = document.getElementById('openSyncModalCardBtn');
  if (openSyncCardBtn) {
    openSyncCardBtn.addEventListener('click', openSyncModal);
  }

  const closeSyncBtn = document.getElementById('closeSyncModalBtn');
  const syncModal = document.getElementById('syncModal');
  if (closeSyncBtn && syncModal) {
    closeSyncBtn.addEventListener('click', () => {
      syncModal.style.display = 'none';
    });
    syncModal.addEventListener('click', (e) => {
      if (e.target === syncModal) {
        syncModal.style.display = 'none';
      }
    });
  }

  const copySyncLinkBtn = document.getElementById('copySyncLinkBtn');
  if (copySyncLinkBtn) {
    copySyncLinkBtn.addEventListener('click', handleCopySyncLink);
  }

  const manualSyncBtn = document.getElementById('manualSyncBtn');
  if (manualSyncBtn) {
    manualSyncBtn.addEventListener('click', handleManualSyncInput);
  }

  const manualSyncInput = document.getElementById('manualSyncInput');
  if (manualSyncInput) {
    manualSyncInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleManualSyncInput();
      }
    });
  }

  // Edit modal actions
  const editModal = document.getElementById('editLogModal');
  const closeEditBtn = document.getElementById('closeEditModalBtn');
  if (closeEditBtn && editModal) {
    closeEditBtn.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) closeEditModal();
    });
  }
  const saveEditBtn = document.getElementById('saveEditLogBtn');
  if (saveEditBtn) {
    saveEditBtn.addEventListener('click', handleSaveEditLog);
  }

  // Esc closes any open modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const syncM = document.getElementById('syncModal');
      if (syncM && syncM.style.display === 'flex') syncM.style.display = 'none';
      closeEditModal();
    }
  });
}

function switchTab(viewName) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === viewName);
  });
  document.querySelectorAll('.view-content').forEach(v => {
    v.classList.toggle('active', v.id === `view-${viewName}`);
  });

  if (viewName === 'stats') renderStats();
  if (viewName === 'trofei') renderBadges();
  if (viewName === 'feed') renderFeed();
}

// --- Render Techniques ---
function getAllTechniques() {
  return [...TECHNIQUES, ...customTechs];
}

function renderTechniques() {
  const container = document.getElementById('techniquesGrid');
  if (!container) return;

  const all = getAllTechniques();
  const filtered = currentCategory === 'all' 
    ? all 
    : all.filter(t => t.category === currentCategory);

  container.innerHTML = '';

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'grid-column: 1 / -1; text-align: center; color: var(--text-muted); font-size: 0.82rem; padding: 16px;';
    empty.textContent = 'Nessuna tecnica in questa categoria.';
    container.appendChild(empty);
    return;
  }

  filtered.forEach(tech => {
    const techId = typeof tech.id === 'string' ? tech.id : '';
    const isCustom = techId.startsWith('custom_');
    const isSelected = selectedTech && selectedTech.id === techId;

    // Wrapper div (a <button> cannot legally contain another button)
    const wrap = document.createElement('div');
    wrap.className = `tech-btn${isSelected ? ' selected' : ''}`;
    wrap.setAttribute('role', 'button');
    wrap.setAttribute('tabindex', '0');

    const topRow = document.createElement('div');
    topRow.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start; width: 100%; gap: 8px;';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = tech.name || 'Tecnica senza nome';

    topRow.appendChild(nameSpan);

    if (isCustom) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'delete-custom-tech';
      del.dataset.id = techId;
      del.title = 'Elimina tecnica';
      del.setAttribute('aria-label', `Rimuovi ${tech.name}`);
      del.style.cssText = 'color: #F87171; font-size: 0.72rem; padding: 2px 6px; background: rgba(239, 68, 68, 0.25); border-radius: 6px; font-weight: 800; border: 1px solid #EF4444; cursor: pointer; flex-shrink: 0;';
      del.textContent = '✕ Rimuovi';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteCustomTechnique(techId);
      });
      topRow.appendChild(del);
    }

    const tagSpan = document.createElement('span');
    tagSpan.className = 'tech-tag';
    tagSpan.textContent = tech.tag || getCategoryLabel(tech.category);

    wrap.appendChild(topRow);
    wrap.appendChild(tagSpan);

    const selectTech = () => {
      container.querySelectorAll('.tech-btn').forEach(b => b.classList.remove('selected'));
      wrap.classList.add('selected');
      selectedTech = tech;
      triggerHaptic();
    };
    wrap.addEventListener('click', selectTech);
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectTech();
      }
    });
    container.appendChild(wrap);
  });
}

function handleDeleteCustomTechnique(id) {
  customTechs = customTechs.filter(t => t.id !== id);
  if (selectedTech && selectedTech.id === id) {
    selectedTech = null;
  }
  saveData();
  renderTechniques();
  showToast('🗑️ Tecnica personalizzata rimossa');
}

function handleClearAllCustomTechniques() {
  if (customTechs.length === 0) {
    showToast('Nessuna mossa custom salvata.');
    return;
  }
  if (confirm('Vuoi davvero rimuovere tutte le mosse personalizzate salvate?')) {
    customTechs = [];
    selectedTech = null;
    saveData();
    renderTechniques();
    showToast('🧹 Tutte le mosse custom sono state rimosse');
  }
}

function getCategoryLabel(cat) {
  switch (cat) {
    case 'chokes': return 'Strangolamento';
    case 'leglocks': return 'Leg Lock';
    case 'armlocks': return 'Leva Braccia';
    default: return 'Personalizzata';
  }
}

// --- Handle Add Custom Technique ---
function handleAddCustomTechnique() {
  const input = document.getElementById('customTechInput');
  const catSelect = document.getElementById('customTechCat');
  const rawName = input ? input.value.trim() : '';
  let category = catSelect ? catSelect.value : 'custom';
  if (!VALID_CATEGORIES.has(category)) category = 'custom';

  if (!rawName) {
    showToast('⚠️ Inserisci il nome della tecnica!');
    return;
  }

  const name = rawName.slice(0, 80);

  // Avoid exact-duplicate names (case-insensitive)
  const allNames = new Set(getAllTechniques().map(t => (t.name || '').toLowerCase()));
  if (allNames.has(name.toLowerCase())) {
    showToast('⚠️ Questa tecnica esiste già!');
    return;
  }

  const id = generateId('custom');
  const newTech = { id, name, category, tag: 'Custom' };
  customTechs.push(newTech);
  saveData();

  if (input) input.value = '';

  // Make sure the new technique is visible even if a filter was active
  if (currentCategory !== 'all' && currentCategory !== category) {
    currentCategory = 'all';
    document.querySelectorAll('.cat-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.category === 'all');
    });
  }

  selectedTech = newTech;
  renderTechniques();
  showToast(`✅ "${name}" aggiunta all'arsenale!`);
}

// --- Handle Submission Log ---
function handleLogSubmission() {
  if (!selectedBelt || !VALID_BELTS.has(selectedBelt)) {
    showToast('⚠️ Seleziona la cintura del tuo avversario!');
    triggerHaptic(true);
    return;
  }

  if (!selectedTech || !selectedTech.id || !selectedTech.name) {
    showToast('⚠️ Seleziona la finalizzazione che hai messo a segno!');
    triggerHaptic(true);
    return;
  }

  const notesInput = document.getElementById('rollNotesInput');
  const notes = notesInput ? notesInput.value.trim().slice(0, 280) : '';

  const previousBadges = getUnlockedBadgesCount();

  const newLog = {
    id: generateId('log'),
    timestamp: new Date().toISOString(),
    belt: selectedBelt,
    techId: selectedTech.id,
    techName: String(selectedTech.name).slice(0, 80),
    category: VALID_CATEGORIES.has(selectedTech.category) ? selectedTech.category : 'custom',
    notes: notes
  };

  logs.unshift(newLog);
  saveData();

  // Reset inputs
  if (notesInput) notesInput.value = '';
  document.querySelectorAll('.belt-btn').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('.tech-btn').forEach(b => b.classList.remove('selected'));
  selectedBelt = null;
  selectedTech = null;

  triggerHaptic();
  refreshAll();

  // Toast confirmation
  showToast(`🥋 +1 KILL REGISTRATA! (${newLog.techName})`);

  // Check if new badge unlocked
  const newBadgesCount = getUnlockedBadgesCount();
  if (newBadgesCount > previousBadges) {
    setTimeout(() => {
      showToast('🏆 NUOVO TROFEO SBLOCCATO! Controlla la bacheca!');
      triggerHaptic();
    }, 1200);
  }
}

// --- Stats Calculation & Rendering ---
function renderStats() {
  const total = logs.length;

  // Overview metrics
  const statTotal = document.getElementById('statTotalKills');
  if (statTotal) statTotal.textContent = total;

  // Signature submission (count by stable techId, display stored name)
  const techCounts = {};
  logs.forEach(l => {
    const key = l.techId || l.techName;
    if (!techCounts[key]) techCounts[key] = { count: 0, name: l.techName };
    techCounts[key].count++;
    // Keep the most recent display name for this id
    techCounts[key].name = l.techName;
  });

  let topTechName = 'N/A';
  let topTechCount = 0;
  Object.values(techCounts).forEach(({ name, count }) => {
    if (count > topTechCount) {
      topTechName = name;
      topTechCount = count;
    }
  });

  const statSigName = document.getElementById('statSignatureName');
  const statSigPct = document.getElementById('statSignaturePct');
  if (statSigName) statSigName.textContent = topTechName;
  if (statSigPct) {
    const pct = total > 0 ? Math.round((topTechCount / total) * 100) : 0;
    statSigPct.textContent = total > 0 ? `${pct}% (${topTechCount} tap)` : '0%';
  }

  // Belt distribution breakdown
  const beltCounts = { white: 0, blue: 0, purple: 0, brown: 0, black: 0 };
  logs.forEach(l => {
    if (beltCounts[l.belt] !== undefined) {
      beltCounts[l.belt]++;
    }
  });

  BELTS.forEach(b => {
    const count = beltCounts[b.id] || 0;
    const pct = total > 0 ? (count / total) * 100 : 0;
    
    const countEl = document.getElementById(`belt-count-${b.id}`);
    const barEl = document.getElementById(`belt-bar-${b.id}`);
    
    if (countEl) countEl.textContent = count;
    if (barEl) barEl.style.width = `${pct}%`;
  });

  // Category distribution (custom/other kept explicit so % always sums to 100)
  const chokesCount = logs.filter(l => l.category === 'chokes').length;
  const legsCount = logs.filter(l => l.category === 'leglocks').length;
  const armsCount = logs.filter(l => l.category === 'armlocks').length;
  const otherCount = Math.max(0, total - chokesCount - legsCount - armsCount);

  const chokesEl = document.getElementById('statChokesCount');
  const legsEl = document.getElementById('statLegsCount');
  const armsEl = document.getElementById('statArmsCount');
  const otherEl = document.getElementById('statOtherCount');

  const pctOf = (n) => total ? Math.round(n / total * 100) : 0;
  if (chokesEl) chokesEl.textContent = `${chokesCount} (${pctOf(chokesCount)}%)`;
  if (legsEl) legsEl.textContent = `${legsCount} (${pctOf(legsCount)}%)`;
  if (armsEl) armsEl.textContent = `${armsCount} (${pctOf(armsCount)}%)`;
  if (otherEl) {
    otherEl.textContent = `${otherCount} (${pctOf(otherCount)}%)`;
    const otherRow = document.getElementById('statOtherRow');
    if (otherRow) otherRow.style.display = otherCount > 0 ? 'flex' : 'none';
  }
}

// --- Badges Rendering ---
function getUnlockedBadgesCount() {
  return BADGES_CONFIG.filter(b => b.check(logs)).length;
}

function renderBadges() {
  const container = document.getElementById('badgesGrid');
  if (!container) return;

  container.innerHTML = '';

  BADGES_CONFIG.forEach(badge => {
    const isUnlocked = badge.check(logs);
    const card = document.createElement('div');
    card.className = `badge-card ${isUnlocked ? 'unlocked' : 'locked'}`;

    const icon = document.createElement('div');
    icon.className = 'badge-icon';
    icon.textContent = badge.icon;

    const title = document.createElement('div');
    title.className = 'badge-title';
    title.textContent = badge.title;

    const desc = document.createElement('div');
    desc.className = 'badge-desc';
    desc.textContent = badge.desc;

    const status = document.createElement('div');
    status.className = 'badge-status';
    status.textContent = isUnlocked ? 'SBLOCCATO' : 'IN CORSO';

    card.append(icon, title, desc, status);
    container.appendChild(card);
  });
}

// --- Feed (Recent Rolls) ---
function renderFeed() {
  const container = document.getElementById('recentFeedList');
  if (!container) return;

  if (logs.length === 0) {
    container.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const icon = document.createElement('div');
    icon.className = 'empty-state-icon';
    icon.textContent = '🥋';
    const p1 = document.createElement('p');
    p1.textContent = 'Nessun tap registrato finora.';
    const p2 = document.createElement('p');
    p2.style.cssText = 'font-size: 0.8rem; margin-top: 6px;';
    p2.textContent = 'Vai nella scheda "Log" e registra la tua prima sottomissione!';
    empty.append(icon, p1, p2);
    container.appendChild(empty);
    return;
  }

  container.innerHTML = '';
  const fragment = document.createDocumentFragment();

  logs.forEach(log => {
    const item = document.createElement('div');
    item.className = 'feed-item';

    const beltObj = BELTS.find(b => b.id === log.belt) || { name: 'Sconosciuta', label: '❓ Sconosciuta', color: '#334155' };
    const dateFormatted = formatShortDate(log.timestamp);

    const left = document.createElement('div');
    left.className = 'feed-item-left';

    const pill = document.createElement('div');
    pill.className = 'feed-belt-pill';
    pill.style.background = beltObj.color || '#334155';

    const info = document.createElement('div');
    info.className = 'feed-info';

    const techName = document.createElement('span');
    techName.className = 'feed-tech-name';
    techName.textContent = log.techName || 'Tecnica sconosciuta';

    const meta = document.createElement('span');
    meta.className = 'feed-meta';
    meta.textContent = `vs ${beltObj.label || beltObj.name || log.belt} • ${dateFormatted}${log.notes ? ' • ' + log.notes : ''}`;

    info.append(techName, meta);
    left.append(pill, info);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete-log';
    delBtn.type = 'button';
    delBtn.title = 'Elimina log';
    delBtn.setAttribute('aria-label', `Elimina ${log.techName}`);
    delBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    `;
    delBtn.addEventListener('click', () => handleDeleteLog(log.id));

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-delete-log';
    editBtn.type = 'button';
    editBtn.title = 'Modifica log';
    editBtn.setAttribute('aria-label', `Modifica ${log.techName}`);
    editBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
      </svg>
    `;
    editBtn.addEventListener('click', () => openEditLog(log.id));

    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; align-items: center; gap: 2px; flex-shrink: 0;';
    actions.append(editBtn, delBtn);

    item.append(left, actions);
    fragment.appendChild(item);
  });

  container.appendChild(fragment);
}

function handleDeleteLog(id) {
  if (confirm('Sei sicuro di voler eliminare questa sottomissione dal registro?')) {
    logs = logs.filter(l => l.id !== id);
    saveData();
    refreshAll();
    showToast('🗑️ Sottomissione rimossa.');
  }
}

// --- Edit Existing Log ---
function openEditLog(id) {
  const log = logs.find(l => l.id === id);
  if (!log) return;
  editingLogId = id;

  const techSelect = document.getElementById('editLogTech');
  if (techSelect) {
    techSelect.innerHTML = '';
    getAllTechniques().forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      if (t.id === log.techId) opt.selected = true;
      techSelect.appendChild(opt);
    });
    // Logged technique deleted meanwhile: keep showing the stored name
    if (![...techSelect.options].some(o => o.value === log.techId)) {
      const opt = document.createElement('option');
      opt.value = log.techId;
      opt.textContent = log.techName;
      opt.selected = true;
      techSelect.appendChild(opt);
    }
  }

  const beltSelect = document.getElementById('editLogBelt');
  if (beltSelect) beltSelect.value = VALID_BELTS.has(log.belt) ? log.belt : 'white';

  const notesInput = document.getElementById('editLogNotes');
  if (notesInput) notesInput.value = log.notes || '';

  const modal = document.getElementById('editLogModal');
  if (modal) modal.style.display = 'flex';
}

function closeEditModal() {
  const modal = document.getElementById('editLogModal');
  if (modal) modal.style.display = 'none';
  editingLogId = null;
}

function handleSaveEditLog() {
  if (!editingLogId) return;
  const idx = logs.findIndex(l => l.id === editingLogId);
  if (idx === -1) {
    closeEditModal();
    return;
  }

  const techSelect = document.getElementById('editLogTech');
  const beltSelect = document.getElementById('editLogBelt');
  const notesInput = document.getElementById('editLogNotes');

  const chosenTech = getAllTechniques().find(t => t.id === (techSelect && techSelect.value))
    || { id: logs[idx].techId, name: logs[idx].techName, category: logs[idx].category };
  const belt = beltSelect && VALID_BELTS.has(beltSelect.value) ? beltSelect.value : logs[idx].belt;
  const notes = notesInput ? notesInput.value.trim().slice(0, 280) : '';

  const updated = sanitizeLog({
    id: logs[idx].id,
    timestamp: logs[idx].timestamp,
    belt,
    techId: chosenTech.id,
    techName: chosenTech.name,
    category: chosenTech.category,
    notes
  });
  if (!updated) {
    showToast('⚠️ Modifica non valida!');
    return;
  }

  logs[idx] = updated;
  saveData();
  closeEditModal();
  refreshAll();
  showToast('✏️ Sottomissione aggiornata!');
}

function updateTotalHeader() {
  const countEl = document.getElementById('headerTotalKills');
  if (countEl) countEl.textContent = logs.length;
}

// --- Backup, Export & Import ---
function exportDataToFile() {
  const data = {
    appName: 'SUB-LOG No-Gi Grappling Tracker',
    exportDate: new Date().toISOString(),
    logs: logs,
    customTechniques: customTechs
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sublog_backup_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('💾 Backup scaricato con successo!');
}

function importDataFromFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const parsed = JSON.parse(event.target.result);
      const rawLogs = Array.isArray(parsed.logs) ? parsed.logs : (Array.isArray(parsed) ? parsed : null);
      if (!rawLogs) {
        showToast('⚠️ Formato file non valido!');
        return;
      }
      const cleanLogs = rawLogs.map(sanitizeLog).filter(Boolean);
      const rawTechs = Array.isArray(parsed.customTechniques)
        ? parsed.customTechniques
        : (Array.isArray(parsed.customTechs) ? parsed.customTechs : []);
      const cleanTechs = rawTechs.map(sanitizeCustomTech).filter(Boolean);

      const droppedLogs = rawLogs.length - cleanLogs.length;
      logs = cleanLogs;
      customTechs = cleanTechs;
      // Keep newest-first ordering
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      saveData();
      selectedTech = null;
      refreshAll();
      showToast(`✅ Ripristinati ${logs.length} tap con successo!${droppedLogs > 0 ? ` (${droppedLogs} record non validi ignorati)` : ''}`);
    } catch (err) {
      console.error('Errore lettura backup:', err);
      showToast('⚠️ Errore nella lettura del file JSON di backup.');
    } finally {
      // Allow re-importing the same file twice
      e.target.value = '';
    }
  };
  reader.onerror = () => {
    showToast('⚠️ Impossibile leggere il file.');
    e.target.value = '';
  };
  reader.readAsText(file);
}

function handleClearData() {
  if (confirm('⚠️ ATTENZIONE: Vuoi davvero cancellare TUTTI i tuoi dati e ricominciare da zero?')) {
    logs = [];
    customTechs = [];
    selectedBelt = null;
    selectedTech = null;
    saveData();
    refreshAll();
    showToast('🧹 Tutti i dati sono stati cancellati.');
  }
}

// --- QR / Device Synchronization Engine ---
function encodeSyncPayload(data) {
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  const b64 = btoa(binary);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeSyncPayload(str) {
  if (typeof str !== 'string' || !str) throw new Error('Empty payload');
  const clean = str.trim();
  if (!/^[A-Za-z0-9\-_]+$/.test(clean)) throw new Error('Invalid payload characters');
  if (clean.length > 500000) throw new Error('Payload too large');
  let b64 = clean.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
}

function extractSyncPayload(raw) {
  const val = (raw || '').trim();
  if (!val) return null;
  // Try full URL parsing first (handles ?sync=, ?s=, #sync=, #s=)
  try {
    // Allow pasting a bare hash fragment too
    const url = new URL(val, window.location.href);
    const q = url.searchParams.get('sync') || url.searchParams.get('s');
    if (q) return q.trim();
    if (url.hash) {
      const hm = url.hash.match(/(?:sync|s)=([^&#\s]+)/);
      if (hm) return hm[1].trim();
    }
    // If it looked like a URL but had no sync param, it's not a payload
    if (/^https?:\/\//i.test(val) || val.includes('?') || val.includes('#')) {
      return null;
    }
  } catch (_) {
    // Not a parseable URL — fall through to raw-payload handling below
  }
  // Raw base64url payload (may be URL-encoded if copied from address bar)
  try {
    return decodeURIComponent(val.split(/\s+/)[0].split('&')[0].split('#')[0]);
  } catch (_) {
    return val;
  }
}

function applySyncData(data) {
  if (!data || (!Array.isArray(data.logs) && !Array.isArray(data))) {
    showToast('⚠️ Dati di sincronizzazione non validi!');
    return;
  }

  const rawLogs = Array.isArray(data.logs) ? data.logs : data;
  let addedCount = 0;
  let droppedCount = 0;
  const existingIds = new Set(logs.map(l => l.id));

  rawLogs.forEach(entry => {
    const clean = sanitizeLog(entry);
    if (!clean) {
      droppedCount++;
      return;
    }
    if (!existingIds.has(clean.id)) {
      logs.push(clean);
      existingIds.add(clean.id);
      addedCount++;
    }
  });

  // Accept both key namings (sync uses customTechs, file backup uses customTechniques)
  const rawTechs = Array.isArray(data.customTechs)
    ? data.customTechs
    : (Array.isArray(data.customTechniques) ? data.customTechniques : []);
  let addedTechs = 0;
  if (rawTechs.length > 0) {
    const existingTechIds = new Set(customTechs.map(t => t.id));
    rawTechs.forEach(entry => {
      const clean = sanitizeCustomTech(entry);
      if (clean && !existingTechIds.has(clean.id)) {
        customTechs.push(clean);
        existingTechIds.add(clean.id);
        addedTechs++;
      }
    });
  }

  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  saveData();
  refreshAll();
  triggerHaptic();

  showToast(`🎉 Sincronizzati ${addedCount} tap con successo!${droppedCount > 0 ? ` (${droppedCount} ignorati)` : ''}${addedTechs > 0 ? ` +${addedTechs} mosse` : ''}`);
}

function checkUrlForSyncData() {
  try {
    const payload = extractSyncPayload(window.location.href);
    // Only treat as sync when the current URL actually carries a sync param
    const hasSyncParam = /[?#&](sync|s)=/i.test(window.location.href);
    if (!payload || !hasSyncParam) return;

    const data = decodeSyncPayload(payload);
    // Defer UI refresh: init() renders right after this call
    applySyncDataWithoutRender(data);

    // Clean URL bar (drop query + hash)
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  } catch (err) {
    console.error('Errore durante la decodifica del sync payload:', err);
    showToast('⚠️ Errore nel link di sincronizzazione');
    try {
      window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
    } catch (_) { /* ignore */ }
  }
}

// Sync-on-load variant that doesn't touch the DOM (init renders afterwards)
function applySyncDataWithoutRender(data) {
  if (!data || (!Array.isArray(data.logs) && !Array.isArray(data))) {
    showToast('⚠️ Dati di sincronizzazione non validi!');
    return;
  }
  const rawLogs = Array.isArray(data.logs) ? data.logs : data;
  const existingIds = new Set(logs.map(l => l.id));
  let addedCount = 0;
  rawLogs.forEach(entry => {
    const clean = sanitizeLog(entry);
    if (clean && !existingIds.has(clean.id)) {
      logs.push(clean);
      existingIds.add(clean.id);
      addedCount++;
    }
  });
  const rawTechs = Array.isArray(data.customTechs)
    ? data.customTechs
    : (Array.isArray(data.customTechniques) ? data.customTechniques : []);
  if (rawTechs.length > 0) {
    const existingTechIds = new Set(customTechs.map(t => t.id));
    rawTechs.forEach(entry => {
      const clean = sanitizeCustomTech(entry);
      if (clean && !existingTechIds.has(clean.id)) {
        customTechs.push(clean);
        existingTechIds.add(clean.id);
      }
    });
  }
  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  saveData();
  if (addedCount > 0) {
    setTimeout(() => showToast(`🎉 Sincronizzati ${addedCount} tap con successo!`), 400);
  }
}

function generateSyncUrl() {
  const payload = {
    logs: logs,
    customTechs: customTechs
  };
  const encoded = encodeSyncPayload(payload);
  // Use current origin so sync works on any host (GitHub Pages, Netlify, localhost)
  const base = window.location.origin + window.location.pathname;
  return `${base}?sync=${encoded}`;
}

function renderLocalQrCode(container, text) {
  container.innerHTML = '';
  if (typeof QRCode !== 'undefined') {
    try {
      new QRCode(container, {
        text: text,
        width: 220,
        height: 220,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
      return true;
    } catch (e) {
      console.error('QR code generation error:', e);
    }
  }
  return false;
}

function openSyncModal() {
  const modal = document.getElementById('syncModal');
  const container = document.getElementById('qrcodeContainer');
  if (!modal || !container) return;

  if (logs.length === 0) {
    showToast('⚠️ Non ci sono tap registrati da sincronizzare!');
    return;
  }

  container.innerHTML = '';
  let syncUrl;
  try {
    syncUrl = generateSyncUrl();
  } catch (e) {
    console.error('Sync encode error:', e);
    showToast('⚠️ Errore nella generazione del link!');
    return;
  }

  if (syncUrl.length > MAX_SYNC_URL_LENGTH) {
    container.innerHTML = '<p style="color:#000; font-size:0.8rem; padding:10px; max-width:220px;">Troppi dati per un QR code. Usa "Copia Link" o il Backup JSON.</p>';
    // Still store for copy button
    modal.dataset.syncUrl = syncUrl;
    modal.style.display = 'flex';
    showToast('⚠️ Troppi tap per il QR: usa Copia Link o Backup JSON');
    return;
  }
  modal.dataset.syncUrl = syncUrl;

  // Privacy-first: generate QR locally (offline). Remote API only as fallback.
  const ok = renderLocalQrCode(container, syncUrl);
  if (!ok) {
    const qrImg = document.createElement('img');
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(syncUrl)}`;
    qrImg.alt = 'QR Code Sincronizzazione';
    qrImg.style.width = '240px';
    qrImg.style.height = '240px';
    qrImg.style.display = 'block';
    qrImg.style.borderRadius = '12px';
    qrImg.onerror = () => {
      container.innerHTML = '<p style="color:#000; font-size:0.8rem; padding:10px;">Usa il pulsante "Copia Link" qui sotto</p>';
    };
    container.appendChild(qrImg);
  }

  modal.style.display = 'flex';
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  // Fallback for iOS Safari / non-secure contexts
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (_) { ok = false; }
  document.body.removeChild(ta);
  if (!ok) throw new Error('copy failed');
  return true;
}

function handleCopySyncLink() {
  if (logs.length === 0) {
    showToast('⚠️ Non ci sono tap registrati da sincronizzare!');
    return;
  }

  let syncUrl;
  try {
    syncUrl = generateSyncUrl();
  } catch (e) {
    showToast('⚠️ Errore nella generazione del link!');
    return;
  }
  if (syncUrl.length > MAX_SYNC_URL_LENGTH) {
    showToast('⚠️ Link troppo lungo: usa il Backup JSON per trasferire i dati.');
  }
  copyTextToClipboard(syncUrl).then(() => {
    const feedback = document.getElementById('syncLinkCopyFeedback');
    if (feedback) {
      feedback.style.display = 'block';
      setTimeout(() => { feedback.style.display = 'none'; }, 3500);
    }
    showToast('📋 Link di sincronizzazione copiato!');
  }).catch(() => {
    prompt('Copia questo link di sincronizzazione e aprilo su iPhone:', syncUrl);
  });
}

function handleManualSyncInput() {
  const input = document.getElementById('manualSyncInput');
  if (!input) return;

  const val = input.value.trim();
  if (!val) {
    showToast('⚠️ Incolla prima il link o codice di sincronizzazione!');
    return;
  }

  try {
    const payload = extractSyncPayload(val);
    if (!payload) {
      showToast('⚠️ Codice o link non valido!');
      return;
    }
    const data = decodeSyncPayload(payload);
    applySyncData(data);
    input.value = '';
  } catch (err) {
    console.error('Errore importazione manuale:', err);
    showToast('⚠️ Codice o link non valido!');
  }
}

// --- Helpers ---
const MAX_VISIBLE_TOASTS = 3;
function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  // Avoid toast pile-up
  while (container.children.length >= MAX_VISIBLE_TOASTS) {
    container.firstChild.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  const label = document.createElement('span');
  label.textContent = String(message);
  toast.appendChild(label);
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

function triggerHaptic(isError = false) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(isError ? [50, 50, 50] : [40]);
  }
}

function formatShortDate(isoString) {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  try {
    // Include the year for entries from past years
    const opts = d.getFullYear() === new Date().getFullYear()
      ? { day: 'numeric', month: 'short' }
      : { day: 'numeric', month: 'short', year: 'numeric' };
    return d.toLocaleDateString('it-IT', opts);
  } catch (e) {
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}

// --- PWA Service Worker Registration ---
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('SW registrato:', reg.scope))
        .catch(err => console.log('SW errore:', err));
    });
  }
}

// Start application on DOMContentLoaded
document.addEventListener('DOMContentLoaded', init);
