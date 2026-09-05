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
  }
];

// --- State Management ---
const STORAGE_KEY = 'sublog_nogi_logs_v1';
const CUSTOM_TECH_KEY = 'sublog_custom_techs_v1';

let logs = [];
let customTechs = [];
let currentCategory = 'all';
let selectedBelt = null;
let selectedTech = null;

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
  try {
    const savedLogs = localStorage.getItem(STORAGE_KEY);
    logs = savedLogs ? JSON.parse(savedLogs) : [];
    const savedCustom = localStorage.getItem(CUSTOM_TECH_KEY);
    customTechs = savedCustom ? JSON.parse(savedCustom) : [];
    
    // Rimuovi choke custom aggiunti in precedenza se presenti
    const initialLen = customTechs.length;
    customTechs = customTechs.filter(t => t.category !== 'chokes');
    if (customTechs.length !== initialLen) {
      saveData();
    }
  } catch (e) {
    console.error('Error loading LocalStorage:', e);
    logs = [];
    customTechs = [];
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    localStorage.setItem(CUSTOM_TECH_KEY, JSON.stringify(customTechs));
  } catch (e) {
    console.error('Error saving LocalStorage:', e);
  }
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

  filtered.forEach(tech => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isCustom = tech.id.startsWith('custom_');
    btn.className = `tech-btn ${selectedTech && selectedTech.id === tech.id ? 'selected' : ''}`;
    btn.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
        <span>${tech.name}</span>
        ${isCustom ? `<span class="delete-custom-tech" title="Elimina tecnica" data-id="${tech.id}" style="color: #F87171; font-size: 0.72rem; padding: 2px 6px; background: rgba(239, 68, 68, 0.25); border-radius: 6px; font-weight: 800; border: 1px solid #EF4444;">✕ Rimuovi</span>` : ''}
      </div>
      <span class="tech-tag">${tech.tag || getCategoryLabel(tech.category)}</span>
    `;

    btn.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-custom-tech')) {
        e.stopPropagation();
        handleDeleteCustomTechnique(tech.id);
        return;
      }
      document.querySelectorAll('.tech-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedTech = tech;
      triggerHaptic();
    });
    container.appendChild(btn);
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
  const name = input ? input.value.trim() : '';
  const category = catSelect ? catSelect.value : 'custom';

  if (!name) {
    showToast('⚠️ Inserisci il nome della tecnica!');
    return;
  }

  const id = 'custom_' + Date.now();
  const newTech = { id, name, category, tag: 'Custom' };
  customTechs.push(newTech);
  saveData();

  input.value = '';
  showToast(`✅ "${name}" aggiunta all'arsenale!`);
  selectedTech = newTech;
  renderTechniques();
}

