<template>
  <div class="dashboard-container p-4">
    
    <!-- Header Section -->
    <div class="dashboard-header flex justify-between items-center mb-5">
      <div>
        <span class="text-sm font-semibold text-blue-600 uppercase tracking-wider">Group Overview</span>
        <h1 class="text-3xl font-bold text-gray-900 m-0">{{ currentGroupName }}</h1>
        <p class="text-gray-500 m-0 mt-1">Real-time telemetry, session rankings, and activity analytics.</p>
      </div>
      <div class="flex gap-2">
        <Button label="Refresh Data" icon="pi pi-refresh" severity="secondary" outlined @click="refreshData" />
      </div>
    </div>

    <!-- Not in a group warning state -->
    <div v-if="!user.group" class="card p-4 mb-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700">
      <div class="flex items-center gap-2">
        <i class="pi pi-exclamation-triangle text-xl"></i>
        <span>You are not currently assigned to any group. Go to the Groups page to join or create one!</span>
      </div>
    </div>

    <template v-else>
      <!-- Metric Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
        
        <Card class="shadow-sm border-round">
          <template #content>
            <div class="flex justify-between items-start">
              <div>
                <span class="text-xs text-gray-500 font-bold uppercase">Total Members</span>
                <h3 class="text-2xl font-bold text-gray-800 my-1">{{ totalMembersCount }}</h3>
              </div>
              <div class="p-3 bg-blue-50 text-blue-600 border-round">
                <i class="pi pi-users text-xl"></i>
              </div>
            </div>
          </template>
        </Card>

        <Card class="shadow-sm border-round">
          <template #content>
            <div class="flex justify-between items-start">
              <div>
                <span class="text-xs text-gray-500 font-bold uppercase">Total Group Hours</span>
                <h3 class="text-2xl font-bold text-gray-800 my-1">{{ totalGroupHours }} hrs</h3>
              </div>
              <div class="p-3 bg-green-50 text-green-600 border-round">
                <i class="pi pi-clock text-xl"></i>
              </div>
            </div>
          </template>
        </Card>

        <Card class="shadow-sm border-round bg-blue-50">
          <template #content>
            <div class="flex justify-between items-start">
              <div>
                <span class="text-xs text-blue-600 font-bold uppercase">Top Performer</span>
                <h3 class="text-2xl font-bold text-blue-900 my-1">{{ topMember.name }}</h3>
                <span class="text-xs text-blue-700 font-medium">{{ topMember.hours }} hrs logged</span>
              </div>
              <div class="p-3 bg-blue-100 text-blue-700 border-round">
                <i class="pi pi-trophy text-xl"></i>
              </div>
            </div>
          </template>
        </Card>

        <Card class="shadow-sm border-round">
          <template #content>
            <div class="flex justify-between items-start">
              <div>
                <span class="text-xs text-gray-500 font-bold uppercase">Your Status</span>
                <h3 class="text-xl font-bold text-gray-800 my-1">{{ userActiveHours }} hrs</h3>
                <span class="text-xs text-green-600 font-medium">Rank #{{ userRank }} in group</span>
              </div>
              <div class="p-3 bg-purple-50 text-purple-600 border-round">
                <i class="pi pi-user text-xl"></i>
              </div>
            </div>
          </template>
        </Card>

      </div>

      <!-- Main Layout: Chart & Weekly Goals -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        
        <!-- Activity Chart Card (Takes 2 columns) -->
        <Card class="lg:col-span-2 shadow-sm border-round">
          <template #title>
            <div class="flex justify-between items-center text-lg">
              <span>Member Contribution Chart</span>
              <Badge value="Live telemetry" severity="info" />
            </div>
          </template>
          <template #content>
            <div style="position: relative; height: 320px; width: 100%;">
              <canvas ref="activityChartRef"></canvas>
            </div>
          </template>
        </Card>

        <!-- Weekly Goals & Quick Stats (Takes 1 column) -->
        <Card class="shadow-sm border-round">
          <template #title>
            <span class="text-lg">Weekly Goal Progress</span>
          </template>
          <template #content>
            <div class="flex flex-col gap-4">
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-medium text-gray-700">Group Target (100 hrs)</span>
                  <span class="font-bold text-blue-600">{{ totalGroupHours }} / 100 hrs</span>
                </div>
                <ProgressBar :value="groupGoalPercentage" :showValue="false" style="height: 8px;" />
              </div>

              <div class="border-top-1 surface-border pt-3 mt-2">
                <h4 class="text-sm font-bold text-gray-700 mb-2">Recent Activity Highlights</h4>
                <ul class="list-none p-0 m-0 flex flex-col gap-3">
                  <li v-for="(act, index) in recentActivities" :key="index" class="flex items-center gap-2 text-sm">
                    <i class="pi pi-check-circle text-green-500"></i>
                    <span class="text-gray-600"><strong>{{ act.name }}</strong> logged session time.</span>
                  </li>
                  <li v-if="recentActivities.length === 0" class="text-xs text-gray-400">No recent activity updates.</li>
                </ul>
              </div>
            </div>
          </template>
        </Card>

      </div>

      <!-- Member Table Card -->
      <Card class="shadow-sm border-round">
        <template #title>
          <div class="text-lg">Detailed Member Rankings</div>
        </template>
        <template #content>
          <DataTable :value="memberList" responsiveLayout="scroll" stripedRows paginator :rows="5" class="p-datatable-sm">
            <Column field="name" header="Member Name" sortable>
              <template #body="slotProps">
                <div class="flex items-center gap-2">
                  <Avatar :label="slotProps.data.name.charAt(0).toUpperCase()" shape="circle" class="bg-primary text-white font-bold text-xs" />
                  <span>{{ slotProps.data.name }}</span>
                  <Badge v-if="slotProps.data.uid === user.userID" value="You" severity="success" class="text-xs ml-1" />
                </div>
              </template>
            </Column>
            <Column field="total_time" header="Total Time (hrs)" sortable>
              <template #body="slotProps">
                <span class="font-bold text-gray-800">{{ slotProps.data.total_time }} hrs</span>
              </template>
            </Column>
            <Column field="total_time_week" header="Weekly Time (hrs)" sortable>
              <template #body="slotProps">
                {{ slotProps.data.total_time_week || 0 }} hrs
              </template>
            </Column>
            <Column field="last_active" header="Last Active">
              <template #body="slotProps">
                <span class="text-gray-500 text-sm">{{ slotProps.data.last_active || 'Recently' }}</span>
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>
    </template>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useUserStore } from '../stores/firestore_DATA'
