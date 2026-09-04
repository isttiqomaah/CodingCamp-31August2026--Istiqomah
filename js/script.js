/* ─────────────────────────────────────────────────────────────
   LIFE DASHBOARD — script.js
   Vanilla JS only · No frameworks · LocalStorage persistence
───────────────────────────────────────────────────────────── */

'use strict';

/* ─────────────────────────────────────────────────────────────
   STORAGE HELPERS
───────────────────────────────────────────────────────────── */
const Storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.warn('LocalStorage write failed for key:', key);
    }
  },
};

/* ─────────────────────────────────────────────────────────────
   1. GREETING & DATETIME
───────────────────────────────────────────────────────────── */
const greetingEl = document.getElementById('greeting');
const datetimeEl = document.getElementById('datetime');

function getGreeting(name) {
  const hour = new Date().getHours();
  let phrase;
  if (hour >= 5 && hour < 12)       phrase = 'Good Morning';
  else if (hour >= 12 && hour < 18) phrase = 'Good Afternoon';
  else                               phrase = 'Good Evening';
  return name ? `${phrase}, ${name}!` : `${phrase}!`;
}

function formatDatetime() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  return `${timeStr} · ${dateStr}`;
}

function updateGreeting() {
  const name = Storage.get('userName', '');
  greetingEl.textContent = getGreeting(name);
  datetimeEl.textContent = formatDatetime();
}

// Refresh every second so the clock stays live
updateGreeting();
setInterval(updateGreeting, 1000);

/* ─────────────────────────────────────────────────────────────
   2. CUSTOM NAME MODAL
───────────────────────────────────────────────────────────── */
const nameModal   = document.getElementById('nameModal');
const nameInput   = document.getElementById('nameInput');
const nameBtn     = document.getElementById('nameBtn');
const nameSaveBtn = document.getElementById('nameSave');
const nameCancelBtn = document.getElementById('nameCancel');

function openNameModal() {
  nameInput.value = Storage.get('userName', '');
  nameModal.classList.add('visible');
  nameInput.focus();
}

function closeNameModal() {
  nameModal.classList.remove('visible');
}

nameBtn.addEventListener('click', openNameModal);

nameSaveBtn.addEventListener('click', () => {
  const val = nameInput.value.trim();
  Storage.set('userName', val);
  updateGreeting();
  closeNameModal();
});

nameCancelBtn.addEventListener('click', closeNameModal);

// Close on overlay click
nameModal.addEventListener('click', (e) => {
  if (e.target === nameModal) closeNameModal();
});

// Save on Enter key
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') nameSaveBtn.click();
  if (e.key === 'Escape') closeNameModal();
});

// Open name modal on first visit (no name stored)
if (!Storage.get('userName', '')) {
  setTimeout(openNameModal, 600);
}

/* ─────────────────────────────────────────────────────────────
   3. LIGHT / DARK MODE
───────────────────────────────────────────────────────────── */
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

function applyTheme(theme) {
  html.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  themeToggle.setAttribute('title', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}

// Load saved theme, or fall back to OS preference
const savedTheme = Storage.get('theme', null);
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
applyTheme(savedTheme ?? (prefersDark ? 'dark' : 'light'));

themeToggle.addEventListener('click', () => {
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  Storage.set('theme', next);
  applyTheme(next);
});

/* ─────────────────────────────────────────────────────────────
   4. FOCUS TIMER
───────────────────────────────────────────────────────────── */
const TIMER_DURATION = 25 * 60; // seconds

const timerDisplay = document.getElementById('timerDisplay');
const timerStart   = document.getElementById('timerStart');
const timerStop    = document.getElementById('timerStop');
const timerReset   = document.getElementById('timerReset');

let timerSeconds   = TIMER_DURATION;
let timerInterval  = null;
let timerRunning   = false;

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function renderTimer() {
  timerDisplay.textContent = formatTime(timerSeconds);
  // Update browser tab title while running
  if (timerRunning) {
    document.title = `⏱ ${formatTime(timerSeconds)} — Life Dashboard`;
  }
}

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  timerStart.disabled = true;

  timerInterval = setInterval(() => {
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      timerStart.disabled = false;
      timerDisplay.textContent = '00:00';
      document.title = 'Life Dashboard';
      // Browser notification if permission granted
      notifyTimerDone();
      return;
    }
    timerSeconds--;
    renderTimer();
  }, 1000);
}

