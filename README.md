# ZenFlow // Habit & Productivity Analytics Dashboard ❄️📅📝📊📦

ZenFlow is a premium, localized single-page web application designed to help users establish habits, maintain streaks, track daily wellness correlations, and achieve peak focus with a built-in interactive synthesizer. Built entirely with vanilla technologies, it features rich, premium glassmorphism styling, a robust local persistence model, and a suite of high-value gamified elements.

---

## 🌟 Premium Features

1. **Streak Freeze (❄️)**
   * Protect active habit streaks during busy days or rest days.
   * Start with 1 free token; earn more by achieving "Perfect Days" (up to 3 tokens max).
   * Restores streaks without requiring completion on frozen days.

2. **Habit Scheduling (📅)**
   * Customize active days (Mon, Wed, Fri, etc.) for each habit during creation.
   * Auto-fades off-schedule habits, exempting them from active streak calculations and perfect day requirements.

3. **Daily Journaling (📝)**
   * Dedicated reflections and gratitude log card to keep track of mindfulness alongside tracking metrics.
   * Auto-saves alongside wellness metrics inside today's historical logs.

4. **Weekly Review (📊)**
   * Summary panel displaying total completions, average sleep, screen time, and mood.
   * Provides comparative trend percentages against the previous week, trophy highlights, and customized coach advice.

5. **Curated Habit Templates (📦)**
   * Install structured habit packs with one click (Morning Routine, Fitness, Mindfulness, Developer Flow, and Peak Student) to get started immediately.

---

## 🚀 Core Features

* **Daily Wellness Logger**: Log sleep, screen time, mood (emoji picker), and productivity rating (star ratings).
* **Focus Room & Pomodoro**: Built-in interval timer with a morphing Lotus SVG animation and ambient synthesized backing loops to enhance deep focus.
* **Canvas Analytics**: Heatmap grids, sleep-to-productivity correlation plots, weekly completion progress rings, and historical trend lines.
* **Behavioral AI Coach**: Generates on-the-fly local insights, pointing out correlations between screen time, sleep, and habit completions.
* **Gamification Engine**: Earn EXP, level up your status, and unlock achievements/badges.
* **Import/Export Data**: Easily backup or restore your history using portable JSON files.

---

## 🛠️ Technology Stack

* **Structure**: Semantic HTML5 with Lucide Icons
* **Styling**: Premium CSS custom variables, light-theme variables (`#f5f5f0` and `#eceae4`), frosted glass cards, and micro-animations.
* **Logic**: Vanilla ES6 JavaScript (zero build tools, packages, or compiler dependencies).
* **Analytics**: Custom HTML5 Canvas rendering engine.
* **Persistence**: Synchronous browser `LocalStorage` API serialization.

---

## 💻 Quick Start

To run the project locally:

1. Clone this repository:
   ```bash
   git clone https://github.com/dknc86-max/zenflow-habit-dashboard.git
   cd zenflow-habit-dashboard
   ```

2. Start a local server (e.g. Python):
   ```bash
   python3 -m http.server 8080
   ```

3. Open your browser and navigate to `http://localhost:8080`.
