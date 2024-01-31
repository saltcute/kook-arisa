<script setup lang="ts">
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faForward, faBackward, faPause, faPlay, faArrowUp, faArrowDown, faTrash, faCircleXmark, faRepeat, faShuffle, faGlobe, faLanguage } from '@fortawesome/free-solid-svg-icons'
library.add(faForward, faBackward, faPause, faPlay, faArrowUp, faArrowDown, faTrash, faCircleXmark, faRepeat, faShuffle, faGlobe, faLanguage);

import { playback } from 'menu/arisa/playback/type';
import backend from './common';
import { nextTick, onMounted, reactive, ref } from 'vue';
import axios from 'axios';
import { Netease } from 'menu/arisa/command/netease/lib';
import { QQMusic } from 'menu/arisa/command/qq/lib';

const proxy = "img.kookapp.lolicon.ac.cn";

export declare enum NotificationSetting {
    Default = 0,
    All = 1,
    MentionOnly = 2,
    Block = 3
}
interface RawGuildListResponseItem {
    id: string;
    name: string;
    topic: string;
    user_id: string;
    icon: string;
    notify_type: NotificationSetting;
    region: string;
    enable_open: string;
    open_id: string;
    default_channel_id: string;
    welcome_channel_id: string;
    boost_num: number;
    level: number;
}

async function getGuildList(token: string): Promise<RawGuildListResponseItem[]> {
    return new Promise((resolve, rejects) => {
        axios({
            url: '/api/guilds',
            method: 'POST',
            data: {
                auth: `Bearer ${token}`
            }
        }).then(({ data }) => {
            resolve(data.data.items);
        }).catch((e) => { rejects(e) });
    })
}

async function getNeteaseSongLyrics(id: number): Promise<Netease.lyric> {
    return new Promise((resolve, rejects) => {
        axios({
            url: '/netease/lyric',
            method: 'GET',
            params: {
                id
            }
        }).then(({ data }) => {
            resolve(data.data);
        }).catch((e) => { rejects(e) });
    })
}
async function getQQMusicSongLyrics(mid: string): Promise<QQMusic.API.Lyric> {
    return new Promise((resolve, rejects) => {
        axios({
            url: '/qqmusic/lyric',
            method: 'GET',
            params: {
                mid
            }
        }).then(({ data }) => {
            resolve(data.data);
        }).catch((e) => { rejects(e) });
    })
}

function parseLRC(rawLyric: string) {
    const lineByLineLyric = rawLyric.split('\n');
    const lyrics: [number, string][] = [];
    for (const line of lineByLineLyric) {
        if (!line) continue;
        const [_, rawTimecode, lyric] = /(?:\[([0-9:.]+)\])+(.+)?/.exec(line) || ["00:00.000", ""];
        const [__, m, s, ms] = /([0-9]+):([0-9]+).([0-9]+)/.exec(rawTimecode) || ["0", "0", "0"];
        if (!(m && s && ms)) continue;
        const numberMs = parseInt(ms);
        const realMs = ms.length == 1 ? numberMs * 100 : (ms.length == 2 ? numberMs * 10 : numberMs);
        const timecode = parseInt(m) * 60 * 1000 + parseInt(s) * 1000 + realMs;
        if (!isNaN(timecode) && timecode && lyric) lyrics.push([timecode, lyric]);
    }
    return lyrics;
}

function parseLyric(rawLyric?: string, rawTranslate?: string, rawRomaji?: string, rawKLyric?: string) {

    let lyric: [number, string][] | undefined,
        kLyric: any[] | undefined,
        translate: [number, string][] | undefined,
        romaji: [number, string][] | undefined;
    if (rawLyric) lyric = parseLRC(rawLyric);
    if (rawKLyric) kLyric = [];
    if (rawTranslate) translate = parseLRC(rawTranslate);
    if (rawRomaji) romaji = parseLRC(rawRomaji);

    return { lyric, kLyric, translate, romaji };
}

const waitingForWSConnection = ref(true);
const loadingLyrics = ref(true);
const userDataRaw = localStorage.getItem('user');
if (userDataRaw && backend.ws) {
    const auth = JSON.parse(localStorage.getItem('auth') || "{}");
    const token = auth.access_token;

    backend.ws.addEventListener('open', () => {
        waitingForWSConnection.value = false;
    })

}


