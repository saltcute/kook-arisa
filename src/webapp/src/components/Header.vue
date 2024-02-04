<script setup lang="ts">
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faSun, faMoon, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
library.add(faSun, faMoon, faMagnifyingGlass);

import type { auth as authType } from './cards/common';
import axios from 'axios';
import { Ref, getCurrentInstance, onMounted, ref, } from 'vue';

import { useI18n } from 'vue-i18n'
const { t, availableLocales, locale } = useI18n()

const props = defineProps<{
    showNeteaseSearchDialog: (() => void) | undefined
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
let callbackUrl: Ref<string>, user: Ref<string>, auth: authType | undefined;
user = ref('Loading...');
callbackUrl = ref('');
(async () => {
    const query = new URLSearchParams(window.location.search);
    const code = query.get('code');
    const authRaw = localStorage.getItem('auth');
    if (code) {
        await axios.get(`/api/login?code=${code}`).then(async ({ data }) => {
            const store = data.data;
            store.expires = Date.now() + store.expires_in * 1000;
            localStorage.setItem('auth', JSON.stringify(store));
            const userData = (await getUserMe(store.access_token)).data
            localStorage.setItem('user', JSON.stringify(userData));
            user.value = `${userData.username}`;
            location.replace('/');
        }).catch((e) => {
            alert(e);
            location.replace('/');
        });
    } else {
        if (authRaw && (auth = JSON.parse(authRaw)) && auth.expires - Date.now() > 3600 * 1000) { // Have auth
            const userData = (await getUserMe(auth.access_token)).data
            localStorage.setItem('user', JSON.stringify(userData));
            user.value = `${userData.username}`

        } else {
            console.log('No auth');
            console.log(auth);
            localStorage.removeItem('user');
            localStorage.removeItem('auth');
            callbackUrl.value = "/login"
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

changeLocale(localStorage.getItem("locale") || navigator.language);
function changeLocale(target?: string) {
    if (!target) return;
    if (availableLocales.includes(target)) {
        locale.value = target as any;
        localStorage.setItem("locale", target);
        document.documentElement.setAttribute("lang", target);
    }
}

onMounted(() => {
    const preferredTheme = localStorage.getItem('preferredTheme');
    if (preferredTheme == 'light' || preferredTheme == 'dark') {
        document.querySelector(":root")?.setAttribute('data-theme', preferredTheme);
    }
})

function getFlagEmoji(country: string) {
    function alphaToFlagAlpha(a: string) {
        return String.fromCodePoint(0x1f1a5 + a.toUpperCase().codePointAt(0)!);
    }
    let code = country.slice(0, 2);
    if (code.toLowerCase() == "tw") code = "CN";
    return code.split("").map(alphaToFlagAlpha).join("");
}
</script>

<template>
    <header>
        <nav>
            <ul>
                <li><strong class="title">{{ t("desc.header.title") }}</strong></li>
            </ul>
            <ul>
                <li>
                    <details role="list" class="language-selector">
                        <summary aria-haspopup="listbox">
                            <i class="language-name flag" v-emoji="getFlagEmoji($i18n.locale.split('-')[1])"></i>
                            <span class="language-current">{{ t(`desc.language.name.self`) }}</span>
                        </summary>
                        <ul role="listbox" class="dropdown">
                            <li :class="$i18n.locale == locale ? 'active' : ''" class="language-entry"
                                v-for="locale in $i18n.availableLocales" @click="() => { changeLocale(locale) }">
                                <div class="language-name original">
                                    <span>{{ t(`desc.language.name.original.${locale}`) }}</span>
                                </div>
                                <div class="language-name translated">
                                    {{ t(`desc.language.name.translated.${locale}`) }}
                                </div>
                            </li>
                        </ul>
                    </details>
                </li>
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
                    <a class="username" v-if="user">{{ user }}</a>
                    <a v-else="callbackUrl" :href="callbackUrl" role="button">{{ $t("action.login") }}</a>
                </li>
                <li v-if="user">
                    <a @click="logout" href="#" role="button">{{ $t("action.logout") }}</a>
                </li>
            </ul>
        </nav>
    </header>
</template>

<style scoped lang="scss">
.language-selector {
    .language-entry {
        cursor: pointer;

        &.active {
            color: var(--primary);
            background-color: var(--secondary);
        }

        .language-name {
            &.translated {
                font-size: .65em;
                color: grey;
                float: right;
            }

            &.flag {
                font-size: 1.5em;
            }
        }
    }

    .language-current {
        font-size: .75em;
    }
}

.title {
    font-family: var(--header-font);
    font-weight: var(--header-weight);
    font-size: 1.25em;
}

header {
    height: 3em;
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