<script setup lang="ts">
import { ws } from './common';
import { streamer } from './types';
import { Ref, computed, ref } from 'vue';
const proxy = "img.kookapp.lolicon.ac.cn";
let streamers: Ref<streamer[]> = ref([]), selectedStreamerName: Ref<string>;

const busy = ref(true);
let currentIndex: number;
const userDataRaw = localStorage.getItem('user');
if (userDataRaw) {
    ws.addEventListener('open', () => {
        busy.value = false;
    })

    ws.addEventListener('message', (data) => {
        try {
            if (data.data) {
                streamers.value = JSON.parse(data.data.toString());
            }
        } catch { }
    })

    selectedStreamerName = ref('Select an Arisa')
}

function selectStreamer(event: Event) {
    const value = (event.target as HTMLInputElement).getAttribute('index');
    if (value) {
        const index = currentIndex = parseInt(value);
        selectedStreamerName.value = `${streamers.value[index].name}#${streamers.value[index].identifyNum}`;
        (event.target as HTMLInputElement).parentElement?.parentElement?.removeAttribute('open');
    }
}

const currentQueue = computed(() => {
    if (streamers.value[currentIndex]) {
        return streamers.value[currentIndex].queue.filter(v => v.type == 'netease');
    } else return [];
})
</script>

<template>
    <article :aria-busy="busy" class="dashboard">
        <h4 v-if="userDataRaw">Dashboard</h4>
        <details v-if="userDataRaw" role="list" id="streamerSelector">
            <summary aria-haspopup="listbox">{{ selectedStreamerName }}</summary>
            <ul role="listbox" class="dropdown">
                <li v-if="!streamers.length">
                    No Streamers
                </li>
                <li v-else class="grid" v-for="(streamer, index) in streamers" :index="index" @click="selectStreamer">
                    <img :src="streamer.avatar.replace('img.kaheila.cn', proxy).replace('img.kookapp.cn', proxy)" />
                    {{ streamer.name }}#{{ streamer.identifyNum }}
                </li>
            </ul>
        </details>
    </article>
    <article :aria-busy="busy" class="playlist">
        <h4 v-if="userDataRaw">Playlist</h4>
        <article v-if="userDataRaw" v-for="queue of currentQueue">
            <span class="title">{{ queue.data.meta.title }}</span>
            <span class="artists">{{ queue.data.meta.artists }}</span>
        </article>
    </article>
</template>

<style scoped>
.dropdown>li {
    display: grid;
    grid-template-columns: 2.5em 1fr;
    grid-template-rows: 2.5em;
    gap: 0px 0px;
    grid-template-areas:
        "avatar .";
    justify-items: start;
    align-items: center;
    cursor: pointer;
}

.dropdown>li>img {
    height: 1.5em;
    grid-area: avatar;
}

.playlist {
    overflow-y: scroll;
    overflow-x: hidden;
    padding: 1em .25em 1em .25em;
}

.playlist>h4 {
    margin-left: .75em;
    margin-right: .75em;
    margin-bottom: .25em;
}

h4 {
    --typography-spacing-vertical: 1em;
}

.playlist>article {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 0px 0px;
    grid-template-areas:
        "title"
        "artists";
    justify-items: start;
    align-items: center;
    cursor: pointer;
    margin: .5em;
    padding: .5em;
}

.playlist>article>span {
    width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.playlist>article>.title {
    font-size: 1em;
    grid-area: title;
}

.playlist>article>.artists {
    grid-area: artists;
    font-size: .5em;
    color: var(--secondary);
}
</style>