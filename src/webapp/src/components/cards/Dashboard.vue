<script setup lang="ts">
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faForward, faBackward, faPause, faPlay } from '@fortawesome/free-solid-svg-icons'
library.add(faForward, faBackward, faPause, faPlay)

import { playback } from 'menu/arisa/controller/music';
import { ws, setPlayback, changeTrack } from './common';
import { streamerDetail } from './types';
import { Ref, computed, ref } from 'vue';
const proxy = "img.kookapp.lolicon.ac.cn";
let streamers: Ref<streamerDetail[]> = ref([]), selectedStreamerName: Ref<string>;
let currentPlayback = 'pause'

const busy = ref(true);
/**
 * Current selected streamer index in streamers array
 */
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
                console.log(streamers.value[currentIndex].nowPlaying);
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

function selectedStreamer() {
    return streamers.value[currentIndex];
}
function getPlaybackProgress() {
    const streamer = selectedStreamer();
    const played = streamer.trackPlayedTime
    const duration = streamer.trackTotalDuration
    console.log(played, duration);
    if (played && duration) {
        return played / duration
    } else {
        return 0;
    }
}

function switchPlayback() {
    if (currentPlayback == 'play') {
        currentPlayback = 'pause';
        setPlayback(currentIndex, false);
    } else {
        currentPlayback = 'play';
        setPlayback(currentIndex, true);
    }
}

function playPrevious() {
    changeTrack(currentIndex, false);
}

function playNext() {
    changeTrack(currentIndex, true);
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
        <article v-if="userDataRaw && selectedStreamer()">
            <div class="song-title">{{
                (selectedStreamer().nowPlaying as playback.extra.netease).meta.title || "Not Playing"
            }}</div>
            <div class="song-artists">{{
                (selectedStreamer().nowPlaying as playback.extra.netease).meta.artists || ""
            }}</div>
            <progress :value="getPlaybackProgress() * 100" max="100"></progress>
            <div class="playback-control grid">
                <i @click="playPrevious">
                    <font-awesome-icon :icon="['fas', 'backward']" />
                </i>
                <i @click="switchPlayback">
                    <font-awesome-icon :icon="`a-solid fa-${currentPlayback}`" />
                    <!-- <font-awesome-icon v-else :icon="['fas', 'pause']" /> -->
                </i>
                <i @click="playNext">
                    <font-awesome-icon :icon="['fas', 'forward']" />
                </i>
            </div>

        </article>
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
.song-title {
    font-size: 1.25em;
    text-align: center;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.song-artists {
    color: var(--secondary);
    font-size: 0.75em;
    text-align: center;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.playback-control {
    justify-items: center;
}

.playback-control>i {
    cursor: pointer;
}


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
    border-radius: 100%;
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