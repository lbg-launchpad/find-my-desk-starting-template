// ── State ──────────────────────────────────────────────────────────────────
let currentUser = null;
let allUsers = [];
let bookWeekStart = null;
let selectedBookDate = null;
let selectedBookFloor = 'ground';
let selectedNeighbourhood = '';
let whosInDate = null;

// ── Office location — update lat/lng to your actual office coordinates ──────
const OFFICE_LAT = 51.5074;
const OFFICE_LNG = -0.1278;
const OFFICE_RADIUS_M = 300;

// ── Desk data ──────────────────────────────────────────────────────────────

const DESKS = [
  { id: 'G-W1', floor: 'ground', neighbourhood: 'Window Bank',       features: ['window-seat', 'dual-monitor'] },
  { id: 'G-W2', floor: 'ground', neighbourhood: 'Window Bank',       features: ['window-seat', 'standing-desk'] },
  { id: 'G-W3', floor: 'ground', neighbourhood: 'Window Bank',       features: ['window-seat'] },
  { id: 'G-W4', floor: 'ground', neighbourhood: 'Window Bank',       features: ['window-seat', 'quiet-area'] },
  { id: 'G-Q1', floor: 'ground', neighbourhood: 'Quiet Zone',        features: ['quiet-area', 'dual-monitor'] },
  { id: 'G-Q2', floor: 'ground', neighbourhood: 'Quiet Zone',        features: ['quiet-area'] },
  { id: 'G-Q3', floor: 'ground', neighbourhood: 'Quiet Zone',        features: ['quiet-area', 'standing-desk'] },
  { id: 'G-C1', floor: 'ground', neighbourhood: 'Core Desk Area',    features: ['dual-monitor'] },
  { id: 'G-C2', floor: 'ground', neighbourhood: 'Core Desk Area',    features: ['dual-monitor', 'standing-desk'] },
  { id: 'G-C3', floor: 'ground', neighbourhood: 'Core Desk Area',    features: ['accessible-desk', 'dual-monitor'] },
  { id: 'G-C4', floor: 'ground', neighbourhood: 'Core Desk Area',    features: [] },
  { id: 'G-C5', floor: 'ground', neighbourhood: 'Core Desk Area',    features: ['standing-desk'] },
  { id: 'G-L1', floor: 'ground', neighbourhood: 'Collaboration Zone',features: ['near-team', 'dual-monitor'] },
  { id: 'G-L2', floor: 'ground', neighbourhood: 'Collaboration Zone',features: ['near-team'] },
  { id: 'G-L3', floor: 'ground', neighbourhood: 'Collaboration Zone',features: ['near-team', 'standing-desk'] },
  { id: 'F-W1', floor: 'first',  neighbourhood: 'Window Bank',       features: ['window-seat', 'dual-monitor'] },
  { id: 'F-W2', floor: 'first',  neighbourhood: 'Window Bank',       features: ['window-seat'] },
  { id: 'F-W3', floor: 'first',  neighbourhood: 'Window Bank',       features: ['window-seat', 'standing-desk'] },
  { id: 'F-Q1', floor: 'first',  neighbourhood: 'Quiet Zone',        features: ['quiet-area', 'dual-monitor'] },
  { id: 'F-Q2', floor: 'first',  neighbourhood: 'Quiet Zone',        features: ['quiet-area', 'standing-desk'] },
  { id: 'F-Q3', floor: 'first',  neighbourhood: 'Quiet Zone',        features: ['quiet-area'] },
  { id: 'F-C1', floor: 'first',  neighbourhood: 'Core Desk Area',    features: ['dual-monitor'] },
  { id: 'F-C2', floor: 'first',  neighbourhood: 'Core Desk Area',    features: ['accessible-desk'] },
  { id: 'F-C3', floor: 'first',  neighbourhood: 'Core Desk Area',    features: ['standing-desk', 'dual-monitor'] },
  { id: 'F-C4', floor: 'first',  neighbourhood: 'Core Desk Area',    features: [] },
  { id: 'F-L1', floor: 'first',  neighbourhood: 'Collaboration Zone',features: ['near-team'] },
  { id: 'F-L2', floor: 'first',  neighbourhood: 'Collaboration Zone',features: ['near-team', 'dual-monitor'] },
  { id: 'F-L3', floor: 'first',  neighbourhood: 'Collaboration Zone',features: ['near-team', 'standing-desk'] },
];

// ── Local bookings store (localStorage) ───────────────────────────────────

const BOOKINGS_KEY = 'findMyDesk_bookings';

