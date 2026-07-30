import { getFunctions, httpsCallable } from 'firebase/functions'
import { auth } from '../firebase'
import { getAuth, onAuthStateChanged } from 'firebase/auth'

const functions = getFunctions()

function callable(name) {
  return httpsCallable(functions, name)
}

export async function signup(payload) {
  const fn = callable('signup')
  const res = await fn(payload)
  return res.data
}

export async function bigbroGet(payload) {
  const fn = callable('bigbro_get')
  const res = await fn(payload)
  return res.data
}

export async function bigbroPost(payload) {
  const fn = callable('bigbro_post')
  const res = await fn(payload)
  return res.data
}

export async function createGroup(payload) {
  const fn = callable('bigbro_create_group')
  const res = await fn(payload)
  return res.data
}

export async function joinGroup(payload) {
  const fn = callable('bigbro_join_group')
  const res = await fn(payload)
  return res.data
}

export function onAuthChange(cb) {
  const a = getAuth()
  return onAuthStateChanged(a, cb)
}

export default {
  signup,
  bigbroGet,
  bigbroPost,
  createGroup,
  joinGroup,
  bigbro_create_group: createGroup, // <-- Add this alias
  bigbro_join_group: joinGroup,     // <-- Add this alias
  onAuthChange,
}
