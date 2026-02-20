// =====================================================
// MoodCraft — Telegram Mini App
// Основной файл с логикой приложения
// =============================================

// ==================== РАБОТА С TELEGRAM ====================
const tg = window.Telegram?.WebApp;
let tgUser = null;
if (tg) {
    tg.expand();
    tg.enableClosingConfirmation();
    tgUser = tg.initDataUnsafe?.user;
}

// ==================== ГЛОБАЛЬНОЕ СОСТОЯНИЕ ====================
const state = {
    habits: [],
    notes: [],
    currentMood: null,
    streak: 0,
    currentPage: 'home',
    currentWeek: 0,
    selectedDate: new Date(),
    editingNoteId: null,
    darkTheme: false
};

// ==================== ССЫЛКИ НА DOM ====================
const elements = {
    welcomeCard: document.getElementById('welcome-card'),
    moodSection: document.getElementById('mood-section'),
    habitsSection: document.getElementById('habits-section'),
    diarySection: document.getElementById('diary-section'),
    statsSection: document.getElementById('stats-section'),
    practiceSection: document.getElementById('practice-section'),
    accountSection: document.getElementById('account-section'),

    habitsList: document.getElementById('habits-list'),
    notesList: document.getElementById('notes-list'),
    weekDates: document.getElementById('week-dates'),

    streakCount: document.getElementById('streak-count'),
    habitsCounter: document.getElementById('habits-counter'),
    statStreak: document.getElementById('stat-streak'),
    statCompleted: document.getElementById('stat-completed'),
    statTotal: document.getElementById('stat-total'),

    accountName: document.getElementById('account-name'),
    accountAvatar: document.getElementById('account-avatar'),
    accountStatStreak: document.getElementById('account-stat-streak'),
    accountStatHabits: document.getElementById('account-stat-habits'),
    accountStatNotes: document.getElementById('account-stat-notes'),
    themeToggle: document.getElementById('theme-toggle'),

    addHabitBtn: document.getElementById('add-habit-btn'),
    navBtns: document.querySelectorAll('.bottom-nav .nav-btn'),
    moodBtns: document.querySelectorAll('.mood-btn'),

    habitModal: document.getElementById('habit-modal'),
    noteModal: document.getElementById('note-modal'),
    habitInput: document.getElementById('habit-input'),
    habitDesc: document.getElementById('habit-desc'),
    noteInput: document.getElementById('note-input'),
    charCount: document.getElementById('char-count'),

    prevWeekBtn: document.getElementById('prev-week'),
    nextWeekBtn: document.getElementById('next-week'),
    monthTitle: document.getElementById('month-title'),
    searchNotes: document.getElementById('search-notes'),

    greeting: document.getElementById('greeting'),
    currentDate: document.getElementById('current-date'),

    noteMoodOptions: document.querySelectorAll('.mood-option'),
    noteDeleteBtn: document.getElementById('note-delete-btn'),

    // Видео
    videoModal: document.getElementById('video-modal'),
    videoPlayer: document.getElementById('video-player'),
    videoModalTitle: document.getElementById('video-modal-title'),
    watchOnYoutubeBtn: document.getElementById('watch-on-youtube'),
    closeVideoModalBtn: document.getElementById('close-video-modal'),
    closeVideoBtn: document.getElementById('close-video-btn')
};

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    loadData();
    handleStartParam();
    applyTheme(state.darkTheme);
    setupGreeting();
    setupEventListeners();
    render();
    renderPracticeContent();
    renderAccountStats();
    switchPage('home');
}

// ==================== ОБРАБОТКА ПАРАМЕТРА ЗАПУСКА ====================
function handleStartParam() {
    const startParam = tg?.initDataUnsafe?.start_param;
    if (!startParam) return;

    console.log('Start param:', startParam);

    switch (startParam) {
        case 'today':
        case 'start':
        case 'home':
            switchPage('home');
            break;
        case 'diary':
            switchPage('diary');
            break;
        case 'add':
            switchPage('home');
            setTimeout(() => showModal('habit-modal'), 400);
            break;
        case 'note':
            switchPage('diary');
            state.selectedDate = new Date();
            const todayNote = state.notes.find(n => isSameDay(new Date(n.date), new Date()));
            if (todayNote) {
                state.editingNoteId = todayNote.id;
                setTimeout(() => openNoteModal(todayNote), 400);
            } else {
                setTimeout(() => openNoteModal(), 400);
            }
            break;
        default:
            switchPage('home');
    }
}

