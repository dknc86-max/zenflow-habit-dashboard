/* ==========================================================================
   ZenFlow Charts & Visualizations Renderer (HTML5 Canvas + SVG)
   ========================================================================== */

class ZenCharts {
    constructor() {
        this.tooltips = {};
    }

    // Initialize or retrieve absolute tooltip element
    getTooltipElement(canvasId) {
        let tooltip = this.tooltips[canvasId];
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'chart-tooltip-bubble';
            tooltip.style.position = 'absolute';
            tooltip.style.background = 'rgba(15, 17, 26, 0.95)';
            tooltip.style.border = '1px solid rgba(0, 242, 254, 0.3)';
            tooltip.style.color = 'white';
            tooltip.style.padding = '0.45rem 0.75rem';
            tooltip.style.borderRadius = '6px';
            tooltip.style.fontSize = '0.72rem';
            tooltip.style.pointerEvents = 'none';
            tooltip.style.opacity = '0';
            tooltip.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            tooltip.style.zIndex = '100';
            tooltip.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';
            
            // Append next to canvas
            const canvas = document.getElementById(canvasId);
            if (canvas && canvas.parentElement) {
                canvas.parentElement.style.position = 'relative';
                canvas.parentElement.appendChild(tooltip);
            }
            this.tooltips[canvasId] = tooltip;
        }
        return tooltip;
    }

    // 1. Draw Correlation Scatter Plot (Sleep vs Productivity)
    renderCorrelationChart(logs) {
        console.log("Entering renderCorrelationChart, logs count:", logs ? logs.length : 0);
        const canvas = document.getElementById('correlation-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const tooltip = this.getTooltipElement('correlation-chart');
        
        // Handle High-DPI screens
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        console.log("renderCorrelationChart canvas rect:", rect.width, rect.height);
        if (rect.width === 0 || rect.height === 0) {
            console.log("renderCorrelationChart size is 0, returning early");
            return;
        }
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        
        const width = rect.width;
        const height = rect.height;
        
        // Padding
        const padLeft = 45;
        const padRight = 20;
        const padTop = 20;
        const padBottom = 40;
        
        const chartWidth = width - padLeft - padRight;
        const chartHeight = height - padTop - padBottom;
        
        // Clean
        ctx.clearRect(0, 0, width, height);
        
        // Draw Grid Lines (Sleep: 0 to 12 hrs, Productivity: 1 to 5 stars)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#6b7280'; // Text-dim
        ctx.font = '500 9px Inter';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        
        // Y Axis Grid (Productivity Rating: 1 - 5)
        for (let r = 1; r <= 5; r++) {
            const y = padTop + chartHeight - ((r - 1) / 4) * chartHeight;
            
            // Grid line
            ctx.beginPath();
            ctx.moveTo(padLeft, y);
            ctx.lineTo(width - padRight, y);
            ctx.stroke();
            
            // Y Label
            ctx.fillText(r + ' ★', padLeft - 10, y);
        }
        
        // X Axis Grid (Sleep Hours: 4 - 12 hrs)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (let sh = 4; sh <= 12; sh += 2) {
            const x = padLeft + ((sh - 4) / 8) * chartWidth;
            
            ctx.beginPath();
            ctx.moveTo(x, padTop);
            ctx.lineTo(x, padTop + chartHeight);
            ctx.stroke();
            
            // X Label
            ctx.fillText(sh + 'h', x, padTop + chartHeight + 10);
        }
        
        // X Axis label title
        ctx.fillText('Sleep Duration (Hours)', padLeft + chartWidth / 2, padTop + chartHeight + 25);
        
        // Plot Points
        const points = [];
        logs.forEach(log => {
            if (log.sleep === undefined || log.productivity === undefined) return;
            
            // Map values
            // Sleep range clamped to 4 - 12 for chart limits
            const sleepVal = Math.max(4, Math.min(12, log.sleep));
            const x = padLeft + ((sleepVal - 4) / 8) * chartWidth;
            
            // Productivity range 1 - 5
            const prodVal = Math.max(1, Math.min(5, log.productivity));
            const y = padTop + chartHeight - ((prodVal - 1) / 4) * chartHeight;
            
            points.push({ x, y, sleep: log.sleep, productivity: log.productivity, date: log.date });
            
            // Draw Gradient Point
            const grad = ctx.createRadialGradient(x, y, 1, x, y, 6);
            grad.addColorStop(0, '#0891b2');
            grad.addColorStop(1, 'rgba(0, 242, 254, 0.15)');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#0891b2';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.stroke();
        });
        
        // Save points to canvas element to avoid closure capture issues
        canvas.points = points;
        
        // Add interactive hover listener once
        if (!canvas.dataset.listener) {
            canvas.dataset.listener = 'true';
            
            canvas.addEventListener('mousemove', (e) => {
                const rect = canvas.getBoundingClientRect();
                const mX = e.clientX - rect.left;
                const mY = e.clientY - rect.top;
                
                // Find closest point
                let closest = null;
                let minDist = 18; // hover proximity threshold
                
                const currentPoints = canvas.points || [];
                currentPoints.forEach(p => {
                    const dx = p.x - mX;
                    const dy = p.y - mY;
                    const d = Math.sqrt(dx*dx + dy*dy);
                    if (d < minDist) {
                        minDist = d;
                        closest = p;
                    }
                });
                
                if (closest) {
                    tooltip.style.opacity = '1';
                    tooltip.style.transform = `translate(${closest.x}px, ${closest.y - 45}px) translateX(-50%)`;
                    tooltip.innerHTML = `
                        <strong>${this.formatDateString(closest.date)}</strong><br/>
                        Sleep: <span style="color:#0891b2">${closest.sleep} hrs</span><br/>
                        Productivity: <span style="color:#fbbf24">${closest.productivity}/5 Stars</span>
                    `;
                } else {
                    tooltip.style.opacity = '0';
                }
            });
            
            canvas.addEventListener('mouseleave', () => {
                tooltip.style.opacity = '0';
            });
        }
    }

    // 2. Draw Wellness Balance Trend (Screen Time bars vs Mood line)
    renderTrendChart(logs) {
        console.log("Entering renderTrendChart, logs count:", logs ? logs.length : 0);
        const canvas = document.getElementById('trend-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const tooltip = this.getTooltipElement('trend-chart');
        
        // Handle High-DPI screens
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        console.log("renderTrendChart canvas rect:", rect.width, rect.height);
        if (rect.width === 0 || rect.height === 0) {
            console.log("renderTrendChart size is 0, returning early");
            return;
        }
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        
        const width = rect.width;
        const height = rect.height;
        
        // Padding
        const padLeft = 45;
        const padRight = 45;
        const padTop = 20;
        const padBottom = 30;
        
        const chartWidth = width - padLeft - padRight;
        const chartHeight = height - padTop - padBottom;
        
        // Clean
        ctx.clearRect(0, 0, width, height);
        
        // Filter last 7 log records to show trend
        const sortedLogs = [...logs]
            .sort((a,b) => new Date(a.date) - new Date(b.date))
            .slice(-7);
            
        if (sortedLogs.length === 0) return;
        
        // Grid Axis Labels and lines
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.lineWidth = 1;
        ctx.font = '500 9px Inter';
        
        // Left Axis: Screen Time (0 - 12 hours)
        ctx.fillStyle = '#9ca3af'; // muted
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let sh = 0; sh <= 12; sh += 3) {
            const y = padTop + chartHeight - (sh / 12) * chartHeight;
            ctx.beginPath();
            ctx.moveTo(padLeft, y);
            ctx.lineTo(width - padRight, y);
            ctx.stroke();
            ctx.fillText(sh + 'h', padLeft - 10, y);
        }
        
        // Right Axis: Mood level (1 - 5)
        ctx.textAlign = 'left';
        const moodsText = ['Low', 'Tired', 'Neut', 'Good', 'Flow'];
        for (let m = 1; m <= 5; m++) {
            const y = padTop + chartHeight - ((m - 1) / 4) * chartHeight;
            ctx.fillText(moodsText[m-1], width - padRight + 10, y);
        }
        
        // Render Bars for Screen Time & Points for Mood
        const barWidth = Math.max(12, Math.min(24, chartWidth / 7 * 0.45));
        const spacing = chartWidth / (sortedLogs.length === 1 ? 2 : sortedLogs.length);
        const points = [];
        
        sortedLogs.forEach((log, index) => {
            const x = padLeft + (index * spacing) + (sortedLogs.length === 1 ? spacing/2 : spacing/2);
            
            // 1. Render Screen Time Bar (Mapped to Left Axis: 0 to 12 hrs)
            if (log.screen !== undefined) {
                const screenVal = Math.max(0, Math.min(12, log.screen));
                const barHeight = (screenVal / 12) * chartHeight;
                const barY = padTop + chartHeight - barHeight;
                
                // Draw rounded bar
                const barGrad = ctx.createLinearGradient(x - barWidth/2, barY, x - barWidth/2 + barWidth, padTop + chartHeight);
                barGrad.addColorStop(0, 'rgba(244, 63, 94, 0.4)');
                barGrad.addColorStop(1, 'rgba(244, 63, 94, 0.05)');
                ctx.fillStyle = barGrad;
                
                this.drawRoundedRect(ctx, x - barWidth/2, barY, barWidth, barHeight, 4);
                ctx.fill();
            }
            
            // 2. Map Mood to Line Point (Mapped to Right Axis: 1 to 5)
            if (log.mood !== undefined) {
                const moodVal = Math.max(1, Math.min(5, log.mood));
                const y = padTop + chartHeight - ((moodVal - 1) / 4) * chartHeight;
                points.push({ x, y, mood: log.mood, screen: log.screen || 0, date: log.date });
            }
            
            // Draw X date labels
            ctx.fillStyle = '#6b7280';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const dateObj = new Date(log.date);
            const dateFormatted = (dateObj.getMonth() + 1) + '/' + dateObj.getDate();
            ctx.fillText(dateFormatted, x, padTop + chartHeight + 10);
        });
        
        // Draw Mood trend line
        if (points.length > 1) {
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            
            for (let i = 1; i < points.length; i++) {
                // Smooth bezier curve calculations
                const xc = (points[i-1].x + points[i].x) / 2;
                const yc = (points[i-1].y + points[i].y) / 2;
                ctx.quadraticCurveTo(points[i-1].x, points[i-1].y, xc, yc);
            }
            ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
            ctx.stroke();
        }
        
        // Draw Mood indicators dots
        points.forEach(p => {
            ctx.fillStyle = '#a855f7';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });
        
        // Save points to canvas element to avoid closure capture issues
        canvas.points = points;
        
        // Add interactive hover listener once
        if (!canvas.dataset.listener) {
            canvas.dataset.listener = 'true';
            
            canvas.addEventListener('mousemove', (e) => {
                const rect = canvas.getBoundingClientRect();
                const mX = e.clientX - rect.left;
                const mY = e.clientY - rect.top;
                
                let closest = null;
                let minDist = 25;
                
                const currentPoints = canvas.points || [];
                currentPoints.forEach(p => {
                    // Check horizontal proximity primarily
                    const dx = Math.abs(p.x - mX);
                    if (dx < minDist) {
                        minDist = dx;
                        closest = p;
                    }
                });
                
                if (closest) {
                    tooltip.style.opacity = '1';
                    tooltip.style.transform = `translate(${closest.x}px, ${closest.y - 50}px) translateX(-50%)`;
                    tooltip.innerHTML = `
                        <strong>${this.formatDateString(closest.date)}</strong><br/>
                        Screen Time: <span style="color:#f43f5e">${closest.screen} hrs</span><br/>
                        Mood State: <span style="color:#a855f7">${moodsText[closest.mood-1]}</span>
                    `;
                } else {
                    tooltip.style.opacity = '0';
                }
            });
            
            canvas.addEventListener('mouseleave', () => {
                tooltip.style.opacity = '0';
            });
        }
    }

    // 3. Render Weekly Progress Radial Rings (SVG)
    renderProgressRings(habits, logs) {
        const container = document.getElementById('rings-summary-container');
        if (!container) return;
        
        container.innerHTML = ''; // Clean
        
        if (habits.length === 0) {
            container.innerHTML = '<div class="insight-text" style="color:var(--text-dim)">No habits configured yet.</div>';
            return;
        }

        // We'll map colors to rings cyclically
        const ringThemes = ['cyan', 'purple', 'rose'];
        
        // Compute last 7 days metrics
        const last7Days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last7Days.push(d.toISOString().split('T')[0]);
        }
        
        // Take up to top 3 habits to display as gorgeous progress rings
        const displayHabits = habits.slice(0, 3);
        
        displayHabits.forEach((habit, idx) => {
            const theme = ringThemes[idx % ringThemes.length];
            
            // Calculate completion rate in the last 7 days
            let completedCount = 0;
            logs.forEach(log => {
                if (last7Days.includes(log.date) && log.completedHabits && log.completedHabits.includes(habit.id)) {
                    completedCount++;
                }
            });
            
            const pct = Math.round((completedCount / 7) * 100);
            
            // SVG parameters
            const radius = 40;
            const circ = 2 * Math.PI * radius; // 251.2
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
        
        grid.innerHTML = ''; // Clear
        
        // Total active habits configured
        const totalHabitsCount = habits.length;
        
        // Get last 28 days
        const days = [];
        for (let i = 27; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }
        
        days.forEach(dayStr => {
            const dayLog = logs.find(l => l.date === dayStr);
            let score = 0; // 0 to 4 density rank
            let completedCount = 0;
            
            if (dayLog && totalHabitsCount > 0) {
                completedCount = dayLog.completedHabits ? dayLog.completedHabits.length : 0;
                const ratio = completedCount / totalHabitsCount;
                
                if (ratio > 0.8) score = 4;
                else if (ratio > 0.5) score = 3;
                else if (ratio > 0.25) score = 2;
                else if (ratio > 0) score = 1;
            }
            
            const dateObj = new Date(dayStr);
            const dateLabel = this.formatDateString(dayStr);
            
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

    /* --- Helper Drawing & Formatting Utilities --- */
    
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    formatDateString(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
}

// Global visual rendering engine instance
const Visuals = new ZenCharts();
window.ZenCharts = Visuals;