function loadBookings() {
  try { return JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]'); } catch { return []; }
}

function saveBookings(bookings) {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

function generateId() {
  return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
}

function enrichBooking(b) {
  const user = allUsers.find(u => u.id === b.userId) || null;
  const desk = DESKS.find(d => d.id === b.deskId) || null;
  return { ...b, user, desk };
}

// ── Data access ────────────────────────────────────────────────────────────

async function fetchUsers() {
  return USERS_DATA;
}

function getBookings({ userId, date, upcoming } = {}) {
  let list = loadBookings();
  if (userId) list = list.filter(b => b.userId === userId);
  if (date)   list = list.filter(b => b.date === date);
  if (upcoming) list = list.filter(b => b.date >= today()).sort((a, b) => a.date.localeCompare(b.date));
  return list.map(enrichBooking);
}

function createBooking({ userId, deskId, date, slot }) {
  const bookings = loadBookings();
  const conflicts = bookings.filter(b => b.deskId === deskId && b.date === date);
  for (const c of conflicts) {
    if (slotsConflict(c.slot || 'full', slot)) throw new Error('That desk slot is already booked');
  }
  const booking = { id: generateId(), userId, deskId, date, slot, checkedIn: false, checkedInAt: null };
  bookings.push(booking);
  saveBookings(bookings);
  return enrichBooking(booking);
}

function deleteBooking(id) {
  saveBookings(loadBookings().filter(b => b.id !== id));
  return { success: true };
}

function checkInBookingLocal(id) {
  const bookings = loadBookings();
  const b = bookings.find(b => b.id === id);
  if (!b) throw new Error('Booking not found');
  b.checkedIn = true;
  b.checkedInAt = new Date().toISOString();
  saveBookings(bookings);
  return enrichBooking(b);
}

function getDesks({ floor, date } = {}) {
  const dayBookings = date ? loadBookings().filter(b => b.date === date) : [];
  return DESKS
    .filter(d => !floor || d.floor === floor)
    .map(d => {
      const db = dayBookings.filter(b => b.deskId === d.id);
      const amBooked = db.some(b => slotsConflict(b.slot || 'full', 'am'));
      const pmBooked = db.some(b => slotsConflict(b.slot || 'full', 'pm'));
      return { ...d, amAvailable: !amBooked, pmAvailable: !pmBooked, available: !amBooked || !pmBooked };
    });
}

// ── Utilities ──────────────────────────────────────────────────────────────

function toDateStr(d) { return d.toISOString().slice(0, 10); }
function today() { return toDateStr(new Date()); }

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function displayDate(dateStr) {
  return parseDate(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function displayShortDate(dateStr) {
  return parseDate(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatTime(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function weekMonday(dateStr) {
  const d = parseDate(dateStr);
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  return toDateStr(m);
}

function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function getWeekDates(mondayStr) {
  return Array.from({ length: 5 }, (_, i) => addDays(mondayStr, i));
}

function dayKey(dateStr) {
  return ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][parseDate(dateStr).getDay()];
}

function getWorkingStatus(user, dateStr) {
  return user.defaultWorkingPattern?.[dayKey(dateStr)] || 'remote';
}

function isAnchorDay(user, dateStr) {
  const name = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][parseDate(dateStr).getDay()];
  return (user.anchorDays || []).includes(name);
}

function initials(name) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function avatarColor(name) {
  const cols = ['#1d4ed8','#0891b2','#7c3aed','#be185d','#b45309','#16a34a','#dc2626','#0369a1'];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return cols[Math.abs(h) % cols.length];
}

function scoreDesk(desk, user) {
  let s = 0;
  if (desk.neighbourhood === user.preferredNeighbourhood) s += 3;
  for (const f of desk.features) if ((user.deskPreferences || []).includes(f)) s += 1;
  if (user.accessibilityNeeds && desk.features.includes('accessible-desk')) s += 2;
  return s;
}

function nbClass(nb) { return 'nb-' + nb.replace(/\s+/g, ''); }

function featureLabel(f) {
  return { 'window-seat':'Window Seat','quiet-area':'Quiet Area','standing-desk':'Standing',
           'dual-monitor':'Dual Monitor','near-team':'Near Team','accessible-desk':'Accessible' }[f] || f;
}

function slotLabel(slot) {
  return slot === 'am' ? 'AM (until 1pm)' : slot === 'pm' ? 'PM (from 1pm)' : 'Full Day';
}

function slotShort(slot) {
  return slot === 'am' ? 'AM' : slot === 'pm' ? 'PM' : 'Full Day';
}

function slotsConflict(a, b) {
  if (a === 'full' || b === 'full') return true;
  return a === b;
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── Toast ──────────────────────────────────────────────────────────────────

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Modal ──────────────────────────────────────────────────────────────────

function showModal(html) {
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function hideModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ── Navigation ─────────────────────────────────────────────────────────────

function navigate(view) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
  document.getElementById(`view-${view}`).classList.remove('hidden');
  if (view === 'dashboard') renderDashboard();
  else if (view === 'book') initBookView();
  else if (view === 'my-bookings') renderMyBookings();
  else if (view === 'whos-in') renderWhosIn();
}

// ── Login ──────────────────────────────────────────────────────────────────

async function initLogin() {
  allUsers = await fetchUsers();
  allUsers.sort((a, b) => a.fullName.localeCompare(b.fullName));
  const sel = document.getElementById('user-select');
  sel.innerHTML = '<option value="">-- Choose employee --</option>' +
    allUsers.map(u => `<option value="${u.id}">${u.fullName} — ${u.role}, ${u.team}</option>`).join('');
}

function login() {
  const sel = document.getElementById('user-select');
  const user = allUsers.find(u => u.id === sel.value);
  if (!user) { toast('Please select an employee', 'error'); return; }
  currentUser = user;
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  const av = document.getElementById('sidebar-avatar');
  av.textContent = initials(user.fullName);
  av.style.background = avatarColor(user.fullName);
  document.getElementById('sidebar-name').textContent = user.fullName;
  document.getElementById('sidebar-role').textContent = `${user.role} · ${user.team}`;

  navigate('dashboard');
}

function logout() {
  currentUser = null;
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('user-select').value = '';
}

// ── Geolocation auto check-in ──────────────────────────────────────────────

async function tryAutoCheckIn() {
  if (!navigator.geolocation) return;

  const bookings = getBookings({ userId: currentUser.id, date: today() });
  const unchecked = bookings.filter(b => !b.checkedIn);
  if (unchecked.length === 0) return;

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const dist = distanceMeters(pos.coords.latitude, pos.coords.longitude, OFFICE_LAT, OFFICE_LNG);
      if (dist <= OFFICE_RADIUS_M) {
        for (const b of unchecked) {
          checkInBookingLocal(b.id);
        }
        toast('Location verified — checked in automatically', 'success');
        renderDashboard();
      }
    },
    () => {}
  );
}

async function checkInBooking(bookingId) {
  try {
    checkInBookingLocal(bookingId);
    toast('Checked in successfully', 'success');
    renderDashboard();
    const mbView = document.getElementById('view-my-bookings');
    if (!mbView.classList.contains('hidden')) renderMyBookings();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── Dashboard ──────────────────────────────────────────────────────────────

async function renderDashboard() {
  const container = document.getElementById('view-dashboard');
  container.innerHTML = '<div style="color:#94a3b8;padding:20px">Loading...</div>';

  const allUpcoming  = getBookings({ userId: currentUser.id, upcoming: true });
  const todayBookings = getBookings({ date: today() });

  const myTodayBookings = allUpcoming.filter(b => b.date === today());
  const todayStatus = getWorkingStatus(currentUser, today());
  const todayAnchor = isAnchorDay(currentUser, today());
  const teamInToday = todayBookings.filter(b => b.user?.team === currentUser.team && b.userId !== currentUser.id);

  const dayLabel = parseDate(today()).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' });

  let suggestions = [];
  if (myTodayBookings.length === 0 && (todayStatus === 'office' || todayAnchor)) {
    const desks = getDesks({ date: today() });
    suggestions = desks.filter(d => d.available)
      .map(d => ({ ...d, score: scoreDesk(d, currentUser) }))
      .sort((a, b) => b.score - a.score).slice(0, 3);
  }

  const checkinBanner = (() => {
    if (myTodayBookings.length === 0) return '';
    const allCheckedIn = myTodayBookings.every(b => b.checkedIn);
    if (allCheckedIn) {
      const t = formatTime(myTodayBookings[0].checkedInAt);
      return `<div class="checkin-banner checkin-banner-done">
        <span>Checked in${t ? ' at ' + t : ''} — your desk is confirmed.</span>
      </div>`;
    }
    const ids = myTodayBookings.filter(b => !b.checkedIn).map(b => `'${b.id}'`).join(',');
    return `<div class="checkin-banner checkin-banner-pending">
      <span>You have a desk today but haven't checked in yet. Auto-detecting your location&hellip;</span>
      <button class="btn btn-sm btn-primary" onclick="manualCheckInAll([${ids}])">Check In Now</button>
    </div>`;
  })();

  container.innerHTML = `
    <div class="page-header">
      <h1>Good ${greetingTime()}, ${currentUser.fullName.split(' ')[0]}</h1>
      <p>${dayLabel} &mdash; ${currentUser.location} office</p>
    </div>

    ${checkinBanner}

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">Today</div>
        <div class="stat-value">${todayStatus === 'office' ? 'Office' : 'Remote'}</div>
        <div class="stat-sub">${todayAnchor ? 'Anchor day' : 'Default pattern'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Upcoming Bookings</div>
        <div class="stat-value">${allUpcoming.length}</div>
        <div class="stat-sub">${allUpcoming.length === 0 ? 'None scheduled' : 'Next: ' + displayShortDate(allUpcoming[0].date)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Team In Today</div>
        <div class="stat-value">${teamInToday.length}</div>
        <div class="stat-sub">${currentUser.team}</div>
      </div>
    </div>

    ${suggestions.length > 0 ? `
    <div class="card one-col">
      <div class="card-header">
        <span class="card-title">Smart Suggestions for Today</span>
        <span class="pill pill-amber">Office day — no desk booked yet</span>
      </div>
      <div class="card-body">
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">Based on your preferences (${currentUser.preferredNeighbourhood}).</p>
        <div class="suggestion-cards">
          ${suggestions.map(desk => `
            <div class="suggestion-card" onclick="quickBook('${desk.id}','${today()}')">
              <div class="suggestion-label">Recommended</div>
              <div class="desk-id">${desk.id}</div>
              <div class="desk-neighbourhood ${nbClass(desk.neighbourhood)}" style="margin:4px 0">${desk.neighbourhood}</div>
              <div class="slot-bar" style="margin-top:6px">
                <div class="slot-badge ${desk.amAvailable?'slot-free':'slot-taken'}">AM</div>
                <div class="slot-badge ${desk.pmAvailable?'slot-free':'slot-taken'}">PM</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    ` : myTodayBookings.length > 0 ? `
    <div class="card one-col">
      <div class="card-header"><span class="card-title">Today's Desks</span></div>
      <div class="card-body" style="padding:12px 16px">
        ${myTodayBookings.map(b => renderBookingItem(b, false)).join('')}
      </div>
    </div>
    ` : ''}

    <div class="two-col">
      <div class="card">
        <div class="card-header"><span class="card-title">Your Working Pattern</span></div>
        <div class="card-body" style="padding:12px 16px">${renderWeekPatternMini()}</div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">Team In Today</span>
          <span class="pill pill-blue">${currentUser.team}</span>
        </div>
        <div class="card-body" style="padding:12px 16px">
          ${teamInToday.length === 0
            ? '<p style="color:var(--text-muted);font-size:13px">No team members with bookings today.</p>'
            : teamInToday.slice(0, 4).map(b => `
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
                <div class="user-avatar" style="background:${avatarColor(b.user.fullName)};width:28px;height:28px;font-size:11px;flex-shrink:0">${initials(b.user.fullName)}</div>
                <div>
                  <div style="font-size:13px;font-weight:600">${b.user.fullName}</div>
                  <div style="font-size:12px;color:var(--text-secondary)">${b.desk?.id || '–'} · <span class="slot-badge-inline">${slotShort(b.slot||'full')}</span></div>
                </div>
              </div>`).join('')}
        </div>
      </div>
    </div>

    ${allUpcoming.length > 0 ? `
    <div class="card one-col">
      <div class="card-header">
        <span class="card-title">Upcoming Bookings</span>
        <a href="#" class="btn btn-sm btn-secondary" onclick="navigate('my-bookings');return false">View all</a>
      </div>
      <div class="card-body" style="padding:12px 16px">
        <div class="booking-list">${allUpcoming.slice(0, 3).map(b => renderBookingItem(b, false)).join('')}</div>
      </div>
    </div>` : ''}
  `;

  tryAutoCheckIn();
}

function greetingTime() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

function renderWeekPatternMini() {
  const days = ['monday','tuesday','wednesday','thursday','friday'];
  const labels = ['Mon','Tue','Wed','Thu','Fri'];
  const pattern = currentUser.defaultWorkingPattern || {};
  const anchors = (currentUser.anchorDays || []).map(d => d.toLowerCase());
  return `<div style="display:flex;gap:6px">
    ${days.map((d, i) => {
      const s = pattern[d] || 'remote';
      const a = anchors.includes(d);
      return `<div style="flex:1;text-align:center;padding:8px 4px;border-radius:6px;background:${s==='office'?'#eff6ff':'#f8fafc'};border:1.5px solid ${s==='office'?'#bfdbfe':'#e2e8f0'}">
        <div style="font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase">${labels[i]}</div>
        <div style="font-size:11px;font-weight:700;color:${s==='office'?'#1d4ed8':'#64748b'};margin-top:3px">${a?'Anchor':s==='office'?'Office':'Remote'}</div>
      </div>`;
    }).join('')}
  </div>`;
}

async function manualCheckInAll(ids) {
  for (const id of ids) await checkInBooking(id);
}

function quickBook(deskId, date) {
  showModal(`
    <div class="modal-title">Book ${deskId}</div>
    <div class="modal-desc">How long do you need the desk on <strong>${displayShortDate(date)}</strong>?</div>
    <div class="slot-picker">
      <button class="slot-pick-btn" onclick="doBook('${deskId}','${date}','am')">
        AM Only<br><small>Until 1:00pm</small>
      </button>
      <button class="slot-pick-btn" onclick="doBook('${deskId}','${date}','pm')">
        PM Only<br><small>From 1:00pm</small>
      </button>
      <button class="slot-pick-btn slot-pick-full" onclick="doBook('${deskId}','${date}','full')">
        Full Day<br><small>All day</small>
      </button>
    </div>
    <button class="btn btn-secondary" style="width:100%;margin-top:10px" onclick="hideModal()">Cancel</button>
  `);
}

// ── Book a Desk ────────────────────────────────────────────────────────────

function initBookView() {
  bookWeekStart = weekMonday(today());
  selectedBookDate = today();
  renderBookView();
}

async function renderBookView() {
  const container = document.getElementById('view-book');

  const weekDates = getWeekDates(bookWeekStart);
  const weekLabel = (() => {
    const s = parseDate(weekDates[0]).toLocaleDateString('en-GB', { day:'numeric', month:'short' });
    const e = parseDate(weekDates[4]).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
    return `${s} – ${e}`;
  })();

  const allUpcoming = getBookings({ userId: currentUser.id, upcoming: true });
  const desks = selectedBookDate ? getDesks({ floor: selectedBookFloor, date: selectedBookDate }) : [];

  const userBookingDates = new Set(allUpcoming.map(b => b.date));
  const myBookingsForDate = allUpcoming.filter(b => b.date === selectedBookDate);
  const mySlots = myBookingsForDate.map(b => b.slot || 'full');

  const filteredDesks = selectedNeighbourhood ? desks.filter(d => d.neighbourhood === selectedNeighbourhood) : desks;
  const grouped = {};
  for (const d of filteredDesks) {
    if (!grouped[d.neighbourhood]) grouped[d.neighbourhood] = [];
    grouped[d.neighbourhood].push(d);
  }

  const totalAvailSlots = desks.reduce((n, d) => n + (d.amAvailable?1:0) + (d.pmAvailable?1:0), 0);
  const totalSlots = desks.length * 2;

  const myDeskSummary = myBookingsForDate.map(b => `${b.desk?.id} (${slotShort(b.slot||'full')})`).join(', ');

  const nbOptions = ['Window Bank','Quiet Zone','Core Desk Area','Collaboration Zone'];

  container.innerHTML = `
    <div class="page-header">
      <h1>Book a Desk</h1>
      <p>Find and reserve your workspace</p>
    </div>

    <div class="card one-col">
      <div class="card-body">
        <div class="week-nav">
          <div class="week-nav-title">${weekLabel}</div>
          <div class="week-nav-btns">
            <button class="btn btn-sm btn-secondary btn-icon" id="prev-week-btn">&#8592;</button>
            <button class="btn btn-sm btn-secondary" id="today-btn">Today</button>
            <button class="btn btn-sm btn-secondary btn-icon" id="next-week-btn">&#8594;</button>
          </div>
        </div>
        <div class="week-strip">
          ${weekDates.map(dateStr => {
            const dObj = parseDate(dateStr);
            const dayName = dObj.toLocaleDateString('en-GB', { weekday: 'short' });
            const dayNum = dObj.getDate();
            const status = getWorkingStatus(currentUser, dateStr);
            const anchor = isAnchorDay(currentUser, dateStr);
            const isSelected = dateStr === selectedBookDate;
            const isToday_ = dateStr === today();
            const isPast_ = dateStr < today();
            const hasBooking = userBookingDates.has(dateStr);
            return `<div class="week-day${isSelected?' selected':''}${isToday_?' today':''}${isPast_?' past':''}"
              onclick="selectBookDate('${dateStr}')">
              ${hasBooking ? '<div class="day-booking-dot"></div>' : ''}
              <div class="day-name">${dayName}</div>
              <div class="day-num">${dayNum}</div>
              <div class="day-status ${anchor?'anchor':status}">${anchor?'Anchor':status==='office'?'Office':'Remote'}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    ${selectedBookDate ? `
    <div style="margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
      <div>
        <span style="font-size:15px;font-weight:600">${displayDate(selectedBookDate)}</span>
        ${myDeskSummary ? `<span class="pill pill-blue" style="margin-left:8px;font-size:12px">You: ${myDeskSummary}</span>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div class="floor-tabs">
          <button class="floor-tab${selectedBookFloor==='ground'?' active':''}" onclick="selectFloor('ground')">Ground Floor</button>
          <button class="floor-tab${selectedBookFloor==='first'?' active':''}" onclick="selectFloor('first')">First Floor</button>
        </div>
        <select onchange="selectNeighbourhood(this.value)" style="padding:7px 28px 7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;background:white;appearance:none;-webkit-appearance:none;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:right 10px center;cursor:pointer">
          <option value="">All Neighbourhoods</option>
          ${nbOptions.map(n => `<option value="${n}"${selectedNeighbourhood===n?' selected':''}>${n}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="avail-bar">
      <span class="avail-count-available">${totalAvailSlots}</span> slot${totalAvailSlots !== 1 ? 's' : ''} available
      &nbsp;·&nbsp;
      <span class="avail-count-booked">${totalSlots - totalAvailSlots}</span> booked
      &nbsp;on ${selectedBookFloor === 'ground' ? 'Ground' : 'First'} Floor
    </div>

    ${Object.entries(grouped).map(([nb, nbDesks]) => `
      <div class="section-header">${nb}</div>
      <div class="desk-grid" style="margin-bottom:8px">
        ${nbDesks.map(desk => renderDeskCard(desk, myBookingsForDate, mySlots, selectedBookDate)).join('')}
      </div>
    `).join('')}

    ${Object.keys(grouped).length === 0 ? `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/></svg>
        <h3>No desks found</h3>
        <p>Try a different floor or remove the neighbourhood filter.</p>
      </div>
    ` : ''}
    ` : ''}
  `;

  document.getElementById('prev-week-btn')?.addEventListener('click', () => { bookWeekStart = addDays(bookWeekStart, -7); renderBookView(); });
  document.getElementById('next-week-btn')?.addEventListener('click', () => { bookWeekStart = addDays(bookWeekStart, 7); renderBookView(); });
  document.getElementById('today-btn')?.addEventListener('click', () => { bookWeekStart = weekMonday(today()); selectedBookDate = today(); renderBookView(); });
}

function renderDeskCard(desk, myBookingsForDate, mySlots, date) {
  const myDeskBooking = myBookingsForDate.find(b => b.deskId === desk.id);
  const isMyDesk = !!myDeskBooking;

  const canBookAm = desk.amAvailable && !mySlots.some(s => slotsConflict(s, 'am'));
  const canBookPm = desk.pmAvailable && !mySlots.some(s => slotsConflict(s, 'pm'));
  const canBookFull = desk.amAvailable && desk.pmAvailable && mySlots.length === 0;
  const canBookAnything = canBookAm || canBookPm;
  const isFuture = date >= today();

  const score = scoreDesk(desk, currentUser);
  const isRecommended = score >= 3 && !isMyDesk && canBookAnything;

  let cardClass = 'desk-card';
  if (isMyDesk) cardClass += ' my-desk';
  else if (!desk.amAvailable && !desk.pmAvailable) cardClass += ' booked';
  else cardClass += ' available';
  if (isRecommended) cardClass += ' recommended';

  return `
    <div class="${cardClass}">
      ${isRecommended ? '<div class="desk-recommended-badge">Recommended</div>' : ''}
      <div class="desk-id">${desk.id}</div>
      <div class="desk-neighbourhood ${nbClass(desk.neighbourhood)}">${desk.neighbourhood}</div>
      <div class="desk-features">
        ${desk.features.map(f => `<span class="feature-tag ft-${f}">${featureLabel(f)}</span>`).join('')}
        ${desk.features.length === 0 ? '<span style="font-size:12px;color:var(--text-muted)">Standard desk</span>' : ''}
      </div>
      <div class="slot-bar">
        <span class="slot-badge ${desk.amAvailable ? 'slot-free' : 'slot-taken'}">AM</span>
        <span class="slot-badge ${desk.pmAvailable ? 'slot-free' : 'slot-taken'}">PM</span>
        ${myDeskBooking ? `<span class="slot-badge slot-mine">${slotShort(myDeskBooking.slot||'full')} — You</span>` : ''}
      </div>
      ${isFuture ? `<div class="desk-actions">
        ${canBookFull  ? `<button class="btn btn-primary btn-sm" onclick="confirmBook('${desk.id}','${date}','full')">Full Day</button>` : ''}
        ${canBookAm && !canBookFull ? `<button class="btn btn-primary btn-sm" onclick="confirmBook('${desk.id}','${date}','am')">Book AM</button>` : ''}
        ${canBookPm && !canBookFull ? `<button class="btn btn-secondary btn-sm" onclick="confirmBook('${desk.id}','${date}','pm')">Book PM</button>` : ''}
        ${myDeskBooking ? `<button class="btn btn-sm btn-outline-danger" onclick="cancelBookingById('${myDeskBooking.id}')">Cancel</button>` : ''}
      </div>` : ''}
    </div>
  `;
}

function selectBookDate(dateStr) {
  if (dateStr < today()) return;
  selectedBookDate = dateStr;
  renderBookView();
}

function selectFloor(floor) {
  selectedBookFloor = floor;
  renderBookView();
}

function selectNeighbourhood(value) {
  selectedNeighbourhood = value;
  renderBookView();
}

function confirmBook(deskId, date, slot) {
  showModal(`
    <div class="modal-title">Confirm Booking</div>
    <div class="modal-desc">
      Book desk <strong>${deskId}</strong> &mdash; <strong>${slotLabel(slot)}</strong><br>
      on <strong>${displayDate(date)}</strong>?
      ${slot !== 'full' ? `<br><span style="font-size:12px;color:var(--text-muted)">The other half of the day will stay available for others.</span>` : ''}
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary" onclick="doBook('${deskId}','${date}','${slot}')">Confirm</button>
    </div>
  `);
}

async function doBook(deskId, date, slot) {
  hideModal();
  try {
    createBooking({ userId: currentUser.id, deskId, date, slot });
    toast(`${deskId} booked — ${slotLabel(slot)} on ${displayShortDate(date)}`, 'success');
    renderBookView();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function cancelBookingById(bookingId) {
  try {
    deleteBooking(bookingId);
    toast('Booking cancelled', 'info');
    renderBookView();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── My Bookings ────────────────────────────────────────────────────────────

async function renderMyBookings() {
  const container = document.getElementById('view-my-bookings');
  container.innerHTML = '<div style="color:#94a3b8;padding:20px">Loading...</div>';

  const bookings = getBookings({ userId: currentUser.id, upcoming: true });

  container.innerHTML = `
    <div class="page-header">
      <h1>My Bookings</h1>
      <p>Your upcoming desk reservations</p>
    </div>
    ${bookings.length === 0 ? `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <h3>No upcoming bookings</h3>
        <p>You don't have any desk reservations. Head to Book a Desk to get started.</p>
        <button class="btn btn-primary" onclick="navigate('book')">Book a Desk</button>
      </div>
    ` : `<div class="booking-list">${bookings.map(b => renderBookingItem(b, true)).join('')}</div>`}
  `;
}

function renderBookingItem(booking, showActions) {
  const d = parseDate(booking.date);
  const month = d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
  const day = d.getDate();
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' });
  const floor = booking.desk?.floor === 'ground' ? 'Ground Floor' : 'First Floor';
  const slot = booking.slot || 'full';
  const isToday_ = booking.date === today();

  const checkinHtml = (() => {
    if (!isToday_) return '';
    if (booking.checkedIn) {
      return `<span class="checkin-status checkin-done">Checked in${booking.checkedInAt ? ' ' + formatTime(booking.checkedInAt) : ''}</span>`;
    }
    return `<span class="checkin-status checkin-pending">Not checked in</span>`;
  })();

  return `
    <div class="booking-item">
      <div class="booking-info">
        <div class="booking-date-block">
          <div class="bdate-month">${month}</div>
          <div class="bdate-day">${day}</div>
        </div>
        <div class="booking-details">
          <div class="booking-desk">
            ${booking.desk?.id || '–'}
            <span class="slot-badge slot-${slot === 'full' ? 'full' : slot}" style="margin-left:6px;font-size:11px">${slotShort(slot)}</span>
          </div>
          <div class="booking-meta">${weekday} · ${floor} · ${booking.desk?.neighbourhood || '–'}</div>
          ${booking.desk?.features?.length > 0
            ? `<div class="desk-features" style="margin-top:4px">${booking.desk.features.map(f=>`<span class="feature-tag ft-${f}">${featureLabel(f)}</span>`).join('')}</div>`
            : ''}
          ${checkinHtml ? `<div style="margin-top:6px">${checkinHtml}</div>` : ''}
        </div>
      </div>
      ${showActions ? `
        <div class="booking-actions">
          ${isToday_ && !booking.checkedIn
            ? `<button class="btn btn-sm btn-primary" onclick="checkInBooking('${booking.id}')">Check In</button>`
            : ''}
          <button class="btn btn-sm btn-secondary" style="color:var(--danger);border-color:var(--danger)"
            onclick="promptCancel('${booking.id}','${booking.desk?.id}','${booking.date}')">Cancel</button>
        </div>` : ''}
    </div>
  `;
}

function promptCancel(bookingId, deskId, date) {
  showModal(`
    <div class="modal-title">Cancel Booking</div>
    <div class="modal-desc">
      Cancel your booking for desk <strong>${deskId}</strong> on <strong>${displayDate(date)}</strong>?
      This cannot be undone.
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="hideModal()">Keep it</button>
      <button class="btn btn-danger" onclick="doCancel('${bookingId}','${deskId}')">Cancel booking</button>
    </div>
  `);
}

async function doCancel(bookingId, label) {
  hideModal();
  try {
    deleteBooking(bookingId);
    toast(`Booking cancelled: ${label}`, 'info');
    renderMyBookings();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── Who's In ───────────────────────────────────────────────────────────────

async function renderWhosIn() {
  const container = document.getElementById('view-whos-in');
  if (!whosInDate) whosInDate = today();

  container.innerHTML = `
    <div class="page-header">
      <h1>Who's In</h1>
      <p>See who has a desk booked for any day</p>
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;flex-wrap:wrap">
      <label style="font-size:13px;font-weight:500;color:var(--text-secondary)">Date:</label>
      <input type="date" id="whos-in-date" value="${whosInDate}" onchange="whosInDate=this.value;loadWhosIn()">
    </div>
    <div id="whos-in-content"><div style="color:#94a3b8">Loading...</div></div>
  `;
  loadWhosIn();
}

async function loadWhosIn() {
  const date = whosInDate || today();
  const content = document.getElementById('whos-in-content');
  if (!content) return;
  content.innerHTML = '<div style="color:#94a3b8">Loading...</div>';

  const bookings = getBookings({ date });

  if (bookings.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <h3>Nobody in yet</h3>
        <p>No desk bookings for ${displayDate(date)}.</p>
      </div>`;
    return;
  }

  const grouped = {};
  for (const b of bookings) {
    const nb = b.desk?.neighbourhood || 'Unknown';
    if (!grouped[nb]) grouped[nb] = [];
    grouped[nb].push(b);
  }

  content.innerHTML = `
    <div class="alert alert-info" style="margin-bottom:20px">
      <strong>${bookings.length}</strong> booking${bookings.length !== 1 ? 's' : ''} on ${displayDate(date)}.
    </div>
    ${Object.entries(grouped).map(([nb, bks]) => `
      <div class="section-header">${nb}</div>
      <div class="people-grid">
        ${bks.map(b => `
          <div class="person-card">
            <div class="person-avatar" style="background:${avatarColor(b.user?.fullName||'?')}">${initials(b.user?.fullName||'?')}</div>
            <div class="person-info">
              <div class="person-name">${b.user?.fullName || 'Unknown'}</div>
              <div class="person-sub">${b.user?.role || ''} &middot; ${b.user?.team || ''}</div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
                <span class="pill pill-grey" style="font-size:11px">${b.desk?.id || '–'}</span>
                <span class="slot-badge slot-${b.slot||'full'}">${slotShort(b.slot||'full')}</span>
                ${b.checkedIn ? '<span class="checkin-status checkin-done" style="font-size:10px">In</span>' : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `).join('')}
  `;
}

// ── Init ───────────────────────────────────────────────────────────────────

async function init() {
  await initLogin();
  document.getElementById('login-btn').addEventListener('click', login);
  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) hideModal();
  });
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.view); });
  });
}

document.addEventListener('DOMContentLoaded', init);
