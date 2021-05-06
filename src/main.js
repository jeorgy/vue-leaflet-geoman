import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify';
import * as Vue2Leaflet from 'vue2-leaflet'
import { Icon } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import IconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import IconUrl from 'leaflet/dist/images/marker-icon.png'
import ShadowUrl from 'leaflet/dist/images/marker-shadow.png'

// this part resolve an issue where the markers would not appear
delete Icon.Default.prototype._getIconUrl

Icon.Default.mergeOptions({
  iconRetinaUrl: IconRetinaUrl,
  iconUrl: IconUrl,
  shadowUrl: ShadowUrl,
})

Vue.config.productionTip = false

Vue.use(Vue2Leaflet)

new Vue({
  vuetify,
  render: h => h(App)
}).$mount('#app')
