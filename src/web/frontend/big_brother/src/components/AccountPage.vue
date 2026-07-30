<template>
  <section class="page-card">
    <div class="page-header p-mb-3">
      <p class="eyebrow">Account</p>
      <h2 v-if="!user.loged">Sign in or create an account</h2>
      <h2 v-else>Manage your profile</h2>
    </div>

    <div v-if="!user.loged" class="auth-panel p-fluid">
      <div class="p-mb-3">
        <Button label="Login" class="p-button-text p-mr-2" @click="mode = 'login'" :disabled="mode==='login'" />
        <Button label="Create account" class="p-button-text" @click="mode = 'create'" :disabled="mode==='create'" />
      </div>

      <div v-if="mode==='login'">
        <label>Email</label>
        <InputText v-model="email" type="email" />
        <label class="p-mt-2">Password</label>
        <InputText v-model="password" type="password" />
        <div class="p-mt-3">
          <Button label="Sign in" @click="doSignIn" />
        </div>
        <p v-if="error" class="p-text-danger">{{ error }}</p>
      </div>

      <div v-else>
        <label>Name</label>
        <InputText v-model="createName" type="text" />
        <label class="p-mt-2">Email</label>
        <InputText v-model="createEmail" type="email" />
        <label class="p-mt-2">Password</label>
        <InputText v-model="createPassword" type="password" />
        <label class="p-mt-2">Club ID</label>
        <InputText v-model="clubId" type="text" />
        <label class="p-mt-2">Department (optional)</label>
        <InputText v-model="department" type="text" />

        <label class="p-mt-2">Face image (clear, frontal)</label>
        <input type="file" accept="image/*" @change="onFile" class="p-mb-2" />
        <div v-if="previewUrl" class="p-mb-2"><img :src="previewUrl" alt="preview" style="max-width:200px"/></div>
        <div class="p-mt-1">
          <em v-if="encodingInProgress">Checking image...</em>
          <span v-else-if="encoderMessage" :class="statusClass">{{ encoderMessage }}</span>
        </div>

        <div class="p-mt-3">
          <Button label="Create account" @click="doCreate" />
        </div>
        <p v-if="error" class="p-text-danger">{{ error }}</p>
        <p v-if="creating" class="p-text-success">Creating account... please wait</p>
      </div>
    </div>

    <div v-else class="account-layout p-d-flex p-flex-column">
      <div class="profile-panel p-d-flex p-ai-center">
        <div class="avatar p-mr-3">{{ initials }}</div>
        <div>
          <h3>{{ user.name || 'User' }}</h3>
          <p>User ID: {{ user.userID }}</p>
        </div>
      </div>
      <div class="p-mt-3">
        <Button label="Sign out" class="p-button-secondary" @click="signOut" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useUserStore, useUIStore } from '../stores/firestore_DATA'
import { encodeImageFile } from '../lib/faceEncoder'
import { useToastStore } from '../stores/toastStore'
const toast = useToastStore()
const user = useUserStore()
const ui = useUIStore()

const mode = ref('login')
const email = ref('')
const password = ref('')
const error = ref('')

const createName = ref('')
const createEmail = ref('')
const createPassword = ref('')
const clubId = ref('')
const department = ref('')
const selectedFile = ref(null)
const previewUrl = ref('')
const creating = ref(false)

const encodingInProgress = ref(false)
const encoderMessage = ref('')
const encoderSuccess = ref(false)
const lastDescriptor = ref(null)

const doSignIn = async () => {
  try {
    await user.signIn(email.value, password.value)
    await user.fetchUserData()
    ui.activePage = 'home'
  } catch (err) {
    toast.addError(err.message || 'Failed to sign in')
  }
}

const onFile = async (e) => {
  const f = e.target.files && e.target.files[0]
  encoderMessage.value = ''
  encoderSuccess.value = false
  lastDescriptor.value = null
  if (!f) return
  selectedFile.value = f
  previewUrl.value = URL.createObjectURL(f)

  encodingInProgress.value = true
  try {
    const descriptor = await encodeImageFile(f)
    if (!descriptor || !Array.isArray(descriptor) || descriptor.length < 64) {
      encoderMessage.value = 'Face detected but encoding invalid. Try another photo.'
      encoderSuccess.value = false
    } else {
      encoderMessage.value = 'Face encoding successful.'
      encoderSuccess.value = true
      lastDescriptor.value = descriptor
    }
  } catch (err) {
    encoderMessage.value = err.message || String(err)
    encoderSuccess.value = false
    toast.addError(err.message || 'Failed to process image')
  } finally {
    encodingInProgress.value = false
  }
}

const doCreate = async () => {
  if (!createEmail.value || !createPassword.value || !clubId.value) {
   toast.addError('Email, password and club ID are required')
    return
  }
  if (!selectedFile.value) {
   toast.addError('Please upload a face photo')
    return
  }

  const descriptor = lastDescriptor.value
  if (!descriptor) {
    toast.addError('Face not encoded yet or encoding invalid. Please re-select a clearer photo.')
    return
  }

  creating.value = true
  try {
    const payload = {
      email: createEmail.value,
      password: createPassword.value,
      build_club_id: clubId.value,
      buildClubId: clubId.value,
      name: createName.value,
      department: department.value || '',
      encoded_face: descriptor,
    }

    await user.apiSignup(payload)
    await user.signIn(createEmail.value, createPassword.value)
    await user.fetchUserData()
    ui.activePage = 'home'
  } catch (err) {
    console.error(err)
    toast.addError(err.message || String(err))
  } finally {
    creating.value = false
  }
}

const signOut = () => {
  user.loged = false
  user.userID = ''
  ui.activePage = 'home'
}

const statusClass = computed(() => {
  if (!encoderMessage.value) return ''
  return encoderSuccess.value ? 'encoder-feedback success' : 'encoder-feedback error'
})

const initials = computed(() => {
  if (!user.name) return 'U'
  return user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
})
</script>
