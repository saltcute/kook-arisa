<script setup lang="ts">
import Dashboard from '../components/cards/Dashboard.vue';
import Profile from '../components/cards/Profile.vue';
</script>

<template>
    <main class="container">
        <Dashboard />
        <Profile />
    </main>
</template>

<style>
main {
    padding-top: 2em;
    padding-bottom: 2em;
}

.container {
    max-width: 100vw;
    width: 90vw;
    margin-left: 5vw;
    margin-right: 5vw;
    height: calc(100vh - 6em);
    display: grid;
    grid-template-columns: 3fr 17em;
    grid-template-rows: 13em 3fr;
    gap: 1em 1em;
    grid-auto-flow: row;
    grid-template-areas:
        "dashboard profile"
        "dashboard playlist";
}

.container>article {
    margin: 0px;
}

.dashboard {
    grid-area: dashboard;
}

.profile {
    grid-area: profile;
}

.playlist {
    grid-area: playlist;
}
</style>