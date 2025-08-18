// reference variables
const quoteInput = document.getElementById('newQuoteText');
const categoryInput = document.getElementById('newQuoteCategory');
const quoteDisplay = document.getElementById('quoteDisplay');
const newQuoteBtn = document.getElementById('newQuote');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const categoryFilter = document.getElementById('categoryFilter');

// empty array for quotes and a localstorage to store added quotes in the browser
let quotes = [];
const storedQuotes = localStorage.getItem('myQuotes');
if (storedQuotes) {
    quotes = JSON.parse(storedQuotes);
}

// save quotes function
function saveQuotes() {
    localStorage.setItem('myQuotes', JSON.stringify(quotes));
}

// show random quote
function showRandomQuote() {
    if (quotes.length === 0) {
        quoteDisplay.innerHTML = `<p>No quotes available, add quotes!</p>`;
        return;
    }
    const randomIndex = Math.floor(Math.random() * quotes.length);
    const quote = quotes[randomIndex];
    quoteDisplay.innerHTML = `<p>"${quote.text}" - <em>${quote.category}</em></p>`;
}

// dynamically create the form
function createAddQuoteForm() {
    const formDiv = document.createElement('div');
    formDiv.id = "quoteForm";

    const quoteInput = document.createElement('input');
    quoteInput.type = "text";
    quoteInput.id = "newQuoteText";
    quoteInput.placeholder = "Enter a new quote!";

    const categoryInput = document.createElement('input');
    categoryInput.type = "text";
    categoryInput.id = "newQuoteCategory";
    categoryInput.placeholder = "Enter category!";

    const addBtn = document.createElement('button');
    addBtn.textContent = "Add Quote";
    addBtn.setAttribute("onclick", "addQuote()");

    formDiv.appendChild(quoteInput);
    formDiv.appendChild(categoryInput);
    formDiv.appendChild(addBtn);

    document.body.appendChild(formDiv);
}

createAddQuoteForm();

// add quote
function addQuote() {
    const quoteText = document.getElementById('newQuoteText').value.trim();
    const quoteCategory = document.getElementById('newQuoteCategory').value.trim();

    if (quoteText && quoteCategory) {
        const objQuote = {
            text: quoteText,
            category: quoteCategory
        };
        quotes.push(objQuote);
        saveQuotes();
        document.getElementById('newQuoteText').value = "";
        document.getElementById('newQuoteCategory').value = "";
        showRandomQuote();
        populateCategories(); // update dropdown
        filterQuotes();      // update displayed quotes if category matches
    }
}

// event listener for random quote button
newQuoteBtn.addEventListener('click', showRandomQuote);

// export quotes
function exportToJsonFile() {
    if (quotes.length === 0) {
        alert('No quotes to export yet.');
        return;
    }
    const jsonData = JSON.stringify(quotes, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "quotes.json";
    a.click();
    URL.revokeObjectURL(url);
}

// bind export button
exportBtn.addEventListener('click', exportToJsonFile);

// import quotes
function importFromJsonFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = function (event) {
        const importedQuotes = JSON.parse(event.target.result);
        quotes.push(...importedQuotes);
        saveQuotes();
        alert('Quotes imported successfully!');
        populateCategories();
        filterQuotes();
    };
    fileReader.readAsText(file);
}

// populate category dropdown
function populateCategories() {
    categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
    const categories = quotes.map(q => q.category);
    const uniqueCategories = [...new Set(categories)];

    uniqueCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categoryFilter.appendChild(option);
    });

    const savedCategory = localStorage.getItem('selectedCategory');
    if (savedCategory) {
        categoryFilter.value = savedCategory;
    }
}

// filter quotes
function filterQuotes() {
    const selectedCategory = categoryFilter.value;
    localStorage.setItem('selectedCategory', selectedCategory);

    let filteredQuotes;
    if (selectedCategory === 'all') {
        filteredQuotes = quotes;
    } else {
        filteredQuotes = quotes.filter(q => q.category === selectedCategory);
    }

    quoteDisplay.innerHTML = "";
    filteredQuotes.forEach(quote => {
        const p = document.createElement('p');
        p.textContent = `"${quote.text}" - <em>${quote.category}</em>`;
        quoteDisplay.appendChild(p);
    });
}

// run on page load
populateCategories();
filterQuotes();

// event listener for category filter
categoryFilter.addEventListener('change', filterQuotes);
