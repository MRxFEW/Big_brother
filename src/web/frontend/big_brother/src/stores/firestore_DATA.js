import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { db, auth } from '../firebase'
import api, { onAuthChange } from '../services/api'
import { doc, onSnapshot, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'

export const useUserStore = defineStore('user', () => {
  const loged = ref(false)
  const userID = ref('')
  const idToken = ref('')
  const buildClubId = ref('')
  const group = ref('')
  const currentGroup = ref(null) // Added preloaded group state
  const history = reactive({})
  const name = ref('')
  const timesVoted = reactive({})
  
  const fetchUserData = async (uidToFetch) => {
    const targetUid = uidToFetch || userID.value
    if (!targetUid) {
      console.log('You are not logged in')
      return
    }
    
    try {
      const userDocRef = doc(db, 'users', targetUid)
      const userSnap = await getDoc(userDocRef)
      
      if (userSnap.exists()) {
        const data = userSnap.data()
        userID.value = targetUid
        name.value = data.name || ''
        buildClubId.value = data.build_club_id || ''
        group.value = data.group || ''
        loged.value = true

        // AUTO-LOAD GROUP IF USER ALREADY HAS ONE
        if (data.group) {
          const groupDocRef = doc(db, 'group', data.group)
          const groupSnap = await getDoc(groupDocRef)
          if (groupSnap.exists()) {
            currentGroup.value = { id: groupSnap.id, ...groupSnap.data() }
          } else {
            currentGroup.value = null
          }
        } else {
          currentGroup.value = null
        }
      } else {
        console.log('No user document found')
      }
    } catch (err) {
      console.error('Failed to fetch user data', err)
    }
  }

  const signIn = async (email, password) => {
    if (!auth) throw new Error('Auth not initialized')
    const res = await signInWithEmailAndPassword(auth, email, password)
    userID.value = res.user.uid
    loged.value = true
    idToken.value = await res.user.getIdToken()
    await fetchUserData(userID.value)
    return res
  }

  const signUp = async (email, password) => {
    if (!auth) throw new Error('Auth not initialized')
    const res = await createUserWithEmailAndPassword(auth, email, password)
    userID.value = res.user.uid
    loged.value = true
    idToken.value = await res.user.getIdToken()
    return res
  }

  const apiSignup = async (payload) => {
    return api.signup(payload)
  }

  const apiCreateGroup = async (payload) => {
    return api.bigbro_create_group(payload)
  }

  const apiJoinGroup = async (payload) => {
    return api.bigbro_join_group(payload)
  }

  // Keep auth state in store across page loads
  onAuthChange(async (user) => {
    if (user) {
      loged.value = true
      userID.value = user.uid
      idToken.value = await user.getIdToken()
      await fetchUserData(user.uid)
    } else {
      loged.value = false
      userID.value = ''
      idToken.value = ''
      group.value = ''
      currentGroup.value = null
    }
  })

  return {
    loged,
    userID,
    buildClubId,
    group,
    currentGroup,
    history,
    name,
    timesVoted,
    idToken,
    fetchUserData,
    signIn,
    signUp,
    apiSignup,
    apiCreateGroup,
    apiJoinGroup,
  }
})

export const useUIStore = defineStore('ui', () => {
  const activePage = ref('home')
  return { activePage }
})

export const useGroupApi = () => {
  const userStore = useUserStore()

  const searchGroupByName = async (nameToFind) => {
    const q = query(collection(db, 'group'), where('name', '==', nameToFind))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }

  const createGroup = async (groupData) => {
    return await userStore.apiCreateGroup(groupData)
  }

  const joinGroup = async (groupData) => {
    return await userStore.apiJoinGroup(groupData)
  }

  return { searchGroupByName, createGroup, joinGroup }
}