function getQueueBackground(queue: playback.extra) {
    return `background-image: url("${proxiedKookImage(queue.meta.cover)}")`
}


let keep = false, percent = 0;
window.addEventListener('mousemove', (event) => {
    const target = document.getElementById('playback-progress') as HTMLProgressElement | null;
    if (target) {
        const localX = event.clientX - target.offsetLeft;
        if (keep) {
            percent = localX / target.offsetWidth;
            target.value = percent
        }
    }
});
window.addEventListener('mousedown', (event) => {
    const target = event.target as HTMLProgressElement | null;
    if (target?.id == 'playback-progress') {
        keep = true;
        const localX = event.clientX - target.offsetLeft;
        percent = localX / target.offsetWidth;
        target.value = percent;
    }
})
window.addEventListener('mouseup', () => {
    if (keep) {
        keep = false;
        backend.jumpToPercentage(percent);
    }
})


function proxiedKookImage(original: string) {
    return original.replace('img.kaiheila.cn', proxy).replace('img.kookapp.cn', proxy);
}

function currentQueue() {
    return backend.currentStreamer?.queue || [];
}

function getPlaybackProgress() {
    if (keep) {
        return percent;
    } else {
        const streamer = backend.currentStreamer
        if (streamer) {
            const played = streamer.trackPlayedTime
            const duration = streamer.trackTotalDuration
            if (played && duration) return played / duration
            else return 0;
        } else return 0;
    }
}

backend.on('newTrack', (nowPlaying?: playback.extra) => {
    console.log(nowPlaying);
    percent = 0;
    if (nowPlaying?.data?.songId) {
        switch (nowPlaying.type) {
            case "netease":
                getNeteaseSongLyrics(nowPlaying.data.songId).then((data) => {
                    const lyrics = parseLyric(data.lrc?.lyric, data.tlyric?.lyric, data.romalrc?.lyric, data.klyric?.lyric);
                    currentLyric = lyrics
                    bilingualLyric = parseBilingual()
                    currentLyricIndexCache = undefined;
                    loadingLyrics.value = false;
                })
                break;
            case "qqmusic":
                getQQMusicSongLyrics(nowPlaying.data.songMId).then((data) => {
                    const lyrics = parseLyric(data.lyric, data.trans);
                    currentLyric = lyrics
                    bilingualLyric = parseBilingual()
                    currentLyricIndexCache = undefined;
                    loadingLyrics.value = false;
                })
                break;
            default:
                currentLyric = { lyric: undefined, translate: undefined, kLyric: undefined, romaji: undefined };
                currentLyricIndexCache = undefined;
                loadingLyrics.value = false;
        }
    }
})

function scrollToActiveLyric(arg?: boolean | ScrollIntoViewOptions) {
    let element: Element | null = document.getElementById(currentLyricIndex()[1].toString())
    if (!element) {
        const children = document.getElementsByClassName(currentLyricIndex()[1].toString());
        element = children[1] || children[0];
    }
    if (!element) {
        const children = document.getElementsByClassName("lyric")[0]?.children;
        if (children) element = children[children.length - 1];
    }
    element?.scrollIntoView(arg);
}

backend.on('wsEvent', () => {
    forceRender().then(() => {
        if (Date.now() - lastScroll > 2 * 1000) {
            scrollToActiveLyric({ behavior: 'smooth', block: 'center' });
        }
    })
})

let lastScroll = 0;
function onScrollLyric(event: Event) {
    lastScroll = Date.now();
}

let currentLyric: ReturnType<typeof parseLyric>;

interface BilingualLyric {
    [timecode: number]: {
        original: string,
        translate?: string,
        romaji?: string
    }
}

function parseBilingual(): BilingualLyric {
    let obj: BilingualLyric = {};
    if (currentLyric.lyric) {
        obj = Object.fromEntries(currentLyric.lyric.map(v => [v[0], { original: v[1] }]));
    }
    if (currentLyric.translate) {
        for (const [timecode, lyric] of currentLyric.translate) {
            if (obj[timecode] != undefined) {
                obj[timecode].translate = lyric;
            }
        }
    }
    if (currentLyric.romaji) {
        for (const [timecode, lyric] of currentLyric.romaji) {
            if (obj[timecode] != undefined) {
                obj[timecode].romaji = lyric;
            }
        }
    }
    return obj;
}
let bilingualLyric: BilingualLyric = {};

