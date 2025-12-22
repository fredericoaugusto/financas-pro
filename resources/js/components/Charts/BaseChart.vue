<template>
    <div class="relative w-full h-full" :style="{ minHeight: height }">
        <canvas ref="canvas"></canvas>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, shallowRef } from 'vue';
import Chart from 'chart.js/auto';

const props = defineProps({
    type: {
        type: String,
        required: true,
        validator: (value) => ['line', 'bar', 'doughnut', 'pie'].includes(value)
    },
    data: {
        type: Object,
        required: true
    },
    options: {
        type: Object,
        default: () => ({})
    },
    height: {
        type: String,
        default: '300px'
    }
});

const emit = defineEmits(['click']);

const canvas = ref(null);
const chartInstance = shallowRef(null);

function createChart() {
    if (chartInstance.value) {
        chartInstance.value.destroy();
    }

    if (!canvas.value) return;

    const ctx = canvas.value.getContext('2d');
    
    // Merge default options with props options
    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements, chart) => {
            if (elements.length > 0) {
                const element = elements[0];
                const datasetIndex = element.datasetIndex;
                const index = element.index;
                const data = props.data.datasets[datasetIndex].data[index];
                const label = props.data.labels[index];
                
                emit('click', { event, element, datasetIndex, index, data, label });
            }
        },
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                }
            }
        }
    };

    chartInstance.value = new Chart(ctx, {
        type: props.type,
        data: props.data,
        options: { ...defaultOptions, ...props.options }
    });
}

watch(() => props.data, (newData) => {
    if (chartInstance.value) {
        chartInstance.value.data = newData;
        chartInstance.value.update();
    } else {
        createChart();
    }
}, { deep: true });

onMounted(() => {
    createChart();
});

onUnmounted(() => {
    if (chartInstance.value) {
        chartInstance.value.destroy();
    }
});
</script>
