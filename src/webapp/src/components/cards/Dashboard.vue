<script setup lang="ts">
import SliderComponent from "./VolumeSlider.vue";
import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
    faForward,
    faBackward,
    faPause,
    faPlay,
    faArrowUp,
    faArrowDown,
    faTrash,
    faCircleXmark,
    faRepeat,
    faShuffle,
    faGlobe,
    faLanguage,
    faVolumeXmark,
    faVolumeLow,
    faVolumeHigh,
} from "@fortawesome/free-solid-svg-icons";
library.add(
    faForward,
    faBackward,
    faPause,
    faPlay,
    faArrowUp,
    faArrowDown,
    faTrash,
    faCircleXmark,
    faRepeat,
    faShuffle,
    faGlobe,
    faLanguage,
    faVolumeXmark,
    faVolumeLow,
    faVolumeHigh
);

import { playback } from "menu/arisa/playback/type";
import backend from "./common";
import { nextTick, onMounted, reactive, ref } from "vue";
import axios from "axios";
import { Netease } from "menu/arisa/command/netease/lib";
import { QQMusic } from "menu/arisa/command/qq/lib";

import draggable from "vuedraggable";
import type { SortableEvent } from "sortablejs";

import { useI18n } from "vue-i18n";
const { t } = useI18n();

const props = defineProps<{
    setSliderValue: ((value: number) => void) | undefined;
}>();
const volumeSlider = ref(null);

const proxy = "img.kookapp.lolicon.ac.cn";

