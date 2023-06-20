import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
// @ts-ignore
import Notifications from '@kyvg/vue3-notification'

import './assets/theme.css';
import './assets/main.css';

const app = createApp(App)

app.use(router)
app.use(Notifications)

app.mount('#app')
