<script setup lang="ts">
import { ref } from 'vue';
const proxy = "img.kookapp.lolicon.ac.cn";
const userDataRaw = localStorage.getItem('user');
let username = ref('Please login');
let avatar = ref(`https://${proxy}/assets/2022-07/vlOSxPNReJ0dw0dw.jpg`);
if (userDataRaw) {
    const userData = JSON.parse(userDataRaw);
    username.value = `${userData.username}#${userData.identify_num}`;
    avatar.value = userData.avatar.replace('img.kaheila.cn', proxy).replace('img.kookapp.cn', proxy);
}
</script>

<template>
    <article class="profile grid">
        <article class="avatar">
            <img :src="avatar">
        </article>
        <div class="username">
            <span>{{ username.split("#")[0] }}</span>
            <span style="font-size: 0.75rem; font-weight: var(--header-weight); color: gray;">#{{ username.split("#")[1]
            }}</span>
        </div>
    </article>
</template>

<style scoped>
.profile {
    display: grid;
    grid-template-columns: 100%;
    grid-template-rows: 70% 1fr;
    gap: 0px 0px;
    grid-auto-flow: row;
    grid-template-areas:
        "avatar"
        "username";
    align-content: center;
    align-items: center;
    justify-items: center;
}


.username {
    text-align: center;
    grid-area: username;
    width: 100%;
}

.avatar {
    padding: 0px;
    height: 95%;
    aspect-ratio: 1 / 1;
    border-radius: 100%;
    overflow: hidden;
    grid-area: avatar;
}

.avatar>img {
    aspect-ratio: 1 / 1;
    height: 100%;
    /* width: 150%; */
}
</style>