function stopTimer() {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerRunning = false;
  timerStart.disabled = false;
  document.title = 'Life Dashboard';
}

function resetTimer() {
  stopTimer();
  timerSeconds = TIMER_DURATION;
  renderTimer();
}

function notifyTimerDone() {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('🍅 Focus session complete!', {
      body: 'Time to take a break.',
      icon: '',
    });
  }
}

// Request notification permission passively
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

timerStart.addEventListener('click', startTimer);
timerStop.addEventListener('click', stopTimer);
timerReset.addEventListener('click', resetTimer);

renderTimer();

/* ─────────────────────────────────────────────────────────────
   5. TO-DO LIST
───────────────────────────────────────────────────────────── */
const todoForm  = document.getElementById('todoForm');
const todoInput = document.getElementById('todoInput');
const todoList  = document.getElementById('todoList');
const todoError = document.getElementById('todoError');
const todoEmpty = document.getElementById('todoEmpty');

/** @type {{ id: string, text: string, completed: boolean }[]} */
let tasks = Storage.get('tasks', []);

// ── helpers ──────────────────────────────────────────────────

function saveTasks() {
  Storage.set('tasks', tasks);
}

function showTodoError(msg) {
  todoError.textContent = msg;
  setTimeout(() => { todoError.textContent = ''; }, 3000);
}

function isDuplicate(text) {
  return tasks.some(
    (t) => t.text.toLowerCase() === text.toLowerCase()
  );
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── render ───────────────────────────────────────────────────

function renderTasks() {
  todoList.innerHTML = '';
  todoEmpty.style.display = tasks.length === 0 ? 'block' : 'none';

  tasks.forEach((task) => {
    const li = document.createElement('li');
    li.className = `todo-item${task.completed ? ' completed' : ''}`;
    li.dataset.id = task.id;

    li.innerHTML = `
      <input
        type="checkbox"
        class="todo-checkbox"
        aria-label="Mark '${escapeHtml(task.text)}' as complete"
        ${task.completed ? 'checked' : ''}
      />
      <span class="todo-text">${escapeHtml(task.text)}</span>
      <div class="todo-actions">
        <button class="btn btn--icon" data-action="edit"  title="Edit task"   aria-label="Edit '${escapeHtml(task.text)}'">✏️</button>
        <button class="btn btn--danger" data-action="delete" title="Delete task" aria-label="Delete '${escapeHtml(task.text)}'">🗑️</button>
      </div>
    `;

    todoList.appendChild(li);
  });
}

// ── add task ─────────────────────────────────────────────────

todoForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = todoInput.value.trim();

  if (!text) {
    showTodoError('Please enter a task.');
    todoInput.focus();
    return;
  }

  if (isDuplicate(text)) {
    showTodoError(`"${text}" is already in your list.`);
    todoInput.select();
    return;
  }

  tasks.push({ id: generateId(), text, completed: false });
  saveTasks();
  renderTasks();
  todoInput.value = '';
  todoInput.focus();
});

// ── delegate: complete / edit / delete ───────────────────────

todoList.addEventListener('click', (e) => {
  const li = e.target.closest('.todo-item');
  if (!li) return;
  const id = li.dataset.id;

  // Toggle complete via checkbox
  if (e.target.classList.contains('todo-checkbox')) {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      task.completed = e.target.checked;
      saveTasks();
      li.classList.toggle('completed', task.completed);
    }
    return;
  }

  const action = e.target.closest('[data-action]')?.dataset.action;
  if (!action) return;

  if (action === 'delete') {
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();
    // Animate out
    li.style.transition = 'opacity 0.2s, transform 0.2s';
    li.style.opacity = '0';
    li.style.transform = 'translateX(12px)';
    setTimeout(() => renderTasks(), 200);
    return;
  }

  if (action === 'edit') {
    startEditTask(li, id);
  }
});

// ── inline edit ──────────────────────────────────────────────

