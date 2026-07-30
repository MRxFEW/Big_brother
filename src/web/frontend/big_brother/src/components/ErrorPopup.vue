<script setup>
import { useToastStore } from '../stores/toastStore'

const toastStore = useToastStore()
</script>

<template>
  <div class="toast-container" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="error in toastStore.errors"
        :key="error.id"
        class="toast-error"
      >
        <span>{{ error.message }}</span>
        <button class="close-btn" @click="toastStore.removeError(error.id)" aria-label="Close error">
          &times;
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none; /* Allows clicking through the container */
}

.toast-error {
  background-color: #fee2e2;
  border-left: 4px solid #ef4444;
  color: #991b1b;
  padding: 16px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 300px;
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: auto; /* Re-enables clicking on the toast itself */
}

.close-btn {
  background: transparent;
  border: none;
  color: #991b1b;
  font-size: 20px;
  cursor: pointer;
  margin-left: 16px;
  padding: 0 4px;
  line-height: 1;
}

/* Vue TransitionGroup Classes */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(50px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.9);
}
</style>