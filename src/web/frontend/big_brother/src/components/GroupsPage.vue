<template>
  <section class="page-card">
    <div class="page-header p-mb-4">
      <p class="eyebrow">Groups</p>
      <h2>Manage your groups</h2>
      <p>Organize people, rooms, or teams into clear groups for easier monitoring and communication.</p>
    </div>

    <!-- Logged Out State -->
    <div v-if="!user.loged" class="p-p-3">
      <div class="p-message p-message-info">
        <div class="p-message-wrapper">
          <span class="p-message-text">
            You are not signed in. Please 
            <Button link label="sign in" class="p-p-0 p-ml-1 p-mr-1" @click="goToAccount" /> 
            to manage or join groups.
          </span>
        </div>
      </div>
    </div>

    <!-- Logged In State -->
    <div v-else class="groups-layout">
      
      <!-- Toolbar for Search and Create Actions -->
      <Toolbar class="p-mb-4" v-if="!activeGroup">
        <template #start>
          <span class="p-input-icon-left p-mr-2">
            <i class="pi pi-search" />
            <InputText 
              v-model="search" 
              placeholder="Search group by name" 
              @keyup.enter="doSearch"
              @input="searchPerformed = false" 
            />
          </span>
          <Button 
            label="Search" 
            icon="pi pi-search" 
            :loading="loadingSearch" 
            @click="doSearch" 
          />
        </template>
        <template #end>
          <Button 
            label="Create Group" 
            icon="pi pi-plus" 
            severity="success" 
            @click="showCreate = true" 
          />
        </template>
      </Toolbar>

      <!-- Group Search Results Grid -->
      <div v-if="!activeGroup && results.length > 0" class="p-grid p-formgrid grid" style="display: flex; gap: 16px; flex-wrap: wrap;">
        <Card v-for="g in results" :key="g.id" style="width: 300px;">
          <template #title>{{ g.name || g.id }}</template>
          <template #subtitle>
            Members: {{ (g.member && Object.keys(g.member).length) || 0 }}
          </template>
          <template #footer>
            <Button 
              :label="isUserInThisGroup(g) ? 'View Group' : 'Join & View'" 
              :icon="isUserInThisGroup(g) ? 'pi pi-eye' : 'pi pi-sign-in'" 
              :severity="isUserInThisGroup(g) ? 'secondary' : 'primary'"
              :loading="loadingJoinId === g.id"
              @click="handleJoinGroup(g)" 
            />
          </template>
        </Card>
      </div>

      <!-- Empty State / Not Found -->
      <div v-if="!activeGroup && searchPerformed && results.length === 0" style="text-align: center; padding: 3rem 1rem; background: #f9fafb; border-radius: 8px; border: 1px dashed #dee2e6; margin-top: 1rem;">
        <i class="pi pi-search p-mb-3" style="font-size: 2.5rem; color: #6c757d;"></i>
        <h3 style="margin-top: 0; color: #343a40;">No groups found</h3>
        <p style="color: #6c757d; margin-bottom: 1.5rem;">We couldn't find an exact match for "<strong>{{ search }}</strong>".</p>
        <Button label="Create this group" icon="pi pi-plus" severity="secondary" outlined @click="createFromSearch" />
      </div>

      <!-- Active Group Members View -->
      <div v-else-if="activeGroup" class="active-group-view">
        <div class="p-d-flex p-jc-between p-ai-center p-mb-3" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3>{{ activeGroup.name || activeGroup.id }} - Members</h3>
          <Button 
            label="Back to Search" 
            icon="pi pi-arrow-left" 
            severity="secondary" 
            text 
            @click="activeGroup = null" 
          />
        </div>

        <DataTable 
          :value="activeGroupMembers" 
          responsiveLayout="scroll" 
          stripedRows
          class="p-datatable-sm"
        >
          <template #empty>
            No members found in this group.
          </template>
          <Column field="uid" header="User ID"></Column>
          <Column field="name" header="Name">
            <template #body="slotProps">
              {{ slotProps.data.name || 'Unknown' }}
            </template>
          </Column>
          <Column field="last_active" header="Last Active">
            <template #body="slotProps">
              {{ slotProps.data.last_active || 'Never' }}
            </template>
          </Column>
          <Column field="total_time" header="Total Time">
             <template #body="slotProps">
              {{ slotProps.data.total_time || 0 }}
            </template>
          </Column>
          <Column field="total_time_week" header="Weekly Time">
            <template #body="slotProps">
              {{ slotProps.data.total_time_week || 0 }}
            </template>
          </Column>
        </DataTable>
      </div>

      <!-- Create Group Dialog -->
      <Dialog 
        v-model:visible="showCreate" 
        header="Create New Group" 
        :modal="true" 
        class="p-fluid" 
        style="width: 400px"
      >
        <div class="p-field p-mt-2">
          <label for="groupName" style="display:block; margin-bottom: 8px;">Group Name</label>
          <InputText id="groupName" v-model="newGroupName" autofocus @keyup.enter="createGroup" />
        </div>
        <template #footer>
          <Button label="Cancel" icon="pi pi-times" text severity="secondary" @click="showCreate = false" />
          <Button label="Create" icon="pi pi-check" :loading="loadingCreate" @click="createGroup" />
        </template>
      </Dialog>

    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore, useUIStore, useGroupApi } from '../stores/firestore_DATA'
