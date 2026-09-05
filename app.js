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

// ISO week key (UTC) for long-term consistency badges
function getIsoWeekKey(d) {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (dt.getUTCDay() + 6) % 7; // Monday = 0
  dt.setUTCDate(dt.getUTCDate() - day + 3); // Thursday of this week
  const firstThu = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
  const fday = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - fday + 3);
  const week = 1 + Math.round((dt - firstThu) / (7 * 86400000));
  return dt.getUTCFullYear() + '-W' + week;
}

function getDistinctWeeks(logs) {
  const weeks = new Set();
  logs.forEach(l => {
    const d = new Date(l.timestamp);
    if (!isNaN(d.getTime())) weeks.add(getIsoWeekKey(d));
  });
  return weeks;
}

function getDayCounts(logs) {
  const counts = {};
  logs.forEach(l => {
    const d = new Date(l.timestamp);
    if (isNaN(d.getTime())) return;
    const k = d.getUTCFullYear() + '-' + d.getUTCMonth() + '-' + d.getUTCDate();
    counts[k] = (counts[k] || 0) + 1;
  });
  return counts;
}

function getMaxTapsSingleDay(logs) {
  const counts = Object.values(getDayCounts(logs));
  return counts.length ? Math.max(...counts) : 0;
}

function getMaxGapDays(logs) {
  const days = [...getDistinctDayKeys(logs)].map(k => {
    const [y, m, dd] = k.split('-').map(Number);
    return Date.UTC(y, m, dd) / 86400000;
  }).sort((a, b) => a - b);
  let gap = 0;
  for (let i = 1; i < days.length; i++) {
    gap = Math.max(gap, days[i] - days[i - 1] - 1);
  }
  return gap;
}

const HEATMAP_DAYS = 126; // 18 weeks
const expandedCats = new Set();

function heatLevel(count) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

// Monday-first cells covering the trailing `days`, padded back to Monday
// so week columns align. Pure (testable): [{date, count, inRange}].
function buildHeatmapData(logs, days, todayUtcMs) {
  const counts = getDayCounts(logs);
  const now = new Date(todayUtcMs === undefined ? Date.now() : todayUtcMs);
  const endDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startDay = endDay - (days - 1) * 86400000;
  const startDow = (new Date(startDay).getUTCDay() + 6) % 7; // Monday = 0
  const gridStart = startDay - startDow * 86400000;
  const endDow = (new Date(endDay).getUTCDay() + 6) % 7;
  const gridEnd = endDay + ((6 - endDow + 7) % 7) * 86400000; // pad forward to Sunday
  const cells = [];
  for (let t = gridStart; t <= gridEnd; t += 86400000) {
    const d = new Date(t);
    const key = d.getUTCFullYear() + '-' + d.getUTCMonth() + '-' + d.getUTCDate();
    cells.push({ date: d, count: counts[key] || 0, inRange: t >= startDay && t <= endDay });
  }
  return cells;
}

function renderCalendar() {
  const container = document.getElementById('activityHeatmap');
  if (!container) return;
  container.innerHTML = '';
  const cells = buildHeatmapData(logs, HEATMAP_DAYS);
  const frag = document.createDocumentFragment();
  cells.forEach(c => {
    const el = document.createElement('div');
    el.className = 'heatmap-cell';
    if (!c.inRange) {
      el.style.visibility = 'hidden';
      frag.appendChild(el);
      return;
    }
    el.dataset.level = String(heatLevel(c.count));
    try {
      el.title = `${c.count} tap — ${c.date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`;
    } catch (_) {
      el.title = `${c.count} tap`;
    }
    frag.appendChild(el);
  });
  container.appendChild(frag);

  const summary = document.getElementById('heatmapSummary');
  if (summary) {
    const total = cells.reduce((s, c) => s + (c.inRange ? c.count : 0), 0);
    summary.textContent = `${total} tap ultimi ${HEATMAP_DAYS} gg`;
  }
}

function getDistinctMonthKeys(logs) {
  const months = new Set();
  logs.forEach(l => {
    const d = new Date(l.timestamp);
    if (!isNaN(d.getTime())) months.add(d.getUTCFullYear() + '-' + d.getUTCMonth());
  });
  return months;
}

