<script setup lang="ts">
import { AuthCredentials } from '../control/common';
let authToken: false | string = false, auth: AuthCredentials | undefined;

const authRaw = localStorage.getItem('auth');
if (authRaw) {
    auth = JSON.parse(authRaw)
    if (auth && auth.expires - Date.now() > 3600 * 1000) {
        authToken = auth.access_token;
    }
}

const _isAdmin = ref(false);
async function isAdmin(): Promise<boolean> {
    if (!authToken) return false;
    return (await axios.get('/api/auth/isAdmin', {
        params: {
            auth: authToken
        }
    })).data.data.isAdmin;
}

isAdmin().then((admin) => {
    _isAdmin.value = admin;
}).catch((e) => {
    location.replace('/login');
})


import axios from 'axios';
// @ts-expect-error
import type { ChartData, ChartOptions } from 'chart.js';
import 'chartjs-adapter-luxon';
import { TelemetryEntry } from 'menu/arisa/telemetry/type';
import { defineAsyncComponent, onMounted, ref } from 'vue';

const Line = defineAsyncComponent(async () => {
    const {
        Chart: ChartJS,
        TimeSeriesScale,
        LinearScale,
        CategoryScale,
        PointElement,
        LineElement,
        Title,
        Tooltip,
        Legend
    } = await import('chart.js');
    ChartJS.register(
        TimeSeriesScale,
        LinearScale,
        CategoryScale,
        PointElement,
        LineElement,
        Title,
        Tooltip,
        Legend
    )
    ChartJS.defaults.font.family = `"Comfortaa", "Gen Jyuu Gothic Regular", "GenSenRounded TW R", sans-serif`;
    ChartJS.defaults.animation = false;
    return (await import('vue-chartjs')).Line
});

async function getTelemetry(): Promise<TelemetryEntry[]> {
    return (await axios.get('/api/telemetry/entries', {
        params: {
            timespan: 5 * 60 * 1000,
            auth: authToken
        }
    })).data.data.entries;
}

async function getUniqueUsers(timespan?: number | "minute" | "hour" | "day" | "week" | "month"): Promise<string[]> {
    return (await axios.get('/api/telemetry/uniqueUsers', {
        params: {
            timespan,
            auth: authToken
        }
    })).data.data.users;
}

async function getTotalStreamerCount(): Promise<number> {
    return (await axios.get('/api/telemetry/totalStreamerCount', {
        params: {
            auth: authToken
        }
    })).data.data.count;
}

const data = {
    datasets: [{
        backgroundColor: '#f87979',
        borderColor: '#f87979',
        data: []
    }]
};

const [audienceCountData, sessionCountData, memoryUsageData, cpuUsageData]: ChartData<any, any, any>[] = [structuredClone(data), structuredClone(data), structuredClone(data), structuredClone(data)]


const options: ChartOptions<"line"> = {
    scales: {
        x: {
            type: 'timeseries',
            time: {
                // minUnit: 'second',
                // unit: 'day',
                displayFormats: {
                    'second': "HH:mm:ss",
                }
            },
            ticks: {
                autoSkip: true,
                maxTicksLimit: 9
            }
        },
        y: {
            min: 0,
            ticks: {
                precision: 0
            }
        }
    },
    elements: {
        point: {
            radius: 1
        }
    },
    plugins: {
        legend: {
            display: false
        },
        decimation: {
            enabled: true,
            algorithm: 'min-max'
        }
    },
    // responsive: false
}

const [audienceCountOptions, sessionCountOptions, memoryUsageOptions, cpuUsageOptions]: ChartOptions<"line">[] = [structuredClone(options), structuredClone(options), structuredClone(options), structuredClone(options)];

const totalUniqueUsers = ref(0), uniqueUsersInLastDay = ref(0);

getTotalStreamerCount().then((count) => {
    if (sessionCountOptions.scales?.y?.max) sessionCountOptions.scales.y.max = count;
});

if (memoryUsageOptions.scales?.y?.ticks) memoryUsageOptions.scales.y.ticks.callback = function (tickValue: number | string) {
    if (typeof tickValue == 'number') {
        return `${Math.ceil(tickValue)} GB`;
    } else {
        return tickValue;
    }
}