function setupGreeting() {
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    let name = 'Друг';
    if (tgUser) name = tgUser.first_name || 'Друг';
    if (elements.greeting) elements.greeting.textContent = `Привет, ${name}!`;
    if (elements.currentDate) elements.currentDate.textContent = now.toLocaleDateString('ru-RU', options);
    if (elements.accountName) elements.accountName.textContent = name;
}

function setupEventListeners() {
    // Переключение страниц
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

    // Календарь
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

    // Модалки
    setupModalControls();

    // Вкладки практик
    setupPracticeTabs();

    // Тема
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('change', (e) => {
            state.darkTheme = e.target.checked;
            applyTheme(state.darkTheme);
            saveData();
        });
    }

    // Скрытие клавиатуры
    document.addEventListener('click', function(e) {
        const searchInput = elements.searchNotes;
        if (searchInput && !searchInput.contains(e.target)) {
            searchInput.blur();
        }
    });
}

function setupModalControls() {
    // Закрытие модалки привычки
    document.querySelectorAll('#habit-modal .close-btn, #cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal('habit-modal');
            if (elements.habitInput) elements.habitInput.value = '';
            if (elements.habitDesc) elements.habitDesc.value = '';
        });
    });
    document.getElementById('save-btn')?.addEventListener('click', saveHabit);
    elements.habitInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveHabit();
    });

    // Закрытие модалки заметки
    document.querySelectorAll('#note-modal .close-btn, #note-cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal('note-modal');
            if (elements.noteInput) elements.noteInput.value = '';
            state.editingNoteId = null;
        });
    });
    document.getElementById('note-save-btn')?.addEventListener('click', saveNote);
    if (elements.noteDeleteBtn) {
        elements.noteDeleteBtn.addEventListener('click', deleteCurrentNote);
    }
    elements.noteInput?.addEventListener('input', (e) => {
        if (elements.charCount) elements.charCount.textContent = `${e.target.value.length}/1000`;
    });

    // Выбор настроения в заметке
    elements.noteMoodOptions.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.noteMoodOptions.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });

    // Закрытие модалок по клику на фон
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideModal(modal.id);
        });
    });

    // ----- Видео-модалка -----
    if (elements.closeVideoModalBtn) {
        elements.closeVideoModalBtn.addEventListener('click', () => hideModal('video-modal'));
    }
    if (elements.closeVideoBtn) {
        elements.closeVideoBtn.addEventListener('click', () => hideModal('video-modal'));
    }
    if (elements.watchOnYoutubeBtn) {
        elements.watchOnYoutubeBtn.addEventListener('click', () => {
            const url = elements.watchOnYoutubeBtn.dataset.url;
            if (url) window.open(url, '_blank');
        });
    }
}

function switchPage(page) {
    state.currentPage = page;

    const sections = [
        elements.welcomeCard,
        elements.moodSection,
        elements.habitsSection,
        elements.diarySection,
        elements.statsSection,
        elements.practiceSection,
        elements.accountSection
    ];
    sections.forEach(el => el?.classList.add('hidden'));

    if (page === 'home') {
        elements.welcomeCard?.classList.remove('hidden');
        elements.moodSection?.classList.remove('hidden');
        elements.habitsSection?.classList.remove('hidden');
        elements.statsSection?.classList.remove('hidden');
    } else if (page === 'diary') {
        elements.diarySection?.classList.remove('hidden');
        renderCalendar();
        renderNotes();
    } else if (page === 'practice') {
        elements.practiceSection?.classList.remove('hidden');
    } else if (page === 'account') {
        elements.accountSection?.classList.remove('hidden');
        renderAccountStats();
    }
}