function getMaxConsecutiveMonths(logs) {
  const nums = [...getDistinctMonthKeys(logs)].map(k => {
    const [y, m] = k.split('-').map(Number);
    return y * 12 + m;
  }).sort((a, b) => a - b);
  let best = nums.length ? 1 : 0, run = 1;
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

function countWeekendTaps(logs) {
  return logs.filter(l => {
    const d = new Date(l.timestamp);
    if (isNaN(d.getTime())) return false;
    const g = d.getDay();
    return g === 0 || g === 6;
  }).length;
}

function hasTapInHourRange(logs, from, to) {
  return logs.some(l => {
    const d = new Date(l.timestamp);
    if (isNaN(d.getTime())) return false;
    const h = d.getHours();
    return h >= from && h < to;
  });
}

function hasTripleThreatDay(logs) {
  const byDay = {};
  logs.forEach(l => {
    const d = new Date(l.timestamp);
    if (isNaN(d.getTime())) return;
    const k = d.getUTCFullYear() + '-' + d.getUTCMonth() + '-' + d.getUTCDate();
    if (!byDay[k]) byDay[k] = new Set();
    byDay[k].add(l.category);
  });
  return Object.values(byDay).some(set =>
    set.has('chokes') && set.has('leglocks') && set.has('armlocks'));
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
  },
  // --- Volumi estremi ---
  {
    id: 'volume_300',
    icon: '🏔️',
    title: 'Predatore Apex',
    desc: '300 sottomissioni totali registrate.',
    check: (logs) => logs.length >= 300
  },
  {
    id: 'volume_500',
    icon: '🗿',
    title: 'Immortale',
    desc: '500 sottomissioni totali registrate. Il tatami ti appartiene.',
    check: (logs) => logs.length >= 500
  },
  // --- Specialisti extra ---
  {
    id: 'leg_collector',
    icon: '🦿',
    title: 'Collezionista di Gambe',
    desc: '15 leg lock registrati.',
    check: (logs) => logs.filter(l => l.category === 'leglocks').length >= 15
  },
  {
    id: 'americana_express',
    icon: '⛓️',
    title: 'Americana Express',
    desc: '5 Americane messe a segno.',
    check: (logs) => logs.filter(l => l.techId === 'americana').length >= 5
  },
  {
    id: 'ezekiel_enforcer',
    icon: '🧣',
    title: 'Ezekiel Enforcer',
    desc: '3 Ezekiel (classico o a un braccio) messi a segno.',
    check: (logs) => logs.filter(l => ['ezekiel', 'ezekiel_one_arm'].includes(l.techId)).length >= 3
  },
  {
    id: 'rare_breed',
    icon: '🦄',
    title: 'Razza Rara',
    desc: 'Finalizza con una mossa esotica: Twister, Buggy, Von Flue, Wristlock o Calf Slicer.',
    check: (logs) => logs.some(l => ['twister', 'buggy', 'von_flue', 'wristlock', 'calf_slicer'].includes(l.techId))
  },
  // --- Imprese di un giorno e costanza ---
  {
    id: 'triple_threat',
    icon: '🔱',
    title: 'Tripla Minaccia',
    desc: 'Strangolamento, leg lock e leva nello stesso giorno.',
    check: (logs) => hasTripleThreatDay(logs)
  },
  {
    id: 'marathon',
    icon: '🏃',
    title: 'Maratona',
    desc: '5 sottomissioni registrate in un solo giorno.',
    check: (logs) => getMaxTapsSingleDay(logs) >= 5
  },
  {
    id: 'comeback',
    icon: '🔙',
    title: 'Comeback',
    desc: 'Torna a registrare dopo 30+ giorni di pausa.',
    check: (logs) => getMaxGapDays(logs) >= 30
  },
  {
    id: 'grinder',
    icon: '⚙️',
    title: 'Grinder',
    desc: 'Registra tap in 8 settimane diverse.',
    check: (logs) => getDistinctWeeks(logs).size >= 8
  },
  // --- Completezza ---
  {
    id: 'completionist',
    icon: '🎖️',
    title: 'Completista',
    desc: 'Finalizza con tutte le 23 tecniche di base.',
    check: (logs) => {
      const have = new Set(logs.map(l => l.techId));
      return TECHNIQUES.every(t => have.has(t.id));
    }
  },
  {
    id: 'mad_scientist',
    icon: '👨‍🔬',
    title: 'Scienziato Pazzo',
    desc: 'Vai a segno con una mossa personalizzata.',
    check: (logs) => logs.some(l => typeof l.techId === 'string' && l.techId.startsWith('custom_'))
  },
  {
    id: 'full_house',
    icon: '🃏',
    title: 'Full House',
    desc: 'Almeno una finalizzazione per ogni categoria, custom incluse.',
    check: (logs) => {
      const cats = new Set(logs.map(l => l.category));
      return cats.has('chokes') && cats.has('leglocks') && cats.has('armlocks') && cats.has('custom');
    }
  },
  // --- Leggende e riti ---
  {
    id: 'vannacciano',
    icon: '🫡',
    title: 'Vannacciano',
    desc: '20 strangolamenti. Qui il mondo non è al contrario: comandi tu.',
    check: (logs) => logs.filter(l => l.category === 'chokes').length >= 20
  },
  {
    id: 'kali_yuga',
    icon: '🌑',
    title: 'KALI YUGA',
    desc: "Un tap registrato nel cuore della notte (00:00–05:00). L'era oscura.",
    check: (logs) => hasTapInHourRange(logs, 0, 5)
  },
  {
    id: 'alba',
    icon: '🌅',
    title: "Prima dell'Alba",
    desc: 'Un tap registrato tra le 05:00 e le 08:00. Chi dorme non finalizza.',
    check: (logs) => hasTapInHourRange(logs, 5, 8)
  },
  {
    id: 'weekend_warrior',
    icon: '🏖️',
    title: 'Weekend Warrior',
    desc: '10 tap di sabato o domenica.',
    check: (logs) => countWeekendTaps(logs) >= 10
  },
  {
    id: 'three_months',
    icon: '📆',
    title: 'Tre Mesi di Guerra',
    desc: 'Tap in 3 mesi di calendario consecutivi.',
    check: (logs) => getMaxConsecutiveMonths(logs) >= 3
  },
  {
    id: 'perfect_week',
    icon: '📈',
    title: 'Settimana Perfetta',
    desc: 'Tap in 7 giorni consecutivi.',
    check: (logs) => getMaxDayStreak(logs) >= 7
  },
  {
    id: 'full_year',
    icon: '🗓️',
    title: 'Anno Intero',
    desc: 'Tap in 12 mesi diversi. La costanza è tutto.',
    check: (logs) => getDistinctMonthKeys(logs).size >= 12
  },
  // --- Specialisti extra ---
  {
    id: 'north_south_master',
    icon: '🧭',
    title: 'Croce del Nord',
    desc: '3 North-South Choke messi a segno.',
    check: (logs) => logs.filter(l => l.techId === 'north_south').length >= 3
  },
  {
    id: 'anaconda_squeeze',
    icon: '🌀',
    title: 'Anaconda Squeeze',
    desc: '3 Anaconda Choke messi a segno.',
    check: (logs) => logs.filter(l => l.techId === 'anaconda').length >= 3
  },
  {
    id: 'foot_collector',
    icon: '🦶',
    title: 'Collezionista di Piedi',
    desc: '3 Toe Hold o Calf Slicer messi a segno.',
    check: (logs) => logs.filter(l => ['toe_hold', 'calf_slicer'].includes(l.techId)).length >= 3
  },
  // --- Meta ---
  {
    id: 'custom_master',
    icon: '🔬',
    title: 'Maestro Custom',
    desc: 'Crea 3 mosse personalizzate.',
    check: () => customTechs.length >= 3
  },
  {
    id: 'biografo',
    icon: '📖',
    title: 'Biografo',
    desc: 'Aggiungi note a 25 sottomissioni.',
    check: (logs) => logs.filter(l => l.notes && l.notes.trim()).length >= 25
  }
];

