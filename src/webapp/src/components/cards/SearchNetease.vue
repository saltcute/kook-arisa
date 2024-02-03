<script setup lang="ts">
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
library.add(faPlus);

import { nextTick, ref, getCurrentInstance } from 'vue';
import axios from 'axios';
import { Netease } from 'menu/arisa/command/netease/lib';
import backend from './common'

// @ts-ignore
import { useNotification } from "@kyvg/vue3-notification";
import { QQMusic } from 'menu/arisa/command/qq/lib';

import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const akarin = "https://img.kookapp.lolicon.ac.cn/assets/2022-07/vlOSxPNReJ0dw0dw.jpg";
const { notify } = useNotification()
const instance = getCurrentInstance();
const searched = ref(false);

function closeDialog() {
    document.getElementById('netease-search')?.removeAttribute('open');
}
function showDialog() {
    document.getElementById('netease-search')?.setAttribute('open', 'true');
}

let searchInput = ref('');
let searchResult: (Netease.songDetail | QQMusic.Pattern.Song)[] = [];
async function getNeteaseSearch(keyword: string): Promise<Netease.song[]> {
    return new Promise((resolve, reject) => {
        axios({
            url: "/netease/search",
            params: {
                keyword
            }
        }).then(({ data }) => {
            resolve(data.data);
        }).catch(e => reject(e));
    })
}

function isNeteaseSong(payload: any): payload is Netease.songDetail {
    return payload.al !== undefined;
}

async function getQQMusicSearch(keyword: string): Promise<QQMusic.API.Search> {
    return new Promise((resolve, reject) => {
        axios({
            url: "/qqmusic/search",
            params: {
                keyword
            }
        }).then(({ data }) => {
            resolve(data.data);
        }).catch(e => reject(e));
    })
}
async function getNeteaseSongDetails(ids: string): Promise<Netease.songDetail[]> {
    return new Promise((resolve, reject) => {
        axios({
            url: "/netease/songs",
            params: {
                ids
            }
        }).then(({ data }) => {
            resolve(data.data);
        }).catch(e => reject(e));
    })
}
function search() {
    let searchResultElement = document.querySelector("#netease-search .search-result");
    if (searchResultElement?.getAttribute("aria-busy") != "true") {
        searched.value = false;
        searchResult = [];
        instance?.proxy?.$forceUpdate();
        searchResultElement?.setAttribute("aria-busy", "true");
        switch (activeTab.value) {
            case 'netease':
                getNeteaseSearch(searchInput.value).then((res) => {
                    if (res) {
                        getNeteaseSongDetails(res.map(v => v.id).join(',')).then(async (re) => {
                            searchResult = re;
                            searchResultElement?.removeAttribute("aria-busy");
                            searched.value = true;
                            await nextTick();
                            instance?.proxy?.$forceUpdate();
                        }).catch((e) => {
                            console.error(e);
                            searched.value = false;
                            searchResultElement?.removeAttribute("aria-busy");
                        })
                    } else {
                        searched.value = false;
                        searchResult = [];
                        searchResultElement?.removeAttribute("aria-busy");
                    }
                }).catch((e) => {
                    searched.value = false;
                    searchResult = [];
                    searchResultElement?.removeAttribute("aria-busy");
                    console.error(e);
                })
                break;
            case "qqmusic":
                getQQMusicSearch(searchInput.value).then(async (res) => {
                    if (res) {
                        searchResult = res.list;
                        searchResultElement?.removeAttribute("aria-busy");
                        searched.value = true;
                        await nextTick();
                        instance?.proxy?.$forceUpdate();
                    } else {
                        searched.value = false;
                        searchResult = [];
                        searchResultElement?.removeAttribute("aria-busy");
                    }
                }).catch((e) => {
                    searched.value = false;
                    searchResult = [];
                    searchResultElement?.removeAttribute("aria-busy");
                    console.error(e);
                })
                break;
            case "bilibili":
                nextTick().then(() => {
                    searched.value = false;
                    searchResult = [];
                    searchResultElement?.removeAttribute("aria-busy");
                })
                const pattern = /(?:https?:\/\/(?:www|m).bilibili.com\/video\/)?(BV[0-9A-Za-z]{10})/gm;
                const bvid = pattern.exec(searchInput.value)?.[1]
                if (bvid) {
                    backend.addTrack({
                        type: 'bilibili',
                        data: {
                            bvid,
                            part: 0
                        },
                        meta: {
                            title: "Bilibili Video",
                            artists: "Unknown",
                            duration: -1,
                            cover: akarin
                        }
                    })
                    notify({
                        group: "search",
                        title: t("notification.search.success.title"),
                        text: t("notification.search.success.bilibili"),
                    });
                } else {
                    notify({
                        group: "search",
                        title: t("notification.search.error.title"),
                        text: t("notification.search.error.bilibiliWrongLinkPattern"),
                    });
                }
        }
    } else {
        notify({
            group: "search",
            title: t("notification.search.error.title"),
            text: t("notification.search.error.waitForPreviousFinish"),
        });
    }
}

function addNeteaseTrack(song: Netease.songDetail) {
    backend.addTrack({
        type: 'netease',
        data: {
            songId: song.id,
        },
        meta: {
            title: song.name,
            artists: song.ar.map(v => v.name).join(', '),
            duration: song.dt,
            cover: song.al.picUrl
        }
    });
    if (backend.currentStreamer) {
        notify({
            group: "search",
            title: t("notification.search.success.title"),
            text: t("notification.search.success.addedToPlaylist", { name: song.name }),
        });
    } else {
        notify({
            group: "search",
            title: t("notification.search.warning.title", { name: song.name }),
            text: t("notification.search.warning.noStreamers", { name: song.name }),
        });
    }
}