function getBilingualLyricEntry(): [number, BilingualLyric[number]][] {
    return Object.entries(bilingualLyric) as any;
}

let currentLyricIndexCache: [number, number] | undefined;
function currentLyricIndex() {
    if (currentLyricIndexCache) return currentLyricIndexCache;
    const currentTrackTime = (backend.currentStreamer?.trackPlayedTime || 0) * 1000;
    if (!currentTrackTime) return [0, 0];
    const entries: [number, BilingualLyric[number]][] = Object.entries(bilingualLyric).map(v => [parseInt(v[0]), v[1]]);
    let flg = false;
    for (let i = 0; i < entries.length; ++i) {
        const [timecode, lyric] = entries[i];
        if (currentTrackTime < timecode) {
            flg = true;
            if (i > 0) currentLyricIndexCache = [i - 1, entries[i - 1][0]];
            else currentLyricIndexCache = [i, timecode];
            break;
        }
    }
    if (flg && currentLyricIndexCache) return currentLyricIndexCache;
    else {
        const last = entries.at(-1);
        return last ? [entries.length - 1, last[0]] : [0, 0]
    }
}

const componentKey = ref(0);
function forceRender() {
    componentKey.value++;
    return nextTick();
}

function getLyricStyle(index: number, timecode: number, position: "main" | "top" | "bottom") {
    const [curIndex, curTimecode] = currentLyricIndex();
    let properties: any = {};
    if (index == Object.entries(bilingualLyric).length - 1) currentLyricIndexCache = undefined;
    if (index == curIndex || timecode == curTimecode) {
        properties.color = 'orange';
    } else {
        properties.filter = "blur(1px)";
    }
    if (index > 0 && position != "main") {
        properties.fontSize = "0.75em";
        if (properties.color) properties.color = "#916b00"
        else properties.color = "grey";
        if (position == "bottom") properties.verticalAlign = "top";
        else properties.verticalAlign = "bottom";
    }
    return reactive(properties);
}

function getRandomKaomoji() {
    const library = [`(;-;)`, `(='X'=)`, `(>_<)`, `\\(^Д^)/`, `(˚Δ˚)b`, `(^-^*)`, `(·_·)`, `(o^^)o`, `(≥o≤)`]
    return library.at((backend.currentNowPlaying?.data.songId || 114514) * 19260817 % library.length);
}

const enableRomaji = ref(false), enableTranslate = ref(true);

function switchRomaji() {
    enableRomaji.value = !enableRomaji.value;
    localStorage.setItem('showRomaji', enableRomaji.value.toString());
    nextTick().then(() => {
        scrollToActiveLyric({ behavior: 'instant', block: 'center' });
    })
}
function switchTranslate() {
    enableTranslate.value = !enableTranslate.value;
    localStorage.setItem('showTranslate', enableTranslate.value.toString());
    nextTick().then(() => {
        scrollToActiveLyric({ behavior: 'instant', block: 'center' });
    })
}

onMounted(() => {
    enableRomaji.value = localStorage.getItem('showRomaji') == "true" ? true : false;
    enableTranslate.value = localStorage.getItem('showTranslate') == "true" ? true : false;

    const lyricTextarea = document.getElementById("lyricTextarea")
    if (lyricTextarea) {
        lyricTextarea.addEventListener('wheel', onScrollLyric)
    }
});
</script>

