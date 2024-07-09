<script setup lang="ts">
import Dashboard from "../components/cards/Dashboard.vue";
import Profile from "../components/cards/Profile.vue";
</script>

<template>
    <main class="container">
        <Dashboard />
        <Profile />
    </main>
</template>

<style lang="scss">
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

@media screen and (max-aspect-ratio: 1/1), screen and (max-height: 500px) {
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

.container > article {
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
