<script setup lang="ts">
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faForward, faBackward, faPause, faPlay, faArrowUp, faArrowDown, faTrash, faCircleXmark, faRepeat, faShuffle } from '@fortawesome/free-solid-svg-icons'
library.add(faForward, faBackward, faPause, faPlay, faArrowUp, faArrowDown, faTrash, faCircleXmark, faRepeat, faShuffle);

import { playback } from 'menu/arisa/controller/music';
import { ws, setPlayback, changeTrack, changeQueueEntry, sendShuffleQueue, sendChangeCycleMode, currentStreamerIndex, setStreamerIndex } from './common';
import { streamerDetail } from './types';
import { Ref, computed, ref } from 'vue';
const proxy = "img.kookapp.lolicon.ac.cn";
let streamers: Ref<streamerDetail[]> = ref([]), selectedStreamerName: Ref<string>;

const busy = ref(true);
const userDataRaw = localStorage.getItem('user');
if (userDataRaw) {
    ws.addEventListener('open', () => {
        busy.value = false;
    })

    ws.addEventListener('message', (data) => {
        try {
            if (data.data) {
                streamers.value = JSON.parse(data.data.toString());
                // console.log(streamers.value[currentStreamerIndex].nowPlaying);
            }
        } catch { }
    })

    selectedStreamerName = ref('Select an Arisa')
}

function selectStreamer(event: Event) {
    const value = (event.target as HTMLElement).getAttribute('index');
    if (value) {
        const index = parseInt(value);
        setStreamerIndex(index);
        selectedStreamerName.value = `${streamers.value[index].name}#${streamers.value[index].identifyNum}`;
        (event.target as HTMLInputElement).parentElement?.parentElement?.removeAttribute('open');
    }
}

function selectedStreamer() {
    return streamers.value[currentStreamerIndex];
}
function nowPlaying() {
    const streamer = selectedStreamer();
    if (streamer) {
        // console.log(streamer.nowPlaying);
        return streamer.nowPlaying;
    } else return undefined;
}
function getPlaybackProgress() {
    const streamer = selectedStreamer();
    if (streamer) {
        const played = streamer.trackPlayedTime
        const duration = streamer.trackTotalDuration
        if (played && duration) return played / duration
        else return 0;
    } else return 0;
    // console.log(played, duration);
}

function switchPlayback() {
    const streamer = selectedStreamer();
    if (streamer) {
        if (streamer.isPaused) {
            setPlayback(false);
        } else {
            setPlayback(true);
        }
    }
}

function playPrevious() {
    const streamer = selectedStreamer();
    if (streamer) {
        changeTrack(false);
    }
}

function playNext() {
    const streamer = selectedStreamer();
    if (streamer) {
        changeTrack(true);
    }
}

function proxiedKookImage(original: string) {
    return original.replace('img.kaiheila.cn', proxy).replace('img.kookapp.cn', proxy);
}


const currentQueue = computed(() => {
    if (streamers.value[currentStreamerIndex]) {
        return streamers.value[currentStreamerIndex].queue.filter(v => v.type == 'netease');
    } else return [];
})


function queueMoveEntryUp(index: number) {
    const streamer = selectedStreamer();
    if (streamer) {
        return changeQueueEntry(index, 'up');
    }
}
function queueMoveEntryDown(index: number) {
    const streamer = selectedStreamer();
    if (streamer) {
        return changeQueueEntry(index, 'down');
    }
}
function queueDeleteEntry(index: number) {
    const streamer = selectedStreamer();
    if (streamer) {
        return changeQueueEntry(index, 'delete');
    }
}

function shuffleQueue() {
    const streamer = selectedStreamer();
    if (streamer) {
        return sendShuffleQueue();
    }
}

function switchCycleMode(mode: 'repeat_one' | 'repeat' | 'no_repeat') {
    const streamer = selectedStreamer();
    if (streamer) {
        return sendChangeCycleMode(mode);
    }
}

