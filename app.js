// Инициализация Telegram Web App
const tg = window.Telegram?.WebApp;
let tgUser = null;

if (tg) {
    tg.expand();
    tg.enableClosingConfirmation();
    tgUser = tg.initDataUnsafe?.user;
}

// Состояние приложения
const state = {
    habits: [],
    notes: [],
    currentMood: 4,
    streak: 0,
    currentPage: 'home',
    currentWeek: 0,
    selectedDate: new Date(),
    editingNoteId: null
};

// DOM элементы
const elements = {
    // Элементы страниц
    welcomeCard: document.getElementById('welcome-card'),
    moodSection: document.getElementById('mood-section'),
    habitsSection: document.getElementById('habits-section'),
    diarySection: document.getElementById('diary-section'),
    statsSection: document.getElementById('stats-section'),
    
    // Списки
    habitsList: document.getElementById('habits-list'),
    notesList: document.getElementById('notes-list'),
    weekDates: document.getElementById('week-dates'),
    
    // Статистика
    streakCount: document.getElementById('streak-count'),
    habitsCounter: document.getElementById('habits-counter'),
    statStreak: document.getElementById('stat-streak'),
    statCompleted: document.getElementById('stat-completed'),
    statTotal: document.getElementById('stat-total'),
    
    // Кнопки
    addHabitBtn: document.getElementById('add-habit-btn'),
    navBtns: document.querySelectorAll('.nav-btn'),
    moodBtns: document.querySelectorAll('.mood-btn'),
    
    // Модальные окна
    habitModal: document.getElementById('habit-modal'),
    noteModal: document.getElementById('note-modal'),
    habitInput: document.getElementById('habit-input'),
    noteInput: document.getElementById('note-input'),
    charCount: document.getElementById('char-count'),
    
    // Календарь
    prevWeekBtn: document.getElementById('prev-week'),
    nextWeekBtn: document.getElementById('next-week'),
    monthTitle: document.getElementById('month-title'),
    searchNotes: document.getElementById('search-notes'),
    
    // Приветствие
    greeting: document.getElementById('greeting'),
    currentDate: document.getElementById('current-date')
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    setupGreeting();
    setupEventListeners();
    loadData();
    render();
    
    // Показываем главную страницу по умолчанию
    switchPage('home');
}

// Настройка приветствия с именем из Telegram
function setupGreeting() {
    const now = new Date();
    const dateOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    
    // Получаем имя пользователя из Telegram
    let userName = 'Друг';
    if (tgUser) {
        userName = tgUser.first_name || 'Друг';
    }
    
    // Устанавливаем приветствие
    elements.greeting.textContent = `Привет, ${userName}!`;
    elements.currentDate.textContent = now.toLocaleDateString('ru-RU', dateOptions);
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Навигация
    elements.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            switchPage(page);
            
            // Обновляем активное состояние
            elements.navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Кнопки настроения
    elements.moodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mood = parseInt(btn.dataset.mood);
            setMood(mood);
            
            elements.moodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Кнопка добавления привычки
    elements.addHabitBtn.addEventListener('click', () => {
        showModal('habit-modal');
        elements.habitInput.focus();
    });
    
    // Навигация календаря
    elements.prevWeekBtn.addEventListener('click', () => {
        state.currentWeek--;
        renderCalendar();
    });
    
    elements.nextWeekBtn.addEventListener('click', () => {
        state.currentWeek++;
        renderCalendar();
    });
    
    // Поиск заметок
    elements.searchNotes?.addEventListener('input', renderNotes);
    
    // Управление модальными окнами
    setupModalControls();
}

function setupModalControls() {
    // Модальное окно привычки
    document.querySelectorAll('.close-btn, #cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal('habit-modal');
            elements.habitInput.value = '';
        });
    });
    
    document.getElementById('save-btn').addEventListener('click', saveHabit);
    elements.habitInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveHabit();
    });
    
    // Модальное окно заметки
    document.querySelectorAll('#note-modal .close-btn, #note-cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal('note-modal');
            elements.noteInput.value = '';
            state.editingNoteId = null;
        });
    });
    
    document.getElementById('note-save-btn').addEventListener('click', saveNote);
    elements.noteInput.addEventListener('input', (e) => {
        elements.charCount.textContent = `${e.target.value.length}/1000`;
    });
    
    // Закрытие модальных окон по клику на фон
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideModal(modal.id);
        });
    });
}

// Переключение страниц
function switchPage(page) {
    state.currentPage = page;
    
    // Скрываем все секции
    elements.welcomeCard.classList.add('hidden');
    elements.moodSection.classList.add('hidden');
    elements.habitsSection.classList.add('hidden');
    elements.diarySection.classList.add('hidden');
    elements.statsSection.classList.add('hidden');
    
    // Показываем нужные секции для текущей страницы
    if (page === 'home') {
        // На главной: приветствие + настроение + привычки + статистика
        elements.welcomeCard.classList.remove('hidden');
        elements.moodSection.classList.remove('hidden');
        elements.habitsSection.classList.remove('hidden');
        elements.statsSection.classList.remove('hidden');
    } else if (page === 'diary') {
        // В дневнике: только календарь и заметки
        elements.diarySection.classList.remove('hidden');
        renderCalendar();
        renderNotes();
    } else if (page === 'habits') {
        // На странице привычек: только привычки
        elements.habitsSection.classList.remove('hidden');
    }
}