function applyTheme(isDark) {
    if (isDark) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    if (elements.themeToggle) {
        elements.themeToggle.checked = isDark;
    }
}

// ==================== НАСТРОЕНИЕ ====================
function setMood(mood) {
    state.currentMood = mood;
    saveData();

    const moodNames = ['', 'Плохо', 'Не очень', 'Хорошо', 'Отлично!'];
    showToast(moodNames[mood]);
}

// ==================== ПРИВЫЧКИ ====================
function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

function migrateHabits(habits) {
    return habits.map(habit => ({
        ...habit,
        completedDates: habit.completedDates || (habit.completed ? [getTodayString()] : []),
        description: habit.description || ''
    }));
}

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
    let current = 1, max = 1;
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

function getCompletedTodayCount() {
    const today = getTodayString();
    return state.habits.filter(h => h.completedDates.includes(today)).length;
}

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

function deleteHabit(id) {
    if (confirm('Удалить привычку?')) {
        state.habits = state.habits.filter(h => h.id !== id);
        calculateOverallStreak();
        saveData();
        render();
        showToast('Привычка удалена');
    }
}

function saveHabit() {
    const title = elements.habitInput?.value.trim();
    if (!title) {
        showToast('Введите название привычки');
        return;
    }
    const description = elements.habitDesc?.value.trim() || '';
    const newHabit = {
        id: Date.now(),
        title,
        description,
        completedDates: [],
        createdAt: new Date().toISOString()
    };
    state.habits.push(newHabit);
    hideModal('habit-modal');
    if (elements.habitInput) elements.habitInput.value = '';
    if (elements.habitDesc) elements.habitDesc.value = '';
    saveData();
    render();
    showToast('Привычка добавлена');
}

