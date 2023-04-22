<script setup lang="ts">
import { RouterView } from 'vue-router'
import HeaderComponent from './components/Header.vue'
import FooterComponent from './components/Footer.vue';
</script>

<template>
    <HeaderComponent />
    <RouterView />
    <FooterComponent />
</template>