// Установка настроения
function setMood(mood) {
    state.currentMood = mood;
    saveData();
    showToast('Настроение сохранено');
}

// Сохранение привычки
function saveHabit() {
    const title = elements.habitInput.value.trim();
    if (!title) {
        showToast('Введите название привычки');
        return;
    }
    
    const newHabit = {
        id: Date.now(),
        title: title,
        completed: false,
        streak: 0,
        createdAt: new Date().toISOString()
    };
    
    state.habits.push(newHabit);
    hideModal('habit-modal');
    elements.habitInput.value = '';
    saveData();
    render();
    showToast('Привычка добавлена');
}

// Переключение статуса привычки
function toggleHabit(id) {
    const habit = state.habits.find(h => h.id === id);
    if (habit) {
        habit.completed = !habit.completed;
        habit.streak = habit.completed ? habit.streak + 1 : Math.max(0, habit.streak - 1);
        
        // Обновляем серию
        const completedToday = state.habits.filter(h => h.completed).length;
        if (completedToday > 0) {
            state.streak = Math.max(state.streak, 1);
        }
        
        saveData();
        render();
        showToast(habit.completed ? 'Выполнено!' : 'Отменено');
    }
}

// Удаление привычки
function deleteHabit(id) {
    if (confirm('Удалить привычку?')) {
        state.habits = state.habits.filter(h => h.id !== id);
        saveData();
        render();
        showToast('Привычка удалена');
    }
}

// Рендер календаря
function renderCalendar() {
    const today = new Date();
    const currentDate = new Date();
    currentDate.setDate(today.getDate() + (state.currentWeek * 7));
    
    // Обновляем заголовок месяца
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                       'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    elements.monthTitle.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    
    // Находим понедельник текущей недели
    const monday = new Date(currentDate);
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
    
    // Очищаем предыдущие дни
    elements.weekDates.innerHTML = '';
    
    const weekDays = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
    
    // Рендерим 7 дней недели
    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        
        const btn = document.createElement('button');
        btn.className = 'date-btn';
        btn.innerHTML = `
            <div>${date.getDate()}</div>
            <div style="font-size: 10px; margin-top: 2px; opacity: 0.7">${weekDays[i]}</div>
        `;
        
        // Проверяем, сегодня ли это
        if (isSameDay(date, today)) {
            btn.classList.add('today');
        }
        
        // Проверяем, выбран ли этот день
        if (isSameDay(date, state.selectedDate)) {
            btn.classList.add('selected');
        }
        
        // Проверяем, есть ли заметка на этот день
        const hasNote = state.notes.some(note => isSameDay(new Date(note.date), date));
        if (hasNote) {
            btn.classList.add('has-note');
        }
        
        // Проверяем, другой ли это месяц
        if (date.getMonth() !== currentDate.getMonth()) {
            btn.classList.add('other-month');
        }
        
        // Обработчик клика на день
        btn.addEventListener('click', () => {
            state.selectedDate = date;
            renderCalendar(); // Перерисовываем для обновления выделения
            openNoteModal();
        });
        
        elements.weekDates.appendChild(btn);
    }
}

// Проверка, один ли это день
function isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
}

// Рендер заметок
function renderNotes() {
    const searchQuery = elements.searchNotes?.value.toLowerCase() || '';
    
    // Фильтруем и сортируем заметки
    let filteredNotes = state.notes.filter(note => 
        note.text.toLowerCase().includes(searchQuery)
    ).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (filteredNotes.length === 0) {
        elements.notesList.innerHTML = `
            <div class="empty-state">
                <div class="emoji">📝</div>
                <p>${searchQuery ? 'Заметки не найдены' : 'Пока нет заметок'}</p>
            </div>
        `;
        return;
    }
    
    // Рендерим заметки
    elements.notesList.innerHTML = filteredNotes.map(note => {
        const date = new Date(note.date);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        let dateDisplay = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        if (isSameDay(date, today)) dateDisplay = 'Сегодня';
        if (isSameDay(date, yesterday)) dateDisplay = 'Вчера';
        
        const preview = note.text.length > 100 ? note.text.substring(0, 100) + '...' : note.text;
        
        return `
            <div class="note-card" data-id="${note.id}">
                <div class="note-header">
                    <div class="note-date">${dateDisplay}</div>
                </div>
                <div class="note-text">${preview}</div>
            </div>
        `;
    }).join('');
    
    // Добавляем обработчики кликов
    document.querySelectorAll('.note-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            const note = state.notes.find(n => n.id === id);
            if (note) {
                state.editingNoteId = id;
                state.selectedDate = new Date(note.date);
                openNoteModal(note);
            }
        });
    });
}

