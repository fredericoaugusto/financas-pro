<template>
    <div 
        v-if="!isDismissed"
        :class="[
            'card border mb-6',
            colorClasses
        ]"
    >
        <div class="flex items-start gap-3">
            <div :class="['p-2 rounded-lg', iconBgClass]">
                <slot name="icon">
                    <svg class="w-5 h-5" :class="iconColorClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </slot>
            </div>
            <div class="flex-1">
                <p :class="['text-sm', textColorClass]">
                    <slot></slot>
                </p>
            </div>
            <button 
                @click="dismiss(false)"
                class="p-1 hover:bg-black/10 rounded-lg transition-colors"
                title="Fechar"
            >
                <svg class="w-5 h-5" :class="iconColorClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        
        <!-- Never show again option -->
        <div v-if="!hideNeverShowOption" class="mt-3 pl-10">
            <button 
                @click="dismiss(true)"
                class="text-xs underline opacity-70 hover:opacity-100 transition-opacity"
                :class="textColorClass"
            >
                Não mostrar novamente
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';

const props = defineProps({
    storageKey: {
        type: String,
        required: true
    },
    color: {
        type: String,
        default: 'blue', // blue, green, yellow, purple, indigo
        validator: (value) => ['blue', 'green', 'yellow', 'purple', 'indigo', 'emerald'].includes(value)
    },
    hideNeverShowOption: {
        type: Boolean,
        default: false
    }
});

const isDismissed = ref(false);

const colorMap = {
    blue: {
        bg: 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-200 dark:border-blue-800',
        iconBg: 'bg-blue-500/20',
        iconColor: 'text-blue-600',
        textColor: 'text-blue-700 dark:text-blue-300'
    },
    green: {
        bg: 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-200 dark:border-green-800',
        iconBg: 'bg-green-500/20',
        iconColor: 'text-green-600',
        textColor: 'text-green-700 dark:text-green-300'
    },
    emerald: {
        bg: 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-200 dark:border-emerald-800',
        iconBg: 'bg-emerald-500/20',
        iconColor: 'text-emerald-600',
        textColor: 'text-emerald-700 dark:text-emerald-300'
    },
    yellow: {
        bg: 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-200 dark:border-yellow-800',
        iconBg: 'bg-yellow-500/20',
        iconColor: 'text-yellow-600',
        textColor: 'text-yellow-700 dark:text-yellow-300'
    },
    purple: {
        bg: 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-800',
        iconBg: 'bg-purple-500/20',
        iconColor: 'text-purple-600',
        textColor: 'text-purple-700 dark:text-purple-300'
    },
    indigo: {
        bg: 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-200 dark:border-indigo-800',
        iconBg: 'bg-indigo-500/20',
        iconColor: 'text-indigo-600',
        textColor: 'text-indigo-700 dark:text-indigo-300'
    }
};

const colorClasses = computed(() => colorMap[props.color].bg);
const iconBgClass = computed(() => colorMap[props.color].iconBg);
const iconColorClass = computed(() => colorMap[props.color].iconColor);
const textColorClass = computed(() => colorMap[props.color].textColor);

onMounted(() => {
    // Check if permanently dismissed
    const permanentKey = `banner_never_${props.storageKey}`;
    if (localStorage.getItem(permanentKey) === 'true') {
        isDismissed.value = true;
        return;
    }
    
    // Check session dismissal
    const sessionKey = `banner_session_${props.storageKey}`;
    if (sessionStorage.getItem(sessionKey) === 'true') {
        isDismissed.value = true;
    }
});

function dismiss(permanent) {
    isDismissed.value = true;
    
    if (permanent) {
        // Save to localStorage (persists across sessions)
        localStorage.setItem(`banner_never_${props.storageKey}`, 'true');
    } else {
        // Save to sessionStorage (only for this session)
        sessionStorage.setItem(`banner_session_${props.storageKey}`, 'true');
    }
}
</script>
