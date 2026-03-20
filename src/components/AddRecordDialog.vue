<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog">
      <!-- Dialog Title Bar -->
      <div class="dialog-titlebar">
        <span class="dialog-title">新增记录</span>
        <button class="close-btn" @click="$emit('close')"><i class="pi pi-times"></i></button>
      </div>

      <!-- Type Toggle -->
      <div class="type-toggle">
        <button :class="['type-btn', 'expense', { active: form.type === 'expense' }]" @click="form.type = 'expense'; form.categoryId = ''">
          支出
        </button>
        <button :class="['type-btn', 'income', { active: form.type === 'income' }]" @click="form.type = 'income'; form.categoryId = ''">
          收入
        </button>
      </div>

      <!-- Amount Input -->
      <div class="amount-section">
        <div class="amount-display">
          <span class="currency">¥</span>
          <span class="amount-text" :class="{ placeholder: !form.amount }">{{ form.amount || '0.00' }}</span>
        </div>
      </div>

      <!-- Numpad -->
      <div class="numpad">
        <button v-for="key in numpadKeys" :key="key" class="numpad-btn" @click="handleKey(key)">
          <span v-if="key === 'backspace'"><i class="pi pi-delete-left"></i></span>
          <span v-else>{{ key }}</span>
        </button>
      </div>

      <!-- Category -->
      <div class="field">
        <label>分类</label>
        <div class="cat-grid">
          <button
            v-for="cat in currentCategories"
            :key="cat.id"
            :class="['cat-chip', { active: form.categoryId === cat.id }]"
            :style="form.categoryId === cat.id ? { background: cat.color, color: '#fff', borderColor: cat.color } : { borderColor: cat.color + '66' }"
            @click="form.categoryId = cat.id"
          >
            <i :class="'pi ' + cat.icon"></i>
            <span>{{ cat.name }}</span>
          </button>
        </div>
      </div>

      <!-- Date & Note -->
      <div class="fields-row">
        <div class="field half">
          <label>日期</label>
          <input type="date" v-model="form.date" class="mac-input" />
        </div>
        <div class="field half">
          <label>备注</label>
          <input type="text" v-model="form.note" placeholder="可选" class="mac-input" maxlength="30" />
        </div>
      </div>

      <!-- Submit -->
      <button class="submit-btn" :disabled="!canSubmit" @click="submit">
        保存记录
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from '../store.js'

const emit = defineEmits(['close'])
const { state, addRecord } = useStore()

const today = new Date().toISOString().slice(0, 10)
const form = ref({
  type: 'expense',
  amount: '',
  categoryId: '',
  date: today,
  note: '',
})

const numpadKeys = ['7','8','9','4','5','6','1','2','3','.','0','backspace']

function handleKey(key) {
  if (key === 'backspace') {
    form.value.amount = form.value.amount.slice(0, -1)
    return
  }
  if (key === '.' && form.value.amount.includes('.')) return
  const parts = form.value.amount.split('.')
  if (parts[1] !== undefined && parts[1].length >= 2) return
  if (form.value.amount === '' && key === '.') { form.value.amount = '0.'; return }
  if (form.value.amount.length >= 10) return
  form.value.amount += key
}

const currentCategories = computed(() =>
  state.categories.filter(c => c.type === form.value.type)
)

const canSubmit = computed(() =>
  form.value.amount && parseFloat(form.value.amount) > 0 && form.value.categoryId && form.value.date
)

function submit() {
  if (!canSubmit.value) return
  addRecord({
    type: form.value.type,
    amount: parseFloat(form.value.amount),
    categoryId: form.value.categoryId,
    date: form.value.date,
    note: form.value.note.trim(),
  })
  emit('close')
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.35);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.15s ease;
}
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

.dialog {
  width: 360px;
  background: rgba(250,250,252,0.97);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  overflow: hidden;
  animation: slideUp 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 0;
}
@keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }

.dialog-titlebar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--mac-border);
}
.dialog-title { font-size: 15px; font-weight: 600; color: var(--mac-text); }
.close-btn {
  width: 24px; height: 24px; border: none; background: rgba(0,0,0,0.07);
  border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 11px; color: var(--mac-text-secondary);
}
.close-btn:hover { background: rgba(0,0,0,0.12); }

.type-toggle {
  display: flex; gap: 0;
  margin: 12px 16px 0;
  background: rgba(0,0,0,0.07);
  border-radius: 10px; padding: 3px;
}
.type-btn {
  flex: 1; padding: 7px; border: none; background: transparent;
  border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer;
  color: var(--mac-text-secondary); transition: all 0.15s;
}
.type-btn.active.expense { background: var(--mac-red); color: #fff; }
.type-btn.active.income { background: var(--mac-green); color: #fff; }

.amount-section {
  padding: 16px 16px 8px;
  text-align: center;
}
.amount-display {
  display: flex; align-items: baseline; justify-content: center; gap: 4px;
}
.currency { font-size: 22px; font-weight: 300; color: var(--mac-text-secondary); }
.amount-text {
  font-size: 42px; font-weight: 300; color: var(--mac-text);
  min-width: 2ch; letter-spacing: -1px;
}
.amount-text.placeholder { color: rgba(0,0,0,0.2); }

.numpad {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 1px; background: var(--mac-border);
  margin: 0 16px 12px;
  border-radius: 10px; overflow: hidden;
}
.numpad-btn {
  background: rgba(255,255,255,0.8);
  border: none; padding: 14px; font-size: 18px; font-weight: 300;
  cursor: pointer; color: var(--mac-text); transition: background 0.1s;
  display: flex; align-items: center; justify-content: center;
}
.numpad-btn:hover { background: rgba(0,0,0,0.06); }
.numpad-btn:active { background: rgba(0,0,0,0.12); }

.field { display: flex; flex-direction: column; gap: 5px; padding: 0 16px; }
.field label { font-size: 11px; font-weight: 600; color: var(--mac-text-secondary); text-transform: uppercase; letter-spacing: 0.4px; }

.cat-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.cat-chip {
  display: flex; align-items: center; gap: 4px;
  padding: 5px 10px; border-radius: 20px;
  border: 1px solid var(--mac-border);
  background: transparent; cursor: pointer;
  font-size: 11px; color: var(--mac-text); transition: all 0.15s;
}
.cat-chip i { font-size: 11px; }
.cat-chip.active { font-weight: 500; }

.fields-row { display: flex; gap: 10px; padding: 0 16px; margin-top: 10px; }
.field.half { flex: 1; padding: 0; }

.mac-input {
  padding: 8px 10px; border: 1px solid var(--mac-border);
  border-radius: 8px; font-size: 13px; color: var(--mac-text);
  background: rgba(255,255,255,0.8); outline: none;
  font-family: inherit; transition: border 0.15s; width: 100%;
}
.mac-input:focus { border-color: var(--mac-accent); }

.submit-btn {
  margin: 14px 16px 16px;
  padding: 12px;
  border: none; background: var(--mac-accent);
  color: #fff; border-radius: 10px;
  font-size: 14px; font-weight: 600;
  cursor: pointer; transition: opacity 0.15s;
}
.submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.submit-btn:not(:disabled):hover { opacity: 0.88; }
</style>
