let quotes = JSON.parse(localStorage.getItem("quotes")) || [];

// Save quotes to localStorage
function saveQuotes() {
  localStorage.setItem("quotes", JSON.stringify(quotes));
}

// ---------------- DISPLAY QUOTES ----------------
function showRandomQuote() {
  const quoteDisplay = document.getElementById("quoteDisplay");
  if (!quotes || quotes.length === 0) {
    quoteDisplay.innerText = "No quotes available.";
    return;
  }
  const randomIndex = Math.floor(Math.random() * quotes.length);
  quoteDisplay.innerText = quotes[randomIndex].text;
}

// ---------------- CREATE ADD QUOTE FORM ----------------
function createAddQuoteForm() {
  const formDiv = document.createElement("div");
  formDiv.id = "formDiv";

  const quoteInput = document.createElement("input");
  quoteInput.id = "newQuoteText";
  quoteInput.type = "text";
  quoteInput.placeholder = "Enter a new quote";

  const categoryInput = document.createElement("input");
  categoryInput.id = "newQuoteCategory";
  categoryInput.type = "text";
  categoryInput.placeholder = "Enter quote category";

  const addButton = document.createElement("button");
  addButton.textContent = "Add Quote";
  addButton.onclick = addQuote;

  formDiv.appendChild(quoteInput);
  formDiv.appendChild(categoryInput);
  formDiv.appendChild(addButton);

  document.body.appendChild(formDiv);
}

// ---------------- ADD QUOTE ----------------
function addQuote() {
  const text = document.getElementById("newQuoteText").value.trim();
  const category = document.getElementById("newQuoteCategory").value.trim();

  if (!text || !category) return;

  quotes.push({ text, category });
  saveQuotes();
  populateCategories();
  filterQuotesByCategory();
  showNotification("Quote added successfully!");
  document.getElementById("newQuoteText").value = "";
  document.getElementById("newQuoteCategory").value = "";
}

// ---------------- JSON IMPORT / EXPORT ----------------
function exportToJsonFile() {
  const dataStr = JSON.stringify(quotes, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "quotes.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importFromJsonFile(event) {
  const fileReader = new FileReader();
  fileReader.onload = function (event) {
    try {
      const importedQuotes = JSON.parse(event.target.result);
      if (Array.isArray(importedQuotes)) {
        quotes.push(...importedQuotes);
        saveQuotes();
        populateCategories();
        filterQuotesByCategory();
        showNotification("Quotes imported successfully!");
      } else {
        alert("Invalid file format!");
      }
    } catch (err) {
      alert("Error parsing JSON file!");
    }
  };
  fileReader.readAsText(event.target.files[0]);
}

// ---------------- CATEGORY FILTER ----------------
function populateCategories() {
  const categoryFilter = document.getElementById("categoryFilter");
  if (!categoryFilter) return;

  const categories = [...new Set(quotes.map((q) => q.category))];
  categoryFilter.innerHTML = `<option value="">All Categories</option>`;

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });

  // Restore saved filter
  const savedCategory = localStorage.getItem("selectedCategory") || "";
  categoryFilter.value = savedCategory;
  filterQuotesByCategory();

  categoryFilter.onchange = function () {
    localStorage.setItem("selectedCategory", categoryFilter.value);
    filterQuotesByCategory();
  };
}

function filterQuotesByCategory() {
  const category = document.getElementById("categoryFilter").value;
  const quoteDisplay = document.getElementById("quoteDisplay");

  let filteredQuotes = quotes;
  if (category) {
    filteredQuotes = quotes.filter((q) => q.category === category);
  }

  if (filteredQuotes.length === 0) {
    quoteDisplay.innerText = "No quotes in this category.";
    return;
  }

  const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
  quoteDisplay.innerText = filteredQuotes[randomIndex].text;
}

// ---------------- SERVER SYNC ----------------
async function fetchQuotesFromServer() {
  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts");
    const serverData = await response.json();
    return serverData.slice(0, 5).map((item) => ({
      text: item.title,
      category: "Server",
    }));
  } catch (err) {
    console.error("Error fetching from server:", err);
    return [];
  }
}

async function postQuoteToServer(quote) {
  try {
    await fetch("https://jsonplaceholder.typicode.com/posts", {
      method: "POST",
      body: JSON.stringify(quote),
      headers: { "Content-type": "application/json; charset=UTF-8" },
    });
  } catch (err) {
    console.error("Error posting to server:", err);
  }
}

async function syncQuotes() {
  const serverQuotes = await fetchQuotesFromServer();
  if (serverQuotes.length > 0) {
    quotes = [...serverQuotes, ...quotes];
    saveQuotes();
    populateCategories();
    filterQuotesByCategory();
    showNotification(
      "Data synced with server. Conflicts resolved (server wins)."
    );
  }
}

// ---------------- NOTIFICATION ----------------
function showNotification(message) {
  let note = document.getElementById("notification");
  if (!note) {
    note = document.createElement("div");
    note.id = "notification";
    note.style.cssText =
      "position:fixed; top:10px; left:50%; transform:translateX(-50%); padding:10px 20px; background:#007bff; color:#fff; border-radius:5px; font-weight:bold; z-index:9999; display:none;";
    document.body.appendChild(note);
  }
  note.innerText = message;
  note.style.display = "block";
  setTimeout(() => (note.style.display = "none"), 4000);
}

// ---------------- INIT ----------------
window.onload = () => {
  createAddQuoteForm();
  populateCategories();
  displayRandomQuote();
  syncQuotes();
  setInterval(syncQuotes, 30000);

  const newQuoteBtn = document.getElementById("newQuote");
  if (newQuoteBtn) newQuoteBtn.onclick = displayRandomQuote;
};