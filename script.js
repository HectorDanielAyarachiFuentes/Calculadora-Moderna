// =================================================================================
// DOM Elements
// =================================================================================
const display = document.getElementById('display');
const keypad = document.getElementById('keypad');
const historyList = document.getElementById('historyList');
const historyControls = document.getElementById('history-controls');
const selectTrack = document.getElementById('selectTrack');
const reproductor = document.getElementById('reproductor');
const themeToggleButton = document.getElementById('theme-toggle');
const tabButtons = document.querySelectorAll('.tab-button');

// =================================================================================
// Calculator State
// =================================================================================
let history = [];
let currentIndex = -1;

// =================================================================================
// Helper Functions
// =================================================================================
function isOperator(char) {
    return ['+', '-', '*', '/'].includes(char);
}

// =================================================================================
// Calculator Core Functions
// =================================================================================
function addToDisplay(value) {
    const currentValue = display.value;
    const lastChar = currentValue.slice(-1);

    if (isOperator(lastChar) && isOperator(value)) {
        display.value = currentValue.slice(0, -1) + value;
    } else {
        display.value += value;
    }
}

function deleteLastDigit() {
    display.value = display.value.slice(0, -1);
}

function clearDisplay() {
    display.value = '';
}

function calculate() {
    const expression = display.value;
    if (!expression) return;

    try {
        // Using new Function is safer than eval()
        const result = new Function('return ' + expression)();
        if (isNaN(result) || !isFinite(result)) {
            throw new Error("Invalid expression");
        }
        display.value = result;
        animateDisplay();
        saveToHistory(expression, result);
    } catch (error) {
        display.value = 'Error';
    }
}

function animateDisplay() {
    display.classList.remove('calculate-animation');
    void display.offsetWidth; // Trigger reflow
    display.classList.add('calculate-animation');
}

// =================================================================================
// History Functions
// =================================================================================
function saveToHistory(expression, result) {
    // If we are in the middle of history, new calculation clears the "future"
    if (currentIndex < history.length - 1) {
        history = history.slice(0, currentIndex + 1);
    }
    const timestamp = new Date().toISOString();
    history.push({ expression, result, timestamp });
    currentIndex = history.length - 1;
    updateLocalStorage();
}

function goBack() {
    if (currentIndex > 0) {
        currentIndex--;
        loadFromHistory();
    }
}

function goForward() {
    if (currentIndex < history.length - 1) {
        currentIndex++;
        loadFromHistory();
    }
}

function loadFromHistory() {
    if (currentIndex >= 0 && currentIndex < history.length) {
        display.value = history[currentIndex].expression;
    }
}

function displayHistory() {
    historyList.innerHTML = '';
    history.forEach((entry, index) => {
        const listItem = document.createElement('li');
        listItem.dataset.index = index; // Store the index of the history item
        listItem.classList.add('history-item'); // Add a class for styling
        
        // Create a container for the main content (calculation + timestamp)
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('history-item-content');

        const calculationSpan = document.createElement('span');
        calculationSpan.textContent = `${entry.expression} = ${entry.result}`;
        calculationSpan.classList.add('history-item-calculation');

        const timestampSpan = document.createElement('span');
        const date = new Date(entry.timestamp);
        timestampSpan.textContent = date.toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        timestampSpan.classList.add('history-item-timestamp');

        contentDiv.appendChild(calculationSpan);
        contentDiv.appendChild(timestampSpan);

        // Add click listener for selecting the item
        listItem.addEventListener('click', (event) => {
            // Prevent the delete button click from triggering the select
            if (!event.target.classList.contains('delete-history-item-btn')) {
                selectHistoryItem(index);
            }
        });

        // Create a delete button for each history item
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'x'; // Or '🗑️'
        deleteButton.classList.add('delete-history-item-btn');
        deleteButton.setAttribute('aria-label', `Borrar cálculo ${entry.expression} = ${entry.result}`);
        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent the parent li's click event from firing
            deleteHistoryItem(index);
        });

        listItem.appendChild(contentDiv);
        listItem.appendChild(deleteButton);
        historyList.appendChild(listItem);
    });
}

function selectHistoryItem(index) {
    // Only load if the index is valid and not already the current one
    currentIndex = index; // The if condition was removed as it contained a recursive bug
    loadFromHistory();
    showTab('calculator-tab'); // Switch to calculator tab for convenience
}

