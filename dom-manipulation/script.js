// reference variables
const quoteDisplay = document.getElementById('quoteDisplay');
const newQuoteBtn = document.getElementById('newQuote');

// empty array for quotes and localStorage to store added quotes in the browser
let quotes = [];
const storedQuotes = localStorage.getItem('myQuotes');
if (storedQuotes) {
    quotes = JSON.parse(storedQuotes);
}

// save quotes function
function saveQuotes() {
    localStorage.setItem('myQuotes', JSON.stringify(quotes));
}

// function to show random quote
function showRandomQuote() {
    if (quotes.length === 0) {
        quoteDisplay.innerHTML = `<p>No quotes available, add quotes!</p>`;
        return;
    }
    const randomIndex = Math.floor(Math.random() * quotes.length);
    const quote = quotes[randomIndex];
    quoteDisplay.innerHTML = `<p>"${quote.text}" - <em>${quote.category}</em></p>`;
}

// function to dynamically create the form
function createAddQuoteForm() {
    const formDiv = document.createElement('div');
    formDiv.id = "quoteForm";

    // create input for quote
    const quoteInput = document.createElement('input');
    quoteInput.type = "text";
    quoteInput.id = "newQuoteText";
    quoteInput.placeholder = "Enter a new quote!";

    // create input for category
    const categoryInput = document.createElement('input');
    categoryInput.type = "text";
    categoryInput.id = "newQuoteCategory";
    categoryInput.placeholder = "Enter category!";

    // create button
    const addBtn = document.createElement('button');
    addBtn.textContent = "Add Quote";
    addBtn.setAttribute("onclick", "addQuote()");

    // append elements
    formDiv.appendChild(quoteInput);
    formDiv.appendChild(categoryInput);
    formDiv.appendChild(addBtn);

    document.body.appendChild(formDiv);
}

createAddQuoteForm();

// function to add quote
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

        // clear inputs
        document.getElementById('newQuoteText').value = "";
        document.getElementById('newQuoteCategory').value = "";

        // show the new quote immediately
        showRandomQuote();
    }
}

// event listener for random quote button
newQuoteBtn.addEventListener('click', showRandomQuote);

// function to export to json
function exportQuotesToJson() {
    if (quotes.length === 0) {
        alert('No quotes to export yet!');
        return;
    }

    const jsonData = JSON.stringify(quotes, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.href = url;
    a.download = "quotes.json";
    a.click();

    URL.revokeObjectURL(url);
}

// creating an export button element
function createExportBtn() {
    const exportBtn = document.createElement('button');
    exportBtn.id = "export-btn";
    exportBtn.textContent = "Export Quotes";
    document.body.appendChild(exportBtn);

    // ✅ attach listener here after creating it
    exportBtn.addEventListener('click', exportQuotesToJson);
}

createExportBtn();

// input element function
function createInputElement() {
    const inputElement = document.createElement("input");
    inputElement.id = "importFile";
    inputElement.type = "file";
    inputElement.setAttribute('accept', '.json');
    inputElement.setAttribute('onchange', 'importFromJsonFile(event)');
    document.body.appendChild(inputElement);
}

createInputElement();

// create a function to import file from json
function importFromJsonFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = function (event) {
        const importedQuotes = JSON.parse(event.target.result);
        quotes.push(...importedQuotes);
        saveQuotes();
        alert('Quotes imported successfully!');
    };
    fileReader.readAsText(file);
}