// ==================== ОТРИСОВКА ГЛАВНОЙ ====================
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
        const completed = habit.completedDates.includes(getTodayString());
        return `
            <div class="habit-item">
                <div class="habit-info">
                    <div class="habit-icon">${completed ? '✅' : '📎'}</div>
                    <div class="habit-text">
                        <h4>${habit.title}</h4>
                        ${habit.description ? `<div class="habit-description">${habit.description}</div>` : ''}
                        <p>Выполнено дней: ${habit.completedDates.length}</p>
                    </div>
                </div>
                <div class="habit-actions">
                    <button class="habit-delete" onclick="deleteHabit(${habit.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="habit-check ${completed ? 'checked' : ''}" 
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

// ==================== КАЛЕНДАРЬ ====================
function renderCalendar() {
    if (!elements.weekDates) return;
    const today = new Date();
    const currentDate = new Date();
    currentDate.setDate(today.getDate() + (state.currentWeek * 7));
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    if (elements.monthTitle) {
        elements.monthTitle.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }

    // Находим понедельник этой недели
    const monday = new Date(currentDate);
    const day = monday.getDay(); // 0 = воскресенье, 1 = понедельник, ...
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

        // Отмечаем сегодняшний день
        if (isSameDay(date, today)) btn.classList.add('today');

        // Отмечаем выбранный день
        if (state.selectedDate && isSameDay(date, state.selectedDate)) btn.classList.add('selected');

        // Отмечаем дни с заметками
        const hasNote = state.notes.some(note => {
            try { return isSameDay(new Date(note.date), date); } catch { return false; }
        });
        if (hasNote) btn.classList.add('has-note');

        // Дни из другого месяца
        if (date.getMonth() !== currentDate.getMonth()) btn.classList.add('other-month');

        // Выделяем выходные
        if (i === 5 || i === 6) btn.classList.add('weekend-number');

        const dateCopy = new Date(date);
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (dateCopy > new Date()) {
                showToast('Заметки заранее недоступны');
                return;
            }
            const existingNote = state.notes.find(n => isSameDay(new Date(n.date), dateCopy));
            if (existingNote) {
                state.editingNoteId = existingNote.id;
                state.selectedDate = dateCopy;
                openNoteModal(existingNote);
            } else {
                state.selectedDate = dateCopy;
                openNoteModal();
            }
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

// ==================== ЗАМЕТКИ ====================
function renderNotes() {
    if (!elements.notesList) return;
    const query = elements.searchNotes?.value.toLowerCase() || '';
    let filtered = state.notes.filter(n => n.text.toLowerCase().includes(query))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
        elements.notesList.innerHTML = `<div class="empty-state"><div class="emoji">📝</div><p>${query ? 'Заметки не найдены' : 'Пока нет заметок'}</p></div>`;
        return;
    }

    const moodEmojis = [
        '', 
        '<img src="images/badly.png" class="note-mood-img" alt="Плохо">',
        '<img src="images/not_good.png" class="note-mood-img" alt="Не очень">',
        '<img src="images/good.png" class="note-mood-img" alt="Хорошо">',
        '<img src="images/great.png" class="note-mood-img" alt="Отлично!">'
    ];

    elements.notesList.innerHTML = filtered.map(note => {
        const date = new Date(note.date);
        const today = new Date(), yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        let display = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        if (isSameDay(date, today)) display = 'Сегодня';
        else if (isSameDay(date, yesterday)) display = 'Вчера';
        const preview = note.text.length > 100 ? note.text.slice(0, 100) + '…' : note.text;
        const moodEmoji = note.mood ? moodEmojis[note.mood] : '';
        return `<div class="note-card" data-id="${note.id}">
                    <div class="note-header">
                        <div class="note-date">${display}</div>
                        ${moodEmoji ? `<div class="note-mood">${moodEmoji}</div>` : ''}
                    </div>
                    <div class="note-text">${preview}</div>
                </div>`;
    }).join('');

    document.querySelectorAll('.note-card').forEach(card => {
        card.addEventListener('click', function () {
            const id = parseInt(this.dataset.id);
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
    if (!note && state.selectedDate > new Date()) {
        showToast('Заметки заранее недоступны');
        return;
    }

    if (elements.noteInput) elements.noteInput.value = note ? note.text : '';
    if (elements.charCount) elements.charCount.textContent = `${elements.noteInput?.value.length || 0}/1000`;

    const title = document.getElementById('note-title');
    if (title) title.textContent = note ? 'Редактировать заметку' : 'Новая заметка';

    const moodToSelect = note ? note.mood : state.currentMood;
    elements.noteMoodOptions.forEach(btn => {
        const moodVal = parseInt(btn.dataset.mood);
        if (moodVal === moodToSelect) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });

    showModal('note-modal');
    elements.noteInput?.focus();
}

function saveNote() {
    const text = elements.noteInput?.value.trim();
    if (!text) {
        showToast('Введите текст заметки');
        return;
    }

    let selectedMood = null;
    elements.noteMoodOptions.forEach(btn => {
        if (btn.classList.contains('selected')) {
            selectedMood = parseInt(btn.dataset.mood);
        }
    });

    if (state.editingNoteId) {
        const idx = state.notes.findIndex(n => n.id === state.editingNoteId);
        if (idx !== -1) {
            state.notes[idx].text = text;
            state.notes[idx].mood = selectedMood;
            state.notes[idx].updatedAt = new Date().toISOString();
        }
    } else {
        state.notes.push({
            id: Date.now(),
            date: state.selectedDate.toISOString(),
            text,
            mood: selectedMood,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }

    hideModal('note-modal');
    if (elements.noteInput) elements.noteInput.value = '';
    state.editingNoteId = null;
    saveData();
    renderCalendar();
    renderNotes();
    showToast('Заметка сохранена');
}

function deleteCurrentNote() {
    if (!state.editingNoteId) {
        hideModal('note-modal');
        return;
    }

    if (confirm('Удалить эту заметку?')) {
        state.notes = state.notes.filter(n => n.id !== state.editingNoteId);
        state.editingNoteId = null;
        hideModal('note-modal');
        if (elements.noteInput) elements.noteInput.value = '';
        saveData();
        renderCalendar();
        renderNotes();
        showToast('Заметка удалена');
    }
}

// ==================== ПРАКТИКИ (ОБНОВЛЕНО) ====================
function setupPracticeTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            tabs.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${tab}-tab`)?.classList.add('active');
        });
    });
}

