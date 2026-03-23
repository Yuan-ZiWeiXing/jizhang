<template>
  <div class="lock-overlay">
    <div class="lock-titlebar">
      <div class="lock-titlebar-left"></div>
      <div class="lock-titlebar-title">紫微星记账工具</div>
      <div class="mac-controls">
        <span class="mac-btn mac-minimize" @click="$emit('minimize')" title="最小化"></span>
        <span class="mac-btn mac-maximize" @click="$emit('maximize')" title="最大化"></span>
        <span class="mac-btn mac-close" @click="$emit('close')" title="关闭"></span>
      </div>
    </div>

    <div class="lock-body">
      <div class="lock-card">
        <div class="lock-icon">
          <i class="pi pi-lock"></i>
        </div>

        <!-- Set new password -->
        <template v-if="mode === 'setup'">
          <h2 class="lock-heading">设置锁屏密码</h2>
          <p class="lock-sub">首次使用，请设置密码</p>
          <form @submit.prevent="handleSetPassword" class="lock-form">
            <Password
              v-model="newPw"
              placeholder="输入密码"
              :feedback="false"
              toggleMask
              class="lock-input"
              inputClass="lock-input-inner"
              @keydown.enter.prevent
            />
            <Password
              v-model="confirmPw"
              placeholder="确认密码"
              :feedback="false"
              toggleMask
              class="lock-input"
              inputClass="lock-input-inner"
            />
            <p v-if="errMsg" class="lock-err">{{ errMsg }}</p>
            <Button type="submit" label="确认设置" icon="pi pi-check" class="lock-btn" />
          </form>
        </template>

        <!-- Unlock -->
        <template v-else>
          <h2 class="lock-heading">已锁定</h2>
          <p class="lock-sub">请输入密码解锁</p>
          <form @submit.prevent="handleUnlock" class="lock-form">
            <Password
              ref="pwInput"
              v-model="password"
              placeholder="输入密码"
              :feedback="false"
              toggleMask
              class="lock-input"
              inputClass="lock-input-inner"
            />
            <p v-if="errMsg" class="lock-err">{{ errMsg }}</p>
            <Button type="submit" label="解锁" icon="pi pi-lock-open" class="lock-btn" />
          </form>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import Password from 'primevue/password'
import Button from 'primevue/button'

const props = defineProps({
  hasPassword: { type: Boolean, default: false },
})

const emit = defineEmits(['unlocked', 'minimize', 'maximize', 'close'])

const mode = ref(props.hasPassword ? 'unlock' : 'setup')
const password = ref('')
const newPw = ref('')
const confirmPw = ref('')
const errMsg = ref('')
const pwInput = ref(null)

onMounted(async () => {
  await nextTick()
  if (pwInput.value?.$el) {
    const input = pwInput.value.$el.querySelector('input')
    if (input) input.focus()
  }
})

async function handleSetPassword() {
  errMsg.value = ''
  if (!newPw.value || newPw.value.length < 4) {
    errMsg.value = '密码至少4位'
    return
  }
  if (newPw.value !== confirmPw.value) {
    errMsg.value = '两次密码不一致'
    return
  }
  await window.api.setLockPassword(newPw.value)
  emit('unlocked')
}

async function handleUnlock() {
  errMsg.value = ''
  if (!password.value) {
    errMsg.value = '请输入密码'
    return
  }
  const ok = await window.api.verifyLockPassword(password.value)
  if (ok) {
    emit('unlocked')
  } else {
    errMsg.value = '密码错误'
    password.value = ''
  }
}
</script>

<style scoped>
.lock-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  background: var(--mac-bg);
  border-radius: 12px;
  overflow: hidden;
}

.lock-titlebar {
  height: 40px;
  background: var(--mac-titlebar-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--mac-border);
  display: flex;
  align-items: center;
  padding: 0 12px;
  flex-shrink: 0;
  user-select: none;
  -webkit-app-region: drag;
}
.lock-titlebar-left { flex: 1; }
.lock-titlebar-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--mac-text);
  letter-spacing: -0.2px;
}
.mac-controls {
  flex: 1;
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  -webkit-app-region: no-drag;
}
.mac-btn {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: block;
  cursor: pointer;
  transition: opacity 0.15s;
  position: relative;
}
.mac-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.15s;
  background-size: 8px 8px;
  background-repeat: no-repeat;
  background-position: center;
}
.mac-controls:hover .mac-btn::after { opacity: 1; }
.mac-minimize { background: #febc2e; border: 1px solid #d4a029; }
.mac-minimize::after { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Crect x='0' y='3.5' width='8' height='1' fill='%23985a00' rx='0.5'/%3E%3C/svg%3E"); }
.mac-maximize { background: #28c840; border: 1px solid #1aab2e; }
.mac-maximize::after { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M1 1h6v6H1z' fill='none' stroke='%23006500' stroke-width='1'/%3E%3C/svg%3E"); }
.mac-close { background: #ff5f57; border: 1px solid #e0443e; }
.mac-close::after { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cline x1='1' y1='1' x2='7' y2='7' stroke='%238b0000' stroke-width='1.2' stroke-linecap='round'/%3E%3Cline x1='7' y1='1' x2='1' y2='7' stroke='%238b0000' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E"); }

.lock-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lock-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 48px;
  background: var(--mac-surface);
  border-radius: 16px;
  box-shadow: var(--shadow-md);
  min-width: 340px;
}

.lock-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--mac-selected);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}
.lock-icon i {
  font-size: 28px;
  color: var(--mac-accent);
}

.lock-heading {
  font-size: 20px;
  font-weight: 600;
  color: var(--mac-text);
  margin-bottom: 6px;
}

.lock-sub {
  font-size: 13px;
  color: var(--mac-text-secondary);
  margin-bottom: 24px;
}

.lock-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  align-items: center;
}

.lock-input {
  width: 100%;
}
:deep(.lock-input-inner) {
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--mac-border);
  font-size: 14px;
  outline: none;
  background: #fff;
  transition: border-color 0.2s;
}
:deep(.lock-input-inner:focus) {
  border-color: var(--mac-accent);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
}

.lock-err {
  color: var(--mac-red);
  font-size: 12px;
  margin: -4px 0;
}

.lock-btn {
  width: 100%;
  margin-top: 4px;
  justify-content: center;
}
</style>
