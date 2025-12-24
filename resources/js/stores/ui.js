import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUiStore = defineStore('ui', () => {
    const isLoading = ref(false);
    const toasts = ref([]);
    const sidebarOpen = ref(true);

    // Initialize dark mode from localStorage, fallback to system preference
    function getInitialDarkMode() {
        const saved = localStorage.getItem('darkMode');
        if (saved !== null) {
            return saved === 'true';
        }
        // Fallback to system preference
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    const darkMode = ref(getInitialDarkMode());

    // Sync class with state (the inline script in app.blade.php handles initial load)
    if (darkMode.value && !document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.add('dark');
    } else if (!darkMode.value && document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
    }

    function setLoading(value) {
        isLoading.value = value;
    }

    function showToast(message, type = 'info', duration = 5000) {
        const id = Date.now();
        toasts.value.push({ id, message, type });

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }

    function removeToast(id) {
        const index = toasts.value.findIndex(t => t.id === id);
        if (index !== -1) {
            toasts.value.splice(index, 1);
        }
    }

    function toggleSidebar() {
        sidebarOpen.value = !sidebarOpen.value;
    }

    function toggleDarkMode() {
        darkMode.value = !darkMode.value;
        localStorage.setItem('darkMode', darkMode.value);

        if (darkMode.value) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    return {
        isLoading,
        toasts,
        sidebarOpen,
        darkMode,
        setLoading,
        showToast,
        removeToast,
        toggleSidebar,
        toggleDarkMode,
    };
});
