<template>
    <div class="card mb-6">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Anexos</h2>
            <div v-if="loading" class="text-sm text-gray-500">
                <svg class="animate-spin h-5 w-5 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        </div>

        <div
            class="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
            @click="triggerFileInput"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
            :class="{ 'border-primary-500 bg-primary-50 dark:bg-primary-900/10': isDragging }"
        >
            <input
                ref="fileInput"
                type="file"
                multiple
                class="hidden"
                accept=".jpg,.jpeg,.png,.pdf,.webp"
                @change="handleFileSelect"
            />
            <div class="text-gray-500 dark:text-gray-400">
                <svg class="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p class="text-sm">
                    <span class="font-medium text-primary-600 hover:text-primary-500">Clique para enviar</span>
                    ou arraste e solte
                </p>
                <p class="text-xs mt-1">PNG, JPG, PDF até 10MB</p>
            </div>
        </div>

        <!-- Lists -->
        <div v-if="attachments.length > 0 || queuedFiles.length > 0" class="mt-4 space-y-2">
            
            <!-- Queued Files (Pending Upload) -->
            <div v-for="(file, index) in queuedFiles" :key="'queued-' + index" class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">{{ file.name }}</p>
                        <p class="text-xs text-gray-500">{{ formatSize(file.size) }} • Aguardando envio</p>
                    </div>
                </div>
                <button @click.stop="removeQueued(index)" class="text-gray-400 hover:text-red-500 transition-colors p-1">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Existing Attachments -->
            <div v-for="att in attachments" :key="att.id" class="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div class="flex items-center gap-3 cursor-pointer" @click="handleDownload(att)">
                    <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <svg v-if="att.mime_type.includes('image')" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">{{ att.original_name }}</p>
                        <p class="text-xs text-gray-500">{{ formatSize(att.size) }} • {{ formatDate(att.created_at) }}</p>
                    </div>
                </div>
                <div class="flex items-center gap-1">
                     <button @click.stop="handleDownload(att)" class="text-gray-400 hover:text-primary-500 transition-colors p-1" title="Baixar">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </button>
                    <button @click.stop="handleDelete(att)" class="text-gray-400 hover:text-red-500 transition-colors p-1" title="Remover">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useTransactionsStore } from '@/stores/transactions';
import { useUiStore } from '@/stores/ui';

const props = defineProps({
    transactionId: {
        type: [Number, String],
        default: null
    }
});

const emit = defineEmits(['files-changed']);

const transactionsStore = useTransactionsStore();
const uiStore = useUiStore();

const fileInput = ref(null);
const isDragging = ref(false);
const loading = ref(false);
const attachments = ref([]);
const queuedFiles = ref([]);

// Fetch attachments if transactionId exists
async function loadAttachments() {
    if (!props.transactionId) return;
    loading.value = true;
    try {
        attachments.value = await transactionsStore.fetchAttachments(props.transactionId);
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    if (props.transactionId) {
        loadAttachments();
    }
});

watch(() => props.transactionId, (newId) => {
    if (newId) {
        loadAttachments();
    } else {
        attachments.value = [];
    }
});

function triggerFileInput() {
    fileInput.value.click();
}

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    addFiles(files);
    // Reset input
    event.target.value = '';
}

function handleDrop(event) {
    isDragging.value = false;
    const files = Array.from(event.dataTransfer.files);
    addFiles(files);
}

function addFiles(files) {
    const validFiles = files.filter(validateFile);
    
    if (props.transactionId) {
        // Upload immediately
        uploadFiles(validFiles);
    } else {
        // Queue
        queuedFiles.value.push(...validFiles);
        emit('files-changed', queuedFiles.value);
    }
}

function validateFile(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(file.type)) {
        uiStore.showToast(`Tipo de arquivo não permitido: ${file.name}`, 'warning');
        return false;
    }
    
    if (file.size > maxSize) {
        uiStore.showToast(`Arquivo muito grande (>10MB): ${file.name}`, 'warning');
        return false;
    }
    
    return true;
}

async function uploadFiles(files) {
    if (files.length === 0) return;
    
    const loadingState = uiStore.loading; // Preserve global loading state if any
    loading.value = true; // Local loading
    
    try {
        const result = await transactionsStore.uploadAttachments(props.transactionId, files);
        if (result.success) {
            attachments.value.push(...result.data);
        }
    } finally {
        loading.value = false;
    }
}

// Expose this method to parent
async function uploadQueuedFiles(newTransactionId) {
    if (queuedFiles.value.length === 0) return { success: true };
    const result = await transactionsStore.uploadAttachments(newTransactionId, queuedFiles.value);
    if (result.success) {
        queuedFiles.value = []; // Clear queue
    }
    return result;
}

function removeQueued(index) {
    queuedFiles.value.splice(index, 1);
    emit('files-changed', queuedFiles.value);
}

async function handleDelete(attachment) {
    if (!confirm('Deseja realmente remover este anexo?')) return;
    
    const result = await transactionsStore.deleteAttachment(attachment.id);
    if (result.success) {
        attachments.value = attachments.value.filter(a => a.id !== attachment.id);
    }
}

async function handleDownload(attachment) {
    await transactionsStore.downloadAttachment(attachment.id, attachment.original_name);
}

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('pt-BR');
}

defineExpose({
    uploadQueuedFiles,
    hasQueuedFiles: () => queuedFiles.value.length > 0
});
</script>