function startEditTask(li, id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  const textSpan   = li.querySelector('.todo-text');
  const editBtn    = li.querySelector('[data-action="edit"]');
  const deleteBtn  = li.querySelector('[data-action="delete"]');

  // Replace span with input
  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.className = 'todo-edit-input';
  editInput.value = task.text;
  editInput.maxLength = 120;
  editInput.setAttribute('aria-label', 'Edit task text');

  li.replaceChild(editInput, textSpan);
  editBtn.textContent = '💾';
  editBtn.dataset.action = 'save';
  editBtn.title = 'Save changes';
  deleteBtn.style.display = 'none';

  editInput.focus();
  editInput.select();

  function saveEdit() {
    const newText = editInput.value.trim();

    if (!newText) {
      editInput.focus();
      return;
    }

    // Allow saving if text is unchanged (no duplicate check needed)
    if (newText.toLowerCase() !== task.text.toLowerCase() && isDuplicate(newText)) {
      editInput.style.borderColor = 'var(--danger)';
      editInput.setAttribute('title', 'A task with this name already exists');
      // Brief shake animation via inline style
      editInput.animate(
        [{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' },
         { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }],
        { duration: 300, easing: 'ease-out' }
      );
      return;
    }

    task.text = newText;
    saveTasks();
    renderTasks();
  }

  // Save on save-button click (delegated via li click)
  li.addEventListener('click', function onSaveClick(e) {
    if (e.target.closest('[data-action="save"]')) {
      li.removeEventListener('click', onSaveClick);
      saveEdit();
    }
  });

  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  saveEdit();
    if (e.key === 'Escape') renderTasks(); // cancel
  });

  editInput.addEventListener('blur', () => {
    // Small delay so a click on Save button fires first
    setTimeout(() => {
      if (document.activeElement !== editInput) renderTasks();
    }, 150);
  });
}

renderTasks();

/* ─────────────────────────────────────────────────────────────
   6. QUICK LINKS
───────────────────────────────────────────────────────────── */
const linksForm  = document.getElementById('linksForm');
const linkNameEl = document.getElementById('linkName');
const linkUrlEl  = document.getElementById('linkUrl');
const linksGrid  = document.getElementById('linksGrid');
const linksError = document.getElementById('linksError');
const linksEmpty = document.getElementById('linksEmpty');

/** @type {{ id: string, name: string, url: string }[]} */
let links = Storage.get('links', []);

function saveLinks() {
  Storage.set('links', links);
}

function showLinksError(msg) {
  linksError.textContent = msg;
  setTimeout(() => { linksError.textContent = ''; }, 3000);
}

function normalizeUrl(url) {
  url = url.trim();
  if (url && !/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  return url;
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function renderLinks() {
  linksGrid.innerHTML = '';
  linksEmpty.style.display = links.length === 0 ? 'block' : 'none';

  links.forEach((link) => {
    const chip = document.createElement('div');
    chip.className = 'link-chip';
    chip.dataset.id = link.id;

    // Favicon
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(link.url)}&sz=16`;

    chip.innerHTML = `
      <img src="${faviconUrl}" alt="" width="16" height="16" aria-hidden="true"
           onerror="this.style.display='none'" />
      <a href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer"
         style="color:inherit;text-decoration:none;">${escapeHtml(link.name)}</a>
      <button class="link-chip__remove" data-id="${escapeAttr(link.id)}"
              title="Remove link" aria-label="Remove ${escapeHtml(link.name)}">✕</button>
    `;

    linksGrid.appendChild(chip);
  });
}

linksForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = linkNameEl.value.trim();
  const url  = normalizeUrl(linkUrlEl.value);

  if (!name) {
    showLinksError('Please enter a label for the link.');
    linkNameEl.focus();
    return;
  }

  if (!url || !isValidUrl(url)) {
    showLinksError('Please enter a valid URL.');
    linkUrlEl.focus();
    return;
  }

  links.push({ id: generateId(), name, url });
  saveLinks();
  renderLinks();
  linkNameEl.value = '';
  linkUrlEl.value  = '';
  linkNameEl.focus();
});

linksGrid.addEventListener('click', (e) => {
  const removeBtn = e.target.closest('.link-chip__remove');
  if (!removeBtn) return;
  const id = removeBtn.dataset.id;
  links = links.filter((l) => l.id !== id);
  saveLinks();
  renderLinks();
});

renderLinks();

/* ─────────────────────────────────────────────────────────────
   UTILITIES
───────────────────────────────────────────────────────────── */

/** Escape text for safe innerHTML insertion */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escape text for safe HTML attribute values */
function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}
