import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { installTauriBridge } from '../shared/tauriBridge';

installTauriBridge();
createApp(App).use(createPinia()).mount('#app');
