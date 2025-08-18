
// ---------- DOM refs (make sure these exist in your HTML) ----------
const quoteDisplay   = document.getElementById('quoteDisplay');
const newQuoteBtn    = document.getElementById('newQuote');
const exportBtn      = document.getElementById('exportBtn');
const importFile     = document.getElementById('importFile');
const categoryFilter = document.getElementById('categoryFilter');

// Optional: Manual sync button (add <button id="syncNow">Sync Now</button> in HTML if you want)
const syncNowBtn     = document.getElementById('syncNow');

// ---------- Local state ----------
let quotes = [];
const LS_QUOTES_KEY = 'myQuotes';
const LS_FILTER_KEY = 'selectedCategory';

// Load from localStorage
const stored = localStorage.getItem(LS_QUOTES_KEY);
if (stored) {
  try { quotes = JSON.parse(stored); } catch { quotes = []; }
}

// Utility to save
function saveQuotes() {
  localStorage.setItem(LS_QUOTES_KEY, JSON.stringify(quotes));
}

// ---------- Notifications ----------
let noticeEl = document.getElementById('syncNotice');
if (!noticeEl) {
  noticeEl = document.createElement('div');
  noticeEl.id = 'syncNotice';
  noticeEl.style.cssText = `
    position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
    background: #222; color: #fff; padding: 10px 16px; border-radius: 8px;
    font-size: 14px; display: none; z-index: 9999; box-shadow: 0 6px 16px rgba(0,0,0,.25);
  `;
  document.body.appendChild(noticeEl);
}
function notify(msg, timeout = 2500) {
  noticeEl.textContent = msg;
  noticeEl.style.display = 'block';
  setTimeout(() => { noticeEl.style.display = 'none'; }, timeout);
}

// ---------- Basic UI: show random, categories, filter ----------
function showRandomQuote() {
  if (quotes.length === 0) {
    quoteDisplay.innerHTML = `<p>No quotes available, add quotes!</p>`;
    return;
  }
  const randomIndex = Math.floor(Math.random() * quotes.length);
  const q = quotes[randomIndex];
  quoteDisplay.innerHTML = `<p>"${q.text}" - <em>${q.category}</em></p>`;
}

function populateCategories() {
  if (!categoryFilter) return;
  categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
  const unique = [...new Set(quotes.map(q => q.category))];
  unique.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });
  const savedCategory = localStorage.getItem(LS_FILTER_KEY);
  if (savedCategory && [...categoryFilter.options].some(o => o.value === savedCategory)) {
    categoryFilter.value = savedCategory;
  }
}

function filterQuotes() {
  if (!categoryFilter) return;
  const selected = categoryFilter.value;
  localStorage.setItem(LS_FILTER_KEY, selected);
  const list = (selected === 'all')
    ? quotes
    : quotes.filter(q => q.category === selected);

  quoteDisplay.innerHTML = '';
  if (list.length === 0) {
    quoteDisplay.innerHTML = `<p>No quotes in this category yet.</p>`;
    return;
  }
  list.forEach(q => {
    const p = document.createElement('p');
    p.innerHTML = `"${q.text}" - <em>${q.category}</em>`;
    quoteDisplay.appendChild(p);
  });
}

//add quote function

function addQuote() {
  const textEl = document.getElementById('newQuoteText');
  const catEl  = document.getElementById('newQuoteCategory');
  if (!textEl || !catEl) return;

  const text = textEl.value.trim();
  const category = catEl.value.trim();
  if (!text || !category) return;

  // Create a local quote with a local id; mark unsynced
  const quote = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    category,
    updatedAt: new Date().toISOString(),
    synced: false
  };
  quotes.push(quote);
  saveQuotes();

  // Clear + update UI
  textEl.value = '';
  catEl.value = '';
  populateCategories();
  filterQuotes();
  notify('Quote added locally. Will sync with server soon.');
}

// Wire random button (if present)
if (newQuoteBtn) {
  newQuoteBtn.addEventListener('click', showRandomQuote);
}


if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    if (quotes.length === 0) { notify('No quotes to export.'); return; }
    const data = JSON.stringify(quotes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'quotes.json';
    a.click();
    URL.revokeObjectURL(url);
  });
}
if (importFile) {
  importFile.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!Array.isArray(imported)) throw new Error('Invalid JSON format');
        // Normalize imported items
        imported.forEach(item => {
          quotes.push({
            id: item.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            text: item.text ?? String(item.title ?? ''),
            category: item.category ?? 'general',
            updatedAt: item.updatedAt ?? new Date().toISOString(),
            synced: false
          });
        });
        saveQuotes();
        populateCategories();
        filterQuotes();
        notify('Quotes imported and saved locally.');
      } catch {
        notify('Import failed: invalid JSON.');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be chosen again later
    e.target.value = '';
  });
}

