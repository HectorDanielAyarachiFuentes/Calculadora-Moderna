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
    history.push({ expression, result });
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
        listItem.textContent = `${entry.expression} = ${entry.result}`;
        historyList.appendChild(listItem);
    });
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

    // Show the first tab by default
    showTab('calculator-tab');
});