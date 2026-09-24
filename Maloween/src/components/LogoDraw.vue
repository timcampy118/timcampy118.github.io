<template>
  <div class="card">
    <div class="header">
      <strong>Draw the {{ logo.name }} logo</strong>
      <button class="btn" @click="$emit('next')">Next logo</button>
    </div>

    <div class="canvas-wrapper">
      <canvas
        ref="canvas"
        class="canvas"
        @mousedown="start"
        @mousemove="move"
        @mouseup="end"
        @mouseleave="end"
        @touchstart.prevent="start"
        @touchmove.prevent="move"
        @touchend.prevent="end"
      ></canvas>
    </div>

    <div class="toolbar">
      <div class="tools">
        <label class="tool">
          Width
          <input type="range" min="1" max="36" v-model.number="brushSize" />
        </label>

        <div class="colors">
          <button
            v-for="c in palette"
            :key="c"
            class="color"
            :style="{ background: c, border: c === '#ffffff' ? '1px solid #333' : 'none' }"
            :aria-label="`Pick ${c}`"
            @click="brushColor = c"
          />
        </div>
      </div>

      <div class="actions">
        <button class="btn" @click="clear">Clear</button>
        <button class="btn primary" @click="exportComparison">Export</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps({
  logo: {
    type: Object,
    required: true // { name, src, bg, palette }
  },
  palette: {
    type: Array,
    default: () => ['#000000', '#ffffff']
  },
  bgColor: { type: String, default: '#ffffff' }
});

const canvas = ref(null);
let ctx = null;

const drawing = ref(false);
const last = ref({ x: 0, y: 0 });
const brushColor = ref('#000000');
const brushSize  = ref(6);

let dpr = 1;
const logoImg = new Image();
logoImg.crossOrigin = 'anonymous';

function setupCanvasForLogo() {
  if (!canvas.value || !logoImg.naturalWidth) return;

  const w = logoImg.naturalWidth;
  const h = logoImg.naturalHeight;

  // DPR-aware backing store
  dpr = window.devicePixelRatio || 1;
  canvas.value.width  = Math.round(w * dpr);
  canvas.value.height = Math.round(h * dpr);
  canvas.value.style.width  = w + 'px';
  canvas.value.style.height = h + 'px';

  ctx = canvas.value.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale once
  // Fill background
  ctx.fillStyle = props.bgColor || '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // Brush defaults
  applyBrush();
}

