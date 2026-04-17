<template>
  <section class="content-card">
    <header v-if="title || subtitle || $slots.header" class="content-card__header">
      <div>
        <h3 v-if="title" class="content-card__title">{{ title }}</h3>
        <p v-if="subtitle" class="content-card__subtitle">{{ subtitle }}</p>
      </div>
      <slot name="header" />
    </header>
    <slot />
  </section>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' }
})
</script>
