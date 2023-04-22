<script setup lang="ts">
import axios from 'axios';
import webui from '../../../config/webui';
import { Ref, ref, } from 'vue';
interface auth {
    access_token: string,
    expires_in: number,
    token_type: string,
    scope: string,
    expires: number
}

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
        user.value = `Hi, ${userData.username}`
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
            callbackUrl.value = `https://www.kookapp.cn/app/oauth2/authorize?id=12273&client_id=${webui.kookClientID}&redirect_uri=${encodeURIComponent(webui.oauth2Url)}&response_type=code&scope=get_user_info`
            user.value = '';
        }
    }
})()
</script>

<template>
    <header>
        <nav>
            <ul>
                <li><strong class="title">Arisa</strong></li>
            </ul>
            <ul>
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
</style>