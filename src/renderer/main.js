import Vue from 'vue'
import axios from 'axios'

import App from './App'
import router from './router'
import store from './store'
import iView from '../../node_modules/iview';
import '../../node_modules/iview/dist/styles/iview.css';
import '../../static/css/main.css';

import { ipcRenderer } from 'electron';

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
Vue.http = Vue.prototype.$http = axios
Vue.config.productionTip = false
Vue.use(iView);
/* eslint-disable no-new */
new Vue({
  components: { App },
  router,
  store,
  render: h => h(App),
}).$mount('#app')

