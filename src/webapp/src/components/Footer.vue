<script setup lang="ts"></script>

<template>
    <footer>
        <i18n-t keypath="desc.footer.license" tag="label" for="desc.footer.MIT">
            <span>© 2023-2024 saltcute</span>
            <a
                href="https://github.com/saltcute/kook-arisa/blob/main/LICENSE"
                target="_blank"
            >
                {{ $t("desc.footer.MIT") }}
            </a>
        </i18n-t>
    </footer>
</template>

<style scoped>
footer {
    height: 3em;
    padding-left: 2em;
    padding-right: 2em;
}
</style>