async function loadStats() {
    getTelemetry().then((entries) => {
        console.log(entries);
        audienceCountData.datasets[0].data = entries.map((entry) => {
            return {
                x: entry.sampleTimestamp,
                y: entry.sessions.map((session) => session.audienceCount).reduce((accumulator, currentValue) => {
                    return accumulator + currentValue
                }, 0)
            }
        });
        sessionCountData.datasets[0].data = entries.map((entry) => {
            return {
                x: entry.sampleTimestamp,
                y: entry.sessionCount
            }
        });
        memoryUsageData.datasets[0].data = entries.map((entry) => {
            return {
                x: entry.sampleTimestamp,
                y: entry.systemStatus.memoryTotal - entry.systemStatus.memoryFree
            }
        });
        cpuUsageData.datasets[0].data = entries.map((entry) => {
            return {
                x: entry.sampleTimestamp,
                y: entry.systemStatus.cpuLoad
            }
        });
        forceUpdate();

        if (memoryUsageOptions.scales?.y) memoryUsageOptions.scales.y.max = entries[0].systemStatus.memoryTotal;
        if (cpuUsageOptions.scales?.y) cpuUsageOptions.scales.y.max = entries[0].systemStatus.cpuCores;
    });
    getUniqueUsers(24 * 60 * 60 * 1000).then((users) => {
        uniqueUsersInLastDay.value = users.length;
        forceUpdate();
    });
    getUniqueUsers().then((users) => {
        totalUniqueUsers.value = users.length;
        forceUpdate();
    });
}
function loop() {
    setTimeout(() => {
        loadStats().then(() => {
            loop();
        })
    }, 5 * 1000)
}
onMounted(() => {
    loadStats().then(() => {
        loop();
    })
});

const updateKey = ref(0);
function forceUpdate() {
    updateKey.value++;
}
</script>
<template>
    <article v-if="!authToken" class="require-login">
        {{ $t("desc.error.requireLogin") }}
    </article>
    <article v-else-if="!_isAdmin">
        {{ $t("desc.error.requireAdmin") }}
    </article>
    <article v-else class="main-card">
        <h3>{{ $t("desc.admin.stats.header") }}</h3>
        <div class="stats">
            <ul>
                <li :key="updateKey">{{ $t("desc.admin.uniqueUsers.total", { count: totalUniqueUsers }) }}</li>
                <li :key="updateKey">{{ $t("desc.admin.uniqueUsers.lastDay", { count: uniqueUsersInLastDay }) }}</li>
            </ul>
        </div>
        <div class="graph">
            <article class="audience-count">
                <h4>{{ $t("desc.admin.chartHeaders.audienceCount") }}</h4>
                <Line :key="updateKey" :data="audienceCountData" :options="audienceCountOptions"></Line>
            </article>
            <article class="session-count">
                <h4>{{ $t("desc.admin.chartHeaders.sessionCount") }}</h4>
                <Line :key="updateKey" :data="sessionCountData" :options="sessionCountOptions"></Line>
            </article>
            <article class="memory-usage">
                <h4>{{ $t("desc.admin.chartHeaders.memoryUsage") }}</h4>
                <Line :key="updateKey" :data="memoryUsageData" :options="memoryUsageOptions"></Line>
            </article>
            <article class="unique-users">
                <h4>{{ $t("desc.admin.chartHeaders.cpuUsage") }}</h4>
                <Line :key="updateKey" :data="cpuUsageData" :options="cpuUsageOptions"></Line>
            </article>
        </div>
    </article>
</template>
<style scoped lang="scss">
.main-card {
    height: 100%;
    width: 100%;

    display: grid;

    grid-template: "header stats" min-content
        "graph graph" auto / 1fr 1fr;

}

.stats {
    grid-area: stats;
}

.graph {
    display: grid;
    grid-template:
        "audience-count session-count" 1fr "memory-usage unique-users" 1fr / 1fr 1fr;
    gap: 1rem;

    grid-area: graph;

    article {
        margin: 0px;
        padding: 1rem;
    }

    canvas {
        width: 100%;
        height: 100%;
    }

    .audience-count {
        grid-area: audience-count;
    }

    .session-count {
        grid-area: session-count;
    }

    .memory-usage {
        grid-area: memory-usage;
    }

    .unique-users {
        grid-area: unique-users;
    }
}
</style>