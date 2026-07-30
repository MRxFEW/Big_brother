import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useToastStore = defineStore('toast', () => {
  const errors = ref([])
  let nextId = 0

  const addError = (message, duration = 4000) => {
    const id = nextId++
    errors.value.push({ id, message })
    
    // Automatically remove the error after the duration
    setTimeout(() => {
      removeError(id)
    }, duration)
  }

  const removeError = (id) => {
    errors.value = errors.value.filter(e => e.id !== id)
  }

  return { errors, addError, removeError }
})