<template>
    <article :aria-busy="waitingForWSConnection" class="dashboard">
        <h4 v-if="userDataRaw" class="title">Dashboard</h4>
        <article v-if="userDataRaw" class="control">
            <div class="song-title">{{
                backend.currentNowPlaying?.meta?.title || "Not Playing"
            }}</div>
            <div class="song-artists">{{
                backend.currentNowPlaying?.meta?.artists
            }}</div>
            <progress :key="componentKey" id="playback-progress" :value="getPlaybackProgress()"></progress>
            <div v-if="backend.currentStreamer" class="playback-control grid">
                <i data-tooltip="Click to Shuffle Playlist" @click="backend.shuffleQueue">
                    <font-awesome-icon :icon="['fas', 'shuffle']" />
                </i>
                <i @click="() => { backend.playPrevious() }">
                    <font-awesome-icon :icon="['fas', 'backward']" />
                </i>
                <i @click="backend.switchPlayback">
                    <font-awesome-icon v-if="backend.currentStreamer.isPaused" :icon="['fas', 'play']" />
                    <font-awesome-icon v-else :icon="['fas', 'pause']" />
                </i>
                <i @click="backend.playNext">
                    <font-awesome-icon :icon="['fas', 'forward']" />
                </i>
                <i data-tooltip="No Repeat" v-if="backend.currentStreamer.cycleMode == 'no_repeat'"
                    @click="backend.switchCycleMode('repeat')">
                    <font-awesome-icon :icon="['fas', 'circle-xmark']" />
                </i>
                <i data-tooltip="Repeat" v-else-if="backend.currentStreamer.cycleMode == 'repeat'"
                    @click="backend.switchCycleMode('repeat_one')">
                    <font-awesome-icon :icon="['fas', 'repeat']" />
                </i>
                <i data-tooltip="Repeat One" v-else-if="backend.currentStreamer.cycleMode == 'repeat_one'"
                    @click="backend.switchCycleMode('no_repeat')">
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
        <details v-if="userDataRaw" role="list" id="streamerselector">
            <summary aria-haspopup="listbox">{{ backend.currentStreamerName }}</summary>
            <ul role="listbox" class="dropdown">
                <li v-if="!backend.streamers.length">
                    No Streamers
                </li>
                <li v-else class="grid" v-for="(streamer, index) in backend.streamers" :index="index"
                    @click="backend.selectStreamer">
                    <img :src="proxiedKookImage(streamer.avatar)" />
                    {{ streamer.name }}#{{ streamer.identifyNum }}
                </li>
            </ul>
        </details>
        <!-- <article v-if="userDataRaw && (nowPlaying() as playback.extra.netease)?.data.songId"> -->
        <article v-if="userDataRaw">
            <h5 style="margin: 0px;">
                Lyrics
                &nbsp<span v-if="currentLyric?.translate" @click="switchTranslate">
                    <i class="click-cursor" v-if="enableTranslate" data-tooltip="Hide translation"><font-awesome-icon
                            :icon="['fas', 'language']" /></i>
                    <i class="click-cursor" v-else data-tooltip="Show translation"><font-awesome-icon
                            :icon="['fas', 'language']" /></i>
                </span>
                &nbsp<span v-if="currentLyric?.romaji" @click="switchRomaji">
                    <i class="click-cursor" v-if="enableRomaji" data-tooltip="Hide Romaji"><font-awesome-icon
                            :icon="['fas', 'globe']" /></i>
                    <i class="click-cursor" v-else data-tooltip="Show Romaji"><font-awesome-icon
                            :icon="['fas', 'globe']" /></i>
                </span>
            </h5>
            <div id="lyricTextarea" :aria-busy="loadingLyrics">
                <div class="lyric" v-if="Object.keys(bilingualLyric).length">
                    <div class="line" :class="timecode.toString()"
                        v-for="([timecode, lyric], index) in getBilingualLyricEntry() ">
                        <span v-if="lyric.romaji && enableRomaji" :style="getLyricStyle(index, timecode, 'top')">
                            {{ lyric.romaji }}<br>
                        </span>
                        <i v-if="enableRomaji && !enableTranslate" :id="timecode.toString()"></i>
                        <span :style="getLyricStyle(index, timecode, 'main')">
                            <i v-if="!enableRomaji && !enableTranslate" :id="timecode.toString()"></i>
                            {{ lyric.original }}<br>
                        </span>
                        <i v-if="!enableRomaji && enableTranslate" :id="timecode.toString()"></i>
                        <span v-if="lyric.translate && enableTranslate" :style="getLyricStyle(index, timecode, 'bottom')">
                            {{ lyric.translate }}
                        </span>
                    </div>
                </div>
                <div class="lyric" v-else-if="!loadingLyrics">
                    Lyric went missing! {{ getRandomKaomoji() }} </div>
            </div>
        </article>
    </article>
    <article :aria-busy="waitingForWSConnection" class="playlist">
        <h4 v-if="userDataRaw">Playlist</h4>
        <article :key="componentKey" v-if="userDataRaw" v-for="( queue, index ) in  currentQueue() "
            :class="index == 0 ? 'now-playing-sign' : ''" :style="getQueueBackground(queue)">
            <div v-if="queue.meta">
                <span class="now-playing-sign" v-if="index == 0">Now Playing:</span>
                <span class="title">{{ queue.meta.title }}</span>
                <span class="artists">{{ queue.meta.artists }}</span>
                <i @click="backend.queueMoveEntryUp(index)" class="up-button">
                    <font-awesome-icon :icon="['fas', 'arrow-up']" />
                </i>
                <i @click="backend.queueMoveEntryDown(index)" class="down-button">
                    <font-awesome-icon :icon="['fas', 'arrow-down']" />
                </i>
                <i @click="backend.queueDeleteEntry(index)" class="trash-button">
                    <font-awesome-icon :icon="['fas', 'trash']" />
                </i>
            </div>
        </article>
    </article>