// --- Handle Submission Log ---
function handleLogSubmission() {
  if (!selectedBelt) {
    showToast('⚠️ Seleziona la cintura del tuo avversario!');
    triggerHaptic(true);
    return;
  }

  if (!selectedTech) {
    showToast('⚠️ Seleziona la finalizzazione che hai messo a segno!');
    triggerHaptic(true);
    return;
  }

  const notesInput = document.getElementById('rollNotesInput');
  const notes = notesInput ? notesInput.value.trim() : '';

  const previousBadges = getUnlockedBadgesCount();

  const newLog = {
    id: 'log_' + Date.now(),
    timestamp: new Date().toISOString(),
    belt: selectedBelt,
    techId: selectedTech.id,
    techName: selectedTech.name,
    category: selectedTech.category,
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
  updateTotalHeader();
  renderStats();
  renderBadges();
  renderFeed();

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

  // Signature submission
  const techCounts = {};
  logs.forEach(l => {
    techCounts[l.techName] = (techCounts[l.techName] || 0) + 1;
  });

  let topTechName = 'N/A';
  let topTechCount = 0;
  Object.entries(techCounts).forEach(([name, count]) => {
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

  // Category distribution
  const chokesCount = logs.filter(l => l.category === 'chokes').length;
  const legsCount = logs.filter(l => l.category === 'leglocks').length;
  const armsCount = logs.filter(l => l.category === 'armlocks').length;

  const chokesEl = document.getElementById('statChokesCount');
  const legsEl = document.getElementById('statLegsCount');
  const armsEl = document.getElementById('statArmsCount');

  if (chokesEl) chokesEl.textContent = `${chokesCount} (${total ? Math.round(chokesCount/total*100) : 0}%)`;
  if (legsEl) legsEl.textContent = `${legsCount} (${total ? Math.round(legsCount/total*100) : 0}%)`;
  if (armsEl) armsEl.textContent = `${armsCount} (${total ? Math.round(armsCount/total*100) : 0}%)`;
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
    card.innerHTML = `
      <div class="badge-icon">${badge.icon}</div>
      <div class="badge-title">${badge.title}</div>
      <div class="badge-desc">${badge.desc}</div>
      <div class="badge-status">${isUnlocked ? 'SBLOCCATO' : 'IN CORSO'}</div>
    `;
    container.appendChild(card);
  });
}

// --- Feed (Recent Rolls) ---
function renderFeed() {
  const container = document.getElementById('recentFeedList');
  if (!container) return;

  if (logs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🥋</div>
        <p>Nessun tap registrato finora.</p>
        <p style="font-size: 0.8rem; margin-top: 6px;">Vai nella scheda "Log" e registra la tua prima sottomissione!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';

  logs.forEach(log => {
    const item = document.createElement('div');
    item.className = 'feed-item';

    const beltObj = BELTS.find(b => b.id === log.belt) || { label: log.belt, color: '#334155' };
    const dateFormatted = formatShortDate(log.timestamp);

    item.innerHTML = `
      <div class="feed-item-left">
        <div class="feed-belt-pill" style="background: ${beltObj.color};"></div>
        <div class="feed-info">
          <span class="feed-tech-name">${log.techName}</span>
          <span class="feed-meta">vs ${beltObj.label} • ${dateFormatted} ${log.notes ? '• ' + escapeHtml(log.notes) : ''}</span>
        </div>
      </div>
      <button class="btn-delete-log" title="Elimina log" data-id="${log.id}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;

    const delBtn = item.querySelector('.btn-delete-log');
    delBtn.addEventListener('click', () => handleDeleteLog(log.id));

    container.appendChild(item);
  });
}

function handleDeleteLog(id) {
  if (confirm('Sei sicuro di voler eliminare questa sottomissione dal registro?')) {
    logs = logs.filter(l => l.id !== id);
    saveData();
    updateTotalHeader();
    renderStats();
    renderBadges();
    renderFeed();
    showToast('🗑️ Sottomissione rimossa.');
  }
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
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const parsed = JSON.parse(event.target.result);
      if (Array.isArray(parsed.logs)) {
        logs = parsed.logs;
        if (Array.isArray(parsed.customTechniques)) {
          customTechs = parsed.customTechniques;
        }
        saveData();
        updateTotalHeader();
        renderStats();
        renderBadges();
        renderFeed();
        renderTechniques();
        showToast(`✅ Ripristinati ${logs.length} tap con successo!`);
      } else {
        alert('Formato file non valido!');
      }
    } catch (err) {
      alert('Errore nella lettura del file JSON di backup.');
    }
  };
  reader.readAsText(file);
}

function handleClearData() {
  if (confirm('⚠️ ATTENZIONE: Vuoi davvero cancellare TUTTI i tuoi dati e ricominciare da zero?')) {
    logs = [];
    customTechs = [];
    saveData();
    updateTotalHeader();
    renderStats();
    renderBadges();
    renderFeed();
    renderTechniques();
    showToast('🧹 Tutti i dati sono stati cancellati.');
  }
}

// --- QR / Device Synchronization Engine ---
function checkUrlForSyncData() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    let syncPayload = urlParams.get('sync');
    
    if (!syncPayload && window.location.hash.includes('sync=')) {
      const match = window.location.hash.match(/sync=([^&]+)/);
      if (match) syncPayload = match[1];
    }

    if (syncPayload) {
      const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(syncPayload))));
      const data = JSON.parse(jsonStr);

      if (Array.isArray(data.logs) && data.logs.length > 0) {
        let addedCount = 0;
        const existingIds = new Set(logs.map(l => l.id));

        data.logs.forEach(newLog => {
          if (!existingIds.has(newLog.id)) {
            logs.push(newLog);
            existingIds.add(newLog.id);
            addedCount++;
          }
        });

        if (Array.isArray(data.customTechs)) {
          const existingTechIds = new Set(customTechs.map(t => t.id));
          data.customTechs.forEach(t => {
            if (!existingTechIds.has(t.id)) {
              customTechs.push(t);
              existingTechIds.add(t.id);
            }
          });
        }

        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        saveData();

        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);

        setTimeout(() => {
          showToast(`🎉 Sincronizzati ${addedCount} tap con successo!`);
          triggerHaptic();
          updateTotalHeader();
          renderStats();
          renderBadges();
          renderFeed();
          renderTechniques();
        }, 400);
      }
    }
  } catch (err) {
    console.error('Errore durante la sincronizzazione:', err);
    showToast('⚠️ Errore durante la sincronizzazione');
  }
}

function generateSyncUrl() {
  const payload = {
    logs: logs,
    customTechs: customTechs
  };
  const jsonStr = JSON.stringify(payload);
  const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(jsonStr))));
  return `${window.location.origin}${window.location.pathname}?sync=${encoded}`;
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
  const syncUrl = generateSyncUrl();

  if (typeof QRCode !== 'undefined') {
    new QRCode(container, {
      text: syncUrl,
      width: 220,
      height: 220,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    container.innerHTML = '<p style="color:#000; font-size:0.8rem; padding:10px;">Caricamento QR Code...</p>';
  }

  modal.style.display = 'flex';
}

function handleCopySyncLink() {
  if (logs.length === 0) {
    showToast('⚠️ Non ci sono tap registrati da sincronizzare!');
    return;
  }

  const syncUrl = generateSyncUrl();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(syncUrl).then(() => {
      const feedback = document.getElementById('syncLinkCopyFeedback');
      if (feedback) {
        feedback.style.display = 'block';
        setTimeout(() => feedback.style.display = 'none', 3500);
      }
      showToast('📋 Link di sincronizzazione copiato!');
    }).catch(() => {
      prompt('Copia questo link di sincronizzazione e aprilo su iPhone:', syncUrl);
    });
  } else {
    prompt('Copia questo link di sincronizzazione e aprilo su iPhone:', syncUrl);
  }
}

// --- Helpers ---
function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${message}</span>`;
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
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  } catch (e) {
    return '';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
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
