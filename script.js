class Calculator {
    constructor(displayElement, keypadElement, onCalculate) {
        this.display = displayElement;
        this.keypad = keypadElement;
        this.onCalculate = onCalculate; // Callback to notify history manager
    }

    init() {
        this.keypad.addEventListener('click', this.handleKeypadClick.bind(this));
    }

    handleKeypadClick(event) {
        const target = event.target;
        if (target.tagName !== 'BUTTON') return;

        const { value, action } = target.dataset;

        if (value) {
            this.addToDisplay(value);
        } else if (action) {
            switch (action) {
                case 'calculate': this.calculate(); break;
                case 'clear': this.clearDisplay(); break;
                case 'backspace': this.deleteLastDigit(); break;
            }
        }
    }

    isOperator(char) {
        return ['+', '-', '*', '/'].includes(char);
    }

    addToDisplay(value) {
        const currentValue = this.display.value;
        const lastChar = currentValue.slice(-1);

        if (this.isOperator(lastChar) && this.isOperator(value)) {
            this.display.value = currentValue.slice(0, -1) + value;
        } else {
            this.display.value += value;
        }
    }

    deleteLastDigit() {
        this.display.value = this.display.value.slice(0, -1);
    }

    clearDisplay() {
        this.display.value = '';
    }

    calculate() {
        const expression = this.display.value;
        if (!expression) return;

        try {
            // Using new Function is safer than eval()
            const result = new Function('return ' + expression)();
            if (isNaN(result) || !isFinite(result)) {
                throw new Error("Invalid expression");
            }
            this.display.value = result;
            this.animateDisplay();
            this.onCalculate(expression, result);
        } catch (error) {
            this.display.value = 'Error';
        }
    }

    animateDisplay() {
        this.display.classList.remove('calculate-animation');
        void this.display.offsetWidth; // Trigger reflow
        this.display.classList.add('calculate-animation');
    }

    getExpression() {
        return this.display.value;
    }

    setExpression(value) {
        this.display.value = value;
    }
}

class HistoryManager {
    constructor(historyListElement, historyControlsElement, onHistorySelect) {
        this.historyList = historyListElement;
        this.historyControls = historyControlsElement;
        this.onHistorySelect = onHistorySelect; // Callback to set calculator display
        this.history = [];
        this.currentIndex = -1;
    }

    init() {
        this.loadFromLocalStorage();
        this.historyControls.addEventListener('click', this.handleControlsClick.bind(this));
    }

    handleControlsClick(event) {
        const target = event.target;
        if (target.tagName !== 'BUTTON') return;

        const { action } = target.dataset;
        switch (action) {
            case 'history-back': this.goBack(); break;
            case 'history-forward': this.goForward(); break;
            case 'history-clear': this.clear(); break;
        }
    }

    save(expression, result) {
        if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1);
        }
        const timestamp = new Date().toISOString();
        this.history.push({ expression, result, timestamp });
        this.currentIndex = this.history.length - 1;
        this._updateLocalStorage();
    }

    goBack() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.onHistorySelect(this.history[this.currentIndex].expression);
            this._updateLocalStorage();
        }
    }

    goForward() {
        if (this.currentIndex < this.history.length - 1) {
            this.currentIndex++;
            this.onHistorySelect(this.history[this.currentIndex].expression);
            this._updateLocalStorage();
        }
    }

    _display() {
        this.historyList.innerHTML = '';
        this.history.forEach((entry, index) => {
            const listItem = document.createElement('li');
            listItem.dataset.index = index;
            listItem.classList.add('history-item');

            const contentDiv = document.createElement('div');
            contentDiv.classList.add('history-item-content');
            contentDiv.innerHTML = `
                <span class="history-item-calculation">${entry.expression} = ${entry.result}</span>
                <span class="history-item-timestamp">${new Date(entry.timestamp).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            `;

            listItem.addEventListener('click', (event) => {
                if (!event.target.closest('.delete-history-item-btn')) {
                    this.selectItem(index);
                }
            });

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'x';
            deleteButton.classList.add('delete-history-item-btn');
            deleteButton.setAttribute('aria-label', `Borrar cálculo ${entry.expression} = ${entry.result}`);
            deleteButton.addEventListener('click', (event) => {
                event.stopPropagation();
                this.deleteItem(index);
            });

            listItem.appendChild(contentDiv);
            listItem.appendChild(deleteButton);
            this.historyList.appendChild(listItem);
        });
    }

    selectItem(index) {
        this.currentIndex = index;
        this.onHistorySelect(this.history[index].expression, true); // true to switch tab
        this._updateLocalStorage();
    }

    deleteItem(indexToDelete) {
        if (indexToDelete < 0 || indexToDelete >= this.history.length) return;
        if (!confirm(`¿Estás seguro de que quieres borrar "${this.history[indexToDelete].expression} = ${this.history[indexToDelete].result}" del historial?`)) return;

        const listItemToDelete = this.historyList.querySelector(`li[data-index='${indexToDelete}']`);
        if (listItemToDelete) listItemToDelete.classList.add('fade-out');

        setTimeout(() => {
            this.history.splice(indexToDelete, 1);
            if (this.currentIndex >= indexToDelete) {
                this.currentIndex = Math.max(-1, this.currentIndex - 1);
            }
            this._updateLocalStorage();

            if (this.history.length === 0) {
                this.onHistorySelect('');
            } else if (this.currentIndex !== -1) {
                this.onHistorySelect(this.history[this.currentIndex].expression);
            } else {
                this.onHistorySelect('');
            }
        }, 500);
    }

    clear() {
        if (confirm("¿Estás seguro de que quieres borrar el historial?")) {
            this.history = [];
            this.currentIndex = -1;
            this.onHistorySelect('');
            this._updateLocalStorage();
        }
    }

    _updateLocalStorage() {
        localStorage.setItem('calculationHistory', JSON.stringify(this.history));
        localStorage.setItem('currentIndex', this.currentIndex);
        this._display();
    }

    loadFromLocalStorage() {
        this.history = JSON.parse(localStorage.getItem('calculationHistory')) || [];
        this.currentIndex = parseInt(localStorage.getItem('currentIndex'), 10) || -1;
        if (this.history.length > 0 && this.currentIndex > -1) {
            this.onHistorySelect(this.history[this.currentIndex].expression);
        }
        this._display();
    }
}