function addQQMusicTrack(song: QQMusic.Pattern.Song) {
    backend.addTrack({
        type: 'qqmusic',
        data: {
            songMId: song.songmid,
            mediaId: song.strMediaMid
        },
        meta: {
            title: song.name,
            artists: song.singer.map(v => v.name).join(', '),
            duration: song.interval * 1000,
            cover: `https://y.gtimg.cn/music/photo_new/T002R300x300M000${song.albummid}.jpg`
        }
    });
    if (backend.currentStreamer) {
        notify({
            group: "search",
            title: t("notification.search.success.title"),
            text: t("notification.search.success.addedToPlaylist", { name: song.name }),
        });
    } else {
        notify({
            group: "search",
            title: t("notification.search.warning.title", { name: song.name }),
            text: t("notification.search.warning.noStreamers", { name: song.name }),
        });
    }
}

const activeTab = ref<"netease" | "qqmusic" | "bilibili">("netease");

function switchTabTo(target: "netease" | "qqmusic" | "bilibili") {
    activeTab.value = target;
}

defineExpose({
    showDialog
})
</script>

<template>
    <dialog id="netease-search">
        <article>
            <header>
                <a style="cursor: pointer;" @click="closeDialog()" aria-label="Close" class="close"></a>
                <label for="track-name">
                    <span v-if="activeTab == 'netease' || activeTab == 'qqmusic'">
                        {{ t('desc.serach.title.searchForTrack') }}
                    </span>
                    <span v-else-if="activeTab == 'bilibili'">{{ t('desc.serach.title.playBilibiliVideo') }}</span>
                    <span v-else>{{ t('desc.serach.title.unknown') }}</span>
                    <i class="iconfont icon-arisa-wangyiyun" :class="{ active: activeTab == 'netease' }"
                        @click="switchTabTo('netease')"></i>
                    <i class="iconfont icon-arisa-QQyinleshiliangtubiao" :class="{ active: activeTab == 'qqmusic' }"
                        @click="switchTabTo('qqmusic')"></i>
                    <i class="iconfont icon-arisa-bilibili" :class="{ active: activeTab == 'bilibili' }"
                        @click="switchTabTo('bilibili')"></i>
                    <input v-model="searchInput" type="search" name="track-name"
                        :placeholder="activeTab == 'bilibili' ? t('desc.serach.boxDesc.bilibiliVideo') : t('desc.serach.boxDesc.trackName')"
                        @keyup.enter="search()">
                </label>
            </header>
            <div class="search-result">
                <article v-if="searchResult.length" v-for="song of searchResult">
                    <span v-if="isNeteaseSong(song)">
                        <img class="cover" :src="(song as Netease.songDetail).al.picUrl" />
                        <span class="track-meta">
                            <p class="title">{{ (song as Netease.songDetail).name }}</p>
                            <p class="artists">{{ (song as Netease.songDetail).ar.map(v => v.name).join(', ') }}</p>
                        </span>
                        <i class="control" @click="addNeteaseTrack(song)">
                            <font-awesome-icon :icon="['fas', 'plus']" />
                        </i>
                    </span>
                    <span v-else>
                        <img class="cover" :src="`https://y.gtimg.cn/music/photo_new/T002R300x300M000${song.albummid}.jpg`"
                            @error="(event) => { (event.target as HTMLElement).setAttribute('src', akarin) }" />
                        <span class="track-meta">
                            <p class="title">{{ song.name }}</p>
                            <p class="artists">{{ song.singer.map(v => v.name).join(', ') }}</p>
                        </span>
                        <i class="control" @click="addQQMusicTrack(song)">
                            <font-awesome-icon :icon="['fas', 'plus']" />
                        </i>
                    </span>
                </article>
                <article v-else-if="searched">
                    <span class="meta">{{ t('desc.serach.noResults') }}</span>
                </article>
            </div>
        </article>
    </dialog>
</template>

<style scoped>
[class^='icon-arisa-'],
[class*='icon-arisa-'] {
    font-size: 1.1em;
    color: pink;
    filter: grayscale(1);
    margin-left: 0.1em;
    margin-right: 0.1em;
    cursor: pointer;
}

[class^='icon-arisa-'].active,
[class*='icon-arisa-'].active {
    filter: none;
}

#netease-search>article {
    width: 65vw;
    padding-bottom: 0px;
}

#netease-search>article>header {
    margin-bottom: 0px;
}

.search-result {
    overflow-x: scroll;
    overflow-y: hidden;
}

.search-result>article {
    overflow: hidden;
}

.cover {
    grid-area: cover;
}

.title,
.artists {
    margin: 0px;
    text-align: center;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.artists {
    color: var(--secondary);
    font-size: 0.75em;
}

.track-meta {
    grid-area: meta;
    width: 100%;
    overflow: hidden;
}

.control {
    cursor: pointer;
    grid-area: control;
}

.search-result>article {
    padding: 0px;
    margin: 1em;
}

.search-result>article>span {
    display: grid;
    justify-items: center;
    align-items: center;
    grid-template-columns: 3em 1em 1fr 1em 3em;
    grid-template-rows: 1em 1em 1em;
    gap: 0px 0px;
    grid-template-areas:
        "cover . meta . ."
        "cover . meta . control"
        "cover . meta . .";
}
</style>