function applyBrush() {
  if (!ctx) return;
  ctx.strokeStyle = brushColor.value;
  ctx.lineWidth = brushSize.value;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function posFromEvent(e) {
  const rect = canvas.value.getBoundingClientRect();
  if (e.touches?.length) {
    const t = e.touches[0];
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function start(e) {
  drawing.value = true;
  last.value = posFromEvent(e);
}

function move(e) {
  if (!drawing.value) return;
  const p = posFromEvent(e);
  ctx.beginPath();
  ctx.moveTo(last.value.x, last.value.y);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  last.value = p;
}

function end() { drawing.value = false; }

function clear() {
  const w = canvas.value.width / dpr;
  const h = canvas.value.height / dpr;
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);
  ctx.restore();
  ctx.fillStyle = props.bgColor || '#ffffff';
  ctx.fillRect(0, 0, w, h);
}

watch([brushColor, brushSize], applyBrush);

watch(
  () => props.logo,
  (l) => {
    // load new logo, then size canvas to match
    logoImg.onload = () => setupCanvasForLogo();
    logoImg.src = l.src;
    // default brush color
    brushColor.value = props.palette?.[0] || '#000000';
  },
  { immediate: true }
);

onMounted(() => {
  window.addEventListener('resize', applyBrush, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', applyBrush);
});

/** Try to estimate top padding inside the SVG’s paint area and nudge for visual centering. */
function estimateTopPadding(img, targetW, targetH) {
  try {
    const tmp = document.createElement('canvas');
    tmp.width = targetW;
    tmp.height = targetH;
    const tctx = tmp.getContext('2d');
    // Draw fully centered (no nudge) then scan for first non-empty row
    const scale = Math.min(targetW / img.naturalWidth, targetH / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const ox = (targetW - dw) / 2;
    const oy = (targetH - dh) / 2;
    tctx.clearRect(0, 0, targetW, targetH);
    tctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, ox, oy, dw, dh);
    const { data } = tctx.getImageData(0, 0, targetW, targetH);

    // scan rows top -> bottom; count how many fully-transparent rows first
    let firstOpaqueRow = -1;
    for (let y = 0; y < targetH; y++) {
      const rowStart = y * targetW * 4;
      let rowOpaque = false;
      for (let x = 0; x < targetW; x++) {
        const a = data[rowStart + x * 4 + 3];
        if (a > 0) { rowOpaque = true; break; }
      }
      if (rowOpaque) { firstOpaqueRow = y; break; }
    }
    if (firstOpaqueRow <= 0) return 0;

    const topPad = firstOpaqueRow - 0; // pixels of empty space above
    // Nudge upward by half of that pad so visual mass centers better
    return -Math.min(topPad / 2, targetH * 0.12); // cap the correction
  } catch {
    return 0;
  }
}

function exportComparison() {
  const halfW = canvas.value.width / dpr;
  const halfH = canvas.value.height / dpr;
  const gap = 14;

  const outW = halfW * 2 + gap;
  const outH = halfH;

  const out = document.createElement('canvas');
  const outCtx = out.getContext('2d');
  const pr = window.devicePixelRatio || 1;
  out.width = Math.round(outW * pr);
  out.height = Math.round(outH * pr);
  out.style.width = outW + 'px';
  out.style.height = outH + 'px';
  outCtx.setTransform(pr, 0, 0, pr, 0, 0);

  // Background to clearly split halves (like Neal.fun)
  outCtx.fillStyle = '#333';
  outCtx.fillRect(0, 0, outW, outH);

  // Left + Right white panels
  outCtx.fillStyle = '#fff';
  outCtx.fillRect(0, 0, halfW, halfH);
  outCtx.fillRect(halfW + gap, 0, halfW, halfH);

  // Divider
  outCtx.strokeStyle = '#bfbfbf';
  outCtx.lineWidth = 2;
  outCtx.beginPath();
  outCtx.moveTo(halfW + gap / 2, 0);
  outCtx.lineTo(halfW + gap / 2, halfH);
  outCtx.stroke();

  // User drawing (ensure we copy 1:1 logical pixels)
  outCtx.drawImage(
    canvas.value,
    0, 0, halfW * dpr, halfH * dpr,   // source in backing store
    0, 0, halfW, halfH                // dest logical
  );

  // Logo (fit + true centering, with optional auto nudge)
  const s = Math.min(halfW / logoImg.naturalWidth, halfH / logoImg.naturalHeight);
  const drawW = logoImg.naturalWidth * s;
  const drawH = logoImg.naturalHeight * s;
  const startX = halfW + gap;
  let offsetX = startX + (halfW - drawW) / 2;
  let offsetY = (halfH - drawH) / 2;

  // Try to compensate SVG’s internal top padding (if present)
  offsetY += estimateTopPadding(logoImg, Math.round(halfW), Math.round(halfH));

  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';
  outCtx.drawImage(logoImg, 0, 0, logoImg.naturalWidth, logoImg.naturalHeight, offsetX, offsetY, drawW, drawH);

  // Download
  const url = out.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `${props.logo.name.replace(/\s+/g,'_')}_comparison.png`;
  a.click();
}
</script>

<style scoped>
.card {
  background: var(--card);
  border-radius: 6px;
  box-shadow: 0 12px 28px var(--shadow);
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--card);
  border-bottom: 1px solid #eee;
}

.canvas-wrapper {
  position: relative;
  width: 400px;
  height: 400px;
  max-width: 100%;
  margin: 18px auto 8px;

  background: #fff;
  border: 3px solid #e5e7eb; /* clearer boundary (neutral gray) */
  border-radius: 8px;

  display: flex;
  align-items: center;
  justify-content: center;

  box-shadow: none; /* remove misleading inset line */
}


.canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  touch-action: none;
  border-radius: 6px; /* slightly smaller than wrapper for clean corners */
}

.toolbar {
  background: var(--card);
  padding: 15px; /* from original toolbar spacing */ /*  */
  border-top: 1px solid #eee;
  display: grid; grid-template-columns: 1fr auto; gap: 12px;
}

.tools { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.tool { font-size: 14px; display: flex; align-items: center; gap: 8px; }

.colors { display: flex; gap: 10px; }
.color {
  width: 32px; height: 32px; border-radius: 50%;
  cursor: pointer; display: inline-block;
} /* color dots inspired by Neal’s color UI */ /*  */

.actions { display: flex; gap: 8px; align-items: center; }

.btn {
  appearance: none; border: 1px solid #ddd; background: #fff;
  padding: 8px 12px; border-radius: 4px; cursor: pointer; font-weight: 700;
}
.btn.primary { background-color: #05c46b; border-color: #05c46b; color: #fff; } /*  */
.btn:hover { filter: brightness(0.98); }
</style>