function getQueueBackground(queue: playback.extra) {
    return `background-image: url("${proxiedKookImage(queue.meta.cover)}")`
}
</script>

<template>
    <article :aria-busy="busy" class="dashboard">
        <h4 v-if="userDataRaw">Dashboard</h4>
        <article v-if="userDataRaw">
            <div class="song-title">{{
                (nowPlaying() as playback.extra.netease)?.meta?.title || "Not Playing"
            }}</div>
            <div class="song-artists">{{
                (nowPlaying() as playback.extra.netease)?.meta?.artists || ""
            }}</div>
            <progress :value="getPlaybackProgress() * 100" max="100"></progress>
            <div v-if="selectedStreamer()" class="playback-control grid">
                <i data-tooltip="Click to Shuffle Playlist" @click="shuffleQueue">
                    <font-awesome-icon :icon="['fas', 'shuffle']" />
                </i>
                <i @click="playPrevious">
                    <font-awesome-icon :icon="['fas', 'backward']" />
                </i>
                <i @click="switchPlayback">
                    <font-awesome-icon v-if="selectedStreamer()?.isPaused" :icon="['fas', 'play']" />
                    <font-awesome-icon v-else :icon="['fas', 'pause']" />
                </i>
                <i @click="playNext">
                    <font-awesome-icon :icon="['fas', 'forward']" />
                </i>
                <i data-tooltip="No Repeat" v-if="selectedStreamer()?.cycleMode == 'no_repeat'"
                    @click="switchCycleMode('repeat')">
                    <font-awesome-icon :icon="['fas', 'circle-xmark']" />
                </i>
                <i data-tooltip="Repeat" v-else-if="selectedStreamer()?.cycleMode == 'repeat'"
                    @click="switchCycleMode('repeat_one')">
                    <font-awesome-icon :icon="['fas', 'repeat']" />
                </i>
                <i data-tooltip="Repeat One" v-else-if="selectedStreamer()?.cycleMode == 'repeat_one'"
                    @click="switchCycleMode('no_repeat')">
                    <font-awesome-icon :icon="['fas', 'repeat']" fade />
                </i>
            </div>
            <div v-else class="playback-control grid" style="opacity: 55%;">
                <i>
                    <font-awesome-icon :icon="['fas', 'shuffle']" />
                </i>
                <i>
                    <font-awesome-icon :icon="['fas', 'backward']" />
                </i>
                <i>
                    <font-awesome-icon :icon="['fas', 'play']" />
                </i>
                <i>
                    <font-awesome-icon :icon="['fas', 'forward']" />
                </i>
                <i>
                    <font-awesome-icon :icon="['fas', 'repeat']" />
                </i>
            </div>
        </article>
        <details v-if="userDataRaw" role="list" id="streamerSelector">
            <summary aria-haspopup="listbox">{{ selectedStreamerName }}</summary>
            <ul role="listbox" class="dropdown">
                <li v-if="!streamers.length">
                    No Streamers
                </li>
                <li v-else class="grid" v-for="(   streamer, index   ) in   streamers  " :index="index"
                    @click="selectStreamer">
                    <img :src="proxiedKookImage(streamer.avatar)" />
                    {{ streamer.name }}#{{ streamer.identifyNum }}
                </li>
            </ul>
        </details>
    </article>
    <article :aria-busy="busy" class="playlist">
        <h4 v-if="userDataRaw">Playlist</h4>
        <article v-if="userDataRaw" v-for="(queue, index) in currentQueue" :class="index == 0 ? 'now-playing-sign' : ''"
            :style="getQueueBackground(queue)">
            <div>
                <span class="now-playing-sign" v-if="index == 0">Now Playing:</span>
                <span class="title">{{ queue.meta.title }}</span>
                <span class="artists">{{ queue.meta.artists }}</span>
                <i @click="queueMoveEntryUp(index)" class="up-button">
                    <font-awesome-icon :icon="['fas', 'arrow-up']" />
                </i>
                <i @click="queueMoveEntryDown(index)" class="down-button">
                    <font-awesome-icon :icon="['fas', 'arrow-down']" />
                </i>
                <i @click="queueDeleteEntry(index)" class="trash-button">
                    <font-awesome-icon :icon="['fas', 'trash']" />
                </i>
            </div>
        </article>
    </article>