// ---------- Server Sync (JSONPlaceholder simulation) ----------
const API_URL = 'https://jsonplaceholder.typicode.com/posts';
// NOTE: JSONPlaceholder doesn’t persist writes across requests, but it’s fine for simulation.

// Map server post → our quote shape
function mapPostToQuote(post) {
  return {
    id: `srv-${post.id}`,
    text: post.title?.trim() || '(untitled)',
    category: (post.body?.trim() || 'server').slice(0, 30), // keep it short-ish
    updatedAt: new Date().toISOString(), // JSONPlaceholder has no timestamp
    synced: true
  };
}

async function fetchServerQuotes(limit = 10) {
  const res = await fetch(`${API_URL}?_limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch server data');
  const posts = await res.json();
  return posts.map(mapPostToQuote);
}

// Push one local quote to server (simulated)
async function postLocalQuote(localQuote) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: localQuote.text,
      body: localQuote.category,
      userId: 1
    })
  });
  // JSONPlaceholder returns {id: ...}, but won’t actually persist.
  const created = await res.json();
  // Map the returned id back; mark as synced
  return {
    ...localQuote,
    id: created?.id ? `srv-${created.id}` : localQuote.id,
    synced: true,
    updatedAt: new Date().toISOString()
  };
}

// Merge strategy (server wins on conflict by id)
function mergeServerIntoLocal(serverQuotes) {
  const localById = new Map(quotes.map(q => [q.id, q]));
  let conflicts = 0, additions = 0, replacements = 0;

  serverQuotes.forEach(srv => {
    const existing = localById.get(srv.id);
    if (!existing) {
      // add new from server
      localById.set(srv.id, srv);
      additions++;
    } else {
      // check conflict: text or category differ
      const differs = existing.text !== srv.text || existing.category !== srv.category;
      if (differs) {
        // server wins
        localById.set(srv.id, { ...srv, synced: true });
        conflicts++;
        replacements++;
      } else {
        // keep local, but mark synced
        localById.set(srv.id, { ...existing, synced: true });
      }
    }
  });

  // Keep local-only quotes 
  quotes = [...localById.values()];
  saveQuotes();

  return { conflicts, additions, replacements };
}

// Sync function: pulls from server + pushes unsynced locals
async function syncWithServer() {
  try {
    // 1) Pull server data
    const serverQuotes = await fetchServerQuotes(10);

    // 2) Merge server into local (server wins if conflict by id)
    const { conflicts, additions, replacements } = mergeServerIntoLocal(serverQuotes);

    // 3) Push unsynced local quotes to server (simulate creating them)
    const unsynced = quotes.filter(q => !q.synced);
    for (let i = 0; i < unsynced.length; i++) {
      try {
        const updated = await postLocalQuote(unsynced[i]);
        // Replace the local item by id
        const idx = quotes.findIndex(q => q.id === unsynced[i].id);
        if (idx !== -1) quotes[idx] = updated;
      } catch {
        // If posting fails, keep it unsynced for next round
      }
    }
    saveQuotes();

    // 4) Update UI
    populateCategories();
    filterQuotes();

    // 5) Notify user
    if (conflicts || additions || replacements || unsynced.length) {
      const parts = [];
      if (additions) parts.push(`${additions} new from server`);
      if (replacements) parts.push(`${replacements} replaced by server`);
      if (unsynced.length) parts.push(`${unsynced.length} local synced`);
      notify(`Sync complete: ${parts.join(' • ')}`);
    } else {
      notify('Sync complete: no changes');
    }
  } catch (err) {
    notify('Sync failed. Check your connection and try again.');
  }
}

//  Page init 
populateCategories();
filterQuotes();
showRandomQuote();

// Auto-sync every 60s
const SYNC_INTERVAL_MS = 60_000;
setInterval(syncWithServer, SYNC_INTERVAL_MS);

// Manual sync button (if present)
if (syncNowBtn) {
  syncNowBtn.addEventListener('click', syncWithServer);
}

// Optional: initial sync shortly after load
setTimeout(syncWithServer, 1500);
