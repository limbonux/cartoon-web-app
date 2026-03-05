// ═══════════════════════════════════════════
// التحكم بالثيم - مطابق لـ theme_controller.dart
// ═══════════════════════════════════════════

class ThemeController {
    constructor() {
        this.STORAGE_KEY = 'cartoon-maker-theme';
        this.init();
    }

    init() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            this.setTheme(saved);
        } else {
            // استخدام تفضيل النظام
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setTheme(prefersDark ? 'dark' : 'light');
        }

        // الاستماع لتغيير تفضيل النظام
        window.matchMedia('(prefers-color-scheme: dark)')
            .addEventListener('change', (e) => {
                if (!localStorage.getItem(this.STORAGE_KEY)) {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });
    }

    get isDark() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(this.STORAGE_KEY, theme);
        this.updateToggleButton();
        // تحديث لون الـ theme-color meta tag
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.content = theme === 'dark' ? '#0F172A' : '#F8FAFC';
        }
    }

    toggle() {
        this.setTheme(this.isDark ? 'light' : 'dark');
    }

    updateToggleButton() {
        const btn = document.getElementById('theme-toggle');
        if (btn) {
            btn.innerHTML = this.isDark
                ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
                : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';
            btn.setAttribute('aria-label', this.isDark ? 'الوضع الفاتح' : 'الوضع الداكن');
        }
    }
}

export const themeController = new ThemeController();