import { useToastStore } from '../stores/toastStore'

const user = useUserStore()
const ui = useUIStore()
const { searchGroupByName, createGroup: apiCreate, joinGroup: apiJoin } = useGroupApi()
const toast = useToastStore()

const search = ref('')
const results = ref([])
const showCreate = ref(false)
const newGroupName = ref('')
const searchPerformed = ref(false)

// AUTO-SET ACTIVE GROUP: Check if store already preloaded the group
const activeGroup = ref(user.currentGroup || null)

const loadingSearch = ref(false)
const loadingCreate = ref(false)
const loadingJoinId = ref(null)

const goToAccount = () => {
  ui.activePage = 'account'
}

// Automatically sync if store updates later
onMounted(() => {
  if (!activeGroup.value && user.group) {
    // Fallback fetch if store hasn't populated it yet
    fetchUserGroup()
  }
})

const fetchUserGroup = async () => {
  try {
    const { doc, getDoc } = await import('firebase/firestore')
    const { db } = await import('../stores/firestore_DATA') // adjust path if needed
    const snap = await getDoc(doc(db, 'group', user.group))
    if (snap.exists()) {
      activeGroup.value = { id: snap.id, ...snap.data() }
    }
  } catch (err) {
    console.error(err)
  }
}

const doSearch = async () => {
  if (!search.value) return
  results.value = []
  searchPerformed.value = false
  loadingSearch.value = true

  try {
    results.value = await searchGroupByName(search.value)
    searchPerformed.value = true
  } catch (err) {
    toast.addError(err.message || 'Failed to search for groups')
  } finally {
    loadingSearch.value = false
  }
}

const createFromSearch = () => {
  newGroupName.value = search.value
  showCreate.value = true
}

const createGroup = async () => {
  if (!newGroupName.value) return
  loadingCreate.value = true
  
  try {
    const id = await apiCreate({ name: newGroupName.value })
    const createdName = newGroupName.value
    newGroupName.value = ''
    showCreate.value = false
    
    user.group = id // Update local store state to match Firestore schema
    
    activeGroup.value = {
      id,
      name: createdName,
      member: {
        [user.userID]: {
          name: user.name || 'User',
          department: user.department || 'stats',
          encode_face: user.encoded_face || [],
          time_logged: {},
          total_time: 0,
          total_time_week: 0
        }
      },
      last_active: {
        [user.userID]: new Date().toLocaleString()
      }
    }
  } catch (err) {
    const errorMsg = err.message.includes('already-exists') || err.message.includes('already exists')
      ? 'A group with this name already exists.'
      : (err.message || 'Failed to create group')
    toast.addError(errorMsg)
  } finally {
    loadingCreate.value = false
  }
}

// Simple check matching user.group string value
const isUserInThisGroup = (group) => {
  return user.group === group.id || user.group === group.name
}

const handleJoinGroup = async (group) => {
  if (!user.userID) {
    toast.addError('User session not found. Please log in again.')
    return
  }

  loadingJoinId.value = group.id
  try {
    if (!isUserInThisGroup(group)) {
      // Pass both group_id and build_club_id to match backend expectations
      const groupApi = useGroupApi()
      await groupApi.joinGroup({ 
        group_id: group.id, 
        build_club_id: user.userID 
      })
      user.group = group.id 
    }

    if (!group.member) {
      group.member = {}
    }
    
    if (!group.member[user.userID]) {
      group.member[user.userID] = {
        name: user.name || '',
        department: user.department || null,
        encode_face: user.encoded_face || [],
        time_logged: {},
        total_time: 0,
        total_time_week: 0
      }
    }

    activeGroup.value = group
  } catch (err) {
    console.error('Join group error:', err)
    toast.addError(err.message || 'Failed to join the group')
  } finally {
    loadingJoinId.value = null
  }
}

const activeGroupMembers = computed(() => {
  if (!activeGroup.value || !activeGroup.value.member) return []
  
  return Object.entries(activeGroup.value.member).map(([uid, data]) => ({
    uid,
    ...data
  }))
})
</script>

<style scoped>
.p-field {
  margin-bottom: 1rem;
}
</style>