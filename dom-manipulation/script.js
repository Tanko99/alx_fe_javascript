// reference variables
const quoteInput = document.getElementById('newQuoteText');
const categoryInput = document.getElementById('newQuoteCategory');
const quoteDisplay = document.getElementById('quoteDisplay');
const newQuoteBtn = document.getElementById('newQuote');

// empty array for quotes
let quotes = [];

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

        // clear inputs
        document.getElementById('newQuoteText').value = "";
        document.getElementById('newQuoteCategory').value = "";

        // show the new quote immediately
        showRandomQuote();
    }
}

// event listener for random quote button
newQuoteBtn.addEventListener('click', showRandomQuote);