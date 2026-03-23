<template>
  <div class="wire-page">
    <div class="wire-header">
      <span class="wire-title"><i class="pi pi-send"></i> 电汇</span>
    </div>
    <div class="wire-body">
      <div class="wire-placeholder">
        <i class="pi pi-inbox"></i>
        <p class="wire-lead">电汇记账功能开发中</p>
        <p class="wire-sub">此处将用于录入与管理电汇类流水，与「资金」模块并列。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.wire-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--mac-bg);
  padding: 16px 20px;
}
.wire-header {
  flex-shrink: 0;
  margin-bottom: 16px;
}
.wire-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--mac-text);
  display: flex;
  align-items: center;
  gap: 8px;
}
.wire-title i { font-size: 18px; color: var(--mac-accent); }
.wire-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}
.wire-placeholder {
  text-align: center;
  max-width: 360px;
  color: var(--mac-text-secondary);
}
.wire-placeholder > i {
  font-size: 42px;
  display: block;
  margin-bottom: 16px;
  opacity: 0.45;
}
.wire-lead {
  font-size: 15px;
  font-weight: 600;
  color: var(--mac-text);
  margin: 0 0 8px;
}
.wire-sub {
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
}
</style>
