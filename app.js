// =====================================================
// MoodCraft — Telegram Mini App
// Основной файл с логикой приложения
// Комментарии написаны простым языком, чтобы было понятно
// =====================================================

// ==================== РАБОТА С TELEGRAM ====================
const tg = window.Telegram?.WebApp;          // Объект Telegram Web App
let tgUser = null;                           // Данные пользователя из Telegram
if (tg) {
    tg.expand();                              // Растягиваем на весь экран
    tg.enableClosingConfirmation();            // Подтверждение при закрытии
    tgUser = tg.initDataUnsafe?.user;          // Получаем информацию о юзере
}

// ==================== ГЛОБАЛЬНОЕ СОСТОЯНИЕ ПРИЛОЖЕНИЯ ====================
const state = {
    habits: [],                                // Список привычек
    notes: [],                                 // Заметки
    currentMood: null,                          // Текущее настроение (1-5)
    streak: 0,                                  // Общая серия дней
    currentPage: 'home',                         // Активная страница (home, diary, practice, account)
    currentWeek: 0,                              // Смещение недели для календаря
    selectedDate: new Date(),                    // Выбранная дата в календаре
    editingNoteId: null,                          // ID заметки, которую редактируем (null если новая)
    darkTheme: false                              // Флаг тёмной темы
};

// ==================== ССЫЛКИ НА DOM-ЭЛЕМЕНТЫ ====================
// Чтобы не писать document.getElementById каждый раз
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
    noteInput: document.getElementById('note-input'),
    charCount: document.getElementById('char-count'),

    prevWeekBtn: document.getElementById('prev-week'),
    nextWeekBtn: document.getElementById('next-week'),
    monthTitle: document.getElementById('month-title'),
    searchNotes: document.getElementById('search-notes'),

    greeting: document.getElementById('greeting'),
    currentDate: document.getElementById('current-date'),

    // Новые элементы для выбора настроения в модалке заметки
    noteMoodOptions: document.querySelectorAll('.mood-option'),
    noteDeleteBtn: document.getElementById('note-delete-btn')
};

// ==================== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ====================
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    loadData();                               // Загружаем данные из localStorage
    applyTheme(state.darkTheme);                // Применяем сохранённую тему
    setupGreeting();                            // Устанавливаем приветствие
    setupEventListeners();                       // Вешаем обработчики событий
    render();                                    // Отрисовываем главную страницу
    renderPracticeContent();                     // Заполняем раздел практик
    renderAccountStats();                        // Обновляем статистику в аккаунте
    switchPage('home');                          // Показываем главную страницу
}

// ==================== ПРИВЕТСТВИЕ И ДАТА ====================
function setupGreeting() {
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    let name = 'Друг';
    if (tgUser) name = tgUser.first_name || 'Друг';
    if (elements.greeting) elements.greeting.textContent = `Привет, ${name}!`;
    if (elements.currentDate) elements.currentDate.textContent = now.toLocaleDateString('ru-RU', options);
    if (elements.accountName) elements.accountName.textContent = name;
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
function setupEventListeners() {
    // Переключение страниц через нижнее меню
    elements.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            switchPage(page);
            elements.navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Выбор настроения на главной
    elements.moodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mood = parseInt(btn.dataset.mood);
            setMood(mood);
            elements.moodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Кнопка добавления привычки
    if (elements.addHabitBtn) {
        elements.addHuntBtn.addEventListener('click', () => {
            showModal('habit-modal');
            elements.habitInput?.focus();
        });
    }

    // Переключение недели в календаре
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

    // Поиск по заметкам
    elements.searchNotes?.addEventListener('input', renderNotes);

    // Управление модальными окнами
    setupModalControls();

    // Вкладки в разделе практик
    setupPracticeTabs();

    // Переключение тёмной темы
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('change', (e) => {
            state.darkTheme = e.target.checked;
            applyTheme(state.darkTheme);
            saveData();
        });
    }
}

// ==================== УПРАВЛЕНИЕ МОДАЛКАМИ ====================
function setupModalControls() {
    // Закрытие модалки привычки по крестику или кнопке "Отмена"
    document.querySelectorAll('#habit-modal .close-btn, #cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal('habit-modal');
            if (elements.habitInput) elements.habitInput.value = '';
        });
    });
    // Сохранение привычки
    document.getElementById('save-btn')?.addEventListener('click', saveHabit);
    // Сохранение по Enter
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

    // Сохранение заметки
    document.getElementById('note-save-btn')?.addEventListener('click', saveNote);

    // Удаление заметки (новая кнопка)
    if (elements.noteDeleteBtn) {
        elements.noteDeleteBtn.addEventListener('click', deleteCurrentNote);
    }

    // Счётчик символов в заметке
    elements.noteInput?.addEventListener('input', (e) => {
        if (elements.charCount) elements.charCount.textContent = `${e.target.value.length}/1000`;
    });

    // Выбор настроения внутри модалки заметки
    elements.noteMoodOptions.forEach(btn => {
        btn.addEventListener('click', () => {
            // Убираем выделение со всех
            elements.noteMoodOptions.forEach(b => b.classList.remove('selected'));
            // Выделяем текущую
            btn.classList.add('selected');
        });
    });

    // Закрытие модалки при клике на фон
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideModal(modal.id);
        });
    });
}

