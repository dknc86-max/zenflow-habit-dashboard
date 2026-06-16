# Changelog

## [1.1.0] - 2026-06-15

### Fixed
- **Streak calculation bug**: Rewrote `calculateHabitStreak` to fix timezone issues (UTC vs local date mismatch), undefined variable reference (`checkDate`), and potential infinite loops. Now uses safe local date formatting with a 365-day iteration limit.
- **Timer reset bug**: `resetTimer()` now properly resets `timerType` back to `'FOCUS'` and `timerTotalDuration` back to 1500s. Previously, resetting during BREAK mode would keep the timer in BREAK mode.
- **Timer completion flow**: Refactored `handleTimerCompletion` to directly set display state instead of calling `resetTimer()`, which previously overwrote the newly set break/focus duration.
- **Timezone safety**: Replaced all `new Date().toISOString().split('T')[0]` and `new Date(dateStr)` calls with local-time-safe date formatting across `app.js` and `charts.js` to prevent off-by-one date errors near midnight.
- **Toast notification leak**: Added max 5 toast limit to prevent DOM node accumulation when triggering many notifications rapidly.

### Added
- **Accessibility (ARIA)**: Added `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`, `aria-labelledby` to navigation and tab panels for screen reader support.
- **ARIA live region**: Added `aria-live="polite"` and `role="status"` to notification container so toasts are announced by screen readers.
- **ARIA labels**: Added `aria-label` to canvas elements, day pills (Sunday-Saturday), and main navigation landmark.
- **Meta tags**: Added `description`, `theme-color`, and Open Graph tags for SEO and social sharing.
- **Mobile responsiveness**: Added 500px breakpoint for smaller screens — stacks form rows, reduces heading padding, wraps mood selector, adjusts notification container positioning.
- **Keyboard support**: Day pills now have proper `type="button"` and aria-labels.

## [1.0.0] - 2026-06-15

- Initial release with all core features.
