<script setup>
import { computed } from 'vue'
import { useUIStore } from './stores/firestore_DATA'
import HomePage from './components/HomePage.vue'
import AccountPage from './components/AccountPage.vue'
import AboutPage from './components/AboutPage.vue'
import DashboardPage from './components/DashboardPage.vue'
import GroupsPage from './components/GroupsPage.vue'
import ErrorPopup from './components/ErrorPopup.vue'
const ui = useUIStore()

const pages = [
  { key: 'home', label: 'Home', component: HomePage },
  { key: 'dashboard', label: 'Dashboard', component: DashboardPage },
  { key: 'groups', label: 'Groups', component: GroupsPage },
  { key: 'account', label: 'Account', component: AccountPage },
  { key: 'about', label: 'About', component: AboutPage }
]

const currentPage = computed(() => pages.find((page) => page.key === ui.activePage))
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div>
        <p class="brand">Big Brother</p>
        <h1>Control center</h1>
      </div>
      <nav class="nav-links" aria-label="Primary navigation">
        <button
          v-for="page in pages"
          :key="page.key"
          class="nav-btn"
          :class="{ active: ui.activePage === page.key }"
          @click="ui.activePage = page.key"
        >
          {{ page.label }}
        </button>
      </nav>
    </header>

    <main class="content-area">
      <component :is="currentPage.component" />
    </main>
  </div>
</template>
