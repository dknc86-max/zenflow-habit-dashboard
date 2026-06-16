/* ==========================================================================
   ZenFlow Dashboard Core Application Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // URL Cleanup Hook
    if (window.location.search.includes('clear=true')) {
        localStorage.removeItem('zenflow_state');
        window.location.href = window.location.pathname;
        return;
    }

    // ---------------------------------------------------------
    // App State Management
    // ---------------------------------------------------------
    let state = {
        habits: [
            { id: 'coding', name: 'Write Code', icon: 'code', streak: 0 },
            { id: 'workout', name: 'Exercise / Workout', icon: 'barbell', streak: 0 },
            { id: 'hydration', name: 'Drink Water (2L)', icon: 'droplet', streak: 0 },
            { id: 'reading', name: 'Read 15 Pages', icon: 'book-open', streak: 0 },
            { id: 'mindfulness', name: 'Meditation (10m)', icon: 'sunset', streak: 0 }
        ],
        logs: [],
        level: 1,
        exp: 0,
        unlockedBadges: [],
        streakFreezes: 1,
        usedFreezes: []
    };

    // Load State from LocalStorage
    const loadState = () => {
        const stored = localStorage.getItem('zenflow_state');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.habits && parsed.logs) {
                    state = parsed;
                    if (!state.level) state.level = 1;
                    if (!state.exp) state.exp = 0;
                    if (!state.unlockedBadges) state.unlockedBadges = [];
                    if (state.streakFreezes === undefined) state.streakFreezes = 1;
                    if (!state.usedFreezes) state.usedFreezes = [];
                }
            } catch (e) {
                console.error("Failed to parse LocalStorage state, using defaults.", e);
            }
        }
    };


    // Save State to LocalStorage
    const saveState = () => {
        localStorage.setItem('zenflow_state', JSON.stringify(state));
        updateDashboardMetrics();
    };

    // ---------------------------------------------------------
    // Gamification Engine (EXP, Levels, Badges)
    // ---------------------------------------------------------
    const renderGamification = () => {
        const levelText = document.getElementById('user-level-text');
        const expFill = document.getElementById('user-exp-fill');
        const expText = document.getElementById('user-exp-text');
        
        if (levelText) levelText.textContent = `Level ${state.level}`;
        if (expText) expText.textContent = `${state.exp} / 100 EXP`;
        if (expFill) expFill.style.width = `${Math.min(state.exp, 100)}%`;

        renderBadges();
    };

    const addExp = (amount) => {
        state.exp += amount;
        let leveledUp = false;
        while (state.exp >= 100) {
            state.level++;
            state.exp -= 100;
            leveledUp = true;
        }
        if (leveledUp) {
            showToast(`Level Up! You are now Level ${state.level}!`, 'success');
            const levelHeader = document.querySelector('.level-header');
            if (levelHeader) {
                levelHeader.classList.add('level-up-toast');
                setTimeout(() => levelHeader.classList.remove('level-up-toast'), 2000);
            }
        }
        saveState();
        renderGamification();
        checkBadges();
    };

    const checkBadges = () => {
        const unlock = (id) => {
            if (!state.unlockedBadges.includes(id)) {
                state.unlockedBadges.push(id);
                showToast(`Badge Unlocked!`, 'success');
                saveState();
                renderBadges();
            }
        };

        const todayLog = getOrCreateTodayLog();
        
        // 1. First Step
        if (todayLog.completedHabits.length >= 1) unlock('first_step');
        
        // 2. Perfect Harmony
        if (todayLog.completedHabits.length > 0 && todayLog.completedHabits.length === state.habits.length) unlock('perfect_harmony');

        // 3. Unstoppable (3 day streak)
        let hasUnstoppable = false;
        if (typeof calculateHabitStreak === 'function') {
            state.habits.forEach(h => { if (calculateHabitStreak(h.id) >= 3) hasUnstoppable = true; });
        }
        if (hasUnstoppable) unlock('unstoppable');
    };

    const renderBadges = () => {
        const container = document.getElementById('badges-container');
        if (!container) return;
        
        const allBadges = [
            { id: 'first_step', name: 'First Step', icon: 'footprints' },
            { id: 'perfect_harmony', name: 'Perfect Harmony', icon: 'star' },
            { id: 'unstoppable', name: 'Unstoppable', icon: 'flame' },
            { id: 'deep_dive', name: 'Deep Dive', icon: 'target' }
        ];

        container.innerHTML = '';
        allBadges.forEach(b => {
            const unlocked = state.unlockedBadges.includes(b.id);
            container.insertAdjacentHTML('beforeend', `
                <div class="badge-item ${unlocked ? 'unlocked' : ''}">
                    <div class="badge-icon-wrapper" title="${b.name}">
                        <i data-lucide="${b.icon}"></i>
                    </div>
                    <span class="badge-name">${b.name}</span>
                </div>
            `);
        });
        lucide.createIcons();
    };

    // ---------------------------------------------------------
    // Toast Notification System
    // ---------------------------------------------------------
    const showToast = (message, type = 'success') => {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const MAX_TOASTS = 5;
        const existing = container.querySelectorAll('.notification-toast');
        if (existing.length >= MAX_TOASTS) {
            existing[0].remove();
        }

        const toast = document.createElement('div');
        toast.className = `notification-toast ${type}`;
        
        let iconName = 'check-circle';
        if (type === 'error') iconName = 'alert-triangle';
        if (type === 'info') iconName = 'info';

        toast.innerHTML = `
            <i data-lucide="${iconName}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        lucide.createIcons();

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(15px) scale(0.95)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // ---------------------------------------------------------
    // Tab Navigation Logic
    // ---------------------------------------------------------
    const setupNavigation = () => {
        const navItems = document.querySelectorAll('.nav-item');
        const panels = document.querySelectorAll('.tab-panel');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetTab = item.dataset.tab;
                
                // Toggle active menu item
                navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');

                // Toggle active views
                panels.forEach(p => {
                    if (p.id === `tab-${targetTab}`) {
                        p.classList.add('active');
                    } else {
                        p.classList.remove('active');
                    }
                });

                // Re-render visual elements specific to tab
                if (targetTab === 'analytics') {
                    triggerChartsRender();
                }
                if (targetTab === 'calendar') {
                    renderCalendar();
                }
            });
        });
    };

    // Trigger visual canvas refresh
    const triggerChartsRender = () => {
        if (window.ZenCharts) {
            window.ZenCharts.renderCorrelationChart(state.logs);
            window.ZenCharts.renderTrendChart(state.logs);
            window.ZenCharts.renderHabitHeatmap(state.habits, state.logs);
        }
    };

    // ---------------------------------------------------------
    // Date & Time Display
    // ---------------------------------------------------------
    const updateGreeting = (hour) => {
        const greetingTitle = document.getElementById('greeting-title');
        if (!greetingTitle) return;
        
        let greeting = 'Elevate Your Day';
        if (hour >= 5 && hour < 12) {
            greeting = 'Good Morning';
        } else if (hour >= 12 && hour < 17) {
            greeting = 'Good Afternoon';
        } else {
            greeting = 'Good Evening';
        }
        greetingTitle.textContent = greeting;
    };

    const updateTimeWidget = () => {
        const dateEl = document.getElementById('current-date');
        const timeEl = document.getElementById('current-time');
        
        const now = new Date();
        const options = { weekday: 'long', month: 'short', day: 'numeric' };
        
        if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', options);
        if (timeEl) {
            const min = String(now.getMinutes()).padStart(2, '0');
            timeEl.textContent = `${now.getHours()}:${min}`;
        }
        updateGreeting(now.getHours());
    };
    setInterval(updateTimeWidget, 1000);
    updateTimeWidget();

    // ---------------------------------------------------------
    // Habits Operations
    // ---------------------------------------------------------
    const getTodayDateString = () => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const getOrCreateTodayLog = () => {
        const todayStr = getTodayDateString();
        let log = state.logs.find(l => l.date === todayStr);
        if (!log) {
            log = {
                date: todayStr,
                completedHabits: [],
                sleep: 7.5,
                screen: 4.0,
                mood: 3,
                productivity: 4
            };
            state.logs.push(log);
        }
        return log;
    };

    // Day pill selection handler for schedule picker
    document.querySelectorAll('.day-pills .day-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            pill.classList.toggle('active');
        });
    });

    const renderHabitList = () => {
        const container = document.getElementById('habits-container');
        const badge = document.getElementById('habit-count-badge');
        if (!container) return;

        container.innerHTML = '';
        const todayLog = getOrCreateTodayLog();
        const todayDayOfWeek = new Date().getDay();
        
        let completedTodayCount = 0;
        let totalScheduledToday = 0;

        // Calculate counts
        state.habits.forEach(habit => {
            const isScheduledToday = !habit.schedule || habit.schedule.length === 0 || habit.schedule.includes(todayDayOfWeek);
            if (isScheduledToday) {
                totalScheduledToday++;
                if (todayLog.completedHabits.includes(habit.id)) {
                    completedTodayCount++;
                }
            }
        });

        state.habits.forEach(habit => {
            const isCompleted = todayLog.completedHabits.includes(habit.id);
            const isScheduledToday = !habit.schedule || habit.schedule.length === 0 || habit.schedule.includes(todayDayOfWeek);
            const currentStreak = calculateHabitStreak(habit.id);

            // Generate schedule dots HTML
            let scheduleBadge = '';
            if (habit.schedule && habit.schedule.length > 0) {
                scheduleBadge = `
                    <div class="habit-schedule-badge" title="Scheduled: ${habit.schedule.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}">
                        ${[0,1,2,3,4,5,6].map(d => `
                            <span class="sched-dot ${habit.schedule.includes(d) ? 'active-day' : ''} ${d === todayDayOfWeek ? 'today-dot' : ''}"></span>
                        `).join('')}
                    </div>
                `;
            }

            const habitHTML = `
                <div class="habit-item ${isCompleted ? 'completed' : ''} ${!isScheduledToday ? 'off-schedule' : ''}" data-id="${habit.id}">
                    <div class="habit-checkbox-wrapper">
                        <div class="habit-check-control">
                            <i data-lucide="check"></i>
                        </div>
                        <span class="habit-name">
                            ${habit.name}
                            ${scheduleBadge}
                        </span>
                    </div>
                    <div class="habit-meta">
                        ${!isScheduledToday ? `
                            <span class="habit-off-label" style="font-size: 0.65rem; color: var(--text-dim); margin-right: 0.5rem;">Off Schedule</span>
                        ` : ''}
                        ${currentStreak > 0 ? `
                            <span class="habit-streak" title="Active completion streak">
                                <i data-lucide="flame" style="width:14px; height:14px"></i>
                                <span>${currentStreak}d</span>
                            </span>
                        ` : ''}
                        <button class="btn-delete-habit" title="Remove habit" data-id="${habit.id}">
                            <i data-lucide="trash-2" style="width:16px; height:16px"></i>
                        </button>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', habitHTML);
        });

        // Update badge indicator
        if (badge) {
            badge.textContent = `${completedTodayCount}/${totalScheduledToday} Done`;
        }

        // Bind events
        document.querySelectorAll('.habit-checkbox-wrapper').forEach(wrapper => {
            wrapper.addEventListener('click', (e) => {
                const habitItem = wrapper.closest('.habit-item');
                const habitId = habitItem.dataset.id;
                toggleHabitCheck(habitId);
            });
        });

        document.querySelectorAll('.btn-delete-habit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const habitId = btn.dataset.id;
                deleteHabit(habitId);
            });
        });

        lucide.createIcons();
    };

    const toggleHabitCheck = (habitId) => {
        const todayLog = getOrCreateTodayLog();
        const index = todayLog.completedHabits.indexOf(habitId);
        const todayDayOfWeek = new Date().getDay();

        if (index > -1) {
            todayLog.completedHabits.splice(index, 1);
            showToast('Habit reset', 'info');
        } else {
            todayLog.completedHabits.push(habitId);
            showToast('Habit completed! Keep going.', 'success');
            // Gamification: Give EXP
            addExp(10);

            // Calculate scheduled habits
            let totalScheduledToday = 0;
            state.habits.forEach(habit => {
                if (!habit.schedule || habit.schedule.length === 0 || habit.schedule.includes(todayDayOfWeek)) {
                    totalScheduledToday++;
                }
            });

            // Count completed scheduled habits
            let completedScheduledToday = 0;
            state.habits.forEach(habit => {
                const isScheduled = !habit.schedule || habit.schedule.length === 0 || habit.schedule.includes(todayDayOfWeek);
                if (isScheduled && todayLog.completedHabits.includes(habit.id)) {
                    completedScheduledToday++;
                }
            });

            // Perfect day bonus check
            if (completedScheduledToday === totalScheduledToday && totalScheduledToday > 0) {
                setTimeout(() => addExp(50), 500); // Perfect day bonus
                if (state.streakFreezes === undefined) state.streakFreezes = 0;
                if (state.streakFreezes < 3) {
                    state.streakFreezes++;
                    setTimeout(() => {
                        showToast('Perfect day! Earned a Streak Freeze token ❄️', 'info');
                        renderStreakFreeze();
                    }, 1000);
                }
            }
        }

        saveState();
        renderHabitList();
        renderProgressOverview();
        calculateAIInsights();
        triggerChartsRender();
        renderStreakFreeze();
    };

    const deleteHabit = (habitId) => {
        state.habits = state.habits.filter(h => h.id !== habitId);
        const todayLog = getOrCreateTodayLog();
        todayLog.completedHabits = todayLog.completedHabits.filter(id => id !== habitId);

        saveState();
        renderHabitList();
        renderProgressOverview();
        showToast('Habit deleted', 'info');
    };

    // Add New Habit
    const addHabitBtn = document.getElementById('add-habit-btn');
    const newHabitInput = document.getElementById('new-habit-name');

    const handleAddHabit = () => {
        if (!newHabitInput) return;
        const name = newHabitInput.value.trim();
        if (!name) return;

        // Get schedule from active day pills
        const activePills = document.querySelectorAll('.day-pills .day-pill.active');
        const schedule = Array.from(activePills).map(pill => parseInt(pill.dataset.day));

        const id = 'habit_' + Date.now();
        state.habits.push({
            id,
            name,
            icon: 'check-square',
            streak: 0,
            schedule: schedule
        });

        // Reset inputs
        newHabitInput.value = '';
        document.querySelectorAll('.day-pills .day-pill').forEach(pill => pill.classList.remove('active'));

        saveState();
        renderHabitList();
        renderProgressOverview();
        showToast(`Habit "${name}" created!`);
    };

    if (addHabitBtn) addHabitBtn.addEventListener('click', handleAddHabit);
    if (newHabitInput) {
        newHabitInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleAddHabit();
        });
    }

    // ---------------------------------------------------------
    // Wellness Logging Operations
    // ---------------------------------------------------------
    const populateLoggerForm = () => {
        const todayLog = getOrCreateTodayLog();
        
        // Populating Sleep
        const sleepHours = document.getElementById('sleep-hours');
        const sleepVal = document.getElementById('sleep-val');
        if (sleepHours && todayLog.sleep !== undefined) {
            sleepHours.value = todayLog.sleep;
            if (sleepVal) sleepVal.textContent = `${todayLog.sleep} hrs`;
        }
        
        // Populating Screen
        const screenHours = document.getElementById('screen-hours');
        const screenVal = document.getElementById('screen-val');
        if (screenHours && todayLog.screen !== undefined) {
            screenHours.value = todayLog.screen;
            if (screenVal) screenVal.textContent = `${todayLog.screen} hrs`;
        }
        
        // Populating Mood
        if (todayLog.mood !== undefined) {
            const moodInput = document.querySelector(`input[name="mood"][value="${todayLog.mood}"]`);
            if (moodInput) moodInput.checked = true;
        }
        
        // Populating Productivity
        if (todayLog.productivity !== undefined) {
            const prodInput = document.querySelector(`input[name="productivity"][value="${todayLog.productivity}"]`);
            if (prodInput) prodInput.checked = true;
        }
    };
    const wellnessForm = document.getElementById('wellness-form');
    if (wellnessForm) {
        wellnessForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const todayLog = getOrCreateTodayLog();

            // Fetch values
            const sleepVal = parseFloat(document.getElementById('sleep-hours').value);
            const screenVal = parseFloat(document.getElementById('screen-hours').value);
            
            // Mood radio
            const checkedMood = document.querySelector('input[name="mood"]:checked');
            const moodVal = checkedMood ? parseInt(checkedMood.value) : 3;

            // Productivity stars radio
            const checkedProd = document.querySelector('input[name="productivity"]:checked');
            const prodVal = checkedProd ? parseInt(checkedProd.value) : 4;

            // Save inside state log
            todayLog.sleep = sleepVal;
            todayLog.screen = screenVal;
            todayLog.mood = moodVal;
            todayLog.productivity = prodVal;

            saveState();
            showToast('Daily wellness metrics updated successfully!', 'success');
            calculateAIInsights();
        });
    }

    // Update range visual values dynamically
    const sleepSlider = document.getElementById('sleep-hours');
    const screenSlider = document.getElementById('screen-hours');

    if (sleepSlider) {
        sleepSlider.addEventListener('input', (e) => {
            document.getElementById('sleep-val').textContent = `${e.target.value} hrs`;
        });
    }
    if (screenSlider) {
        screenSlider.addEventListener('input', (e) => {
            document.getElementById('screen-val').textContent = `${e.target.value} hrs`;
        });
    }

    // ---------------------------------------------------------
    // Math & Metric Calculators
    // ---------------------------------------------------------
    const calculateHabitStreak = (habitId) => {
        const habit = state.habits.find(h => h.id === habitId);
        if (!habit) return 0;

        const formatDate = (d) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };

        const isDayCompleted = (dateStr) => {
            const log = state.logs.find(l => l.date === dateStr);
            return log && log.completedHabits && log.completedHabits.includes(habitId);
        };

        const isFrozen = (dateStr) => state.usedFreezes && state.usedFreezes.includes(dateStr);

        const today = new Date();
        const todayStr = formatDate(today);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatDate(yesterday);

        const doneToday = isDayCompleted(todayStr) || isFrozen(todayStr);
        const doneYesterday = isDayCompleted(yesterdayStr) || isFrozen(yesterdayStr);

        if (!doneToday && !doneYesterday) return 0;

        let streak = 0;
        let cursor = new Date(today);
        const hasSchedule = habit.schedule && habit.schedule.length > 0;

        for (let i = 0; i < 365; i++) {
            const curStr = formatDate(cursor);
            const dayOfWeek = cursor.getDay();
            const completed = isDayCompleted(curStr) || isFrozen(curStr);

            if (completed) {
                streak++;
            } else if (curStr === todayStr) {
                cursor.setDate(cursor.getDate() - 1);
                continue;
            } else if (hasSchedule && !habit.schedule.includes(dayOfWeek)) {
                cursor.setDate(cursor.getDate() - 1);
                continue;
            } else {
                break;
            }

            cursor.setDate(cursor.getDate() - 1);
        }

        return streak;
    };

    const updateDashboardMetrics = () => {
        // Daily Completion Pct
        const todayLog = getOrCreateTodayLog();
        const dailyCompPct = document.getElementById('daily-completion-pct');
        
        if (dailyCompPct) {
            if (state.habits.length === 0) {
                dailyCompPct.textContent = '0%';
            } else {
                const ratio = Math.round((todayLog.completedHabits.length / state.habits.length) * 100);
                dailyCompPct.textContent = `${ratio}%`;
            }
        }

        // Longest Streak
        const streakEl = document.getElementById('longest-streak-val');
        if (streakEl) {
            let maxStreak = 0;
            state.habits.forEach(h => {
                const str = calculateHabitStreak(h.id);
                if (str > maxStreak) maxStreak = str;
            });
            streakEl.textContent = `${maxStreak} ${maxStreak === 1 ? 'day' : 'days'}`;
        }
    };

    const renderProgressOverview = () => {
        if (window.ZenCharts) {
            window.ZenCharts.renderProgressRings(state.habits, state.logs);
        }
    };

    // ---------------------------------------------------------
    // Integrated Focus Pomodoro Timer
    // ---------------------------------------------------------
    let timerInterval = null;
    let timerSecondsLeft = 1500; // 25 min default
    let timerTotalDuration = 1500;
    let timerIsRunning = false;
    let timerType = 'FOCUS'; // 'FOCUS' | 'BREAK'

    const timerDisplay = document.getElementById('timer-display');
    const timerToggleBtn = document.getElementById('timer-toggle');
    const timerToggleText = document.getElementById('timer-toggle-text');
    const timerPlayIcon = document.getElementById('timer-play-icon');
    const timerResetBtn = document.getElementById('timer-reset');
    const progressRing = document.getElementById('timer-progress-ring');
    const timerStatusLabel = document.getElementById('timer-label-status');

    const updateTimerDisplay = () => {
        if (!timerDisplay) return;
        const mins = String(Math.floor(timerSecondsLeft / 60)).padStart(2, '0');
        const secs = String(timerSecondsLeft % 60).padStart(2, '0');
        timerDisplay.textContent = `${mins}:${secs}`;

        // Circular dash offset countdown
        if (progressRing) {
            const radius = 45;
            const circ = 2 * Math.PI * radius; // 282.7
            const offset = ((timerTotalDuration - timerSecondsLeft) / timerTotalDuration) * circ;
            progressRing.style.strokeDashoffset = offset;
        }
        
        // Blooming Lotus visual
        const lotus = document.getElementById('focus-lotus');
        if (lotus) {
            if (timerIsRunning && timerType === 'FOCUS') {
                const progress = (timerTotalDuration - timerSecondsLeft) / timerTotalDuration;
                const scale = 0.5 + (progress * 0.5); // Grows from 0.5 to 1.0
                lotus.style.transform = `translate(50px, 50px) scale(${scale})`;
                lotus.style.opacity = String(0.5 + progress * 0.5);
            } else {
                lotus.style.transform = 'translate(50px, 50px) scale(0)';
                lotus.style.opacity = '0';
            }
        }
    };

    const toggleTimer = () => {
        if (timerIsRunning) {
            clearInterval(timerInterval);
            timerIsRunning = false;
            if (timerToggleText) timerToggleText.textContent = 'Start Focus';
            if (timerPlayIcon) {
                timerPlayIcon.setAttribute('data-lucide', 'play');
                lucide.createIcons();
            }
            showToast('Focus timer paused', 'info');
            updateTimerDisplay(); // Wither lotus
        } else {
            timerIsRunning = true;
            if (timerToggleText) timerToggleText.textContent = 'Pause Focus';
            if (timerPlayIcon) {
                timerPlayIcon.setAttribute('data-lucide', 'pause');
                lucide.createIcons();
            }
            
            // Request Notification Permission
            if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
                Notification.requestPermission();
            }

            // Web Audio Synth context init safety check
            if (window.ZenSynth) window.ZenSynth.initContext();

            timerInterval = setInterval(() => {
                if (timerSecondsLeft > 0) {
                    timerSecondsLeft--;
                    updateTimerDisplay();
                } else {
                    clearInterval(timerInterval);
                    timerIsRunning = false;
                    handleTimerCompletion();
                }
            }, 1000);
            showToast('Timer started! Enter your zone.', 'success');
        }
    };

    const resetTimer = () => {
        clearInterval(timerInterval);
        timerIsRunning = false;
        timerType = 'FOCUS';
        timerTotalDuration = 1500;
        timerSecondsLeft = 1500;
        if (timerToggleText) timerToggleText.textContent = 'Start Focus';
        if (timerPlayIcon) {
            timerPlayIcon.setAttribute('data-lucide', 'play');
            lucide.createIcons();
        }
        if (timerStatusLabel) timerStatusLabel.textContent = 'FOCUS';
        if (progressRing) progressRing.style.stroke = 'var(--accent-cyan)';
        updateTimerDisplay();
        showToast('Timer reset', 'info');
    };

    const handleTimerCompletion = () => {
        if (window.ZenSynth) window.ZenSynth.stop();
        resetTrackVisualStates();

        if (timerType === 'FOCUS') {
            showToast('Excellent focus session complete! Take a break.', 'success');
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification("ZenFlow", { body: "Focus session complete! Take a break." });
            }
            addExp(25);
            if (!state.unlockedBadges.includes('deep_dive')) {
                state.unlockedBadges.push('deep_dive');
                saveState();
            }
            timerType = 'BREAK';
            timerTotalDuration = 300;
            timerSecondsLeft = 300;
            if (timerStatusLabel) timerStatusLabel.textContent = 'BREAK';
            if (progressRing) progressRing.style.stroke = 'var(--accent-purple)';
        } else {
            showToast('Break session complete. Ready to focus?', 'info');
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification("ZenFlow", { body: "Break complete. Ready to focus?" });
            }
            timerType = 'FOCUS';
            timerTotalDuration = 1500;
            timerSecondsLeft = 1500;
            if (timerStatusLabel) timerStatusLabel.textContent = 'FOCUS';
            if (progressRing) progressRing.style.stroke = 'var(--accent-cyan)';
        }

        clearInterval(timerInterval);
        timerIsRunning = false;
        if (timerToggleText) timerToggleText.textContent = 'Start Focus';
        if (timerPlayIcon) {
            timerPlayIcon.setAttribute('data-lucide', 'play');
            lucide.createIcons();
        }
        updateTimerDisplay();
    };

    // Presets configuration
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const seconds = parseInt(btn.dataset.time);
            clearInterval(timerInterval);
            timerIsRunning = false;
            
            timerTotalDuration = seconds;
            timerSecondsLeft = seconds;
            
            if (seconds === 1500) {
                timerType = 'FOCUS';
                if (timerStatusLabel) timerStatusLabel.textContent = 'FOCUS';
                if (progressRing) progressRing.style.stroke = 'var(--accent-cyan)';
            } else {
                timerType = 'BREAK';
                if (timerStatusLabel) timerStatusLabel.textContent = 'BREAK';
                if (progressRing) progressRing.style.stroke = 'var(--accent-purple)';
            }

            if (timerToggleText) timerToggleText.textContent = 'Start Focus';
            if (timerPlayIcon) {
                timerPlayIcon.setAttribute('data-lucide', 'play');
                lucide.createIcons();
            }

            updateTimerDisplay();
        });
    });

    if (timerToggleBtn) timerToggleBtn.addEventListener('click', toggleTimer);
    if (timerResetBtn) timerResetBtn.addEventListener('click', resetTimer);

    // ---------------------------------------------------------
    // Synthesizer Web Audio API GUI Interface
    // ---------------------------------------------------------
    const trackOptions = document.querySelectorAll('.synth-track-option');
    const volumeSlider = document.getElementById('synth-volume');
    const modulationSlider = document.getElementById('synth-resonance');
    const synthStatusLabel = document.getElementById('synth-status');

    const resetTrackVisualStates = () => {
        trackOptions.forEach(opt => {
            opt.classList.remove('active', 'playing');
            const icon = opt.querySelector('.btn-track-play i');
            if (icon) icon.setAttribute('data-lucide', 'play');
        });
        if (synthStatusLabel) {
            synthStatusLabel.textContent = 'Synthesizer Offline';
            synthStatusLabel.className = 'card-badge';
        }
        lucide.createIcons();
    };

    trackOptions.forEach(opt => {
        const btn = opt.querySelector('.btn-track-play');
        const soundType = opt.dataset.sound;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (window.ZenSynth) {
                // If clicking active, toggle play/stop
                if (window.ZenSynth.activeSound === soundType && window.ZenSynth.isPlaying) {
                    window.ZenSynth.stop();
                    resetTrackVisualStates();
                    showToast('Synthesizer deactivated', 'info');
                } else {
                    // Play new sound
                    window.ZenSynth.play(soundType);
                    
                    // Update visual classes
                    resetTrackVisualStates();
                    opt.classList.add('active', 'playing');
                    btn.querySelector('i').setAttribute('data-lucide', 'square');
                    lucide.createIcons();
                    
                    if (synthStatusLabel) {
                        synthStatusLabel.textContent = 'SYNTHESIZING LIVE';
                        synthStatusLabel.className = 'card-badge pulse';
                    }
                    showToast(`Playing ${opt.querySelector('.track-name').textContent}`, 'success');
                }
            }
        });
    });

    // Volume Slider binding
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            if (window.ZenSynth) window.ZenSynth.setVolume(e.target.value);
        });
    }

    // Modulation Slider binding
    if (modulationSlider) {
        modulationSlider.addEventListener('input', (e) => {
            if (window.ZenSynth) window.ZenSynth.setModulation(e.target.value);
        });
    }

    // ---------------------------------------------------------
    // AI Smart Insights Engine
    // ---------------------------------------------------------
    const calculateAIInsights = () => {
        const container = document.getElementById('insights-container');
        if (!container) return;

        if (state.logs.length < 3) {
            container.innerHTML = `
                <div class="insight-bubble info">
                    <i data-lucide="info"></i>
                    <div class="insight-text">
                        Log at least 3 days of habits and sleep metrics to enable the correlation calculator.
                    </div>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        // Run correlation algorithms
        let totalSleep = 0;
        let sleepOnHighProd = 0;
        let highProdCount = 0;
        
        let screenOnLowMood = 0;
        let lowMoodCount = 0;

        let totalHabitsCompleted = 0;

        state.logs.forEach(log => {
            totalSleep += log.sleep;
            
            // Analyze high productivity (4 or 5 stars)
            if (log.productivity >= 4) {
                sleepOnHighProd += log.sleep;
                highProdCount++;
            }

            // Analyze low mood (1 or 2 stars)
            if (log.mood <= 2) {
                screenOnLowMood += log.screen;
                lowMoodCount++;
            }

            if (log.completedHabits) {
                totalHabitsCompleted += log.completedHabits.length;
            }
        });

        const avgSleep = (totalSleep / state.logs.length).toFixed(1);
        const avgSleepHighProd = highProdCount > 0 ? (sleepOnHighProd / highProdCount).toFixed(1) : 0;
        const avgScreenLowMood = lowMoodCount > 0 ? (screenOnLowMood / lowMoodCount).toFixed(1) : 0;
        
        const insights = [];

        // Insight 1: Sleep correlation
        if (avgSleepHighProd > 0) {
            const sleepDiff = parseFloat(avgSleepHighProd) - parseFloat(avgSleep);
            if (sleepDiff > 0.5) {
                insights.push(`
                    <div class="insight-bubble highlight">
                        <i data-lucide="moon"></i>
                        <div class="insight-text">
                            <strong>Optimal Sleep:</strong> On your highly productive days, you sleep an average of <strong>${avgSleepHighProd} hrs</strong> (which is +${sleepDiff.toFixed(1)} hrs more than your baseline). Aim for this duration tonight!
                        </div>
                    </div>
                `);
            } else {
                insights.push(`
                    <div class="insight-bubble highlight">
                        <i data-lucide="check-circle-2"></i>
                        <div class="insight-text">
                            <strong>Sleep Balance:</strong> Your average sleep of <strong>${avgSleep} hours</strong> is aligned with peak productivity rating. Maintain your current sleep hygiene schedules.
                        </div>
                    </div>
                `);
            }
        }

        // Insight 2: Screen time correlation
        if (avgScreenLowMood > 0 && avgScreenLowMood > 6.0) {
            insights.push(`
                <div class="insight-bubble alert">
                    <i data-lucide="eye-off"></i>
                    <div class="insight-text">
                        <strong>Screen Burnout Alert:</strong> Your low-mood logs correspond with days where screen exposure averages <strong>${avgScreenLowMood} hrs</strong>. Try configuring a focus timeout limit.
                    </div>
                </div>
            `);
        }

        // Insight 3: Completion encouragement
        if (state.habits.length > 0) {
            const completionRate = Math.round((totalHabitsCompleted / (state.logs.length * state.habits.length)) * 100);
            insights.push(`
                <div class="insight-bubble info">
                    <i data-lucide="trending-up"></i>
                    <div class="insight-text">
                        <strong>Consistent Growth:</strong> Your aggregate habit completion rate is <strong>${completionRate}%</strong>. Keep logging daily stats to sharpen our analysis parameters.
                    </div>
                </div>
            `);
        }

        container.innerHTML = insights.join('');
        lucide.createIcons();
    };

    const regenerateInsightsBtn = document.getElementById('regenerate-insights-btn');
    if (regenerateInsightsBtn) {
        regenerateInsightsBtn.addEventListener('click', () => {
            const container = document.getElementById('insights-container');
            if (container) {
                container.innerHTML = `
                    <div class="insight-loading">
                        <i data-lucide="loader-2" class="spin"></i>
                        <p>Recalculating behavioral history patterns...</p>
                    </div>
                `;
                lucide.createIcons();
            }
            setTimeout(() => {
                calculateAIInsights();
                showToast('AI insights successfully updated!', 'info');
            }, 800);
        });
    }

    // ---------------------------------------------------------
    // Data Management & Settings Handling
    // ---------------------------------------------------------
    
    // 1. Load Demo Data (Generates 14 days of realistic logs)
    const btnPopulateDemo = document.getElementById('btn-populate-demo');
    if (btnPopulateDemo) {
        btnPopulateDemo.addEventListener('click', () => {
            const demoLogs = [];
            const habits = ['coding', 'workout', 'hydration', 'reading', 'mindfulness'];
            
            // Loop back 14 days
            for (let i = 13; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const dateStr = `${yyyy}-${mm}-${dd}`;

                // Generate realistic values
                // Sleep: range 6.0 to 9.0 hrs
                const sleep = parseFloat((6.5 + Math.random() * 2.5).toFixed(1));
                
                // Screen: range 3.0 to 9.0 hrs (often inversely proportional to gym/habits)
                let screen = parseFloat((3.0 + Math.random() * 5.0).toFixed(1));

                // Productivity scales with sleep
                let productivity = 3;
                if (sleep >= 7.5) productivity = Math.random() > 0.3 ? 5 : 4;
                else if (sleep < 6.8) productivity = Math.random() > 0.5 ? 2 : 3;

                // Mood inverse to screen time
                let mood = 3;
                if (screen < 5.0) mood = Math.random() > 0.3 ? 4 : 5;
                else if (screen > 7.0) mood = Math.random() > 0.5 ? 2 : 1;

                // Completed Habits (probability scales with productivity/sleep)
                const completedHabits = [];
                habits.forEach(h => {
                    let probability = 0.65;
                    if (productivity === 5) probability = 0.9;
                    if (productivity === 2) probability = 0.35;
                    
                    if (Math.random() < probability) {
                        completedHabits.push(h);
                    }
                });

                demoLogs.push({
                    date: dateStr,
                    completedHabits,
                    sleep,
                    screen,
                    mood,
                    productivity
                });
            }

            state.logs = demoLogs;
            saveState();
            
            populateLoggerForm();
            renderHabitList();
            renderProgressOverview();
            calculateAIInsights();
            triggerChartsRender();
            
            showToast('Demonstration log data generated (14 days)!', 'success');
        });
    }

    // 2. Export Logs to JSON
    const btnExportData = document.getElementById('btn-export-data');
    if (btnExportData) {
        btnExportData.addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `zenflow_backup_${getTodayDateString()}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            showToast('Log backup JSON exported successfully.');
        });
    }

    // 3. Import Logs from JSON
    const inputImportData = document.getElementById('input-import-data');
    if (inputImportData) {
        inputImportData.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const parsed = JSON.parse(event.target.result);
                    if (parsed.habits && parsed.logs) {
                        state = parsed;
                        saveState();
                        
                        populateLoggerForm();
                        renderHabitList();
                        renderProgressOverview();
                        calculateAIInsights();
                        triggerChartsRender();
                        
                        showToast('Backup restored successfully!', 'success');
                    } else {
                        showToast('Invalid backup file schema.', 'error');
                    }
                } catch (err) {
                    showToast('Failed to parse uploaded JSON file.', 'error');
                }
            };
            reader.readAsText(file);
        });
    }

    // 4. Reset Local Logs
    const btnResetData = document.getElementById('btn-reset-data');
    if (btnResetData) {
        btnResetData.addEventListener('click', () => {
            if (confirm("Are you sure you want to permanently clear all track logs, habits, and history? This cannot be undone.")) {
                localStorage.removeItem('zenflow_state');
                
                // Set default state
                state = {
                    habits: [
                        { id: 'coding', name: 'Write Code', icon: 'code', streak: 0 },
                        { id: 'workout', name: 'Exercise / Workout', icon: 'barbell', streak: 0 },
                        { id: 'hydration', name: 'Drink Water (2L)', icon: 'droplet', streak: 0 },
                        { id: 'reading', name: 'Read 15 Pages', icon: 'book-open', streak: 0 },
                        { id: 'mindfulness', name: 'Meditation (10m)', icon: 'sunset', streak: 0 }
                    ],
                    logs: []
                };

                saveState();
                
                populateLoggerForm();
                renderHabitList();
                renderProgressOverview();
                calculateAIInsights();
                triggerChartsRender();
                
                showToast('All logs reset to defaults.', 'info');
            }
        });
    }

    // ---------------------------------------------------------
    // Calendar View (Monthly Habit Heatmap)
    // ---------------------------------------------------------
    let calendarCurrentMonth = new Date();
    let calendarSelectedDate = null;

    const moodEmojis = { 1: '😫', 2: '😔', 3: '😐', 4: '🙂', 5: '🚀' };

    const renderCalendar = () => {
        const monthYearEl = document.getElementById('calendar-month-year');
        const gridEl = document.getElementById('calendar-grid');
        if (!monthYearEl || !gridEl) return;

        const year = calendarCurrentMonth.getFullYear();
        const month = calendarCurrentMonth.getMonth();

        // Update header
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                            'July', 'August', 'September', 'October', 'November', 'December'];
        monthYearEl.textContent = `${monthNames[month]} ${year}`;

        // Clear grid
        gridEl.innerHTML = '';

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const todayStr = getTodayDateString();
        const totalHabits = state.habits.length || 1;

        // Empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell empty';
            gridEl.appendChild(cell);
        }

        // Day cells
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = new Date(year, month, d).toISOString().split('T')[0];
            const log = state.logs.find(l => l.date === dateStr);
            const completedCount = log ? log.completedHabits.length : 0;
            const ratio = completedCount / totalHabits;

            // Determine intensity level
            let level = 'cal-l0';
            if (ratio > 0 && ratio < 0.3) level = 'cal-l1';
            else if (ratio >= 0.3 && ratio < 0.6) level = 'cal-l2';
            else if (ratio >= 0.6 && ratio < 1) level = 'cal-l3';
            else if (ratio >= 1) level = 'cal-l4';

            const cell = document.createElement('div');
            cell.className = `calendar-cell ${level}`;

            if (dateStr === todayStr) cell.classList.add('today');
            if (calendarSelectedDate === dateStr) cell.classList.add('selected');

            // Day number
            const dayNum = document.createElement('span');
            dayNum.className = 'day-number';
            dayNum.textContent = d;
            cell.appendChild(dayNum);

            // Completion dots (max 5 visible)
            if (completedCount > 0) {
                const dotsWrapper = document.createElement('div');
                dotsWrapper.className = 'completion-dots';
                const visibleDots = Math.min(completedCount, 5);
                for (let dd = 0; dd < visibleDots; dd++) {
                    const dot = document.createElement('span');
                    dot.className = 'dot';
                    dotsWrapper.appendChild(dot);
                }
                cell.appendChild(dotsWrapper);
            }

            // Click handler
            cell.addEventListener('click', () => {
                calendarSelectedDate = dateStr;
                showDayDetail(dateStr, log);
                // Update selected visual
                gridEl.querySelectorAll('.calendar-cell').forEach(c => c.classList.remove('selected'));
                cell.classList.add('selected');
            });

            gridEl.appendChild(cell);
        }

        lucide.createIcons();
    };

    const showDayDetail = (dateStr, log) => {
        const detailEl = document.getElementById('calendar-detail');
        if (!detailEl) return;

        const dateObj = new Date(dateStr + 'T12:00:00');
        const dateFormatted = dateObj.toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
        });

        if (!log) {
            detailEl.innerHTML = `
                <div class="detail-date-header">${dateFormatted}</div>
                <div class="detail-no-data">
                    <i data-lucide="calendar-x"></i>
                    <p>No activity logged for this day.</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        const completedCount = log.completedHabits.length;
        const totalHabits = state.habits.length || 1;
        const completionPct = Math.round((completedCount / totalHabits) * 100);
        const moodEmoji = moodEmojis[log.mood] || '😐';

        let habitsHTML = '';
        state.habits.forEach(habit => {
            const isDone = log.completedHabits.includes(habit.id);
            habitsHTML += `
                <div class="detail-habit-item ${isDone ? 'completed' : ''}">
                    <span class="habit-status-icon">
                        <i data-lucide="${isDone ? 'check' : 'circle'}"></i>
                    </span>
                    <span>${habit.name}</span>
                </div>
            `;
        });

        detailEl.innerHTML = `
            <div class="detail-date-header">${dateFormatted}</div>
            <div class="detail-metrics-row">
                <div class="detail-metric">
                    <span class="metric-value">${completionPct}%</span>
                    <span class="metric-label">Completed</span>
                </div>
                <div class="detail-metric">
                    <span class="metric-value detail-mood-display">${moodEmoji}</span>
                    <span class="metric-label">Mood</span>
                </div>
                <div class="detail-metric">
                    <span class="metric-value">${log.sleep ?? '—'}h</span>
                    <span class="metric-label">Sleep</span>
                </div>
                <div class="detail-metric">
                    <span class="metric-value">${log.productivity ?? '—'}★</span>
                    <span class="metric-label">Productivity</span>
                </div>
            </div>
            <div class="detail-habits-title">Habit Breakdown</div>
            <div class="detail-habit-list">
                ${habitsHTML}
            </div>
        `;

        lucide.createIcons();
    };

    // ---------------------------------------------------------
    // PREMIUM: Streak Freeze Widget Logic
    // ---------------------------------------------------------
    const renderStreakFreeze = () => {
        const freezeCountEl = document.getElementById('freeze-count');
        const useFreezeBtn = document.getElementById('btn-use-freeze');
        if (!freezeCountEl || !useFreezeBtn) return;

        if (state.streakFreezes === undefined) state.streakFreezes = 1;
        if (!state.usedFreezes) state.usedFreezes = [];

        freezeCountEl.textContent = state.streakFreezes;
        const todayStr = getTodayDateString();
        const isTodayFrozen = state.usedFreezes.includes(todayStr);

        if (isTodayFrozen) {
            useFreezeBtn.disabled = true;
            useFreezeBtn.innerHTML = `<i data-lucide="shield-check"></i> <span>Frozen Today ❄️</span>`;
        } else if (state.streakFreezes <= 0) {
            useFreezeBtn.disabled = true;
            useFreezeBtn.innerHTML = `<i data-lucide="shield-alert"></i> <span>No Freezes</span>`;
        } else {
            useFreezeBtn.disabled = false;
            useFreezeBtn.innerHTML = `<i data-lucide="shield"></i> <span>Use Freeze Today</span>`;
        }
        lucide.createIcons();
    };

    const useStreakFreeze = () => {
        const todayStr = getTodayDateString();
        if (state.usedFreezes.includes(todayStr)) return;
        if (state.streakFreezes <= 0) return;

        state.streakFreezes--;
        state.usedFreezes.push(todayStr);
        saveState();
        renderStreakFreeze();
        renderHabitList();
        renderCalendar();
        showToast('Streak Freeze activated for today! Your streaks are protected. ❄️', 'success');
    };

    const freezeBtn = document.getElementById('btn-use-freeze');
    if (freezeBtn) {
        freezeBtn.addEventListener('click', useStreakFreeze);
    }

    // ---------------------------------------------------------
    // PREMIUM: Daily Journal Logic
    // ---------------------------------------------------------
    const renderJournal = () => {
        const dateLabel = document.getElementById('journal-date-label');
        const journalInput = document.getElementById('journal-text');
        const gratitudeInput = document.getElementById('gratitude-text');
        const charCount = document.getElementById('journal-char-count');
        if (!journalInput || !gratitudeInput) return;

        const todayLog = getOrCreateTodayLog();
        journalInput.value = todayLog.journal || '';
        gratitudeInput.value = todayLog.gratitude || '';

        if (dateLabel) {
            const dateObj = new Date();
            dateLabel.textContent = dateObj.toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric'
            });
        }

        if (charCount) {
            charCount.textContent = `${journalInput.value.length}/500`;
        }
    };

    const journalInputEl = document.getElementById('journal-text');
    if (journalInputEl) {
        journalInputEl.addEventListener('input', (e) => {
            const charCount = document.getElementById('journal-char-count');
            if (charCount) {
                charCount.textContent = `${e.target.value.length}/500`;
            }
        });
    }

    const saveJournalBtn = document.getElementById('btn-save-journal');
    if (saveJournalBtn) {
        saveJournalBtn.addEventListener('click', () => {
            const journalText = document.getElementById('journal-text').value.trim();
            const gratitudeText = document.getElementById('gratitude-text').value.trim();
            const todayLog = getOrCreateTodayLog();

            todayLog.journal = journalText;
            todayLog.gratitude = gratitudeText;

            saveState();
            showToast('Journal entry saved successfully! 📝', 'success');
        });
    }

    // ---------------------------------------------------------
    // PREMIUM: Weekly Review Analytics
    // ---------------------------------------------------------
    const renderWeeklyReview = () => {
        const container = document.getElementById('weekly-review-content');
        if (!container) return;

        const today = new Date();
        const formatDateStr = (d) => d.toISOString().split('T')[0];

        // Fetch logs for past 14 days
        const getLogsForRange = (daysOffsetStart, daysOffsetEnd) => {
            const logsArray = [];
            for (let i = daysOffsetStart; i <= daysOffsetEnd; i++) {
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() - i);
                const dateStr = formatDateStr(targetDate);
                const log = state.logs.find(l => l.date === dateStr);
                if (log) logsArray.push(log);
            }
            return logsArray;
        };

        // Current week: last 7 days (days 0 to 6)
        const curWeekLogs = getLogsForRange(0, 6);
        // Previous week: days 7 to 13
        const prevWeekLogs = getLogsForRange(7, 13);

        if (curWeekLogs.length === 0) {
            container.innerHTML = `
                <div class="review-loading">
                    <i data-lucide="info" style="margin-bottom:0.5rem; color:var(--accent-cyan)"></i>
                    <p>Complete your wellness logs for a few days to view your weekly analytics summary.</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        // Metrics calculations
        const sumCompletions = (logs) => logs.reduce((acc, log) => acc + (log.completedHabits ? log.completedHabits.length : 0), 0);
        const avgMetric = (logs, key) => {
            const filtered = logs.filter(log => log[key] !== undefined);
            if (filtered.length === 0) return 0;
            return filtered.reduce((acc, log) => acc + log[key], 0) / filtered.length;
        };

        const curCompletions = sumCompletions(curWeekLogs);
        const prevCompletions = sumCompletions(prevWeekLogs);

        const curSleep = avgMetric(curWeekLogs, 'sleep');
        const prevSleep = avgMetric(prevWeekLogs, 'sleep');

        const curScreen = avgMetric(curWeekLogs, 'screen');
        const prevScreen = avgMetric(prevWeekLogs, 'screen');

        const curMood = avgMetric(curWeekLogs, 'mood');

        // Best Day Calculation
        let bestDayStr = 'None';
        let maxCompleted = -1;
        curWeekLogs.forEach(log => {
            const count = log.completedHabits ? log.completedHabits.length : 0;
            if (count > maxCompleted) {
                maxCompleted = count;
                const dObj = new Date(log.date + 'T12:00:00');
                bestDayStr = dObj.toLocaleDateString('en-US', { weekday: 'long' });
            }
        });

        // Trend styling helper
        const renderTrend = (cur, prev, isLowerBetter = false) => {
            if (prev === 0) return `<span class="review-trend neutral"><i data-lucide="minus"></i> <span>No baseline</span></span>`;
            const pctDiff = Math.round(((cur - prev) / prev) * 100);
            
            if (pctDiff === 0) {
                return `<span class="review-trend neutral"><i data-lucide="minus"></i> <span>No change</span></span>`;
            }
            const positive = isLowerBetter ? pctDiff < 0 : pctDiff > 0;
            if (positive) {
                return `<span class="review-trend up"><i data-lucide="trending-up"></i> <span>+${Math.abs(pctDiff)}% vs last wk</span></span>`;
            } else {
                return `<span class="review-trend down"><i data-lucide="trending-down"></i> <span>-${Math.abs(pctDiff)}% vs last wk</span></span>`;
            }
        };

        // Quote & Coach Advice
        let quote = "Consistency creates momentum. Build your streak day by day.";
        if (curCompletions > prevCompletions) {
            quote = "Superb job! You completed more habits this week than last. Ride the wave!";
        } else if (curScreen < prevScreen && curScreen > 0) {
            quote = "Excellent screen time reduction! Your focus room sessions are paying off.";
        } else if (curSleep >= 7.0 && curSleep <= 9.0) {
            quote = "Solid sleep consistency this week. A well-rested mind achieves more.";
        }

        container.innerHTML = `
            <div class="review-stats-grid">
                <div class="review-stat">
                    <span class="stat-value">${curCompletions}</span>
                    <span class="stat-label">Completions</span>
                    ${renderTrend(curCompletions, prevCompletions)}
                </div>
                <div class="review-stat">
                    <span class="stat-value purple">${curSleep.toFixed(1)}h</span>
                    <span class="stat-label">Avg Sleep</span>
                    ${renderTrend(curSleep, prevSleep)}
                </div>
                <div class="review-stat">
                    <span class="stat-value rose">${curScreen.toFixed(1)}h</span>
                    <span class="stat-label">Avg Screen</span>
                    ${renderTrend(curScreen, prevScreen, true)}
                </div>
                <div class="review-stat">
                    <span class="stat-value gold">${curMood.toFixed(1)}/5</span>
                    <span class="stat-label">Avg Mood</span>
                    <span class="review-trend neutral"><i data-lucide="smile"></i> <span>Weekly state</span></span>
                </div>
            </div>
            <div class="review-best-day">
                <i data-lucide="trophy"></i>
                <div class="best-day-info">
                    <div class="best-day-label">Best Performing Day</div>
                    <div class="best-day-name">${bestDayStr} (${maxCompleted} completed)</div>
                </div>
            </div>
            <p class="review-quote">"${quote}"</p>
        `;
        lucide.createIcons();
    };

    const refreshReviewBtn = document.getElementById('btn-refresh-review');
    if (refreshReviewBtn) {
        refreshReviewBtn.addEventListener('click', () => {
            renderWeeklyReview();
            showToast('Weekly review statistics refreshed!', 'info');
        });
    }

    // ---------------------------------------------------------
    // PREMIUM: Curated Habit Templates Library
    // ---------------------------------------------------------
    const renderHabitTemplates = () => {
        const grid = document.getElementById('templates-grid');
        if (!grid) return;

        const templates = [
            {
                id: 'morning',
                class: 'pack-morning',
                name: 'Morning Routine',
                icon: 'sun',
                desc: 'Kickstart your morning with productivity and clarity.',
                habits: ['Make Bed', 'Hydrate (500ml)', 'Morning Stretch', 'Plan the Day']
            },
            {
                id: 'fitness',
                class: 'pack-fitness',
                name: 'Fitness & Strength',
                icon: 'activity',
                desc: 'Build consistency in training, recovery, and nutrition.',
                habits: ['30-min Workout', 'Stretching/Flexibility', 'Protein Intake Log', 'Walk 10k Steps']
            },
            {
                id: 'mindfulness',
                class: 'pack-mindfulness',
                name: 'Mindfulness & Calm',
                icon: 'wind',
                desc: 'Reduce stress, practice presence, and sleep better.',
                habits: ['10-min Meditation', 'Write Gratitude List', 'No Screens 1h before bed', 'Deep Breathing']
            },
            {
                id: 'developer',
                class: 'pack-developer',
                name: 'Developer Flow',
                icon: 'terminal',
                desc: 'Boost code quality, keep learning, and avoid burnout.',
                habits: ['Write Code', 'Review PRs / Learn', 'Clean workspace', 'Hourly stretch break']
            },
            {
                id: 'student',
                class: 'pack-student',
                name: 'Peak Student',
                icon: 'graduation-cap',
                desc: 'Stay ahead of coursework with active recall and deep focus.',
                habits: ['2h Focus study', 'Review lecture notes', 'Flashcards practice', 'Organize tasks']
            }
        ];

        grid.innerHTML = '';
        templates.forEach(pack => {
            // Check if all habits in pack exist already
            const allInstalled = pack.habits.every(hName => 
                state.habits.some(existing => existing.name.toLowerCase() === hName.toLowerCase())
            );

            const packHTML = `
                <div class="template-pack ${pack.class}">
                    <div class="template-pack-header">
                        <div class="template-pack-icon">
                            <i data-lucide="${pack.icon}"></i>
                        </div>
                        <div>
                            <div class="template-pack-name">${pack.name}</div>
                            <div class="template-pack-count">${pack.habits.length} habits</div>
                        </div>
                    </div>
                    <p class="template-pack-desc">${pack.desc}</p>
                    <div class="template-pack-habits">
                        ${pack.habits.map(h => `<span class="template-habit-chip">${h}</span>`).join('')}
                    </div>
                    ${allInstalled ? `
                        <button class="btn-install-template installed" disabled>
                            <i data-lucide="check-circle-2"></i> Installed
                        </button>
                    ` : `
                        <button class="btn-install-template" data-pack-id="${pack.id}">
                            <i data-lucide="download"></i> Install Pack
                        </button>
                    `}
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', packHTML);
        });

        // Click handlers
        grid.querySelectorAll('.btn-install-template:not(.installed)').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const packId = btn.dataset.packId;
                const pack = templates.find(p => p.id === packId);
                if (!pack) return;

                let addedCount = 0;
                pack.habits.forEach(hName => {
                    const exists = state.habits.some(existing => existing.name.toLowerCase() === hName.toLowerCase());
                    if (!exists) {
                        state.habits.push({
                            id: 'habit_' + Date.now() + '_' + Math.floor(Math.random()*1000),
                            name: hName,
                            icon: 'check-square',
                            streak: 0,
                            schedule: [] // Every day default
                        });
                        addedCount++;
                    }
                });

                if (addedCount > 0) {
                    saveState();
                    renderHabitList();
                    renderProgressOverview();
                    renderHabitTemplates();
                    showToast(`Successfully installed "${pack.name}" with ${addedCount} habits! 📦`, 'success');
                } else {
                    showToast('All habits from this pack are already installed!', 'info');
                }
            });
        });

        lucide.createIcons();
    };
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            calendarCurrentMonth.setMonth(calendarCurrentMonth.getMonth() - 1);
            calendarSelectedDate = null;
            renderCalendar();
            // Reset detail panel
            const detailEl = document.getElementById('calendar-detail');
            if (detailEl) {
                detailEl.innerHTML = `
                    <div class="detail-placeholder">
                        <i data-lucide="mouse-pointer-click"></i>
                        <p>Click a day on the calendar to view completion details.</p>
                    </div>
                `;
                lucide.createIcons();
            }
        });
    }
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            calendarCurrentMonth.setMonth(calendarCurrentMonth.getMonth() + 1);
            calendarSelectedDate = null;
            renderCalendar();
            const detailEl = document.getElementById('calendar-detail');
            if (detailEl) {
                detailEl.innerHTML = `
                    <div class="detail-placeholder">
                        <i data-lucide="mouse-pointer-click"></i>
                        <p>Click a day on the calendar to view completion details.</p>
                    </div>
                `;
                lucide.createIcons();
            }
        });
    }

    // ---------------------------------------------------------
    // Initialization Hooks
    // ---------------------------------------------------------
    loadState();
    populateLoggerForm();
    setupNavigation();
    renderHabitList();
    updateTimerDisplay();
    renderProgressOverview();
    calculateAIInsights();
    renderCalendar();
    renderStreakFreeze();
    renderJournal();
    renderWeeklyReview();
    renderHabitTemplates();
    
    // Safety fallback: render Gamification
    if (typeof renderGamification === 'function') renderGamification();
    
    // Mouse hover visual tracking details for cards
    document.querySelectorAll('.glass-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--x', `${x}px`);
            card.style.setProperty('--y', `${y}px`);
        });
    });
});