// Открытие модального окна заметки
function openNoteModal(note = null) {
    elements.noteInput.value = note ? note.text : '';
    elements.charCount.textContent = `${elements.noteInput.value.length}/1000`;
    
    // Обновляем заголовок
    document.getElementById('note-title').textContent = 
        note ? 'Редактировать заметку' : 'Новая заметка';
    
    showModal('note-modal');
    elements.noteInput.focus();
}

// Сохранение заметки
function saveNote() {
    const text = elements.noteInput.value.trim();
    if (!text) {
        showToast('Введите текст заметки');
        return;
    }
    
    if (state.editingNoteId) {
        // Обновляем существующую заметку
        const noteIndex = state.notes.findIndex(n => n.id === state.editingNoteId);
        if (noteIndex !== -1) {
            state.notes[noteIndex].text = text;
            state.notes[noteIndex].updatedAt = new Date().toISOString();
        }
    } else {
        // Создаем новую заметку
        const newNote = {
            id: Date.now(),
            date: state.selectedDate.toISOString(),
            text: text,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        state.notes.push(newNote);
    }
    
    hideModal('note-modal');
    elements.noteInput.value = '';
    state.editingNoteId = null;
    saveData();
    renderCalendar();
    renderNotes();
    showToast('Заметка сохранена');
}

// Основной рендер
function render() {
    renderHabits();
    updateStats();
}

function renderHabits() {
    if (state.habits.length === 0) {
        elements.habitsList.innerHTML = `
            <div class="empty-state">
                <div class="emoji">🎯</div>
                <p>Добавьте первую привычку</p>
            </div>
        `;
        return;
    }
    
    const completed = state.habits.filter(h => h.completed).length;
    const total = state.habits.length;
    elements.habitsCounter.textContent = `${completed}/${total}`;
    
    // Рендерим привычки
    elements.habitsList.innerHTML = state.habits.map(habit => `
        <div class="habit-item">
            <div class="habit-info">
                <div class="habit-icon">${habit.completed ? '✅' : '📌'}</div>
                <div class="habit-text">
                    <h4>${habit.title}</h4>
                    <p>Серия: ${habit.streak} дней</p>
                </div>
            </div>
            <div class="habit-actions">
                <button class="habit-delete" onclick="deleteHabit(${habit.id})">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="habit-check ${habit.completed ? 'checked' : ''}" 
                        onclick="toggleHabit(${habit.id})">
                    <i class="fas fa-check"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function updateStats() {
    const completed = state.habits.filter(h => h.completed).length;
    const total = state.habits.length;
    
    // Обновляем серию
    if (completed > 0) {
        state.streak = state.streak === 0 ? 1 : state.streak;
    }
    
    // Обновляем UI
    elements.streakCount.textContent = state.streak;
    elements.statStreak.textContent = state.streak;
    elements.statCompleted.textContent = completed;
    elements.statTotal.textContent = total;
}

// Вспомогательные функции
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showToast(message) {
    if (tg?.showAlert) {
        tg.showAlert(message);
        return;
    }
    
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: #334155;
        color: white;
        padding: 12px 20px;
        border-radius: 10px;
        font-size: 14px;
        z-index: 1000;
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// Сохранение и загрузка данных
function saveData() {
    const data = {
        habits: state.habits,
        notes: state.notes,
        currentMood: state.currentMood,
        streak: state.streak,
        lastSave: new Date().toISOString()
    };
    localStorage.setItem('moodcraft', JSON.stringify(data));
}

function loadData() {
    const saved = localStorage.getItem('moodcraft');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            state.habits = data.habits || [];
            state.notes = data.notes || [];
            state.currentMood = data.currentMood || 4;
            state.streak = data.streak || 0;
            
            // Устанавливаем активную кнопку настроения
            elements.moodBtns.forEach(btn => {
                if (parseInt(btn.dataset.mood) === state.currentMood) {
                    btn.classList.add('active');
                }
            });
        } catch (e) {
            console.error('Ошибка загрузки данных:', e);
        }
    }
}

// Глобальные функции для onclick атрибутов
window.toggleHabit = toggleHabit;
window.deleteHabit = deleteHabit;

// Загружаем тестовые данные, если нет сохраненных
if (state.habits.length === 0) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    state.habits = [
        { id: 1, title: 'Утренняя зарядка', completed: true, streak: 7, createdAt: '2024-01-01' },
        { id: 2, title: 'Выпить воды', completed: false, streak: 3, createdAt: '2024-01-05' },
        { id: 3, title: 'Чтение книги', completed: false, streak: 5, createdAt: '2024-01-03' }
    ];
    
    state.notes = [
        { 
            id: 1, 
            date: today.toISOString(), 
            text: 'Сегодня отличный день! Сделал зарядку и начал новую книгу.', 
            createdAt: today.toISOString(), 
            updatedAt: today.toISOString() 
        },
        { 
            id: 2, 
            date: yesterday.toISOString(), 
            text: 'Вчера хорошо поработал. Важно не забывать пить воду в течение дня.', 
            createdAt: yesterday.toISOString(), 
            updatedAt: yesterday.toISOString() 
        }
    ];
    
    saveData();
}