</template>

<style scoped>
@property --playlist-card-top {
    syntax: '<co`lo`r>';
    initial-value: rgb(0, 0, 0, 91%);
    inherits: false;
}

@property --playlist-card-bottom {
    syntax: '<color>';
    initial-value: rgb(255, 255, 255, 16%);
    inherits: false;
}


.playlist>article>div {
    background-image: linear-gradient(var(--playlist-card-top), 75%, var(--playlist-card-bottom));
    transition: --playlist-card-top var(--transition), --playlist-card-botoom var(--transition);
}

.playlist>article.now-playing-sign>div {
    background-image: linear-gradient(var(--playlist-card-top), 85%, var(--playlist-card-bottom));
}

div:hover {
    --myColor1: red;
    --myColor2: #E1AF2F;
}

@media only screen and (prefers-color-scheme: dark) {
    :root:not([data-theme]) .playlist>article>div {
        --playlist-card-top: rgb(0, 0, 0, 91%);
        --playlist-card-bottom: rgb(255, 255, 255, 16%);
    }

    :root:not([data-theme]) .dashboard>article {
        background-color: var(--card-panel-background-color-dark);
    }
}

:root[data-theme="dark"] .playlist>article>div {
    --playlist-card-top: rgb(0, 0, 0, 91%);
    --playlist-card-bottom: rgb(255, 255, 255, 16%);
}

:root[data-theme="dark"] .dashboard>article {
    background-color: var(--card-panel-background-color-dark);
}


@media only screen and (prefers-color-scheme: light) {
    :root:not([data-theme]) .playlist>article>div {
        --playlist-card-top: rgb(255, 255, 255, 91%);
        --playlist-card-bottom: rgb(0, 0, 0, 20%);
    }

    :root:not([data-theme]) .dashboard>article {
        background-color: var(--card-panel-background-color-light);
    }
}

:root[data-theme="light"] .playlist>article>div {
    --playlist-card-top: rgb(255, 255, 255, 91%);
    --playlist-card-bottom: rgb(0, 0, 0, 20%);
}

:root[data-theme="light"] .dashboard>article {
    background-color: var(--card-panel-background-color-light);
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

.click-cursor {
    cursor: pointer;
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
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
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

.dashboard {
    display: grid;
    grid-template-rows: min-content min-content min-content auto;
    grid-template-areas:
        "title"
        "control"
        "selector"
        "lyric";

    align-items: center;
}

.dashboard>.title {
    grid-area: title;
}

.dashboard>.controls {
    grid-area: control;
}

#streamerSelector {
    grid-area: selector;
}

#lyricTextarea {
    height: 100%;
    text-align: center;
    font-size: 1.5em;
    overflow-y: scroll;
    -ms-overflow-style: none;
    scrollbar-width: none;
}

#lyricTextarea::-webkit-scrollbar {
    display: none;
}

article:has(>#lyricTextarea) {
    overflow: hidden;
    display: grid;
    grid-area: lyric;
    grid-template-rows: min-content auto;
    height: 100%;
}
</style>