// ==================== НАВИГАЦИЯ ПО СТРАНИЦАМ ====================
function switchPage(page) {
    state.currentPage = page;

    // Скрываем все секции
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

    // Показываем нужные
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

// ==================== ТЁМНАЯ ТЕМА ====================
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
    showToast('Настроение сохранено');
}

// ==================== ПРИВЫЧКИ ====================
// Возвращает сегодняшнюю дату в формате YYYY-MM-DD
function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

// Преобразует старые данные привычек (без completedDates) в новый формат
function migrateHabits(habits) {
    return habits.map(habit => ({
        ...habit,
        completedDates: habit.completedDates || (habit.completed ? [getTodayString()] : [])
    }));
}

// Пересчитывает общую серию дней (максимальная непрерывная цепочка дней,
// в которые была выполнена хотя бы одна привычка)
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

// Сколько привычек выполнено сегодня
function getCompletedTodayCount() {
    const today = getTodayString();
    return state.habits.filter(h => h.completedDates.includes(today)).length;
}

// Отметить/снять отметку выполнения привычки
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

// Удалить привычку
function deleteHabit(id) {
    if (confirm('Удалить привычку?')) {
        state.habits = state.habits.filter(h => h.id !== id);
        calculateOverallStreak();
        saveData();
        render();
        showToast('Привычка удалена');
    }
}

// Сохранить новую привычку из модалки
function saveHabit() {
    const title = elements.habitInput?.value.trim();
    if (!title) {
        showToast('Введите название привычки');
        return;
    }
    const newHabit = {
        id: Date.now(),
        title,
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

// ==================== ОТРИСОВКА ГЛАВНОЙ ====================
function render() {
    renderHabits();
    updateStats();
}

// Показать список привычек
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
                    <div class="habit-icon">${completed ? '✅' : '📌'}</div>
                    <div class="habit-text">
                        <h4>${habit.title}</h4>
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

// Обновить статистику на главной
function updateStats() {
    const completedToday = getCompletedTodayCount();
    const total = state.habits.length;
    if (elements.streakCount) elements.streakCount.textContent = state.streak;
    if (elements.statStreak) elements.statStreak.textContent = state.streak;
    if (elements.statCompleted) elements.statCompleted.textContent = completedToday;
    if (elements.statTotal) elements.statTotal.textContent = total;
}

// ==================== КАЛЕНДАРЬ ====================
// Показывает неделю с понедельника по воскресенье
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
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1); // Коррекция, чтобы понедельник был первым
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
            try { return isSameDay(new Date(note.date), date); } catch { return false; }
        });
        if (hasNote) btn.classList.add('has-note');

        if (date.getMonth() !== currentDate.getMonth()) btn.classList.add('other-month');

        const dateCopy = new Date(date);
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.selectedDate = dateCopy;
            renderCalendar();
            openNoteModal(); // Открываем модалку для создания заметки на выбранный день
        });
        elements.weekDates.appendChild(btn);
    }
}

// Сравнение двух дат (без учёта времени)
function isSameDay(date1, date2) {
    if (!date1 || !date2) return false;
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
}

// ==================== ЗАМЕТКИ ====================
// Отображает список заметок с учётом поиска
function renderNotes() {
    if (!elements.notesList) return;
    const query = elements.searchNotes?.value.toLowerCase() || '';
    let filtered = state.notes.filter(n => n.text.toLowerCase().includes(query))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
        elements.notesList.innerHTML = `<div class="empty-state"><div class="emoji">📝</div><p>${query ? 'Заметки не найдены' : 'Пока нет заметок'}</p></div>`;
        return;
    }

    const moodEmojis = ['', '😢', '😔', '😐', '🙂', '😊'];

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

    // Клик по карточке заметки открывает её для редактирования
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

