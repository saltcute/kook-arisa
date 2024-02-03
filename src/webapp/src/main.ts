import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
// @ts-ignore
import Notifications from '@kyvg/vue3-notification'


import './assets/theme.css';
import './assets/main.css';

const app = createApp(App)

import { createI18n } from 'vue-i18n'
import enUS from './locale/en-US.json';
import zhCN from './locale/zh-CN.json';
import zhTW from './locale/zh-TW.json';

type i18nPattern = typeof enUS;
export const i18n = createI18n<[i18nPattern], "en-US" | "zh-CN" | "zh-TW">({
    legacy: false,
    fallbackLocale: "en-US",
    availableLocales: ["en-US", "zh-CN", "zh-TW", "ja"],
    messages: {
        "en-US": enUS,
        "zh-CN": zhCN,
        "zh-TW": zhTW
    }
})

app.use(i18n)
app.use(router)
app.use(Notifications)

app.mount('#app')
