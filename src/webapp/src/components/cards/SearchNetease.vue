<script setup lang="ts">
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
library.add(faPlus);

import { nextTick, ref, getCurrentInstance } from 'vue';
import axios from 'axios';
import { Netease } from 'menu/arisa/command/netease/lib';
import { addTrack } from './common'

// @ts-ignore
import { useNotification } from "@kyvg/vue3-notification";
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
let searchResult: Netease.songDetail[] = [];
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
async function getSongDetails(ids: string): Promise<Netease.songDetail[]> {
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
        searchResultElement?.setAttribute("aria-busy", "true");
        getNeteaseSearch(searchInput.value).then((res) => {
            if (res) {
                getSongDetails(res.map(v => v.id).join(',')).then(async (re) => {
                    searchResult = re;
                    searched.value = true;
                    searchResultElement?.removeAttribute("aria-busy");
                    await nextTick()
                    instance?.proxy?.$forceUpdate();
                }).catch((e) => {
                    console.error(e);
                    searched.value = false;
                    searchResultElement?.removeAttribute("aria-busy");
                })
            } else {
                searched.value = false;
                searchResultElement?.removeAttribute("aria-busy");
            }
        }).catch((e) => {
            searched.value = false;
            searchResultElement?.removeAttribute("aria-busy");
            console.error(e);
        })
    } else {
        notify({
            group: "search",
            title: "Error",
            text: `Please wait for previous search to complete`,
        });
    }
}

function addNeteaseTrack(song: Netease.songDetail) {
    addTrack({
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
    })
    notify({
        group: "search",
        title: "Success",
        text: `Added "${song.name}" to playlist`,
    });
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
                <label for="track-name">Search for A Track
                    <input v-model="searchInput" type="search" name="track-name" placeholder="Trackname"
                        @keyup.enter="search()">
                </label>
            </header>
            <div class="search-result">
                <article v-if="searchResult.length" v-for="song of searchResult">
                    <img class="cover" :src="(song as Netease.songDetail).al.picUrl" />
                    <span class="track-meta">
                        <p class="title">{{ (song as Netease.songDetail).name }}</p>
                        <p class="artists">{{ (song as Netease.songDetail).ar.map(v => v.name).join(', ') }}</p>
                    </span>
                    <i class="control" @click="addNeteaseTrack(song)">
                        <font-awesome-icon :icon="['fas', 'plus']" />
                    </i>
                </article>
                <article v-else-if="searched">
                    <span class="meta">No Results</span>
                </article>
            </div>
        </article>
    </dialog>
</template>

<style scoped>
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