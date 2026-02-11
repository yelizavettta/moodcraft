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
    welcomeCard: document.getElementById('welcome-card'),
    moodSection: document.getElementById('mood-section'),
    habitsSection: document.getElementById('habits-section'),
    diarySection: document.getElementById('diary-section'),
    statsSection: document.getElementById('stats-section'),
    practiceSection: document.getElementById('practice-section'), // новая секция
    
    habitsList: document.getElementById('habits-list'),
    notesList: document.getElementById('notes-list'),
    weekDates: document.getElementById('week-dates'),
    
    streakCount: document.getElementById('streak-count'),
    habitsCounter: document.getElementById('habits-counter'),
    statStreak: document.getElementById('stat-streak'),
    statCompleted: document.getElementById('stat-completed'),
    statTotal: document.getElementById('stat-total'),
    
    addHabitBtn: document.getElementById('add-habit-btn'),
    navBtns: document.querySelectorAll('.bottom-nav .nav-btn'), // только нижние кнопки
    moodBtns: document.querySelectorAll('.mood-btn'),
    
    habitModal: document.getElementById('habit-modal'),
    noteModal: document.getElementById('note-modal'),
    habitInput: document.getElementById('habit-input'),
    noteInput: document.getElementById('note-input'),
    charCount: document.getElementById('char-count'),
    
    prevWeekBtn: document.getElementById('prev-week'),
    nextWeekBtn: document.getElementById('next-week'),
    monthTitle: document.getElementById('month-title'),
    searchNotes: document.getElementById('search-notes'),
    
    greeting: document.getElementById('greeting'),
    currentDate: document.getElementById('current-date')
};

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    setupGreeting();
    setupEventListeners();
    loadData();             // загружает из localStorage, мигрирует старые привычки
    render();
    renderPracticeContent(); // наполнение вкладок тренировок и медитаций
    switchPage('home');
}

// ========== ПРИВЕТСТВИЕ ==========
function setupGreeting() {
    const now = new Date();
    const dateOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    let userName = 'Друг';
    if (tgUser) userName = tgUser.first_name || 'Друг';
    if (elements.greeting) elements.greeting.textContent = `Привет, ${userName}!`;
    if (elements.currentDate) elements.currentDate.textContent = now.toLocaleDateString('ru-RU', dateOptions);
}

// ========== ОБРАБОТЧИКИ ==========
function setupEventListeners() {
    // Нижняя навигация
    elements.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            switchPage(page);
            elements.navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Настроение
    elements.moodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mood = parseInt(btn.dataset.mood);
            setMood(mood);
            elements.moodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Добавление привычки
    if (elements.addHabitBtn) {
        elements.addHabitBtn.addEventListener('click', () => {
            showModal('habit-modal');
            elements.habitInput?.focus();
        });
    }

    // Календарь: переключение недель
    if (elements.prevWeekBtn && elements.nextWeekBtn) {
        elements.prevWeekBtn.addEventListener('click', () => {
            state.currentWeek--;
            renderCalendar();
        });
        elements.nextWeekBtn.addEventListener('click', () => {
            state.currentWeek++;
            renderCalendar();
        });
    }

    // Поиск заметок
    elements.searchNotes?.addEventListener('input', renderNotes);

    // Модальные окна
    setupModalControls();

    // Табы в практиках
    setupPracticeTabs();
}

function setupModalControls() {
    // Привычка
    document.querySelectorAll('.close-btn, #cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal('habit-modal');
            if (elements.habitInput) elements.habitInput.value = '';
        });
    });
    document.getElementById('save-btn')?.addEventListener('click', saveHabit);
    elements.habitInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveHabit();
    });

    // Заметка
    document.querySelectorAll('#note-modal .close-btn, #note-cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal('note-modal');
            if (elements.noteInput) elements.noteInput.value = '';
            state.editingNoteId = null;
        });
    });
    document.getElementById('note-save-btn')?.addEventListener('click', saveNote);
    elements.noteInput?.addEventListener('input', (e) => {
        if (elements.charCount) elements.charCount.textContent = `${e.target.value.length}/1000`;
    });

    // Закрытие по фону
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideModal(modal.id);
        });
    });
}