</template>

<style scoped>
@property --playlist-card-top {
    syntax: '<color>';
    initial-value: rgb(0, 0, 0, 77%);
    inherits: false;
}

@property --playlist-card-bottom {
    syntax: '<color>';
    initial-value: rgb(255, 255, 255, 32%);
    inherits: false;
}

.playlist>article>div {
    background-image: linear-gradient(var(--playlist-card-top), 75%, var(--playlist-card-bottom));
    transition: --playlist-card-top var(--transition), --playlist-card-botoom var(--transition);
}

div:hover {
    --myColor1: red;
    --myColor2: #E1AF2F;
}

@media only screen and (prefers-color-scheme: dark) {
    :root:not([data-theme]) .playlist>article>div {
        --playlist-card-top: rgb(0, 0, 0, 77%);
        --playlist-card-bottom: rgb(255, 255, 255, 32%);
    }
}

@media only screen and (prefers-color-scheme: light) {
    :root:not([data-theme]) .playlist>article>div {
        --playlist-card-top: rgb(255, 255, 255, 70%);
        --playlist-card-bottom: rgb(0, 0, 0, 35%);
    }
}

:root[data-theme="dark"] .playlist>article>div {
    --playlist-card-top: rgb(0, 0, 0, 77%);
    --playlist-card-bottom: rgb(255, 255, 255, 32%);
}

:root[data-theme="light"] .playlist>article>div {
    --playlist-card-top: rgb(255, 255, 255, 70%);
    --playlist-card-bottom: rgb(0, 0, 0, 35%);
}

.playlist>article>div>i {
    display: none;
}

.playlist>article:not(.now-playing-sign):hover>div>i {
    display: unset;
}

.playlist>article {
    margin: .5em;
    padding: 0px;
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
}

.playlist>article>div {
    border-radius: 0.25rem;
    padding: .5em;
    justify-items: center;
    align-items: center;
    display: grid;
    grid-template-columns: 90% 10%;
    grid-template-rows: 1em 1em 1em 1em 1em 1em;
    gap: 0px 0px;
    grid-template-areas:
        ". up-button"
        "title up-button"
        "artists trash-button"
        ". trash-button"
        ". down-button"
        ". down-button";
}

.playlist>article.now-playing-sign>div {
    grid-template-rows: 1em 1em 1em 1em 1em 1em 1em 1em;
    grid-template-areas:
        "now-playing now-playing"
        ". up-button"
        "title up-button"
        "artists trash-button"
        ". trash-button"
        ". down-button"
        ". down-button"
        ". .";
}

.playlist>h4 {
    grid-area: card-title;
}

.down-button {
    grid-area: down-button;
    cursor: pointer;
}

.trash-button {
    grid-area: trash-button;
    cursor: pointer;
}

.up-button {
    grid-area: up-button;
    cursor: pointer;
}

.song-title {
    grid-area: song-title;
}

.song-artists {
    grid-area: song-artists;
}

.song-title {
    font-size: 1.25em;
    text-align: center;
}

.song-artists {
    color: var(--secondary);
    font-size: 0.75em;
    text-align: center;
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

.playlist>article>div>span {
    width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.playlist>article>div>.title {
    font-size: 1em;
    grid-area: title;
}

.playlist>article>div>.now-playing-sign {
    font-family: var(--header-font);
    font-size: 1em;
    grid-area: now-playing;
}

.playlist>article>div>.artists {
    grid-area: artists;
    font-size: .5em;
    color: var(--secondary);
}

.playlist>article>div>.controls {
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: 1fr;
    gap: 0px .4em;
    grid-template-areas:
        ". . .";
    display: grid;
    justify-items: start;
    align-items: center;
    cursor: pointer;
}
</style>