const VALID_BELTS = new Set(['white', 'blue', 'purple', 'brown', 'black']);
const VALID_CATEGORIES = new Set(['chokes', 'leglocks', 'armlocks', 'custom']);

// --- State Management ---
const STORAGE_KEY = 'sublog_nogi_logs_v1';
const CUSTOM_TECH_KEY = 'sublog_custom_techs_v1';
const MAX_SYNC_URL_LENGTH = 30000;
// iPhone cameras reliably scan on-screen QR codes up to roughly this many
// characters (byte mode, EC level M). Anything bigger renders as an
// ultra-dense, unscannable code — so we QR a recent subset instead.
const QR_MAX_CHARS = 1500;
const QR_RENDER_PX = 280;

function generateId(prefix) {
  // Short time-ordered ids (~18 chars vs 40 for UUIDs): the random tail of
  // a UUID is incompressible noise, so shorter ids shrink every sync payload.
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
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
let feedQuery = '';
let feedBelt = 'all';

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

  // Expandable category breakdown rows in Stats
  document.querySelectorAll('[data-catrow]').forEach(row => {
    const toggle = () => toggleCatBreakdown(row.dataset.catrow);
    row.addEventListener('click', toggle);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
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

  // Date picker defaults to today and can't go in the future
  const dateInput = document.getElementById('rollDateInput');
  if (dateInput) {
    dateInput.max = toLocalDateInputValue(new Date());
  }

  // Feed search + belt filter
  const feedSearch = document.getElementById('feedSearchInput');
  if (feedSearch) {
    feedSearch.addEventListener('input', (e) => {
      feedQuery = e.target.value;
      renderFeed();
    });
  }
  const feedBeltSel = document.getElementById('feedBeltFilter');
  if (feedBeltSel) {
    feedBeltSel.addEventListener('change', (e) => {
      feedBelt = e.target.value;
      renderFeed();
    });
  }

  // CSV export + stat card
  const csvBtn = document.getElementById('exportCsvBtn');
  if (csvBtn) {
    csvBtn.addEventListener('click', exportDataToCsv);
  }
  const cardBtn = document.getElementById('shareCardBtn');
  if (cardBtn) {
    cardBtn.addEventListener('click', shareStatCard);
  }

  // Easter egg trigger
  const aboutCard = document.getElementById('aboutCard');
  if (aboutCard) {
    aboutCard.addEventListener('click', handleAboutTap);
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

  const shareBackupBtn = document.getElementById('shareBackupBtn');
  if (shareBackupBtn) {
    shareBackupBtn.addEventListener('click', shareBackupFile);
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

  const dateInput = document.getElementById('rollDateInput');
  const parsedDate = dateInput ? parseLogDateInput(dateInput.value) : new Date();
  if (!parsedDate) {
    showToast('⚠️ Data non valida!');
    return;
  }
  let stamp = parsedDate;
  if (isFutureCalendarDay(stamp)) {
    stamp = new Date();
    showToast('⚠️ Data futura: registro con la data di oggi.');
  }

  const previousBadges = getUnlockedBadgesCount();

  const newLog = {
    id: generateId('log'),
    timestamp: stamp.toISOString(),
    belt: selectedBelt,
    techId: selectedTech.id,
    techName: String(selectedTech.name).slice(0, 80),
    category: VALID_CATEGORIES.has(selectedTech.category) ? selectedTech.category : 'custom',
    notes: notes
  };

  logs.push(newLog);
  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  saveData();

  // Reset inputs
  if (notesInput) notesInput.value = '';
  if (dateInput) dateInput.value = '';
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

  renderCalendar();

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

  renderBreakdowns();
}

// Per-technique breakdown within each category, sorted by count desc.
// Pure (testable): { chokes: [{name, count, pct}], ... }
function breakdownByCategory(logs) {
  const buckets = { chokes: {}, leglocks: {}, armlocks: {}, other: {} };
  logs.forEach(l => {
    const bucket = (l.category === 'chokes' || l.category === 'leglocks' || l.category === 'armlocks')
      ? l.category : 'other';
    const key = l.techId || l.techName || '?';
    if (!buckets[bucket][key]) buckets[bucket][key] = { name: l.techName || 'Sconosciuta', count: 0 };
    buckets[bucket][key].count++;
  });
  const out = {};
  Object.keys(buckets).forEach(b => {
    const items = Object.values(buckets[b]);
    const total = items.reduce((s, x) => s + x.count, 0);
    out[b] = items
      .map(x => ({ name: x.name, count: x.count, pct: total ? Math.round(x.count / total * 100) : 0 }))
      .sort((a, b2) => b2.count - a.count);
  });
  return out;
}

function toggleCatBreakdown(cat) {
  if (expandedCats.has(cat)) expandedCats.delete(cat);
  else expandedCats.add(cat);
  renderStats();
}

function renderBreakdowns() {
  const groups = breakdownByCategory(logs);
  [['chokes', 'breakdown-chokes'], ['leglocks', 'breakdown-leglocks'],
   ['armlocks', 'breakdown-armlocks'], ['other', 'breakdown-other']].forEach(([cat, boxId]) => {
    const box = document.getElementById(boxId);
    const row = document.querySelector(`[data-catrow="${cat}"]`);
    const items = groups[cat] || [];
    const open = expandedCats.has(cat) && items.length > 0;
    if (row) row.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (!box) return;
    box.hidden = !open;
    if (!open) return;
    box.innerHTML = '';
    const max = Math.max(1, ...items.map(i => i.count));
    const frag = document.createDocumentFragment();
    items.forEach(it => {
      const r = document.createElement('div');
      r.className = 'tech-breakdown-row';
      const name = document.createElement('span');
      name.className = 'tech-breakdown-name';
      name.textContent = it.name;
      name.title = it.name;
      const bar = document.createElement('div');
      bar.className = 'tech-breakdown-bar';
      const fill = document.createElement('div');
      fill.className = 'tech-breakdown-fill';
      fill.style.width = `${Math.max(4, Math.round(it.count / max * 100))}%`;
      bar.appendChild(fill);
      const count = document.createElement('span');
      count.className = 'tech-breakdown-count';
      count.textContent = `${it.count} (${it.pct}%)`;
      r.append(name, bar, count);
      frag.appendChild(r);
    });
    box.appendChild(frag);
  });
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

  container.innerHTML = '';
  const fragment = document.createDocumentFragment();

  const q = feedQuery.trim().toLowerCase();
  const filtering = q !== '' || feedBelt !== 'all';
  const visible = logs.filter(l =>
    (feedBelt === 'all' || l.belt === feedBelt) &&
    (!q || (l.techName || '').toLowerCase().includes(q) || (l.notes || '').toLowerCase().includes(q))
  );

  if (visible.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const p1 = document.createElement('p');
    p1.textContent = filtering ? 'Nessun risultato per questi filtri.' : 'Nessun tap registrato finora.';
    empty.appendChild(p1);
    if (!filtering) {
      const icon = document.createElement('div');
      icon.className = 'empty-state-icon';
      icon.textContent = '🥋';
      const p2 = document.createElement('p');
      p2.style.cssText = 'font-size: 0.8rem; margin-top: 6px;';
      p2.textContent = 'Vai nella scheda "Log" e registra la tua prima sottomissione!';
      empty.prepend(icon);
      empty.appendChild(p2);
    }
    container.appendChild(empty);
    return;
  }

  if (filtering) {
    const count = document.createElement('div');
    count.style.cssText = 'font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px;';
    count.textContent = `${visible.length} di ${logs.length} mostrati`;
    fragment.appendChild(count);
  }

  visible.forEach(log => {
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

  const dateField = document.getElementById('editLogDate');
  if (dateField) {
    const d = new Date(log.timestamp);
    dateField.value = isNaN(d.getTime()) ? '' : toLocalDateInputValue(d);
    dateField.max = toLocalDateInputValue(new Date());
  }

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

  const dateField = document.getElementById('editLogDate');
  let timestamp = logs[idx].timestamp;
  if (dateField && dateField.value) {
    const parsed = parseLogDateInput(dateField.value);
    if (!parsed) {
      showToast('⚠️ Data non valida!');
      return;
    }
    // Keep the original time of day, change only the calendar date
    const orig = new Date(logs[idx].timestamp);
    if (!isNaN(orig.getTime())) {
      parsed.setHours(orig.getHours(), orig.getMinutes(), orig.getSeconds(), 0);
    }
    timestamp = (isFutureCalendarDay(parsed) ? new Date() : parsed).toISOString();
  }

  const updated = sanitizeLog({
    id: logs[idx].id,
    timestamp,
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
  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  saveData();
  closeEditModal();
  refreshAll();
  showToast('✏️ Sottomissione aggiornata!');
}

function updateTotalHeader() {
  const countEl = document.getElementById('headerTotalKills');
  if (countEl) countEl.textContent = logs.length;
}

function resetFeedFilters() {
  feedQuery = '';
  feedBelt = 'all';
  const search = document.getElementById('feedSearchInput');
  if (search) search.value = '';
  const beltSel = document.getElementById('feedBeltFilter');
  if (beltSel) beltSel.value = 'all';
}

// --- Easter egg: tap the About card 5 times (within 1.5s windows) ---
let aboutTaps = 0;
let aboutTapTimer = null;
function handleAboutTap() {
  const egg = document.getElementById('fnEgg');
  if (!egg || egg.style.display !== 'none') return;
  aboutTaps++;
  if (aboutTapTimer) clearTimeout(aboutTapTimer);
  if (aboutTaps >= 5) {
    aboutTaps = 0;
    aboutTapTimer = null;
    egg.style.display = 'block';
    egg.classList.add('egg-reveal');
    showToast('🥚 Easter egg sbloccato!');
    triggerHaptic();
    return;
  }
  aboutTapTimer = setTimeout(() => { aboutTaps = 0; }, 1500);
}

// --- Backup, Export & Import ---
function buildBackupFile() {
  const data = {
    appName: 'SUB-LOG No-Gi Grappling Tracker',
    exportDate: new Date().toISOString(),
    logs: logs,
    customTechniques: customTechs
  };
  const name = `sublog_backup_${new Date().toISOString().slice(0, 10)}.json`;
  return new File([JSON.stringify(data, null, 2)], name, { type: 'application/json' });
}

async function shareBackupFile() {
  const file = buildBackupFile();
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'SUB-LOG Backup' });
      showToast('📤 Backup condiviso!');
      return;
    }
  } catch (err) {
    // User dismissed the share sheet: not an error
    if (err && err.name === 'AbortError') return;
    console.error('Share failed, falling back to download:', err);
  }
  exportDataToFile();
}

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
      resetFeedFilters();
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
    resetFeedFilters();
    saveData();
    refreshAll();
    showToast('🧹 Tutti i dati sono stati cancellati.');
  }
}

// --- CSV Export (semicolon-delimited for Excel IT) ---
function csvCell(v) {
  let s = v === null || v === undefined ? '' : String(v);
  // Prevent spreadsheet formula injection from user notes/names
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function beltNameIt(id) {
  const b = BELTS.find(x => x.id === id);
  return b ? b.name : id;
}

function exportDataToCsv() {
  const header = ['data', 'cintura', 'tecnica', 'id_tecnica', 'categoria', 'note'];
  const lines = [header.map(csvCell).join(';')];
  logs.forEach(l => {
    lines.push([l.timestamp, beltNameIt(l.belt), l.techName, l.techId, l.category, l.notes || '']
      .map(csvCell).join(';'));
  });
  const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sublog_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('📊 CSV scaricato!');
}

// --- Shareable Stat Card (1080x1350, Instagram-ready) ---
function truncateCard(s, max) {
  const str = String(s || '');
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function drawStatCard() {
  const W = 1080, H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0F172A');
  bg.addColorStop(1, '#020617');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#EF4444';
  ctx.fillRect(0, 0, W, 14);

  const cx = W / 2;
  ctx.textAlign = 'center';

  ctx.fillStyle = '#F8FAFC';
  ctx.font = '900 84px -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('SUB·LOG', cx, 150);
  ctx.fillStyle = '#EF4444';
  ctx.font = '800 34px -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('N O - G I   T R A C K E R', cx, 200);

  const total = logs.length;
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '900 260px -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(String(total), cx, 480);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '700 34px -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(total === 1 ? 'KILL TOTALE' : 'KILL TOTALI', cx, 535);

  // Signature move
  const counts = {};
  logs.forEach(l => {
    const k = l.techId || l.techName;
    if (!counts[k]) counts[k] = { n: 0, name: l.techName };
    counts[k].n++;
  });
  let sig = { n: 0, name: '—' };
  Object.values(counts).forEach(c => { if (c.n > sig.n) sig = c; });
  const sigPct = total > 0 ? Math.round(sig.n / total * 100) : 0;
  ctx.fillStyle = '#38BDF8';
  ctx.font = '800 30px -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('MOSSA MIGLIORE', cx, 620);
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '800 52px -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(truncateCard(sig.name, 26), cx, 685);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 34px -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${sig.n} tap • ${sigPct}%`, cx, 735);

  // Belt breakdown
  const beltColors = { white: '#F1F5F9', blue: '#3B82F6', purple: '#A855F7', brown: '#D97706', black: '#64748B' };
  const beltCounts = { white: 0, blue: 0, purple: 0, brown: 0, black: 0 };
  logs.forEach(l => { if (beltCounts[l.belt] !== undefined) beltCounts[l.belt]++; });
  const maxBelt = Math.max(1, ...Object.values(beltCounts));
  let y = 810;
  BELTS.forEach(b => {
    const c = beltCounts[b.id] || 0;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 30px -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(b.name, 120, y + 30);
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(330, y, 520, 34);
    if (c > 0) {
      ctx.fillStyle = beltColors[b.id];
      ctx.fillRect(330, y, Math.max(34, Math.round(520 * c / maxBelt)), 34);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '800 32px -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(String(c), 960, y + 31);
    y += 62;
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748B';
  ctx.font = '600 28px -apple-system, "Segoe UI", Roboto, sans-serif';
  try {
    ctx.fillText(`Aggiornato al ${new Date().toLocaleDateString('it-IT')}`, cx, H - 60);
  } catch (_) {
    ctx.fillText('SUB-LOG', cx, H - 60);
  }
  return canvas;
}

function shareStatCard() {
  if (logs.length === 0) {
    showToast('⚠️ Niente da condividere: registra prima un tap!');
    return;
  }
  let canvas;
  try {
    canvas = drawStatCard();
  } catch (e) {
    console.error('Stat card error:', e);
    showToast('⚠️ Errore nella generazione della card!');
    return;
  }
  canvas.toBlob(async (blob) => {
    if (!blob) {
      showToast('⚠️ Errore nella generazione della card!');
      return;
    }
    const file = new File([blob], 'sublog-stat-card.png', { type: 'image/png' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'SUB-LOG Stat Card' });
        showToast('📊 Card condivisa!');
        return;
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      console.error('Card share failed, falling back to download:', err);
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sublog-stat-card.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('📊 Card scaricata!');
  }, 'image/png');
}

// --- QR / Device Synchronization Engine ---
// Payload v2 (compact): logs are positional arrays [id, epochMs, beltIdx,
// techId, notes] and technique names/categories are rehydrated from the
// bundled custom techniques + built-in list. Roughly halves URL length.
// v1 payloads ({logs:[{...}], ...} and raw arrays) still decode.
const BELT_ORDER = ['white', 'blue', 'purple', 'brown', 'black'];

function encodeSyncPayload(data) {
  const logs = Array.isArray(data.logs) ? data.logs : (Array.isArray(data) ? data : []);
  const techs = Array.isArray(data.customTechs)
    ? data.customTechs
    : (Array.isArray(data.customTechniques) ? data.customTechniques : []);
  const compact = {
    v: 2,
    l: logs.map(l => [
      l.id,
      Date.parse(l.timestamp) || 0,
      BELT_ORDER.indexOf(l.belt),
      l.techId,
      l.notes || ''
    ]),
    t: techs
  };
  const json = JSON.stringify(compact);
  // v3: LZ-string compression inside a base64url envelope. The '+' char is
  // remapped (it would decode as a space in query strings); '$' and '-'
  // survive URLs untouched.
  if (typeof LZString !== 'undefined' && LZString.compressToEncodedURIComponent) {
    const compressed = LZString.compressToEncodedURIComponent(json).replace(/\+/g, '~');
    return bytesToB64Url(new TextEncoder().encode(JSON.stringify({ v: 3, c: compressed })));
  }
  return bytesToB64Url(new TextEncoder().encode(json)); // lib missing: plain v2
}

function bytesToB64Url(bytes) {
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64UrlToJson(clean) {
  let b64 = clean.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function expandCompactPayload(obj) {
  const techById = {};
  TECHNIQUES.forEach(t => { techById[t.id] = t; });
  (Array.isArray(obj.t) ? obj.t : []).forEach(t => {
    if (t && t.id) techById[t.id] = t;
  });
  customTechs.forEach(t => { if (t && t.id && !techById[t.id]) techById[t.id] = t; });

  const logs = (Array.isArray(obj.l) ? obj.l : []).map(entry => {
    if (!Array.isArray(entry)) return null;
    const [id, epochMs, beltIdx, techId, notes] = entry;
    const known = techById[techId];
    const ms = typeof epochMs === 'number' && isFinite(epochMs) && epochMs > 0 ? epochMs : Date.now();
    return {
      id,
      timestamp: new Date(ms).toISOString(),
      belt: BELT_ORDER[beltIdx],
      techId,
      techName: known ? known.name : String(techId || 'Tecnica sconosciuta'),
      category: known ? known.category : 'custom',
      notes: typeof notes === 'string' ? notes : ''
    };
  });

  return {
    logs,
    customTechs: Array.isArray(obj.t) ? obj.t : []
  };
}

function decodeSyncPayload(str) {
  if (typeof str !== 'string' || !str) throw new Error('Empty payload');
  const clean = str.trim();
  if (!/^[A-Za-z0-9\-_]+$/.test(clean)) throw new Error('Invalid payload characters');
  if (clean.length > 500000) throw new Error('Payload too large');
  const parsed = JSON.parse(b64UrlToJson(clean));
  if (parsed && parsed.v === 3) {
    if (typeof parsed.c !== 'string' || !/^[A-Za-z0-9\-$~]+$/.test(parsed.c)) {
      throw new Error('Bad v3 payload');
    }
    if (typeof LZString === 'undefined' || !LZString.decompressFromEncodedURIComponent) {
      throw new Error('Decoder unavailable');
    }
    const decomp = LZString.decompressFromEncodedURIComponent(parsed.c.replace(/~/g, '+'));
    if (typeof decomp !== 'string' || !decomp) throw new Error('Decompression failed');
    const inner = JSON.parse(decomp);
    if (!inner || inner.v !== 2) throw new Error('Bad v3 inner payload');
    return expandCompactPayload(inner);
  }
  if (parsed && parsed.v === 2) return expandCompactPayload(parsed);
  return parsed;
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

  const previousBadges = getUnlockedBadgesCount();

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
  if (addedCount > 0 && getUnlockedBadgesCount() > previousBadges) {
    setTimeout(() => {
      showToast('🏆 NUOVO TROFEO SBLOCCATO! Controlla la bacheca!');
      triggerHaptic();
    }, 1200);
  }
}

const PARTS_PREFIX = 'sublog_parts_';
const PARTS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PARTS_MAX_CHUNKS = 200;

function pruneStaleParts() {
  try {
    const now = Date.now();
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PARTS_PREFIX)) {
        try {
          const entry = JSON.parse(localStorage.getItem(key));
          if (!entry || typeof entry.updatedAt !== 'number' || now - entry.updatedAt > PARTS_MAX_AGE_MS) {
            localStorage.removeItem(key);
          }
        } catch (_) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch (_) { /* storage unavailable */ }
}

// Stores one chunk of a multi-QR transfer. Returns {received, total} or
// null on invalid input. When all chunks arrive, assembles + applies them.
function storeSyncPart(transferId, idx, total, chunk) {
  if (!/^[A-Za-z0-9]{4,16}$/.test(transferId)) return null;
  if (!Number.isInteger(idx) || !Number.isInteger(total)) return null;
  if (idx < 0 || idx >= total || total < 1 || total > PARTS_MAX_CHUNKS) return null;
  if (typeof chunk !== 'string' || chunk.length === 0 || chunk.length > 2000) return null;
  if (!/^[A-Za-z0-9\-_]+$/.test(chunk)) return null;

  const key = PARTS_PREFIX + transferId;
  let entry;
  try {
    entry = JSON.parse(localStorage.getItem(key)) || { n: total, parts: {} };
  } catch (_) {
    entry = { n: total, parts: {} };
  }
  if (entry.n !== total) {
    // Conflicting transfer id (reused): restart collection
    entry = { n: total, parts: {} };
  }
  entry.parts[idx] = chunk;
  entry.updatedAt = Date.now();
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (_) { return null; }

  const received = Object.keys(entry.parts).length;
  if (received >= total) {
    let assembled = '';
    for (let i = 0; i < total; i++) assembled += entry.parts[i] || '';
    localStorage.removeItem(key);
    return { received, total, assembled };
  }
  return { received, total, assembled: null };
}

function parseSyncPartParam(val) {
  if (typeof val !== 'string') return null;
  const m = val.trim().match(/^([A-Za-z0-9]{4,16})\.(\d{1,4})\.(\d{1,4})\.([A-Za-z0-9\-_]+)$/);
  if (!m) return null;
  return { transferId: m[1], idx: parseInt(m[2], 10), total: parseInt(m[3], 10), chunk: m[4] };
}

function handleIncomingPart(part, useRender) {
  if (!part) {
    showToast('⚠️ Codice di trasferimento non valido!');
    return;
  }
  const res = storeSyncPart(part.transferId, part.idx, part.total, part.chunk);
  if (!res) {
    showToast('⚠️ Frammento non valido!');
    return;
  }
  if (res.assembled === null) {
    showToast(`📥 Frammento ${res.received}/${res.total} ricevuto — scansiona il successivo`);
    triggerHaptic();
    return;
  }
  try {
    const data = decodeSyncPayload(res.assembled);
    if (useRender) applySyncData(data);
    else applySyncDataWithoutRender(data);
  } catch (err) {
    console.error('Errore assemblaggio trasferimento:', err);
    showToast('⚠️ Trasferimento danneggiato, riprova da capo');
  }
}

function checkUrlForSyncData() {
  try {
    pruneStaleParts();

    // Multi-QR chunked transfer (?syncpart=<id>.<i>.<n>.<chunk>)
    const partParams = new URLSearchParams(window.location.search);
    const partVal = partParams.get('syncpart');
    if (partVal) {
      handleIncomingPart(parseSyncPartParam(partVal), false);
      window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
      return;
    }

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
        width: QR_RENDER_PX,
        height: QR_RENDER_PX,
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

// Characters of encoded payload per QR chunk. Keeps each code well within
// what phone cameras scan reliably (see QR_MAX_CHARS).
const QR_CHUNK_CHARS = 1100;
let chunkTransfer = null;

function buildChunkUrls(encoded) {
  const transferId = Math.random().toString(36).slice(2, 10);
  const chunks = [];
  for (let i = 0; i < encoded.length; i += QR_CHUNK_CHARS) {
    chunks.push(encoded.slice(i, i + QR_CHUNK_CHARS));
  }
  const base = window.location.origin + window.location.pathname;
  return chunks.map((c, i) => `${base}?syncpart=${transferId}.${i}.${chunks.length}.${c}`);
}

function renderChunkQr(index) {
  const modal = document.getElementById('syncModal');
  const container = document.getElementById('qrcodeContainer');
  const counter = document.getElementById('qrChunkCounter');
  if (!modal || !container || !chunkTransfer) return;
  chunkTransfer.idx = Math.max(0, Math.min(chunkTransfer.urls.length - 1, index));
  renderLocalQrCode(container, chunkTransfer.urls[chunkTransfer.idx]);
  if (counter) {
    counter.textContent = `Codice ${chunkTransfer.idx + 1} di ${chunkTransfer.urls.length} — inquadrali in ordine`;
  }
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
  const staleNav = document.getElementById('qrChunkNav');
  if (staleNav) staleNav.remove();
  chunkTransfer = null;

  let encoded;
  try {
    encoded = encodeSyncPayload({ logs, customTechs });
  } catch (e) {
    console.error('Sync encode error:', e);
    showToast('⚠️ Errore nella generazione del link!');
    return;
  }
  const base = window.location.origin + window.location.pathname;
  modal.dataset.syncUrl = `${base}?sync=${encoded}`;

  if (modal.dataset.syncUrl.length <= QR_MAX_CHARS) {
    // Small enough for one scannable code
    const ok = renderLocalQrCode(container, modal.dataset.syncUrl);
    if (!ok) renderRemoteQrFallback(container, modal.dataset.syncUrl);
    modal.style.display = 'flex';
    return;
  }

  // Large dataset: paginated multi-QR transfer. The receiver scans every
  // code in order; parts accumulate until the transfer completes.
  const urls = buildChunkUrls(encoded);
  chunkTransfer = { urls, idx: 0 };
  renderChunkQr(0);

  const nav = document.createElement('div');
  nav.id = 'qrChunkNav';
  nav.style.cssText = 'display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 10px;';

  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'cat-chip';
  prev.style.cssText = 'cursor: pointer; font-weight: 800;';
  prev.textContent = '◀';
  prev.setAttribute('aria-label', 'Codice precedente');
  prev.addEventListener('click', () => renderChunkQr(chunkTransfer.idx - 1));

  const counter = document.createElement('div');
  counter.id = 'qrChunkCounter';
  counter.style.cssText = 'color: #000; font-size: 0.75rem; font-weight: 700;';

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'cat-chip';
  next.style.cssText = 'cursor: pointer; font-weight: 800;';
  next.textContent = '▶';
  next.setAttribute('aria-label', 'Codice successivo');
  next.addEventListener('click', () => renderChunkQr(chunkTransfer.idx + 1));

  nav.append(prev, counter, next);
  container.parentElement.insertBefore(nav, container.nextSibling);
  counter.textContent = `Codice 1 di ${urls.length} — inquadrali in ordine`;

  modal.style.display = 'flex';
  showToast(`📲 Dataset grande: scansiona i ${urls.length} codici in ordine`);
}

function renderRemoteQrFallback(container, qrUrl) {
  const qrImg = document.createElement('img');
  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=${QR_RENDER_PX}x${QR_RENDER_PX}&margin=8&data=${encodeURIComponent(qrUrl)}`;
  qrImg.alt = 'QR Code Sincronizzazione';
  qrImg.style.width = QR_RENDER_PX + 'px';
  qrImg.style.height = QR_RENDER_PX + 'px';
  qrImg.style.display = 'block';
  qrImg.style.borderRadius = '12px';
  qrImg.onerror = () => {
    container.innerHTML = '<p style="color:#000; font-size:0.8rem; padding:10px;">Usa il pulsante "Copia Link" qui sotto</p>';
  };
  container.appendChild(qrImg);
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
    showToast('⚠️ Link molto lungo: se l\u2019invio fallisce, usa il Backup JSON.');
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
    // Multi-QR chunk (?syncpart=...) pasted manually
    const partMatch = val.match(/[?&]syncpart=([^&#\s]+)/);
    if (partMatch) {
      handleIncomingPart(parseSyncPartParam(decodeURIComponent(partMatch[1])), true);
      input.value = '';
      return;
    }
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

// <input type="date"> value (YYYY-MM-DD) -> local noon Date.
// Returns `new Date()` when empty, null when malformed.
// Calendar-day comparison (ignores time of day): avoids flagging
// "today at noon" as future when logging in the morning.
function isFutureCalendarDay(d) {
  const now = new Date();
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return a > b;
}

function parseLogDateInput(value) {
  if (!value) return new Date();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0);
  // Reject overflowing components (e.g. month 13, Feb 30)
  if (isNaN(d.getTime()) || d.getFullYear() !== +m[1] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3]) {
    return null;
  }
  return d;
}

function toLocalDateInputValue(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
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
