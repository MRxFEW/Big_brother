import { createApp } from 'vue'

import { createPinia } from 'pinia'

import './style.css'

import './firebase'

import App from './App.vue'

// PrimeVue

import Card from 'primevue/card'

import DataTable from 'primevue/datatable'

import Column from 'primevue/column'

import ProgressBar from 'primevue/progressbar'

import Badge from 'primevue/badge'

import Avatar from 'primevue/avatar'

import Button from 'primevue/button'

import InputText from 'primevue/inputtext'

import Toolbar from 'primevue/toolbar'

import Dialog from 'primevue/dialog'

import PrimeVue from 'primevue/config'

import 'primevue/resources/themes/saga-blue/theme.css' //theme

import 'primevue/resources/primevue.min.css' //core CSS

import 'primeicons/primeicons.css' //icons

import 'primeflex/primeflex.css' // css utility

const app = createApp(App)

app.use(createPinia())

app.use(PrimeVue, { ripple: true })



app.component('Card', Card)

app.component('DataTable', DataTable)

app.component('Column', Column)

app.component('ProgressBar', ProgressBar)

app.component('Badge', Badge)

app.component('Avatar', Avatar)

app.component('Button', Button)

app.component('InputText', InputText)

app.component('Toolbar', Toolbar)
app.component('Dialog', Dialog)
app.mount('#app')