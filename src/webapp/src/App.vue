<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ref } from 'vue';
import HeaderComponent from './components/Header.vue'
import FooterComponent from './components/Footer.vue';
import SearchNetease from './components/cards/SearchNetease.vue';

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
