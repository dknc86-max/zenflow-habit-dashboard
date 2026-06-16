/* ==========================================================================
   ZenFlow Charts & Visualizations Renderer (Chart.js + SVG)
   ========================================================================== */

class ZenCharts {
    constructor() {
        this.correlationChart = null;
        this.trendChart = null;
    }

    // 1. Render Correlation Scatter Plot (Sleep vs Productivity) using Chart.js
    renderCorrelationChart(logs) {
        const canvas = document.getElementById('correlation-chart');
        if (!canvas) return;

        const validLogs = logs.filter(l => l.sleep !== undefined && l.productivity !== undefined);

        const data = validLogs.map(log => ({
            x: parseFloat(log.sleep),
            y: parseInt(log.productivity),
            date: log.date
        }));

        const config = {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Sleep vs Productivity',
                    data: data,
                    backgroundColor: 'rgba(122, 154, 138, 0.7)',
                    borderColor: '#7a9a8a',
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        min: 4,
                        max: 12,
                        title: {
                            display: true,
                            text: 'Sleep Duration (Hours)'
                        },
                        ticks: {
                            callback: value => value + 'h'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.06)'
                        }
                    },
                    y: {
                        min: 1,
                        max: 5,
                        title: {
                            display: false,
                            text: 'Productivity'
                        },
                        ticks: {
                            callback: value => value + ' ★'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.06)'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const log = validLogs.find(l => l.date === ctx.raw.date);
                                return `Sleep: ${ctx.parsed.x}h, Productivity: ${ctx.parsed.y} ★`;
                            },
                            title: (ctx) => {
                                const log = validLogs.find(l => l.date === ctx[0].raw.date);
                                const d = new Date(log.date + 'T12:00:00');
                                return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                            }
                        }
                    },
                    legend: {
                        display: false
                    }
                }
            }
        };

        if (this.correlationChart) {
            this.correlationChart.data = data;
            this.correlationChart.update();
        } else {
            this.correlationChart = new Chart(canvas, config);
        }
    }

    // 2. Draw Wellness Balance Trend (Screen Time bars vs Mood line) using Chart.js
    renderTrendChart(logs) {
        const canvas = document.getElementById('trend-chart');
        if (!canvas) return;

        const sortedLogs = [...logs]
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-7);

        const labels = sortedLogs.map(l => {
            const d = new Date(l.date + 'T12:00:00');
            return (d.getMonth() + 1) + '/' + d.getDate();
        });

        const screenData = sortedLogs.map(l => l.screen || 0);
        const moodData = sortedLogs.map(l => l.mood || 3);

        const config = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        type: 'bar',
                        label: 'Screen Time',
                        data: screenData,
                        backgroundColor: 'rgba(181, 138, 122, 0.4)',
                        borderColor: '#b58a7a',
                        yAxisID: 'y-screen',
                        borderRadius: 4
                    },
                    {
                        type: 'line',
                        label: 'Mood',
                        data: moodData,
                        borderColor: '#7a9a8a',
                        backgroundColor: '#7a9a8a',
                        yAxisID: 'y-mood',
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    'y-screen': {
                        type: 'linear',
                        position: 'left',
                        min: 0,
                        max: 12,
                        title: {
                            display: true,
                            text: 'Screen Time (hours)'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    'y-mood': {
                        type: 'linear',
                        position: 'right',
                        min: 1,
                        max: 5,
                        title: {
                            display: true,
                            text: 'Mood'
                        },
                        grid: {
                            display: false
                        },
                        ticks: {
                            callback: value => {
                                const moods = ['Low', 'Tired', 'Neut', 'Good', 'Flow'];
                                return moods[value - 1] || value;
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                if (ctx.dataset.type === 'line') {
                                    const moods = ['Low', 'Tired', 'Neut', 'Good', 'Flow'];
                                    return `Mood: ${moods[ctx.parsed.y - 1]}`;
                                }
                                return `Screen Time: ${ctx.parsed.y}h`;
                            }
                        }
                    },
                    legend: {
                        display: false
                    }
                }
            }
        };

        if (this.trendChart) {
            this.trendChart.data = config.data;
            this.trendChart.options = config.options;
            this.trendChart.update();
        } else {
            this.trendChart = new Chart(canvas, config);
        }
    }

    // 3. Render Weekly Progress Radial Rings (SVG)
    renderProgressRings(habits, logs) {
        const container = document.getElementById('rings-summary-container');
        if (!container) return;

        container.innerHTML = '';

        if (habits.length === 0) {
            container.innerHTML = '<div class="insight-text" style="color:var(--text-dim)">No habits configured yet.</div>';
            return;
        }

        const ringThemes = ['sage', 'clay', 'umber'];

        const last7Days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            last7Days.push(`${yyyy}-${mm}-${dd}`);
        }

        const displayHabits = habits.slice(0, 3);

        displayHabits.forEach((habit, idx) => {
            const theme = ringThemes[idx % ringThemes.length];

            let completedCount = 0;
            logs.forEach(log => {
                if (last7Days.includes(log.date) && log.completedHabits && log.completedHabits.includes(habit.id)) {
                    completedCount++;
                }
            });

            const pct = Math.round((completedCount / 7) * 100);

            const radius = 40;
            const circ = 2 * Math.PI * radius;
            const offset = circ - (pct / 100) * circ;

            const ringHTML = `
                <div class="radial-ring-widget ${theme}" title="Completion rate of '${habit.name}' over the last 7 days">
                    <div class="ring-visual">
                        <svg>
                            <circle class="ring-track" cx="45" cy="45" r="${radius}"></circle>
                            <circle class="ring-progress" cx="45" cy="45" r="${radius}" 
                                    style="stroke-dasharray: ${circ}; stroke-dashoffset: ${offset}"></circle>
                        </svg>
                        <div class="ring-text-inner">${pct}%</div>
                    </div>
                    <span class="ring-name">${habit.name}</span>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', ringHTML);
        });
    }

    // 4. Render Github-style Contribution Grid Heatmap (Last 4 Weeks)
    renderHabitHeatmap(habits, logs) {
        const grid = document.getElementById('heatmap-grid');
        if (!grid) return;

        grid.innerHTML = '';

        const totalHabitsCount = habits.length;

        const days = [];
        for (let i = 27; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            days.push(`${yyyy}-${mm}-${dd}`);
        }

        days.forEach(dayStr => {
            const dayLog = logs.find(l => l.date === dayStr);
            let score = 0;
            let completedCount = 0;

            if (dayLog && totalHabitsCount > 0) {
                completedCount = dayLog.completedHabits ? dayLog.completedHabits.length : 0;
                const ratio = completedCount / totalHabitsCount;

                if (ratio > 0.8) score = 4;
                else if (ratio > 0.5) score = 3;
                else if (ratio > 0.25) score = 2;
                else if (ratio > 0) score = 1;
            }

            const d = new Date(dayStr + 'T12:00:00');
            const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

            const dayNode = document.createElement('div');
            dayNode.className = `heatmap-day level-${score}`;

            dayNode.innerHTML = `
                <div class="heatmap-tooltip">
                    <strong>${dateLabel}</strong><br/>
                    ${completedCount}/${totalHabitsCount} Habits Completed
                </div>
            `;

            grid.appendChild(dayNode);
        });
    }
}

const Visuals = new ZenCharts();
window.ZenCharts = Visuals;