// ========== НАВИГАЦИЯ ПО СТРАНИЦАМ ==========
function switchPage(page) {
    state.currentPage = page;

    // Скрыть все основные секции
    if (elements.welcomeCard) elements.welcomeCard.classList.add('hidden');
    if (elements.moodSection) elements.moodSection.classList.add('hidden');
    if (elements.habitsSection) elements.habitsSection.classList.add('hidden');
    if (elements.diarySection) elements.diarySection.classList.add('hidden');
    if (elements.statsSection) elements.statsSection.classList.add('hidden');
    if (elements.practiceSection) elements.practiceSection.classList.add('hidden');

    // Показать соответствующие секции
    if (page === 'home') {
        elements.welcomeCard?.classList.remove('hidden');
        elements.moodSection?.classList.remove('hidden');
        elements.habitsSection?.classList.remove('hidden');
        elements.statsSection?.classList.remove('hidden');
    } else if (page === 'diary') {
        elements.diarySection?.classList.remove('hidden');
        renderCalendar(); // всегда обновляем календарь при входе
        renderNotes();
    } else if (page === 'practice') {
        elements.practiceSection?.classList.remove('hidden');
    }
}

// ========== НАСТРОЕНИЕ ==========
function setMood(mood) {
    state.currentMood = mood;
    saveData();
    showToast('Настроение сохранено');
}

// ========== ПРИВЫЧКИ (НОВАЯ ЛОГИКА) ==========
function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

// Миграция старых привычек (добавляет поле completedDates)
function migrateHabits(habits) {
    return habits.map(habit => ({
        ...habit,
        completedDates: habit.completedDates || (habit.completed ? [getTodayString()] : [])
    }));
}

// Расчёт общей серии (streak) – максимальное количество дней подряд с выполненными привычками
function calculateOverallStreak() {
    const activeDays = new Set();
    state.habits.forEach(habit => {
        habit.completedDates.forEach(date => activeDays.add(date));
    });

    if (activeDays.size === 0) {
        state.streak = 0;
        return;
    }

    const sorted = Array.from(activeDays).sort();
    let current = 1;
    let max = 1;

    for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1]);
        const curr = new Date(sorted[i]);
        const diff = (curr - prev) / (1000 * 3600 * 24);
        if (diff === 1) {
            current++;
            max = Math.max(max, current);
        } else {
            current = 1;
        }
    }
    state.streak = max;
}

// Количество выполненных привычек сегодня
function getCompletedTodayCount() {
    const today = getTodayString();
    return state.habits.filter(habit => habit.completedDates.includes(today)).length;
}

// Переключение выполнения привычки
function toggleHabit(id) {
    const habit = state.habits.find(h => h.id === id);
    if (!habit) return;

    const today = getTodayString();
    const idx = habit.completedDates.indexOf(today);

    if (idx === -1) {
        habit.completedDates.push(today);
    } else {
        habit.completedDates.splice(idx, 1);
    }

    calculateOverallStreak();
    saveData();
    render();
    showToast(idx === -1 ? 'Выполнено!' : 'Отменено');
}

// Удаление привычки
function deleteHabit(id) {
    if (confirm('Удалить привычку?')) {
        state.habits = state.habits.filter(h => h.id !== id);
        calculateOverallStreak();
        saveData();
        render();
        showToast('Привычка удалена');
    }
}

// Сохранение новой привычки
function saveHabit() {
    const title = elements.habitInput?.value.trim();
    if (!title) {
        showToast('Введите название привычки');
        return;
    }

    const newHabit = {
        id: Date.now(),
        title: title,
        completedDates: [],
        createdAt: new Date().toISOString()
    };

    state.habits.push(newHabit);
    hideModal('habit-modal');
    if (elements.habitInput) elements.habitInput.value = '';
    saveData();
    render();
    showToast('Привычка добавлена');
}

