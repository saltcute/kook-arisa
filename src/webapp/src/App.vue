<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ref } from 'vue';
import HeaderComponent from './components/Header.vue'
import FooterComponent from './components/Footer.vue';
import SearchNetease from './components/control/SearchNetease.vue';

const searchNetease = ref<InstanceType<typeof SearchNetease> | null>(null);
defineExpose({
    searchNetease
})

const view = ref<InstanceType<typeof RouterView> | null>(null);
</script>

<template>
    <notifications group="search" />
    <HeaderComponent :showNeteaseSearchDialog="searchNetease?.showDialog" />
    <RouterView ref="view" />
    <SearchNetease ref="searchNetease" />
    <FooterComponent />
</template>

<style lang="scss">
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC&family=Noto+Sans+TC&family=Noto+Sans+JP&family=Comfortaa&family=Josefin+Sans&display=swap');

:root {
    --body-weight: 400;
    --header-weight: 600;

    --transition: .4s cubic-bezier(0.6, 0.07, 0, 0.99);

    --font-size: 14;

    font-size: min(max(calc(100vh / 720 * var(--font-size)), 12px), 28px);
    // font-size: var(--font-size)px;

    --card-panel-background-color-dark: #16242f;
    --card-panel-background-color-light: #ffffff;

    --body-font: "Comfortaa", "Gen Jyuu Gothic Regular", "GenSenRounded TW R", sans-serif;
    --header-font: "Josefin Sans", "Noto Sans JP", sans-serif;

    &[lang^="zh"],
    &[lang^="zh-TW"] {
        --body-font: "Comfortaa", "Gen Jyuu Gothic Regular", "GenSenRounded TW R", sans-serif;
        --header-font: "Josefin Sans", "Noto Sans TC", sans-serif;
    }

    &[lang^="zh-CN"] {
        --body-font: "Comfortaa", "Gen Jyuu Gothic Regular", "JiangChengYuanTi", sans-serif;
        --header-font: "Josefin Sans", "Noto Sans SC", sans-serif;
    }
}

* {
    transition: background-color var(--transition), background-image var(--transition), box-shadow var(--transition);
}

body {
    font-family: var(--body-font);
    font-weight: var(--body-weight);
}

h1,
h2,
h3,
h4,
h5,
h6 {
    font-family: var(--header-font);
    font-weight: var(--header-weight);
}

.twemoji {
    display: inline-block;
    height: 1.2em;
    width: auto;
    margin-left: .2em;
    margin-right: .2em;

    img {
        height: 100%;
        width: auto;
        display: block;
        margin-top: auto;
        margin-bottom: auto;
    }
}

nav {
    details[role="list"] {
        summary {
            align-items: center;
        }
    }
}

main {
    padding-top: 2em;
    padding-bottom: 2em;
}

@media screen and (max-aspect-ratio: 17/20) {
    header {
        .language-current {
            display: none;
        }
    }
}

@media screen and (max-aspect-ratio: 7/10) {
    header {
        .username {
            display: none;
        }
    }
}

@media screen and (max-aspect-ratio: 6/10) {
    header {
        .title {
            display: none;
        }
    }
}

.container {
    max-width: 100vw;
    width: 90vw;
    margin-left: 5vw;
    margin-right: 5vw;
    height: calc(100vh - 6em);
}


.container>article {
    margin: 0px;
}
</style>