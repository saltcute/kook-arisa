<script setup lang="ts">
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faSun, faMoon, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
library.add(faSun, faMoon, faMagnifyingGlass);

import { auth } from './cards/common';
import axios from 'axios';
import webui from '../../../config/webui';
import { Ref, onMounted, ref, } from 'vue';

const props = defineProps<{
    showNeteaseSearchDialog: () => void
}>()

function logout() {
    localStorage.removeItem('auth');
    localStorage.removeItem('user');
    location.replace('/');
}

async function getUserMe(token: string): Promise<{
    code: number,
    message: string,
    data: any
}> {
    return new Promise((resolve, rejects) => {
        axios({
            url: '/api/me',
            method: 'POST',
            data: {
                auth: `Bearer ${token}`
            }
        }).then(({ data }) => {
            resolve(data);
        }).catch((e) => { rejects(e) });
    })
}
let callbackUrl: Ref<string>, user: Ref<string>, auth: auth;
user = ref('Loading...');
callbackUrl = ref('');
(async () => {
    const query = new URLSearchParams(window.location.search);
    const authRaw = localStorage.getItem('auth');
    if (authRaw && (auth = JSON.parse(authRaw)) && auth.expires - Date.now() > 3600 * 1000) { // Have auth
        const userData = (await getUserMe(auth.access_token)).data
        localStorage.setItem('user', JSON.stringify(userData));
        user.value = `${userData.username}`
    } else {
        localStorage.removeItem('auth');
        const code = query.get('code');
        if (code) {
            await axios.get(`/api/login?code=${code}`).then(async ({ data }) => {
                const store = data.data;
                store.expires = Date.now() + store.expire_in * 1000;
                localStorage.setItem('auth', JSON.stringify(store));
                const userData = (await getUserMe(store.access_token)).data
                localStorage.setItem('user', JSON.stringify(userData));
                user.value = `${userData.username}`;
                location.replace('/');
            }).catch(() => {
                location.replace('/');
            });
        } else {
            callbackUrl.value = `https://www.kookapp.cn/app/oauth2/authorize?id=12273&client_id=${webui.kookClientID}&redirect_uri=${encodeURIComponent(webui.dashboardUrl)}&response_type=code&scope=get_user_info`
            user.value = '';
        }
    }
})()

function switchTheme() {
    let finalTheme;
    const root = document.querySelector(":root");
    if (root) {
        const theme = root.getAttribute('data-theme');
        if (
            (!theme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
            (theme && theme != 'light')
        ) {
            finalTheme = 'dark';
        } else {
            finalTheme = 'light';
        }
        if (finalTheme == 'light') {
            localStorage.setItem('preferredTheme', 'dark');
            root.setAttribute('data-theme', 'dark');
        } else {
            localStorage.setItem('preferredTheme', 'light');
            root.setAttribute('data-theme', 'light');
        }
    }
}

onMounted(() => {
    const preferredTheme = localStorage.getItem('preferredTheme');
    if (preferredTheme == 'light' || preferredTheme == 'dark') {
        document.querySelector(":root")?.setAttribute('data-theme', preferredTheme);
    }
})
</script>

<template>
    <header>
        <nav>
            <ul>
                <li><strong class="title">Arisa</strong></li>
            </ul>
            <ul>
                <li>
                    <i style="cursor: pointer;" @click="showNeteaseSearchDialog">
                        <font-awesome-icon :icon="['fas', 'magnifying-glass']" />
                    </i>
                </li>
                <li>
                    <i class="switch-theme-light" @click="switchTheme">
                        <font-awesome-icon :icon="['fas', 'sun']"></font-awesome-icon>
                    </i>
                    <i class="switch-theme-dark" @click="switchTheme">
                        <font-awesome-icon :icon="['fas', 'moon']"></font-awesome-icon>
                    </i>
                </li>
                <li>
                    <a v-if="user">{{ user }}</a>
                    <a v-else="callbackUrl" :href="callbackUrl" role="button">Login with KOOK</a>
                </li>
                <li v-if="user">
                    <a @click="logout" href="#" role="button">Logout</a>
                </li>
            </ul>
        </nav>
    </header>
</template>

<style scoped>
.title {
    font-family: "Secular One", sans-serif;
}

header {
    padding-left: 2em;
    padding-right: 2em;
}

.switch-theme-light,
.switch-theme-dark {
    cursor: pointer;
}

@media only screen and (prefers-color-scheme: dark) {
    :root:not([data-theme]) .switch-theme-dark {
        display: none;
    }
}

@media only screen and (prefers-color-scheme: light) {
    :root:not([data-theme]) .switch-theme-light {
        display: none;
    }
}

:root[data-theme="dark"] .switch-theme-dark {
    display: none;
}

:root[data-theme="light"] .switch-theme-light {
    display: none;
}
</style>