// ========== ОТРИСОВКА ПРИВЫЧЕК И СТАТИСТИКИ ==========
function render() {
    renderHabits();
    updateStats();
}

function renderHabits() {
    if (!elements.habitsList || !elements.habitsCounter) return;

    if (state.habits.length === 0) {
        elements.habitsList.innerHTML = `
            <div class="empty-state">
                <div class="emoji">🎯</div>
                <p>Добавьте первую привычку</p>
            </div>
        `;
        return;
    }

    const completedToday = getCompletedTodayCount();
    const total = state.habits.length;
    elements.habitsCounter.textContent = `${completedToday}/${total}`;

    elements.habitsList.innerHTML = state.habits.map(habit => {
        const completedToday = habit.completedDates.includes(getTodayString());
        return `
            <div class="habit-item">
                <div class="habit-info">
                    <div class="habit-icon">${completedToday ? '✅' : '📌'}</div>
                    <div class="habit-text">
                        <h4>${habit.title}</h4>
                        <p>Выполнено дней: ${habit.completedDates.length}</p>
                    </div>
                </div>
                <div class="habit-actions">
                    <button class="habit-delete" onclick="deleteHabit(${habit.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="habit-check ${completedToday ? 'checked' : ''}" 
                            onclick="toggleHabit(${habit.id})">
                        <i class="fas fa-check"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function updateStats() {
    const completedToday = getCompletedTodayCount();
    const total = state.habits.length;

    if (elements.streakCount) elements.streakCount.textContent = state.streak;
    if (elements.statStreak) elements.statStreak.textContent = state.streak;
    if (elements.statCompleted) elements.statCompleted.textContent = completedToday;
    if (elements.statTotal) elements.statTotal.textContent = total;
}

// ========== КАЛЕНДАРЬ (ИСПРАВЛЕН) ==========
function renderCalendar() {
    if (!elements.weekDates || !elements.monthTitle) {
        console.warn('Элементы календаря не найдены');
        return;
    }

    const today = new Date();
    const currentDate = new Date();
    currentDate.setDate(today.getDate() + (state.currentWeek * 7));

    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    elements.monthTitle.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    // Понедельник текущей недели
    const monday = new Date(currentDate);
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);

    elements.weekDates.innerHTML = '';

    const weekDays = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);

        const btn = document.createElement('button');
        btn.className = 'date-btn';
        btn.innerHTML = `
            <div>${date.getDate()}</div>
            <div style="font-size: 10px; margin-top: 2px; opacity: 0.7">${weekDays[i]}</div>
        `;

        if (isSameDay(date, today)) btn.classList.add('today');
        if (state.selectedDate && isSameDay(date, state.selectedDate)) btn.classList.add('selected');

        const hasNote = state.notes.some(note => {
            try {
                return isSameDay(new Date(note.date), date);
            } catch {
                return false;
            }
        });
        if (hasNote) btn.classList.add('has-note');

        if (date.getMonth() !== currentDate.getMonth()) btn.classList.add('other-month');

        // 👇 КОПИРУЕМ ДАТУ, ЧТОБЫ ИЗБЕЖАТЬ ЗАМЫКАНИЯ
        const dateCopy = new Date(date);
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.selectedDate = dateCopy;
            renderCalendar();
            openNoteModal();
        });

        elements.weekDates.appendChild(btn);
    }
}

function isSameDay(date1, date2) {
    if (!date1 || !date2) return false;
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
}

// ========== ЗАМЕТКИ ==========
function renderNotes() {
    if (!elements.notesList) return;

    const searchQuery = elements.searchNotes?.value.toLowerCase() || '';
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

function openNoteModal(note = null) {
    if (elements.noteInput) elements.noteInput.value = note ? note.text : '';
    if (elements.charCount) elements.charCount.textContent = `${elements.noteInput?.value.length || 0}/1000`;
    const noteTitle = document.getElementById('note-title');
    if (noteTitle) noteTitle.textContent = note ? 'Редактировать заметку' : 'Новая заметка';
    showModal('note-modal');
    elements.noteInput?.focus();
}

function saveNote() {
    const text = elements.noteInput?.value.trim();
    if (!text) {
        showToast('Введите текст заметки');
        return;
    }

    if (state.editingNoteId) {
        const index = state.notes.findIndex(n => n.id === state.editingNoteId);
        if (index !== -1) {
            state.notes[index].text = text;
            state.notes[index].updatedAt = new Date().toISOString();
        }
    } else {
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
    if (elements.noteInput) elements.noteInput.value = '';
    state.editingNoteId = null;
    saveData();
    renderCalendar();
    renderNotes();
    showToast('Заметка сохранена');
}

// ========== ПРАКТИКИ (НОВОЕ) ==========
function setupPracticeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${tab}-tab`).classList.add('active');
        });
    });
}