function deleteHistoryItem(indexToDelete) {
    if (indexToDelete < 0 || indexToDelete >= history.length) {
        return; // Invalid index
    }

    const confirmation = confirm(`¿Estás seguro de que quieres borrar "${history[indexToDelete].expression} = ${history[indexToDelete].result}" del historial?`);
    if (!confirmation) {
        return;
    }

    // Find the list item in the DOM to apply the animation
    const listItemToDelete = historyList.querySelector(`li[data-index='${indexToDelete}']`);

    if (listItemToDelete) {
        listItemToDelete.classList.add('fade-out');
    }

    // Wait for the animation to finish (e.g., 500ms) before removing the item from the data
    setTimeout(() => {
        history.splice(indexToDelete, 1);

        // Adjust currentIndex after deletion
        if (currentIndex >= indexToDelete) {
            currentIndex = Math.max(-1, currentIndex - 1);
        }

        updateLocalStorage(); // This will re-render the history list

        // If history is now empty, clear the display
        if (history.length === 0) {
            clearDisplay();
        } else if (currentIndex !== -1) {
            // If there's still history and a valid currentIndex, load it
            loadFromHistory();
        } else {
            // If history is not empty but currentIndex is -1 (e.g., deleted the last item)
            // We might want to clear the display or load the new last item.
            // For now, clear display if currentIndex is -1.
            clearDisplay();
        }
    }, 500); // This duration should match the CSS animation duration
}

function updateLocalStorage() {
    localStorage.setItem('calculationHistory', JSON.stringify(history));
    localStorage.setItem('currentIndex', currentIndex);
    displayHistory();
}

function clearHistory() {
    const confirmation = confirm("¿Estás seguro de que quieres borrar el historial?");
    if (confirmation) {
        history = [];
        currentIndex = -1;
        updateLocalStorage();
    }
}

// =================================================================================
// Music Player Functions
// =================================================================================
function changeTrack() {
    const selectedOption = selectTrack.options[selectTrack.selectedIndex];
    if (selectedOption) {
        reproductor.src = selectedOption.value;
        reproductor.play();
    }
}

function loadInitialTrack() {
    if (selectTrack.options.length > 0) {
        reproductor.src = selectTrack.options[0].value;
    }
}

// =================================================================================
// Theme Functions
// =================================================================================
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDarkMode = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    themeToggleButton.textContent = isDarkMode ? '☀️' : '🌙';
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggleButton.textContent = '☀️';
    }
}

// =================================================================================
// Tab Functions
// =================================================================================
function showTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Deactivate all tab buttons
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });

    // Show the selected tab content
    document.getElementById(tabId).classList.add('active');

    // Activate the corresponding tab button
    document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');

    // Save the active tab to localStorage
    localStorage.setItem('lastActiveTab', tabId);
}


// =================================================================================
// Event Listeners
// =================================================================================
keypad.addEventListener('click', (event) => {
    const target = event.target;
    if (target.tagName !== 'BUTTON') return;

    const { value, action } = target.dataset;

    if (value) {
        addToDisplay(value);
    } else if (action) {
        if (action === 'calculate') calculate();
        if (action === 'clear') clearDisplay();
        if (action === 'backspace') deleteLastDigit();
    }
});

historyControls.addEventListener('click', (event) => {
    const target = event.target;
    if (target.tagName !== 'BUTTON') return;

    const { action } = target.dataset;
    if (action === 'history-back') goBack();
    if (action === 'history-forward') goForward();
    if (action === 'history-clear') clearHistory();
});

selectTrack.addEventListener('change', changeTrack);

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.dataset.tab;
        showTab(tabId);
    });
});

themeToggleButton.addEventListener('click', toggleTheme);

window.addEventListener('load', () => {
    const storedHistory = JSON.parse(localStorage.getItem('calculationHistory')) || [];
    const storedIndex = parseInt(localStorage.getItem('currentIndex'), 10) || -1;

    if (storedHistory.length > 0) {
        history = storedHistory;
        currentIndex = storedIndex;
        loadFromHistory();
        displayHistory();
    }

    loadInitialTrack();
    loadTheme();

    // Load the last active tab or default to calculator
    const lastActiveTab = localStorage.getItem('lastActiveTab') || 'calculator-tab';
    showTab(lastActiveTab);
});