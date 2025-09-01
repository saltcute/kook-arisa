<script setup lang="ts">
import { RouterView } from "vue-router";
import { ref } from "vue";
import HeaderComponent from "./components/Header.vue";
import FooterComponent from "./components/Footer.vue";
import SearchNetease from "./components/cards/SearchNetease.vue";

const searchNetease = ref<InstanceType<typeof SearchNetease> | null>(null);
defineExpose({
    searchNetease,
});

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
:root {
    --body-weight: 400;
    --header-weight: 600;

    --transition: 0.4s cubic-bezier(0.6, 0.07, 0, 0.99);

    --font-size: 14;

    font-size: min(max(calc(100vh / 720 * var(--font-size)), 12px), 28px);
    // font-size: var(--font-size)px;

    --card-panel-background-color-dark: #16242f;
    --card-panel-background-color-light: #ffffff;

    --body-font: "Comfortaa", "Gen Jyuu Gothic Regular", "GenSenRounded TW R", "Chiron GoRound TC",
        sans-serif;
    --header-font: "Josefin Sans", "Noto Sans JP", sans-serif;

    &[lang^="zh"],
    &[lang^="zh-TW"] {
        --body-font: "Comfortaa", "Gen Jyuu Gothic Regular",
            "GenSenRounded TW R", sans-serif;
        --header-font: "Josefin Sans", "Noto Sans TC", sans-serif;
    }

    &[lang^="zh-CN"] {
        --body-font: "Comfortaa", "Gen Jyuu Gothic Regular", "JiangChengYuanTi", "Chiron GoRound TC",
            sans-serif;
        --header-font: "Josefin Sans", "Noto Sans SC", sans-serif;
    }
}

* {
    transition:
        background-color var(--transition),
        background-image var(--transition),
        box-shadow var(--transition);
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
    margin-left: 0.2em;
    margin-right: 0.2em;

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
</style>