import Chart from 'chart.js/auto'

// PrimeVue components registration assumed global or auto-imported via plugin, 
// keeping imports clean for Vue 3 setup
const user = useUserStore()
const activityChartRef = ref(null)
let chartInstance = null

const currentGroupName = computed(() => {
  return user.currentGroup?.name || user.group || 'Unnamed Group'
})

const memberList = computed(() => {
  if (!user.currentGroup || !user.currentGroup.member) return []
  return Object.entries(user.currentGroup.member).map(([uid, data]) => ({
    uid,
    name: data.name || 'Unknown',
    total_time: data.total_time || 0,
    total_time_week: data.total_time_week || 0,
    last_active: data.last_active || 'Active'
  })).sort((a, b) => b.total_time - a.total_time)
})

const totalMembersCount = computed(() => memberList.value.length)

const totalGroupHours = computed(() => {
  return memberList.value.reduce((acc, m) => acc + (m.total_time || 0), 0)
})

const groupGoalPercentage = computed(() => {
  const goal = 100 // target threshold
  const percentage = (totalGroupHours.value / goal) * 100
  return Math.min(Math.round(percentage), 100)
})

const topMember = computed(() => {
  if (memberList.value.length === 0) return { name: 'None', hours: 0 }
  const top = memberList.value[0]
  return { name: top.name, hours: top.total_time }
})

const userActiveHours = computed(() => {
  const current = memberList.value.find(m => m.uid === user.userID)
  return current ? current.total_time : 0
})

const userRank = computed(() => {
  const index = memberList.value.findIndex(m => m.uid === user.userID)
  return index !== -1 ? index + 1 : '-'
})

const recentActivities = computed(() => {
  return memberList.value.slice(0, 3).map(m => ({ name: m.name }))
})

const refreshData = async () => {
  if (user.userID) {
    await user.fetchUserData(user.userID)
  }
}

const renderChart = () => {
  if (!activityChartRef.value) return

  const labels = memberList.value.map(m => m.name)
  const dataValues = memberList.value.map(m => m.total_time)

  if (chartInstance) {
    chartInstance.destroy()
  }

  chartInstance = new Chart(activityChartRef.value, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Hours Logged',
        data: dataValues,
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: '#f3f4f6' }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  })
}

onMounted(() => {
  nextTick(() => {
    renderChart()
  })
})

watch(() => user.currentGroup, () => {
  nextTick(() => {
    renderChart()
  })
}, { deep: true })
</script>

<style scoped>
.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
}
</style>