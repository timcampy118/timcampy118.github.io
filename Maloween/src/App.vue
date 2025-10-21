<template>
  <div class="container">
    <div class="title">Draw the Logo from Memory</div>
    <div class="instruction">Draw it below, then export to see your drawing next to the real logo.</div>

    <LogoDraw
      :logo="currentLogo"
      :palette="currentLogo.palette"
      :bgColor="currentLogo.bg"
      @next="nextLogo"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import LogoDraw from './components/LogoDraw.vue';

/** Add/replace with your own logos */
const logos = [
  {
    name: 'MyAnimeList',
    src: '/logos/MAL_Favicon_2020.svg',
    bg: '#ffffff',
    palette: ['#000000', '#1e40af', '#4f46e5', '#8b5cf6', '#22c55e', '#ef4444', '#ffffff']
  },
  // Add more here later (Nike, Apple, etc).
];

const index = ref(0);
const currentLogo = ref(logos[index.value]);

function nextLogo() {
  index.value = (index.value + 1) % logos.length;
  currentLogo.value = logos[index.value];
}
</script>
