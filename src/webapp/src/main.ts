import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
// @ts-ignore
import Notifications from '@kyvg/vue3-notification'

import './assets/fonts/JiangChengYuanTi/style.css';
import './assets/fonts/GenSenRounded/style.css';
import './assets/fonts/GenJyuuGothic/style.css';
import './assets/theme.css';

const app = createApp(App)

import { createI18n } from 'vue-i18n'
import enUS from './locale/en-US.json';
import enCA from './locale/en-CA.json';
import zhCN from './locale/zh-CN.json';
import zhTW from './locale/zh-TW.json';

type i18nPattern = typeof zhCN;
export const i18n = createI18n<[i18nPattern], "en-CA" | "en-US" | "zh-CN" | "zh-TW">({
    legacy: false,
    locale: navigator.language,
    formatFallbackMessages: true,
    fallbackLocale: {
        "zh-HK": ["zh-Hant"],
        "zh-MO": ["zh-Hant"],
        "zh-SG": ["zh-Hans"],
        "zh-MY": ["zh-Hans"],
        "zh-Hans": ["zh-CN"],
        "zh-Hant": ["zh-TW"],
        "zh-TW": ["zh-CN"],
        default: ["en-CA"],
    },
    messages: {
        "en-CA": enCA,
        "en-US": enUS,
        "zh-CN": zhCN,
        "zh-TW": zhTW
    }
})


import twemoji from 'twemoji';
app.directive('emoji', {
    updated(el: Element, { value }) {
        el.classList.add("twemoji");
        el.innerHTML = twemoji.parse(value)
    }
})


app.use(i18n)
app.use(router)
app.use(Notifications)

app.mount('#app')