// Наполнение контентом тренировок и медитаций
function renderPracticeContent() {
    // Тренировки
    const workouts = [
        { title: 'Утренняя зарядка', duration: '10 мин', url: '#', thumbnail: '🏋️' },
        { title: 'Йога для начинающих', duration: '20 мин', url: '#', thumbnail: '🧘' },
        { title: 'Кардио дома', duration: '15 мин', url: '#', thumbnail: '🔥' },
    ];

    // Медитации
    const meditations = [
        { title: 'Осознанное дыхание', duration: '5 мин', url: '#', thumbnail: '🌿' },
        { title: 'Сканирование тела', duration: '15 мин', url: '#', thumbnail: '🧠' },
        { title: 'Медитация благодарности', duration: '10 мин', url: '#', thumbnail: '💖' },
    ];

    const workoutsTab = document.getElementById('workouts-tab');
    const meditationsTab = document.getElementById('meditations-tab');

    if (workoutsTab) {
        workoutsTab.innerHTML = `<div class="videos-grid">${
            workouts.map(v => `
                <div class="video-card">
                    <div class="video-thumbnail">${v.thumbnail}</div>
                    <div class="video-info">
                        <div class="video-title">${v.title}</div>
                        <div class="video-duration">${v.duration}</div>
                        <a href="${v.url}" target="_blank" class="video-link">Смотреть</a>
                    </div>
                </div>
            `).join('')
        }</div>`;
    }

    if (meditationsTab) {
        meditationsTab.innerHTML = `<div class="videos-grid">${
            meditations.map(v => `
                <div class="video-card">
                    <div class="video-thumbnail">${v.thumbnail}</div>
                    <div class="video-info">
                        <div class="video-title">${v.title}</div>
                        <div class="video-duration">${v.duration}</div>
                        <a href="${v.url}" target="_blank" class="video-link">Смотреть</a>
                    </div>
                </div>
            `).join('')
        }</div>`;
    }
}

// ========== МОДАЛЬНЫЕ ОКНА ==========
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// ========== TOAST-УВЕДОМЛЕНИЯ ==========
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
        animation: fadeInOut 2s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// Анимация для toast
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
        15% { opacity: 1; transform: translateX(-50%) translateY(0); }
        85% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    }
`;
document.head.appendChild(style);

// ========== СОХРАНЕНИЕ И ЗАГРУЗКА ==========
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
            state.habits = migrateHabits(data.habits || []);
            state.notes = data.notes || [];
            state.currentMood = data.currentMood || 4;
            state.streak = data.streak || 0;

            calculateOverallStreak(); // пересчитываем на случай изменения дат

            // Активная кнопка настроения
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

// Глобальные функции для onclick
window.toggleHabit = toggleHabit;
window.deleteHabit = deleteHabit;

// ❌ УДАЛЯЕМ ТЕСТОВЫЕ ДАННЫЕ (БЛОК if (state.habits.length === 0) {...} ПОЛНОСТЬЮ УБРАН)