function renderPracticeContent() {
   const workouts = [
        { title: 'Тренировка БЕЗ ПОВТОРОВ с ГАНТЕЛЯМИ за 40 минут | Упражнения На Всё тело', duration: '40 мин', videoId: 'ujkE3ZOcTrQ', channel: 'Татьяна Метельская', views: '456 тыс.' },
        { title: 'Тренировка БЕЗ ПОВТОРОВ с ГАНТЕЛЯМИ за 40 минут | Упражнения На Всё тело (2)', duration: '40 мин', videoId: 'E16zGKdeMz4', channel: 'Татьяна Метельская', views: '389 тыс.' },
        { title: 'ШАГИ ДЛЯ ПОХУДЕНИЯ под Русскоязычные Хиты 2000-х! | Пройди 5000 ШАГОВ ДОМА', duration: '30 мин', videoId: '32xCCheCMtQ', channel: 'Татьяна Метельская', views: '178 тыс.' },
        { title: 'Танцевальная Зарядка за 10 минут под Хиты 2000-х!', duration: '10 мин', videoId: 'jzuULVNrWhE', channel: 'Татьяна Метельская', views: '250 тыс.' },
        { title: 'КРУГОВАЯ Тренировка на Все Тело с ГАНТЕЛЯМИ за 45 Минут | Жиросжигатель', duration: '45 мин', videoId: 'F3a9Lxay_sc', channel: 'Татьяна Метельская', views: '192 тыс.' },
        { title: 'Шаговая Тренировка за 15 минут под Рок Хиты! | ШАГАЙ ДОМА и ХУДЕЙ', duration: '15 мин', videoId: 'v4JvhFGh5Kw', channel: 'Татьяна Метельская', views: '310 тыс.' },
        { title: 'Тренировка на Всё Тело БЕЗ ПОВТОРОВ с Гантелями за 15 минут Дома', duration: '15 мин', videoId: 'h1WpYiXVS6s', channel: 'Татьяна Метельская', views: '167 тыс.' },
        { title: 'Утренняя Зарядка СТОЯ за 5 минут | Суставная Разминка на Всё Тело', duration: '5 мин', videoId: 'zFOG16nn-iY', channel: 'Татьяна Метельская', views: '412 тыс.' },
        { title: 'Пилатес для Плоского Живота за 10 минут | Спокойная Тренировка на ПРЕСС', duration: '10 мин', videoId: 'aOzIPZ1aPRo', channel: 'Татьяна Метельская', views: '288 тыс.' },
        { title: 'Жиросжигающая Тренировка ТАБАТА на ВСЁ ТЕЛО за 30 минут | Убери Живот Быстро!', duration: '30 мин', videoId: 'u0drnTv2v6c', channel: 'Татьяна Метельская', views: '345 тыс.' }
    ];
    const meditations = [
        { title: 'Осознанное дыхание', duration: '5 мин', videoId: 'aakb1q0A8dk', channel: 'Медитации', views: '34 тыс.' },
        { title: 'Сканирование тела', duration: '15 мин', videoId: 'sG4NFqU7I7s', channel: 'Медитации', views: '22 тыс.' },
        { title: 'Медитация благодарности', duration: '10 мин', videoId: '7tF-4Tg4XgU', channel: 'Медитации', views: '18 тыс.' }
    ];

    const wTab = document.getElementById('workouts-tab');
    const mTab = document.getElementById('meditations-tab');

    if (wTab) {
        wTab.innerHTML = `<div class="videos-grid">${workouts.map(v => `
            <div class="video-card">
                <div class="video-thumbnail">
                    <img src="https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg" alt="${v.title}" loading="lazy">
                    <span class="video-duration-badge">${v.duration}</span>
                </div>
                <div class="video-info">
                    <h4 class="video-title">${v.title}</h4>
                    <div class="video-meta">
                        <span class="video-channel">
                            <span class="channel-avatar">🏋️</span>
                            ${v.channel}
                        </span>
                        <span class="video-views">👁️ ${v.views}</span>
                    </div>
                    <div class="video-actions">
                        <button class="video-link" data-video-id="${v.videoId}" data-title="${v.title}">
                            <i class="fas fa-play"></i> Смотреть
                        </button>
                    </div>
                </div>
            </div>`).join('')}</div>`;

        wTab.querySelectorAll('.video-link').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const videoId = btn.dataset.videoId;
                const title = btn.dataset.title;
                openVideoModal(title, videoId);
            });
        });
    }

    if (mTab) {
        mTab.innerHTML = `<div class="videos-grid">${meditations.map(v => `
            <div class="video-card">
                <div class="video-thumbnail">
                    <img src="https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg" alt="${v.title}" loading="lazy">
                    <span class="video-duration-badge">${v.duration}</span>
                </div>
                <div class="video-info">
                    <h4 class="video-title">${v.title}</h4>
                    <div class="video-meta">
                        <span class="video-channel">
                            <span class="channel-avatar">🧘</span>
                            ${v.channel}
                        </span>
                        <span class="video-views">👁️ ${v.views}</span>
                    </div>
                    <div class="video-actions">
                        <button class="video-link" data-video-id="${v.videoId}" data-title="${v.title}">
                            <i class="fas fa-play"></i> Смотреть
                        </button>
                    </div>
                </div>
            </div>`).join('')}</div>`;

        mTab.querySelectorAll('.video-link').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const videoId = btn.dataset.videoId;
                const title = btn.dataset.title;
                openVideoModal(title, videoId);
            });
        });
    }
}