export declare enum NotificationSetting {
    Default = 0,
    All = 1,
    MentionOnly = 2,
    Block = 3,
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

async function getGuildList(
    token: string
): Promise<RawGuildListResponseItem[]> {
    return new Promise((resolve, rejects) => {
        axios({
            url: "/api/guilds",
            method: "POST",
            data: {
                auth: `Bearer ${token}`,
            },
        })
            .then(({ data }) => {
                resolve(data.data.items);
            })
            .catch((e) => {
                rejects(e);
            });
    });
}

async function getNeteaseSongLyrics(id: number): Promise<Netease.lyric> {
    return new Promise((resolve, rejects) => {
        axios({
            url: "/netease/lyric",
            method: "GET",
            params: {
                id,
            },
        })
            .then(({ data }) => {
                resolve(data.data);
            })
            .catch((e) => {
                rejects(e);
            });
    });
}
async function getQQMusicSongLyrics(mid: string): Promise<QQMusic.API.Lyric> {
    return new Promise((resolve, rejects) => {
        axios({
            url: "/qqmusic/lyric",
            method: "GET",
            params: {
                mid,
            },
        })
            .then(({ data }) => {
                resolve(data.data);
            })
            .catch((e) => {
                rejects(e);
            });
    });
}
async function getPuchiririLyrics({
    name,
    artist,
    album,
    duration = 0,
}: {
    name?: string;
    artist?: string;
    album?: string;
    /**
     * Length of the song in milliseconds
     */
    duration?: number;
}): Promise<string> {
    return new Promise((resolve, rejects) => {
        axios({
            url: "/puchiriri/lrc",
            method: "GET",
            params: {
                name,
                artist,
                album,
                duration,
            },
        })
            .then(({ data }) => {
                resolve(data.data);
            })
            .catch((e) => {
                rejects(e);
            });
    });
}

function parseLRC(rawLyric: string) {
    const lineByLineLyric = rawLyric.split("\n");
    const lyrics: [number, string][] = [];
    for (const line of lineByLineLyric) {
        if (!line) continue;
        const [_, rawTimecode, lyric] = /(?:\[([0-9:.]+)\])+(.+)?/.exec(
            line
        ) || ["00:00.000", ""];
        const [__, m, s, ms] = /([0-9]+):([0-9]+).([0-9]+)/.exec(
            rawTimecode
        ) || ["0", "0", "0"];
        if (!(m && s && ms)) continue;
        const numberMs = parseInt(ms);
        const realMs =
            ms.length == 1
                ? numberMs * 100
                : ms.length == 2
                  ? numberMs * 10
                  : numberMs;
        const timecode = parseInt(m) * 60 * 1000 + parseInt(s) * 1000 + realMs;
        if (!isNaN(timecode) && timecode && lyric)
            lyrics.push([timecode, lyric]);
    }
    return lyrics;
}

function parseLyric(
    rawLyric?: string,
    rawTranslate?: string,
    rawRomaji?: string,
    rawKLyric?: string
) {
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
const userDataRaw = localStorage.getItem("user");
if (userDataRaw && backend.ws) {
    const auth = JSON.parse(localStorage.getItem("auth") || "{}");
    const token = auth.access_token;

    backend.ws.addEventListener("open", () => {
        waitingForWSConnection.value = false;
    });
}

function getQueueBackground(queue: playback.extra) {
    return `background-image: url("${proxiedKookImage(queue.meta.cover)}")`;
}

function proxiedKookImage(original: string) {
    return original
        .replace("img.kaiheila.cn", proxy)
        .replace("img.kookapp.cn", proxy);
}

const currentQueue = reactive({
    list: backend.currentStreamer?.queue || [],
});

function getPlaybackProgress() {
    const streamer = backend.currentStreamer;
    if (streamer) {
        const played = streamer.trackPlayedTime;
        const duration = streamer.trackTotalDuration;
        if (played && duration) return (played / duration) * 100;
        else return 0;
    } else return 0;
}

backend.on("newTrack", (nowPlaying?: playback.extra) => {
    console.log(nowPlaying);
    if (nowPlaying) {
        nextTick().then(() => {
            if (volumeSlider.value) {
                console.log(volumeSlider.value);
                // @ts-ignore
                volumeSlider.value.setSliderValue(
                    fr(backend.currentStreamer?.volumeGain || 0) * 100
                );
            }
        });
        switch (nowPlaying.type) {
            case "netease":
                getNeteaseSongLyrics(nowPlaying.data.songId).then((data) => {
                    const lyrics = parseLyric(
                        data.lrc?.lyric,
                        data.tlyric?.lyric,
                        data.romalrc?.lyric,
                        data.klyric?.lyric
                    );
                    currentLyric = lyrics;
                    bilingualLyric = parseBilingual();
                    currentLyricIndexCache = undefined;
                    loadingLyrics.value = false;
                });
                break;
            case "qqmusic":
                getQQMusicSongLyrics(nowPlaying.data.songMId).then((data) => {
                    const lyrics = parseLyric(data.lyric, data.trans);
                    currentLyric = lyrics;
                    bilingualLyric = parseBilingual();
                    currentLyricIndexCache = undefined;
                    loadingLyrics.value = false;
                });
                break;
            default:
                getPuchiririLyrics({
                    name: nowPlaying.meta.title,
                    artist: nowPlaying.meta.artists,
                    duration: nowPlaying.meta.duration * 1000,
                })
                    .then((data) => {
                        const lyrics = parseLyric(data);
                        currentLyric = lyrics;
                        bilingualLyric = parseBilingual();
                        currentLyricIndexCache = undefined;
                        loadingLyrics.value = false;
                    })
                    .catch(() => {
                        getPuchiririLyrics({
                            name: nowPlaying.meta.title,
                            artist: nowPlaying.meta.artists,
                            // duration: nowPlaying.meta.duration * 1000
                        })
                            .then((data) => {
                                const lyrics = parseLyric(data);
                                currentLyric = lyrics;
                                bilingualLyric = parseBilingual();
                                currentLyricIndexCache = undefined;
                                loadingLyrics.value = false;
                            })
                            .catch(() => {
                                currentLyric = {
                                    lyric: undefined,
                                    translate: undefined,
                                    kLyric: undefined,
                                    romaji: undefined,
                                };
                                bilingualLyric = {};
                                currentLyricIndexCache = undefined;
                                loadingLyrics.value = false;
                            });
                    });
        }
    }
});

function scrollToActiveLyric() {
    let element = document.getElementById(currentLyricIndex()[1].toString());
    let parentContainer = document.getElementById("lyricTextarea");
    if (!element) {
        const children = document.getElementsByClassName(
            currentLyricIndex()[1].toString()
        );
        element = (children[1] || children[0]) as HTMLElement;
    }
    if (!element) {
        const children = parentContainer?.children;
        if (children) element = children[children.length - 1] as HTMLElement;
    }
    if (element && parentContainer) {
        var elementTop = element.offsetTop;
        var divTop = parentContainer.offsetTop;
        var elementRelativeTop = elementTop - divTop;
        parentContainer.scrollTop =
            elementRelativeTop -
            parentContainer.clientHeight / 2 +
            element.clientHeight / 2;
    }
}

backend.on("wsEvent", () => {
    if (backend.currentStreamer?.queue && Date.now() - lastDragEnd > 1 * 1000)
        currentQueue.list = backend.currentStreamer?.queue;
    forceRender().then(() => {
        forceRender().then(() => {
            if (Date.now() - lastScroll > 2 * 1000) {
                scrollToActiveLyric();
            }
        });
    });
});

let lastScroll = 0;
function onScrollLyric(event: Event) {
    lastScroll = Date.now();
}

let currentLyric: ReturnType<typeof parseLyric>;

interface BilingualLyric {
    [timecode: number]: {
        original: string;
        translate?: string;
        romaji?: string;
    };
}

function parseBilingual(): BilingualLyric {
    let obj: BilingualLyric = {};
    if (currentLyric.lyric) {
        obj = Object.fromEntries(
            currentLyric.lyric.map((v) => [v[0], { original: v[1] }])
        );
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
    const currentTrackTime =
        (backend.currentStreamer?.trackPlayedTime || 0) * 1000;
    if (!currentTrackTime) return [0, 0];
    const entries: [number, BilingualLyric[number]][] = Object.entries(
        bilingualLyric
    ).map((v) => [parseInt(v[0]), v[1]]);
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
        return last ? [entries.length - 1, last[0]] : [0, 0];
    }
}

const componentKey = ref(0);
function forceRender() {
    componentKey.value++;
    return nextTick();
}

function getLyricStyle(
    index: number,
    timecode: number,
    position: "main" | "top" | "bottom"
) {
    const [curIndex, curTimecode] = currentLyricIndex();
    let classes: string[] = [];
    if (index == Object.entries(bilingualLyric).length - 1)
        currentLyricIndexCache = undefined;
    if (index == curIndex || timecode == curTimecode) {
        classes.push("active");
        if (index > 0 && position != "main") {
            if (position == "bottom") classes.push("top");
            else classes.push("bottom");
        }
        return classes.join(" ");
    }
}
function getRandomKaomoji() {
    function hashcode(str?: string, seed = 0) {
        if (!str) return undefined;
        let h1 = 0xdeadbeef ^ seed,
            h2 = 0x41c6ce57 ^ seed;
        for (let i = 0, ch; i < str.length; i++) {
            ch = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
        h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
        h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

        return 4294967296 * (2097151 & h2) + (h1 >>> 0);
    }
    const library = [
        `(;-;)`,
        `(='X'=)`,
        `(>_<)`,
        `\\(^Д^)/`,
        `(˚Δ˚)b`,
        `(^-^*)`,
        `(·_·)`,
        `(o^^)o`,
        `(≥o≤)`,
    ];
    return library.at(
        ((backend.currentNowPlaying?.data.songId ||
            hashcode(backend.currentNowPlaying?.data.songmid) ||
            hashcode(backend.currentNowPlaying?.data.bvid) ||
            114514) *
            19260817) %
            library.length
    );
}

const enableRomaji = ref(false),
    enableTranslate = ref(true);

function switchRomaji() {
    enableRomaji.value = !enableRomaji.value;
    localStorage.setItem("showRomaji", enableRomaji.value.toString());
    nextTick().then(() => {
        scrollToActiveLyric();
    });
}
function switchTranslate() {
    enableTranslate.value = !enableTranslate.value;
    localStorage.setItem("showTranslate", enableTranslate.value.toString());
    nextTick().then(() => {
        scrollToActiveLyric();
    });
}

let lastDragEnd = -1;
function onDragEnd(event: SortableEvent) {
    const from = event.oldIndex,
        to = event.newIndex;
    if (!from || !to) return;
    let diff = to - from;
    if (diff > 0) {
        backend.queueMoveEntryDown(from, diff);
        lastDragEnd = Date.now();
    } else if (diff < 0) {
        backend.queueMoveEntryUp(from, -diff);
        lastDragEnd = Date.now();
    }
}

onMounted(() => {
    enableRomaji.value =
        localStorage.getItem("showRomaji") == "true" ? true : false;
    enableTranslate.value =
        localStorage.getItem("showTranslate") == "true" ? true : false;

    const lyricTextarea = document.getElementById("lyricTextarea");
    if (lyricTextarea) {
        lyricTextarea.addEventListener("wheel", onScrollLyric);
    }
});

function f(x: number) {
    return Math.exp(0.6933 * x) - 1;
    // if (x < 0.63726) return 1.29 * x * x;
    // else return 1.414 * Math.sqrt(x - 0.5);
    // return Math.pow(x, 2);
    // return 5 / 9 * x * x * x + 0.05;
}
function fr(x: number) {
    return Math.log(x + 1) / 0.6933;
    // if (x < 0.63726) return Math.sqrt(x / 1.29);
    // else return (x / 1.414) * (x / 1.414) + 0.5;
    // return Math.sqrt(x);
    // return Math.cbrt((x - 0.05) * 9 / 5);
}
</script>

<template>
    <article :aria-busy="waitingForWSConnection" class="dashboard">
        <article v-if="userDataRaw" class="control">
            <div class="song-title">
                {{
                    backend.currentNowPlaying?.meta?.title ||
                    t("desc.controlBoard.notPlaying")
                }}
            </div>
            <div class="song-artists">
                {{ backend.currentNowPlaying?.meta?.artists }}
            </div>
            <input
                type="range"
                id="playback-progress"
                @change="
                    (event) => {
                        if (event.target)
                            backend.jumpToPercentage(
                                (event.target as any).value / 100
                            );
                    }
                "
                :value="getPlaybackProgress()"
                min="0"
                max="100"
            />
            <div
                class="playback-control grid"
                :class="{ disabled: backend.currentStreamer ? false : true }"
            >
                <i
                    :data-tooltip="t('tooltip.controlBoard.noRepeat')"
                    v-if="backend.currentCycleMode == 'no_repeat'"
                    @click="backend.switchCycleMode('repeat')"
                >
                    <font-awesome-icon :icon="['fas', 'circle-xmark']" />
                </i>
                <i
                    :data-tooltip="t('tooltip.controlBoard.repeat')"
                    v-else-if="backend.currentCycleMode == 'repeat'"
                    @click="backend.switchCycleMode('repeat_one')"
                >
                    <font-awesome-icon :icon="['fas', 'repeat']" />
                </i>
                <i
                    :data-tooltip="t('tooltip.controlBoard.repeatOne')"
                    v-else-if="backend.currentCycleMode == 'repeat_one'"
                    @click="backend.switchCycleMode('random')"
                >
                    <font-awesome-icon :icon="['fas', 'repeat']" fade />
                </i>
                <i
                    :data-tooltip="t('tooltip.controlBoard.shufflePlaylist')"
                    v-else-if="backend.currentCycleMode == 'random'"
                    @click="backend.switchCycleMode('no_repeat')"
                >
                    <font-awesome-icon :icon="['fas', 'shuffle']" />
                </i>

                <i
                    @click="
                        () => {
                            backend.playPrevious();
                        }
                    "
                >
                    <font-awesome-icon :icon="['fas', 'backward']" />
                </i>
                <i @click="backend.switchPlayback">
                    <font-awesome-icon
                        v-if="backend.currentIsPaused"
                        :icon="['fas', 'play']"
                    />
                    <font-awesome-icon v-else :icon="['fas', 'pause']" />
                </i>
                <i @click="backend.playNext">
                    <font-awesome-icon :icon="['fas', 'forward']" />
                </i>
                <i id="volume-control">
                    <font-awesome-icon
                        v-if="backend.currentVolumeGain <= 0.01"
                        :icon="['fas', 'volume-xmark']"
                    />
                    <font-awesome-icon
                        v-else-if="backend.currentVolumeGain <= 0.4"
                        :icon="['fas', 'volume-low']"
                    />
                    <font-awesome-icon v-else :icon="['fas', 'volume-high']" />
                    <slider-component
                        id="volume-slider"
                        ref="volumeSlider"
                        @inputValue="
                            (value) => {
                                backend.changeVolumeGain(f(value / 100));
                            }
                        "
                        z
                    ></slider-component>
                </i>
            </div>
        </article>
        <details v-if="userDataRaw" role="list" id="streamerselector">
            <summary aria-haspopup="listbox">
                {{
                    backend.currentStreamerName ||
                    t("desc.dashboard.selectStreamer")
                }}
            </summary>
            <ul role="listbox" class="dropdown">
                <li v-if="!backend.streamers.length">
                    {{ t("desc.dashboard.noStreamers") }}
                </li>
                <li
                    v-else
                    class="grid"
                    v-for="(streamer, index) in backend.streamers"
                    :index="index"
                    @click="backend.selectStreamer"
                >
                    <img :src="proxiedKookImage(streamer.avatar)" />
                    {{ streamer.name }}#{{ streamer.identifyNum }}
                </li>
            </ul>
        </details>
        <!-- <article v-if="userDataRaw && (nowPlaying() as playback.extra.netease)?.data.songId"> -->
        <article v-if="userDataRaw">
            <h5 style="margin: 0px">
                {{ t("desc.lyrics.title") }}
                &nbsp<span
                    v-if="currentLyric?.translate"
                    @click="switchTranslate"
                >
                    <i
                        class="click-cursor"
                        v-if="enableTranslate"
                        :data-tooltip="t('tooltip.lyrics.hideTranslate')"
                        ><font-awesome-icon :icon="['fas', 'language']"
                    /></i>
                    <i
                        class="click-cursor"
                        v-else
                        :data-tooltip="t('tooltip.lyrics.showTranslate')"
                        ><font-awesome-icon :icon="['fas', 'language']"
                    /></i>
                </span>
                &nbsp<span v-if="currentLyric?.romaji" @click="switchRomaji">
                    <i
                        class="click-cursor"
                        v-if="enableRomaji"
                        :data-tooltip="t('tooltip.lyrics.hideRomaji')"
                        ><font-awesome-icon :icon="['fas', 'globe']"
                    /></i>
                    <i
                        class="click-cursor"
                        v-else
                        :data-tooltip="t('tooltip.lyrics.showRomaji')"
                        ><font-awesome-icon :icon="['fas', 'globe']"
                    /></i>
                </span>
            </h5>
            <div id="lyricTextarea" :aria-busy="loadingLyrics">
                <div class="lyrics" v-if="Object.keys(bilingualLyric).length">
                    <div
                        class="line"
                        :class="timecode.toString()"
                        v-for="(
                            [timecode, lyric], index
                        ) in getBilingualLyricEntry()"
                    >
                        <span
                            v-if="lyric.romaji && enableRomaji"
                            :class="getLyricStyle(index, timecode, 'top')"
                            class="sub lyric"
                        >
                            {{ lyric.romaji }}<br />
                        </span>
                        <i
                            v-if="enableRomaji && !enableTranslate"
                            :id="timecode.toString()"
                        ></i>
                        <span
                            :class="getLyricStyle(index, timecode, 'main')"
                            class="main lyric"
                        >
                            <i
                                v-if="!enableRomaji && !enableTranslate"
                                :id="timecode.toString()"
                            ></i>
                            {{ lyric.original }}<br />
                        </span>
                        <i
                            v-if="!enableRomaji && enableTranslate"
                            :id="timecode.toString()"
                        ></i>
                        <span
                            v-if="lyric.translate && enableTranslate"
                            :class="getLyricStyle(index, timecode, 'bottom')"
                            class="sub lyric"
                        >
                            {{ lyric.translate }}
                        </span>
                    </div>
                </div>
                <div class="lyrics" v-else-if="!loadingLyrics">
                    {{
                        t("desc.lyrics.notFound", { emoji: getRandomKaomoji() })
                    }}
                </div>
            </div>
        </article>
    </article>
    <article :aria-busy="waitingForWSConnection" class="playlist">
        <h4 v-if="userDataRaw">{{ t("desc.playlist.title") }}</h4>
        <draggable
            class="queue-items"
            :list="currentQueue.list"
            ghost-class="ghost"
            chosen-class="chosen-class"
            @end="onDragEnd"
            draggable=":not(.now-playing-sign)"
        >
            <template #item="{ element, index }">
                <div
                    class="queue-item-card"
                    v-if="element.meta"
                    :class="index ? '' : 'now-playing-sign'"
                    :data-index="index"
                    :style="getQueueBackground(element)"
                >
                    <div>
                        <span class="now-playing-sign" v-if="index == 0">{{
                            t("desc.playlist.nowPlaying")
                        }}</span>
                        <span class="title">
                            <i
                                v-if="element.type == 'netease'"
                                class="iconfont icon-arisa-wangyiyun"
                            ></i>
                            <i
                                v-else-if="element.type == 'qqmusic'"
                                class="iconfont icon-arisa-QQyinleshiliangtubiao"
                            ></i>
                            <i
                                v-else-if="element.type == 'bilibili'"
                                class="iconfont icon-arisa-bilibili"
                            ></i>
                            <i
                                v-else-if="element.type == 'spotify'"
                                class="iconfont icon-arisa-spotify"
                            ></i>
                            {{ element.meta.title }}
                            <span>{{ element.endMark }}</span>
                        </span>
                        <span class="artists">{{ element.meta.artists }}</span>
                        <i
                            @click="backend.queueMoveEntryUp(index)"
                            class="up-button"
                        >
                            <font-awesome-icon :icon="['fas', 'arrow-up']" />
                        </i>
                        <i
                            @click="backend.queueMoveEntryDown(index)"
                            class="down-button"
                        >
                            <font-awesome-icon :icon="['fas', 'arrow-down']" />
                        </i>
                        <i
                            @click="backend.queueDeleteEntry(index)"
                            class="trash-button"
                        >
                            <font-awesome-icon :icon="['fas', 'trash']" />
                        </i>
                    </div>
                </div>
            </template>
        </draggable>
    </article>
</template>

<style scoped lang="scss">
@mixin dark-mode-definition() {
    .playlist > div.queue-items > div.queue-item-card > div {
        --playlist-card-top: rgb(0, 0, 0, 91%);
        --playlist-card-bottom: rgb(255, 255, 255, 16%);
    }

    .dashboard > article {
        background-color: var(--card-panel-background-color-dark);
    }

    span.sub.lyric.active {
        color: #916b00;
    }

    .chosen-class {
        box-shadow: 0px 0px 25px -15px rgb(160, 255, 255);
    }
}

@mixin light-mode-definition() {
    .playlist > div.queue-items > div.queue-item-card > div {
        --playlist-card-top: rgb(255, 255, 255, 91%);
        --playlist-card-bottom: rgb(0, 0, 0, 20%);
    }

    .dashboard > article {
        background-color: var(--card-panel-background-color-light);
    }

    span.sub.lyric.active {
        color: #ffd04b;
    }

    .chosen-class {
        box-shadow: 0px 0px 25px 1px rgb(0, 32, 32);
    }
}

/* Settings set to dark*/
:root[data-theme="dark"] {
    @include dark-mode-definition();
}

/* Settings set to light */
:root[data-theme="light"] {
    @include light-mode-definition();
}

/* System preference is Dark */
@media only screen and (prefers-color-scheme: dark) {
    :root:not([data-theme]) {
        @include dark-mode-definition();
    }
}

/* System preference is light */
@media only screen and (prefers-color-scheme: light) {
    :root:not([data-theme]) {
        @include light-mode-definition();
    }
}

.ghost {
    // filter: grayscale(1);
    visibility: hidden;
}

div.line {
    height: min-content;
    margin-top: 0.5em;
    margin-bottom: 0.5em;
}

span.lyric {
    filter: blur(1px);
    display: block;
    height: min-content;
    line-height: 1.3;
}

span.lyric.active {
    filter: unset;
}

span.main.lyric.active {
    color: orange;
    filter: unset;
}

span.sub.lyric {
    font-size: 0.6em;
    color: grey;
}

span.sub.lyric.top {
    vertical-align: top;
}

span.sub.lyric.bottom {
    vertical-align: bottom;
}

[class^="icon-arisa-"],
[class*="icon-arisa-"] {
    font-size: 1em;
    margin-left: 0.1em;
    cursor: pointer;
}

@property --playlist-card-top {
    syntax: "<co`lo`r>";
    initial-value: rgb(0, 0, 0, 91%);
    inherits: false;
}

@property --playlist-card-bottom {
    syntax: "<color>";
    initial-value: rgb(255, 255, 255, 16%);
    inherits: false;
}

.dashboard {
    display: grid;
    grid-template-rows: min-content min-content auto;
    grid-template-areas:
        "control"
        "selector"
        "lyric";

    align-items: center;
    row-gap: var(--spacing);

    article,
    details {
        margin: 0px;
    }

    .controls {
        grid-area: control;
    }
}

.playlist > div.queue-items > div.queue-item-card > div {
    background-image: linear-gradient(
        var(--playlist-card-top),
        75%,
        var(--playlist-card-bottom)
    );
    transition:
        --playlist-card-top var(--transition),
        --playlist-card-botoom var(--transition);
}

.playlist > div.queue-items > div.queue-item-card > div.now-playing-sign {
    background-image: linear-gradient(
        var(--playlist-card-top),
        85%,
        var(--playlist-card-bottom)
    );
}

div:hover {
    --myColor1: red;
    --myColor2: #e1af2f;
}

.playlist > div.queue-items > div.queue-item-card > div > i {
    display: none;
}

.playlist
    > div.queue-items
    > div.queue-item-card:not(.now-playing-sign)
    > div:hover
    > i {
    display: unset;
}

.playlist > div.queue-items > div.queue-item-card {
    border-radius: 0.25rem;
    margin: 0.5em;
    padding: 0px;
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
}

.playlist > div.queue-items > div.queue-item-card > div {
    border-radius: 0.25rem;
    padding: 0.5em;
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

.playlist > div.queue-items > div.queue-item-card.now-playing-sign > div {
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

.playlist > h4 {
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

    &:not(.disabled) #volume-control {
        &:hover #volume-slider {
            transform: translate(-0.8em, -11em);
            display: block;
            position: absolute;
        }
    }

    #volume-control {
        #volume-slider {
            display: none;
        }
    }