class MusicPlayer {
    constructor(selectElement, audioElement) {
        this.select = selectElement;
        this.audio = audioElement;
    }

    init() {
        this.loadInitialTrack();
        this.select.addEventListener('change', this.changeTrack.bind(this));
    }

    changeTrack() {
        const selectedOption = this.select.options[this.select.selectedIndex];
        if (selectedOption) {
            this.audio.src = selectedOption.value;
            this.audio.play();
        }
    }

    loadInitialTrack() {
        if (this.select.options.length > 0) {
            this.audio.src = this.select.options[0].value;
        }
    }
}

class ThemeManager {
    constructor(toggleButtonElement) {
        this.toggleButton = toggleButtonElement;
    }

    init() {
        this.loadTheme();
        this.toggleButton.addEventListener('click', this.toggleTheme.bind(this));
    }

    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        const isDarkMode = document.body.classList.contains('dark-theme');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        this.toggleButton.textContent = isDarkMode ? '☀️' : '🌙';
    }

    loadTheme() {
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-theme');
            this.toggleButton.textContent = '☀️';
        }
    }
}

class TabManager {
    constructor(tabButtons) {
        this.tabButtons = tabButtons;
    }

    init() {
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => this.showTab(button.dataset.tab));
        });
        const lastActiveTab = localStorage.getItem('lastActiveTab') || 'calculator-tab';
        this.showTab(lastActiveTab);
    }

    showTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        this.tabButtons.forEach(button => button.classList.remove('active'));

        document.getElementById(tabId).classList.add('active');
        document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');
        localStorage.setItem('lastActiveTab', tabId);
    }
}

class App {
    constructor() {
        this.cacheDOMElements();
        this.tabManager = new TabManager(this.dom.tabButtons);
        this.themeManager = new ThemeManager(this.dom.themeToggleButton);
        this.musicPlayer = new MusicPlayer(this.dom.selectTrack, this.dom.reproductor);
        this.historyManager = new HistoryManager(
            this.dom.historyList,
            this.dom.historyControls,
            (expression, switchToCalcTab = false) => {
                this.calculator.setExpression(expression);
                if (switchToCalcTab) this.tabManager.showTab('calculator-tab');
            }
        );
        this.calculator = new Calculator(
            this.dom.display,
            this.dom.keypad,
            (expression, result) => this.historyManager.save(expression, result)
        );
    }

    cacheDOMElements() {
        this.dom = {
            display: document.getElementById('display'),
            keypad: document.getElementById('keypad'),
            historyList: document.getElementById('historyList'),
            historyControls: document.getElementById('history-controls'),
            selectTrack: document.getElementById('selectTrack'),
            reproductor: document.getElementById('reproductor'),
            themeToggleButton: document.getElementById('theme-toggle'),
            tabButtons: document.querySelectorAll('.tab-button'),
        };
    }

    init() {
        window.addEventListener('load', () => {
            this.calculator.init();
            this.historyManager.init();
            this.musicPlayer.init();
            this.themeManager.init();
            this.tabManager.init(); // This will also load the last active tab
        });
    }
}

const app = new App();
app.init();