// ==================== ВИДЕО ПЛЕЕР ====================
function openVideoModal(title, videoId) {
    if (!elements.videoModal || !elements.videoPlayer) return;
    
    elements.videoModalTitle.textContent = title;
    
    // Формируем embed URL с параметрами для нормальной работы без авторизации
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&fs=1&rel=0&modestbranding=1`;
    elements.videoPlayer.src = embedUrl;
    
    // Сохраняем URL для кнопки "Смотреть на YouTube"
    elements.watchOnYoutubeBtn.dataset.url = `https://youtu.be/${videoId}`;
    
    showModal('video-modal');
}

// ==================== АККАУНТ ====================
function renderAccountStats() {
    if (elements.accountStatStreak) elements.accountStatStreak.textContent = state.streak;
    if (elements.accountStatHabits) elements.accountStatHabits.textContent = state.habits.length;
    if (elements.accountStatNotes) elements.accountStatNotes.textContent = state.notes.length;
}

// ==================== МОДАЛЬНЫЕ ОКНА ====================
function showModal(modalId) {
    document.getElementById(modalId)?.classList.add('active');
}
function hideModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
    // Останавливаем видео при закрытии
    if (modalId === 'video-modal' && elements.videoPlayer) {
        elements.videoPlayer.src = '';
    }
}

// ==================== TOAST ====================
function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
        background: var(--text-primary); color: var(--bg-primary);
        padding: 12px 24px; border-radius: 40px; font-size: 14px;
        z-index: 1000; animation: fadeInOut 2s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// ==================== СОХРАНЕНИЕ И ЗАГРУЗКА ====================
function saveData() {
    const data = {
        habits: state.habits,
        notes: state.notes,
        currentMood: state.currentMood,
        streak: state.streak,
        darkTheme: state.darkTheme,
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
            state.currentMood = data.currentMood || null;
            state.streak = data.streak || 0;
            state.darkTheme = data.darkTheme || false;

            calculateOverallStreak();

            if (state.currentMood) {
                elements.moodBtns.forEach(btn => {
                    if (parseInt(btn.dataset.mood) === state.currentMood) {
                        btn.classList.add('active');
                    }
                });
            }
        } catch (e) {
            console.error('Ошибка загрузки данных', e);
        }
    }
}

// ==================== ГЛОБАЛЬНЫЕ ФУНКЦИИ ====================
window.toggleHabit = toggleHabit;
window.deleteHabit = deleteHabit;

