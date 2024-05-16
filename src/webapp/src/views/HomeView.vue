<script setup lang="ts">
import Dashboard from '../components/control/Dashboard.vue';
import Profile from '../components/control/Profile.vue';
</script>

<template>
    <main class="container">
        <Dashboard />
        <Profile />
    </main>
</template>

<style scoped lang="scss">
.container {
    display: grid;
    grid-template-columns: 3fr 17em;
    grid-template-rows: 13em 3fr;
    gap: 1em 1em;
    grid-auto-flow: row;
    grid-template-areas:
        "dashboard profile"
        "dashboard playlist";
}

@media screen and (max-aspect-ratio: 1/1),
screen and (max-height: 500px) {
    .container {
        height: unset;
        grid-template-columns: auto;
        grid-template-rows: auto auto auto;
        grid-template-areas:
            "profile"
            "dashboard"
            "playlist";

        .dashboard {
            .lyrics {
                max-height: 35vh;
            }
        }
    }
}
</style>