    i {
        padding-top: 1em;
        cursor: pointer;
    }

    &.disabled {
        opacity: 55%;
    }
}

.dropdown > li {
    display: grid;
    grid-template-columns: 2.5em 1fr;
    grid-template-rows: 2.5em;
    gap: 0px 0px;
    grid-template-areas: "avatar .";
    justify-items: start;
    align-items: center;
    cursor: pointer;
}

.dropdown > li > img {
    border-radius: 100%;
    height: 1.5em;
    grid-area: avatar;
}

.playlist {
    overflow-y: scroll;
    overflow-x: hidden;
    padding: 1em 0.25em 1em 0.25em;
}

.playlist > h4 {
    margin-left: 0.75em;
    margin-right: 0.75em;
    margin-bottom: 0.25em;
}

h4 {
    --typography-spacing-vertical: 1em;
}

.playlist > div.queue-items > div.queue-item-card > div > span {
    width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.playlist > div.queue-items > div.queue-item-card > div > .title {
    font-size: 1em;
    grid-area: title;
}

.playlist > div.queue-items > div.queue-item-card > div > .now-playing-sign {
    font-family: var(--header-font);
    font-size: 1em;
    grid-area: now-playing;
}

.playlist > div.queue-items > div.queue-item-card > div > .artists {
    grid-area: artists;
    font-size: 0.6em;
    color: var(--secondary);
}

.playlist > div.queue-items > div.queue-item-card > div > .controls {
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: 1fr;
    gap: 0px 0.4em;
    grid-template-areas: ". . .";
    display: grid;
    justify-items: start;
    align-items: center;
    cursor: pointer;
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
    scroll-behavior: smooth;
}

#lyricTextarea::-webkit-scrollbar {
    display: none;
}

article:has(> #lyricTextarea) {
    overflow: hidden;
    display: grid;
    grid-area: lyric;
    grid-template-rows: min-content auto;
    height: 100%;
}
</style>
