import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import SettingsView from '../views/SettingsView.vue';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView
        },
        {
            path: '/settings',
            name: 'settings',
            component: SettingsView
        },
        {
            path: '/admin',
            name: 'admin',
            component: () => import('../views/AdminView.vue')
        }
    ]
})

export default router