// Открыть модалку заметки (для создания или редактирования)
function openNoteModal(note = null) {
    // Заполняем поля
    if (elements.noteInput) elements.noteInput.value = note ? note.text : '';
    if (elements.charCount) elements.charCount.textContent = `${elements.noteInput?.value.length || 0}/1000`;

    // Устанавливаем заголовок
    const title = document.getElementById('note-title');
    if (title) title.textContent = note ? 'Редактировать заметку' : 'Новая заметка';

    // Выделяем настроение, если оно есть у заметки или берём текущее
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

// Сохранить заметку (новую или изменённую)
function saveNote() {
    const text = elements.noteInput?.value.trim();
    if (!text) {
        showToast('Введите текст заметки');
        return;
    }

    // Определяем выбранное настроение (берём из выделенной кнопки в модалке)
    let selectedMood = null;
    elements.noteMoodOptions.forEach(btn => {
        if (btn.classList.contains('selected')) {
            selectedMood = parseInt(btn.dataset.mood);
        }
    });

    if (state.editingNoteId) {
        // Редактирование существующей заметки
        const idx = state.notes.findIndex(n => n.id === state.editingNoteId);
        if (idx !== -1) {
            state.notes[idx].text = text;
            state.notes[idx].mood = selectedMood; // обновляем настроение
            state.notes[idx].updatedAt = new Date().toISOString();
        }
    } else {
        // Новая заметка
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

// Удалить текущую заметку (ту, что открыта в модалке)
function deleteCurrentNote() {
    if (!state.editingNoteId) {
        // Если это новая заметка (ещё не сохранена) — просто закрываем модалку
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

// ==================== ПРАКТИКИ ====================
// Переключение вкладок Тренировки / Медитации
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

// Заполнение контентом (заглушки, можно заменить на реальные ссылки)
function renderPracticeContent() {
    const workouts = [
        { title: 'Утренняя зарядка', duration: '10 мин', url: '#', thumb: '🏋️' },
        { title: 'Йога для начинающих', duration: '20 мин', url: '#', thumb: '🧘' },
        { title: 'Кардио дома', duration: '15 мин', url: '#', thumb: '🔥' }
    ];
    const meditations = [
        { title: 'Осознанное дыхание', duration: '5 мин', url: '#', thumb: '🌿' },
        { title: 'Сканирование тела', duration: '15 мин', url: '#', thumb: '🧠' },
        { title: 'Медитация благодарности', duration: '10 мин', url: '#', thumb: '💖' }
    ];
    const wTab = document.getElementById('workouts-tab');
    const mTab = document.getElementById('meditations-tab');
    if (wTab) {
        wTab.innerHTML = `<div class="videos-grid">${workouts.map(v => `
            <div class="video-card">
                <div class="video-thumbnail">${v.thumb}</div>
                <div class="video-info">
                    <div class="video-title">${v.title}</div>
                    <div class="video-duration">${v.duration}</div>
                    <a href="${v.url}" target="_blank" class="video-link">Смотреть</a>
                </div>
            </div>`).join('')}</div>`;
    }
    if (mTab) {
        mTab.innerHTML = `<div class="videos-grid">${meditations.map(v => `
            <div class="video-card">
                <div class="video-thumbnail">${v.thumb}</div>
                <div class="video-info">
                    <div class="video-title">${v.title}</div>
                    <div class="video-duration">${v.duration}</div>
                    <a href="${v.url}" target="_blank" class="video-link">Смотреть</a>
                </div>
            </div>`).join('')}</div>`;
    }
}

// ==================== АККАУНТ ====================
function renderAccountStats() {
    if (elements.accountStatStreak) elements.accountStatStreak.textContent = state.streak;
    if (elements.accountStatHabits) elements.accountStatHabits.textContent = state.habits.length;
    if (elements.accountStatNotes) elements.accountStatNotes.textContent = state.notes.length;
}

// ==================== МОДАЛЬНЫЕ ОКНА (ПОКАЗАТЬ/СКРЫТЬ) ====================
function showModal(modalId) {
    document.getElementById(modalId)?.classList.add('active');
}
function hideModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
}

// ==================== УВЕДОМЛЕНИЯ (TOAST) ====================
function showToast(message) {
    // Если есть Telegram, показываем alert (но он некрасивый, можно заменить)
    if (tg?.showAlert) {
        tg.showAlert(message);
        return;
    }
    // Создаём временный элемент внизу экрана
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
        background: var(--text-primary); color: var(--bg-primary);
        padding: 12px 24px; border-radius: 40px; font-size: 14px;
        z-index: 1000; animation: fadeInOut 2s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// ==================== СОХРАНЕНИЕ И ЗАГРУЗКА ДАННЫХ (localStorage) ====================
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

            // Восстанавливаем активную кнопку настроения на главной
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

// ==================== ГЛОБАЛЬНЫЕ ФУНКЦИИ (для вызова из HTML) ====================
window.toggleHabit = toggleHabit;
window.deleteHabit = deleteHabit;
