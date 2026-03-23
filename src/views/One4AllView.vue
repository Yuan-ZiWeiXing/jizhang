<template>
  <div class="o4a-page">
    <div class="o4a-header">
      <span class="o4a-title"><i class="pi pi-th-large"></i> One4All</span>
    </div>
    <div class="o4a-body">
      <div class="o4a-placeholder">
        <i class="pi pi-inbox"></i>
        <p class="o4a-lead">One4All 记账功能开发中</p>
        <p class="o4a-sub">此处将用于录入与管理 One4All 类流水，与「资金」「电汇」模块并列。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.o4a-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--mac-bg);
  padding: 16px 20px;
}
.o4a-header {
  flex-shrink: 0;
  margin-bottom: 16px;
}
.o4a-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--mac-text);
  display: flex;
  align-items: center;
  gap: 8px;
}
.o4a-title i { font-size: 18px; color: var(--mac-accent); }
.o4a-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}
.o4a-placeholder {
  text-align: center;
  max-width: 360px;
  color: var(--mac-text-secondary);
}
.o4a-placeholder > i {
  font-size: 42px;
  display: block;
  margin-bottom: 16px;
  opacity: 0.45;
}
.o4a-lead {
  font-size: 15px;
  font-weight: 600;
  color: var(--mac-text);
  margin: 0 0 8px;
}
.o4a-sub {
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
}
</style>
