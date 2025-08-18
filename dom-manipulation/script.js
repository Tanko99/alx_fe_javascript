// variable references
const quoteDisplay   = document.getElementById('quoteDisplay');
const newQuoteBtn    = document.getElementById('newQuote');
const categoryFilter = document.getElementById('categoryFilter');

// ---- Local state & storage keys ----
let quotes = [];
const LS_QUOTES_KEY  = 'myQuotes';
const LS_FILTER_KEY  = 'selectedCategory';
function createAddQuoteForm() {
  const formDiv = document.createElement("div");

  // Input for new quote text
  const quoteInput = document.createElement("input");
  quoteInput.id = "newQuoteText";
  quoteInput.type = "text";
  quoteInput.placeholder = "Enter a new quote";

  // Input for quote category
  const categoryInput = document.createElement("input");
  categoryInput.id = "newQuoteCategory";
  categoryInput.type = "text";
  categoryInput.placeholder = "Enter quote category";

  // Button to add quote
  const addButton = document.createElement("button");
  addButton.textContent = "Add Quote";
  addButton.onclick = addQuote; // attach function directly

  // Append inputs and button to formDiv
  formDiv.appendChild(quoteInput);
  formDiv.appendChild(categoryInput);
  formDiv.appendChild(addButton);

  // Append formDiv to the container in HTML
  document.body.appendChild(formDiv);
}

createAddQuoteForm();


// Load existing quotes
try {
  const stored = localStorage.getItem(LS_QUOTES_KEY);
  if (stored) quotes = JSON.parse(stored);
} catch {
  quotes = [];
}

// Save quotes helper
function saveQuotes() {
  localStorage.setItem(LS_QUOTES_KEY, JSON.stringify(quotes));
}

// ---- Tiny notifier (UI element for updates/conflicts) ----
let noticeEl = document.getElementById('syncNotice');
if (!noticeEl) {
  noticeEl = document.createElement('div');
  noticeEl.id = 'syncNotice';
  noticeEl.style.cssText = `
    position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
    background: #222; color: #fff; padding: 10px 16px; border-radius: 8px;
    font-size: 14px; display: none; z-index: 9999; box-shadow: 0 6px 16px rgba(0,0,0,.25);
  `;
  document.body.appendChild(noticeEl);
}
function notify(msg, ms = 2500) {
  noticeEl.textContent = msg;
  noticeEl.style.display = 'block';
  setTimeout(() => { noticeEl.style.display = 'none'; }, ms);
}

// ---- Core UI helpers ----
function showRandomQuote() {
  if (quotes.length === 0) {
    quoteDisplay.innerHTML = `<p>No quotes available, add quotes!</p>`;
    return;
  }
  const i = Math.floor(Math.random() * quotes.length);
  const q = quotes[i];
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
  const saved = localStorage.getItem(LS_FILTER_KEY);
  if (saved && [...categoryFilter.options].some(o => o.value === saved)) {
    categoryFilter.value = saved;
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


if (newQuoteBtn) newQuoteBtn.addEventListener('click', showRandomQuote);

function addQuote() {
  const textEl = document.getElementById('newQuoteText');
  const catEl  = document.getElementById('newQuoteCategory');
  if (!textEl || !catEl) return;

  const text = textEl.value.trim();
  const category = catEl.value.trim();
  if (!text || !category) return;

  const quote = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    category,
    updatedAt: new Date().toISOString(),
    synced: false
  };
  quotes.push(quote);
  saveQuotes();
  textEl.value = '';
  catEl.value = '';
  populateCategories();
  filterQuotes();
  notify('Quote added locally (will sync).');
}

// MOCK SERVER CONFIG 
const API_URL = 'https://jsonplaceholder.typicode.com/posts';

async function fetchQuotesFromServer(limit = 10) {
  const res = await fetch(`${API_URL}?_limit=${limit}`);
  if (!res.ok) throw new Error('Server fetch failed');
  const posts = await res.json();
  // Map posts → quotes
  return posts.map(p => ({
    id: `srv-${p.id}`,
    text: (p.title || '(untitled)').trim(),
    category: (p.body || 'server').trim().slice(0, 30),
    updatedAt: new Date().toISOString(),
    synced: true
  }));
}


async function postQuoteToServer(localQuote) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: localQuote.text,
      body: localQuote.category,
      userId: 1
    })
  });
  const created = await res.json();
  // JSONPlaceholder won’t persist, but returns an id
  return {
    ...localQuote,
    id: created?.id ? `srv-${created.id}` : localQuote.id,
    synced: true,
    updatedAt: new Date().toISOString()
  };
}

// Merge (server wins on id-conflict)
function mergeServerIntoLocal(serverQuotes) {
  const byId = new Map(quotes.map(q => [q.id, q]));
  let conflicts = 0, additions = 0, replacements = 0;

  serverQuotes.forEach(srv => {
    const existing = byId.get(srv.id);
    if (!existing) {
      byId.set(srv.id, srv);
      additions++;
    } else {
      const differs = existing.text !== srv.text || existing.category !== srv.category;
      if (differs) {
        byId.set(srv.id, { ...srv, synced: true });
        conflicts++;
        replacements++;
      } else {
        byId.set(srv.id, { ...existing, synced: true });
      }
    }
  });

  quotes = [...byId.values()];
  saveQuotes();
  return { conflicts, additions, replacements };
}


// Sync function (pull, merge, push)
async function syncQuotes() {
  try {
    // Pull from server
    const serverQuotes = await fetchQuotesFromServer(10);

    // Merge (server wins)
    const { conflicts, additions, replacements } = mergeServerIntoLocal(serverQuotes);

    // Push unsynced locals
    const unsynced = quotes.filter(q => !q.synced);
    for (let i = 0; i < unsynced.length; i++) {
      try {
        const updated = await postQuoteToServer(unsynced[i]);
        const idx = quotes.findIndex(q => q.id === unsynced[i].id);
        if (idx !== -1) quotes[idx] = updated;
      } catch {
        // keep unsynced for next round
      }
    }
    saveQuotes();

    // Update UI
    populateCategories();
    filterQuotes();

    // Notify result (UI element)
    const parts = [];
    if (additions) parts.push(`${additions} new from server`);
    if (replacements) parts.push(`${replacements} replaced by server`);
    if (unsynced.length) parts.push(`${unsynced.length} local synced`);
    notify(parts.length ? `Sync complete: ${parts.join(' • ')}` : 'Sync complete: no changes');
  } catch (e) {
    notify('Sync failed. Check your connection.');
  }
}


//  Periodically check server
const SYNC_INTERVAL_MS = 60_000; // 60s
setInterval(syncQuotes, SYNC_INTERVAL_MS);

//Init on page load 
populateCategories();
filterQuotes();
showRandomQuote();


setTimeout(syncQuotes, 1500);


if (categoryFilter) {
  categoryFilter.addEventListener('change', filterQuotes);
  document.getElementById('syncNow')?.addEventListener('click', syncQuotes);
}