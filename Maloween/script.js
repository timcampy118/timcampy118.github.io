let fillMode = false;
let logoPreview;
const TOTAL_ROUNDS = 10;
const PANEL_GAP = 20;
const PANEL_PADDING = 24;
const BG_PAGE = "#f1f2f6";
const PANEL_BG = "#ffffff";
let usedNames = new Set();
let rerolledThisRound = false;
let currentScale = 1
let rerollBtn;
let rerollCount = 0;
const dpr = window.devicePixelRatio || 1;
const uniquePrompts = [];
const seenNames = new Set();
const results = Array(TOTAL_ROUNDS).fill(null);

window.addEventListener("DOMContentLoaded", () => {
    rerollBtn = document.getElementById("rerollBtn");
    if (rerollBtn) rerollBtn.addEventListener("click", handleReroll);

    const easyModeToggle = document.getElementById("easyModeToggle");
    easyModeToggle.checked = false;
    const easyModeBtn = document.getElementById("easyModeBtn");

    const easyIndicator = document.createElement("div");
    easyIndicator.className = "easy-indicator";
    easyIndicator.textContent = "EASY MODE ON";
    document.body.appendChild(easyIndicator);

    easyModeBtn.addEventListener("click", () => {
        if (!easyModeToggle.checked) {
            const popup = document.createElement("div");
            popup.className = "easy-popup";
            popup.innerHTML = `
      <div class="popup-box">
        <h3>Enable Easy Mode?</h3>
        <p>This will show the reference image while you draw.</p>
        <div>
          <button id="confirmEasy">Yes, enable</button>
          <button id="cancelEasy">Cancel</button>
        </div>
      </div>
    `;
            document.body.appendChild(popup);
            popup.querySelector("#confirmEasy").addEventListener("click", () => {
                popup.remove();
                easyModeToggle.checked = true;
                easyModeBtn.classList.add("active");
                easyIndicator.classList.add("visible");
                playSfx("click");
                updateLogoPreview();
                updateCanvasLayout();
            });
            popup.querySelector("#cancelEasy").addEventListener("click", () => {
                popup.remove();
                playSfx("click");
            });

        } else {
            easyModeToggle.checked = false;
            easyModeBtn.classList.remove("active");
            easyIndicator.classList.remove("visible");
            playSfx("click");

            updateLogoPreview();
            updateCanvasLayout();
        }
    });

    logoPreview = document.createElement("div");
    logoPreview.className = "logo-preview";
    const container = document.querySelector(".canvas-container");
    if (container) container.appendChild(logoPreview);
});
for (const p of prompts || []) {
    if (p && !seenNames.has(p.name)) {
        seenNames.add(p.name);
        uniquePrompts.push(p);
    }
}
const shuffled = uniquePrompts.sort(() => Math.random() - 0.5);
const selectedPrompts = shuffled.slice(0, TOTAL_ROUNDS);
let remainingPrompts = shuffled.slice(TOTAL_ROUNDS);
const globalPalette = [
    "#000000", "#1e40af", "#4f46e5", "#22c55e", "#ef4444", "#ffffff"
];

let current = 0;
let drawing = false;
let lastX = 0, lastY = 0;
let brushColor = "#000000";
let brushSize = 6;

const roundDims = Array(TOTAL_ROUNDS).fill(null);
const logoImg = new Image(); logoImg.crossOrigin = "anonymous";


const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");
const brushWidthInput = document.getElementById("brushWidth");
const clearBtn = document.getElementById("clearBtn");
const nextBtn = document.getElementById("nextBtn");
const backBtn = document.getElementById("backBtn");
const colorPicker = document.getElementById("colorPicker");
const logoLabel = document.getElementById("logoLabel");
const currentNum = document.getElementById("currentNum");

const signatureCanvas = document.getElementById("signatureCanvas");
const sigCtx = signatureCanvas.getContext("2d");
const clearSigBtn = document.getElementById("clearSig");

const finalOverlay = document.getElementById("finalOverlay");
const finalCanvas = document.getElementById("finalCanvas");
const downloadAllBtn = document.getElementById("downloadAllBtn");

/* Modal */
const finishModal = document.getElementById("finishModal");
const finishConfirm = document.getElementById("finishConfirm");
const finishCancel = document.getElementById("finishCancel");

class SFX {
    constructor(){ this.ctx = null; }
    _ctx(){ if(!this.ctx){ this.ctx = new (window.AudioContext||window.webkitAudioContext)(); } return this.ctx; }
    _beep({freq=600, dur=0.08, type='square', vol=0.2, sweep=null}){
        const ctx=this._ctx();
        const o=ctx.createOscillator(); const g=ctx.createGain();
        o.type=type; o.frequency.value=freq; g.gain.value=0;
        o.connect(g).connect(ctx.destination);
        const now=ctx.currentTime;

        const a=0.005, d=0.03, s=0.15, r=0.06;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(vol, now+a);
        g.gain.linearRampToValueAtTime(vol*s, now+a+d);
        g.gain.exponentialRampToValueAtTime(0.0001, now+dur+r);
        if(sweep){
            o.frequency.setValueAtTime(sweep.start, now);
            o.frequency.exponentialRampToValueAtTime(sweep.end, now+dur);
        }
        o.start(now); o.stop(now+dur+r+0.02);
    }
    click(){ this._beep({freq:700, dur:0.06, type:'square', vol:0.15}); }
    back(){ this._beep({dur:0.09, type:'square', vol:0.15, sweep:{start:600, end:380}}); }
    finish(){ this._beep({dur:0.16, type:'triangle', vol:0.18, sweep:{start:520, end:900}}); }
    woosh(){ this._beep({dur:0.12, type:'sawtooth', vol:0.12, sweep:{start:500+Math.random()*200, end:900+Math.random()*200}}); }
}
const sfx = new SFX();
function playSfx(name){
    try{
        if(name==='woosh') sfx.woosh();
        else if(name==='click') sfx.click();
        else if(name==='back') sfx.back();
        else if(name==='finish') sfx.finish();
    }catch(e){}
}
window.addEventListener("load", () => {
    setupSignaturePad();
    setupRoundUI();
    setupDrawEvents();
});
function syncCanvasAndLogoSize() {
    if (!logoPreview) return;
    logoPreview.style.width = canvas.style.width;
    logoPreview.style.height = canvas.style.height;
}
if (easyModeToggle) {
    easyModeToggle.addEventListener("change", () => {
        const prompt = selectedPrompts[current];
        if (easyModeToggle.checked) {
            playSfx("click");
            logoPreview.classList.add("visible");
            logoPreview.innerHTML = `<img src="${prompt.logo}" alt="Reference Logo">`;
        } else {
            playSfx("click");
            logoPreview.classList.remove("visible");
            logoPreview.innerHTML = "";
        }
        updateCanvasLayout();
    });
}



function updateLogoPreview() {
    const prompt = selectedPrompts?.[current];
    const container = document.querySelector(".canvas-container");

    if (!container || !logoPreview) return;
    if (easyModeToggle?.checked) {
        container.classList.remove("single");
        container.classList.add("easy-mode");
    } else {
        container.classList.remove("easy-mode");
        container.classList.add("single");
    }

    if (easyModeToggle?.checked && prompt?.src) {
        logoPreview.innerHTML = `<img crossOrigin="anonymous" src="${prompt.src}" alt="${prompt.name || 'Reference Logo'}">`;
        showEyedropperHint();
        buildPalette(prompt.palette);
        const logoImgEl = logoPreview.querySelector("img");
        logoImgEl.onload = () => enableImageColorPicker();
    } else {
        logoPreview.innerHTML = "";
    }
}


function enableImageColorPicker() {
  const logoImgEl = logoPreview.querySelector("img");
  if (!logoImgEl) return;

  logoImgEl.crossOrigin = "anonymous";
  logoImgEl.onclick = null;

  logoImgEl.addEventListener("contextmenu", e => e.preventDefault());
  logoImgEl.addEventListener("touchstart", e => e.preventDefault(), { passive: false });

  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  showEyedropperHint(isTouch);

  let preview = document.querySelector(".color-preview");
  if (!preview) {
    preview = document.createElement("div");
    preview.className = "color-preview";
    document.body.appendChild(preview);
  }

  const getDrawnBox = () => {
    const rect = logoImgEl.getBoundingClientRect();
    const iw = logoImgEl.naturalWidth || logoImgEl.width;
    const ih = logoImgEl.naturalHeight || logoImgEl.height;
    const ir = iw / ih;
    const er = rect.width / rect.height;
    let drawW, drawH;
    if (ir > er) { drawW = rect.width; drawH = rect.width / ir; }
    else { drawH = rect.height; drawW = rect.height * ir; }
    const offsetX = (rect.width - drawW) / 2;
    const offsetY = (rect.height - drawH) / 2;
    return { rect, iw, ih, drawW, drawH, offsetX, offsetY };
  };

  const getPixelColor = (clientX, clientY) => {
    const { rect, iw, ih, drawW, drawH, offsetX, offsetY } = getDrawnBox();
    const lx = clientX - rect.left - offsetX;
    const ly = clientY - rect.top - offsetY;
    if (lx < 0 || ly < 0 || lx >= drawW || ly >= drawH) return null;
    const scaleX = iw / drawW;
    const scaleY = ih / drawH;
    const x = Math.floor(lx * scaleX);
    const y = Math.floor(ly * scaleY);
    const sampleCanvas = document.createElement("canvas");
    const ctxSampler = sampleCanvas.getContext("2d", { willReadFrequently: true });
    sampleCanvas.width = iw;
    sampleCanvas.height = ih;
    try {
      ctxSampler.drawImage(logoImgEl, 0, 0, iw, ih);
      const pixel = ctxSampler.getImageData(x, y, 1, 1).data;
      return rgbToHex(pixel[0], pixel[1], pixel[2]);
    } catch { return null; }
  };

  if (!isTouch) {
    let ctrlPressed = false;
    window.addEventListener("keydown", e => { if (e.key === "Control") ctrlPressed = true; });
    window.addEventListener("keyup", e => {
      if (e.key === "Control") { ctrlPressed = false; preview.style.display = "none"; }
    });

    logoImgEl.addEventListener("mousemove", e => {
      if (!ctrlPressed) { preview.style.display = "none"; return; }
      const color = getPixelColor(e.clientX, e.clientY);
      if (!color) { preview.style.display = "none"; return; }
      preview.style.background = color;
      preview.style.left = e.clientX + 20 + "px";
      preview.style.top  = e.clientY + 20 + "px";
      preview.style.display = "block";
    });

    logoImgEl.addEventListener("mouseleave", () => preview.style.display = "none");
    logoImgEl.addEventListener("click", (e) => {
  if (!ctrlPressed && !('ontouchstart' in window)) return; // keep desktop ctrl behavior

  const hex = getPixelColor(e.clientX, e.clientY);
  if (!hex) return;

  setBrushColor(hex);
  if (window.pickr) pickr.setColor(hex);
  playSfx("woosh");
  preview.style.display = "none";

  // 🔹 Remove active highlight from all swatches
  document.querySelectorAll("#colorPicker .color.active").forEach(btn => {
    btn.classList.remove("active");
  });
});
  }

  else {
    logoImgEl.addEventListener("click", e => {
      const hex = getPixelColor(e.clientX, e.clientY);
      if (!hex) return;
      setBrushColor(hex);
      const customBtn = document.getElementById("customColor");
      if (customBtn) markActiveColor(customBtn);
      if (window.pickr) pickr.setColor(hex);
      playSfx("woosh");

      // small flash feedback
      preview.style.background = hex;
      preview.style.left = e.clientX + "px";
      preview.style.top = e.clientY + "px";
      preview.style.display = "block";
      setTimeout(() => preview.style.display = "none", 300);
    });
  }
}

function showMobileEyedropperHint() {
    let hint = document.querySelector(".mobile-eyedropper-hint");
    if (!hint) {
        hint = document.createElement("div");
        hint.className = "mobile-eyedropper-hint";
        hint.textContent = "Tap a color to pick it!";
        document.body.appendChild(hint);
    }
    hint.classList.add("visible");
}
function hideMobileEyedropperHint() {
    const hint = document.querySelector(".mobile-eyedropper-hint");
    if (hint) hint.remove();
}


function showEyedropperHint() {
  let hint = document.querySelector(".eyedropper-hint");
  if (!hint) {
    hint = document.createElement("div");
    hint.className = "eyedropper-hint";
    document.body.appendChild(hint);
  }

  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  hint.textContent = isTouch
    ? "Touch the picture to pick a color"
    : "Hold CTRL to pick colors from the picture";

  hint.classList.add("visible");
  clearTimeout(hint._hideTimer);
  hint._hideTimer = setTimeout(() => hint.classList.remove("visible"), 5000);
}





function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
}

function setupRoundUI() {
    const prompt = selectedPrompts[current];

    logoLabel.textContent = prompt.prompt;
    clearCanvas();

    rerolledThisRound = false;
    if (rerollBtn) rerollBtn.disabled = false;

    updateLogoPreview();
    updateCanvasLayout();
    syncCanvasAndLogoSize();

    logoImg.onload = () => {
        const w = logoImg.naturalWidth;
        const h = logoImg.naturalHeight;
        roundDims[current] = { w, h };

        const maxW = Math.min(window.innerWidth - 40, w);
        const scale = maxW / w;
        currentScale = scale;
        canvas.width = w * scale * dpr;
        canvas.height = h * scale * dpr;
        canvas.style.width = maxW + "px";
        canvas.style.height = h * scale + "px";
        ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);

        logoPreview.style.width = maxW + "px";
        logoPreview.style.height = h * scale + "px";

        ctx.fillStyle = selectedPrompts[current].bg;
        ctx.fillRect(0, 0, w, h);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = brushColor;

        ctx.lineWidth = Number(brushWidthInput.value);
        brushSize = Number(brushWidthInput.value);


        if (results[current] && results[current].drawing) {
            restoreDrawing(results[current].drawing, w, h);
        }

        buildPalette(prompt.palette);
        nextBtn.textContent = current === TOTAL_ROUNDS - 1 ? "Finish" : "Next";
        backBtn.disabled = current === 0;
        updateCanvasLayout();
    };


    currentNum.textContent = current+1;
    logoImg.src = selectedPrompts[current].src;
}
function saveCurrentRound() {
    const drawingURL = canvas.toDataURL("image/png");
    results[current] = {
        prompt: { ...selectedPrompts[current] },
        drawing: drawingURL
    };
}
function loadImage(src) {
    return new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
    });
}
function drawRoundedRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
}
function drawContain(ctx, img, x, y, w, h) {
    const ir = img.width / img.height;
    const cr = w / h;
    let dw = w, dh = h;
    if (ir > cr) { dh = w / ir; } else { dw = h * ir; }
    const dx = x + (w - dw) / 2;
    const dy = y + (h - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
}
window.addEventListener("beforeunload", () => {
    saveCurrentRound();
});

/***************
 * PALETTE + CUSTOM COLOR (Pickr)
 ***************/
let pickr;
let sigDpr = window.devicePixelRatio || 1;
let signing = false, sx = 0, sy = 0;
function normalizeHex(hex){
    if(!hex) return null;
    let h = hex.toLowerCase();
    if(h.startsWith('#')) h = h.slice(1);
    if(h.length===3) h = h.split('').map(c=>c+c).join('');
    if(h.length===8) h = h.slice(0,6);
    return '#'+h;
}
function markActiveColor(el){
    document.querySelectorAll("#colorPicker .color").forEach(b=>b.classList.remove("active"));
    if(el) el.classList.add("active");
}
function buildPalette(palette) {
    colorPicker.innerHTML = "";
    const swatches = palette && palette.length ? palette : globalPalette;

    swatches.forEach(c => {
        const btn = document.createElement("button");
        btn.className = "color" + (c === "#ffffff" ? " white" : "");
        btn.style.background = c;
        btn.addEventListener("click", () => {
            setBrushColor(c);
            markActiveColor(btn);
            playSfx("woosh");
        });
        colorPicker.appendChild(btn);
    });

    const custom = document.createElement("button");
    custom.id = "customColor";
    custom.className = "color custom";
    custom.title = "🎨 Custom color";
    custom.textContent = "🎨";
    colorPicker.appendChild(custom);

    if (pickr) pickr.destroyAndRemove();
    if (window.innerWidth > 700) {
        pickr = Pickr.create({
            el: '#customColor',
            theme: 'classic',
            default: brushColor,
            components: {
                preview: true, opacity: true, hue: true,
                interaction: { hex: true, rgba: true, input: true, save: true, clear: true }
            }
        });}else {
            document.getElementById("customColor").disabled = true;
        }

    pickr.on('init', (instance) => {
        const button = instance.getRoot().button;
        button.style.borderRadius = '50%';
    });

    pickr.on('change', (color) => {
        const hex = color.toHEXA().toString();
        setBrushColor(hex);
        const button = pickr.getRoot().button;
        button.style.background = hex;
    });

    pickr.on('save', (color) => {
        const hex = color ? color.toHEXA().toString() : brushColor;
        setBrushColor(hex);
        markActiveColor(custom);
        playSfx('woosh');
        pickr.hide();
        const button = pickr.getRoot().button;
        button.style.background = hex;
    });
    pickr.on('hide', (instance) => {
      const currentColor = pickr.getColor()?.toHEXA().toString() || brushColor;
      const button = pickr.getRoot().button;

      button.style.background = currentColor;
      button.style.borderRadius = '50%';
      const indicator = document.getElementById('currentColorIndicator');
      if (indicator) indicator.style.background = currentColor;
    });


    const brushHex = normalizeHex(brushColor);
    let matched = false;
    [...colorPicker.querySelectorAll('.color')].forEach(btn => {
        const bg = btn.id === 'customColor'
        ? normalizeHex(brushHex)
        : normalizeHex(rgbStrToHex(getComputedStyle(btn).backgroundColor) || btn.style.background);
        if (btn.id !== 'customColor' && normalizeHex(btn.style.background) === brushHex) {
            matched = true;
            markActiveColor(btn);
        }
    });
    if (!matched) {
        custom.style.background = brushHex;
        custom.style.color = getReadableTextColor(brushHex);
        markActiveColor(custom);
    }
}

function rgbStrToHex(rgb){
    if(!rgb || !rgb.startsWith('rgb')) return null;
    const parts = rgb.match(/(\d+),\s*(\d+),\s*(\d+)/);
    if(!parts) return null;
    const [_, r,g,b] = parts;
    const toHex = n => ('0'+parseInt(n,10).toString(16)).slice(-2);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function setBrushColor(c) {
    brushColor = normalizeHex(c) || c;
    ctx.strokeStyle = brushColor;
    const bubble = document.getElementById('customColor');
    if (bubble) {
        bubble.style.background = brushColor;
        bubble.style.color = getReadableTextColor(brushColor);
    }
    const indicator = document.getElementById('currentColorIndicator');
    if (indicator) indicator.style.background = brushColor;
}

function getReadableTextColor(hex) {
    const m = (hex||'').replace('#',''); if(m.length<6) return '#000';
    const r = parseInt(m.slice(0,2),16);
    const g = parseInt(m.slice(2,4),16);
    const b = parseInt(m.slice(4,6),16);
    const L = 0.299*r + 0.587*g + 0.114*b;
    return L > 160 ? '#000' : '#fff';
}
function getPixelAt(data, x, y, w) {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
}
function floodFill(xCss, yCss, fillHex) {
    const w = canvas.width;
    const h = canvas.height;
    const fx = Math.floor(xCss * dpr);
    const fy = Math.floor(yCss * dpr);

    if (fx < 0 || fy < 0 || fx >= w || fy >= h) return;

    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const target = getPixelAt(data, fx, fy, w);
    const fill = hexToRgb(fillHex).concat(255);

    if (colorsMatch(target, fill)) return;

    const stack = [[fx, fy]];
    const visited = new Uint8Array(w * h);
    while (stack.length) {
        const [x, y] = stack.pop();
        if (x < 0 || x >= w || y < 0 || y >= h) continue;
        const idx = y * w + x;
        if (visited[idx]) continue;

        const off = idx * 4;
        const cur = [data[off], data[off + 1], data[off + 2], data[off + 3]];
        if (!colorsMatch(cur, target)) continue;

        data[off]     = fill[0];
        data[off + 1] = fill[1];
        data[off + 2] = fill[2];
        data[off + 3] = 255;

        visited[idx] = 1;
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    ctx.putImageData(imageData, 0, 0);
}
function updateCanvasLayout() {
    const container = document.querySelector(".canvas-container");
    const logoBox = logoPreview;
    if (!container) return;

    if (easyModeToggle.checked) {
        logoBox.classList.add("visible");
        container.classList.remove("single");
    } else {
        logoBox.classList.remove("visible");
        container.classList.add("single");
    }
}

function colorsMatch(a, b, tolerance = 20) {
    return Math.abs(a[0] - b[0]) < tolerance &&
        Math.abs(a[1] - b[1]) < tolerance &&
        Math.abs(a[2] - b[2]) < tolerance;
}
function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
let drawEventsInitialized = false;
function setupDrawEvents() {
    if (drawEventsInitialized) return;
    drawEventsInitialized = true;

    document.body.addEventListener('touchmove', e => {
        if (e.target === canvas) e.preventDefault();
    }, { passive: false });

    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDraw);
    canvas.addEventListener("mouseleave", stopDraw);
    canvas.addEventListener("touchstart", startDraw, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", stopDraw, { passive: false });


    brushWidthInput.addEventListener("input", () => {
        brushSize = Number(brushWidthInput.value);
        ctx.lineWidth = brushSize * dpr;
    });

    ctx.lineWidth = Number(brushWidthInput.value) * dpr;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    clearBtn.addEventListener("click", () => { playSfx("click"); clearCanvas(); });
    nextBtn.addEventListener("click", handleNextClick);
    backBtn.addEventListener("click", () => { playSfx("back"); handleBack(); });

    downloadAllBtn.addEventListener("click", () => {
        playSfx("click");

        results.forEach((r, i) => {
            if (!r) {
                console.warn(`⚠️ Round ${i}: no saved result`);
                return;
            }
            const src = r.prompt?.src;
            if (!src) console.error(`❌ Round ${i}: src is undefined/null`, r.prompt);
            else if (src === "null") console.error(`❌ Round ${i}: src is literally 'null'`, r.prompt);
        });

        showFinalComposite();
    });

    function hasSignature(canvas) {
        const ctx = canvas.getContext("2d");
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            if (r !== 255 || g !== 255 || b !== 255) return true;
        }
        return false;
    }

    finishConfirm.addEventListener("click", () => {
        if (!hasSignature(signatureCanvas)) {
            playSfx("error");
            alert("✍️ Please sign your name before finishing!");
            return;
        }

        playSfx("finish");
        closeFinishModal();
        showFinalComposite();
    });

    finishCancel.addEventListener("click", () => { playSfx("back"); closeFinishModal(); });
    finishModal.addEventListener("click", (e) => {
        if (e.target === finishModal) closeFinishModal();
    });

    const fillToggle = document.getElementById("fillToggle");
    fillToggle.addEventListener("click", () => {
        fillMode = !fillMode;
        canvas.style.cursor = fillMode ? "cell" : "crosshair";
        fillToggle.classList.toggle("active", fillMode);
        playSfx("click");
    });
}
function startDraw(e) {
    e.preventDefault();
    const p = getCanvasPos(e, canvas);
    if (fillMode) {
        floodFill(p.x, p.y, brushColor);
        playSfx("woosh");
        return;
    }
    drawing = true;
    lastX = p.x;
    lastY = p.y;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
}
function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const p = getCanvasPos(e, canvas);
    const x = p.x;
    const y = p.y;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}
function handleReroll() {
    if (!rerollBtn) return;
    if (rerolledThisRound) return;

    if (!remainingPrompts.length) {
        rerollBtn.disabled = true;
        return;
    }

    playSfx("click");
    rerollCount++;
    document.getElementById("rerollCountDisplay").textContent = `${rerollCount} used`;

    rerollBtn.classList.add("roll");
    rerollBtn.disabled = true;

    setTimeout(() => {
        rerollBtn.classList.remove("roll");

        const currentPrompt = selectedPrompts[current];
        remainingPrompts.push(currentPrompt);

        const available = [...remainingPrompts];
        const arr = new Uint32Array(1);
        crypto.getRandomValues(arr);
        const rand = arr[0] / 0xffffffff;
        const newPromptIndex = Math.floor(rand * available.length);

        let newPrompt = available[newPromptIndex];
        if (available.length > 1 && newPrompt.name === currentPrompt.name) {
            newPrompt = available[(newPromptIndex + 1) % available.length];
        }

        remainingPrompts.splice(remainingPrompts.indexOf(newPrompt), 1);
        selectedPrompts[current] = newPrompt;
        rerolledThisRound = true;
        clearCanvas();
        setupRoundUI();
    }, 500);
}

function getCanvasPos(e, targetCanvas) {
  const rect = targetCanvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  const scaleX = targetCanvas.width / rect.width;
  const scaleY = targetCanvas.height / rect.height;

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}
function stopDraw(){ drawing = false; }
function clearCanvas() {
    const dims = roundDims[current] || { w: canvas.width / dpr, h: canvas.height / dpr };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(currentScale * dpr, 0, 0, currentScale * dpr, 0, 0);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, dims.w, dims.h);
}
function snapshotCanvasDataURL(){ return canvas.toDataURL("image/png"); }
function restoreDrawing(dataURL, w, h){
    const img = new Image();
    ctx.imageSmoothingEnabled = true
    img.onload = () => { ctx.drawImage(img, 0,0, w*dpr, h*dpr, 0,0, w, h); };
    img.src = dataURL;
}
function setupSignaturePad() {
    const cssW = signatureCanvas.width;
    const cssH = signatureCanvas.height;

    signatureCanvas.width  = cssW * sigDpr;
    signatureCanvas.height = cssH * sigDpr;
    signatureCanvas.style.width = cssW + "px";
    signatureCanvas.style.height = cssH + "px";

    sigCtx.setTransform(1, 0, 0, 1, 0, 0);
    sigCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    sigCtx.fillStyle = "#fff";
    sigCtx.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height);

    sigCtx.lineCap = "round";
    sigCtx.lineJoin = "round";
    sigCtx.lineWidth = 2 * sigDpr;
    sigCtx.strokeStyle = "#000";

    let drawing = false;

    function sigStart(e) {
        e.preventDefault();
        drawing = true;
        const rect = signatureCanvas.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        sigCtx.beginPath();
        sigCtx.moveTo(x * sigDpr, y * sigDpr);
    }

    function sigMove(e) {
        if (!drawing) return;
        e.preventDefault();
        const rect = signatureCanvas.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        sigCtx.lineTo(x * sigDpr, y * sigDpr);
        sigCtx.stroke();
    }

    function sigEnd() {
        drawing = false;
    }

    signatureCanvas.addEventListener("mousedown", sigStart);
    signatureCanvas.addEventListener("mousemove", sigMove);
    signatureCanvas.addEventListener("mouseup", sigEnd);
    signatureCanvas.addEventListener("mouseleave", sigEnd);

    signatureCanvas.addEventListener("touchstart", sigStart, { passive: false });
    signatureCanvas.addEventListener("touchmove", sigMove, { passive: false });
    signatureCanvas.addEventListener("touchend", sigEnd, { passive: false });

    clearSigBtn.addEventListener("click", () => {
        playSfx('click');
        clearSignature();
    });
}
function clearSignature(){
    sigCtx.clearRect(0,0,signatureCanvas.width, signatureCanvas.height);
    sigCtx.fillStyle = "#fff";
    sigCtx.fillRect(0,0,signatureCanvas.width, signatureCanvas.height);
}
function buildComparisonRowFromDataURL(dataURL, logoImage, dims){
    const halfW = dims.w;
    const halfH = dims.h;
    const rowW = halfW * 2 + PANEL_GAP + PANEL_PADDING * 2;
    const rowH = halfH + PANEL_PADDING * 2;

    const row = document.createElement("canvas");
    const rctx = row.getContext("2d");
    row.width = rowW;
    row.height = rowH;

    rctx.fillStyle = BG_PAGE; rctx.fillRect(0,0,rowW,rowH);
    const leftX = PANEL_PADDING;
    const rightX = PANEL_PADDING + halfW + PANEL_GAP;
    const y = PANEL_PADDING;
    rctx.fillStyle = PANEL_BG;
    rctx.fillRect(leftX, y, halfW, halfH);
    rctx.fillRect(rightX, y, halfW, halfH);

    rctx.strokeStyle = "#ccc"; rctx.lineWidth = 2;
    rctx.beginPath(); rctx.moveTo(PANEL_PADDING + halfW + PANEL_GAP/2, y);
    rctx.lineTo(PANEL_PADDING + halfW + PANEL_GAP/2, y + halfH); rctx.stroke();

    const img = new Image();
    img.onload = () => {
        rctx.drawImage(img, 0,0, halfW*dpr, halfH*dpr, leftX, y, halfW, halfH);

        const naturalW = logoImage.naturalWidth || logoImage.width;
        const naturalH = logoImage.naturalHeight || logoImage.height;
        const s = Math.min(halfW / naturalW, halfH / naturalH) * 0.85;
        const drawW = naturalW * s, drawH = naturalH * s;
        const ox = rightX + (halfW - drawW)/2;
        const oy = y + (halfH - drawH)/2;
        rctx.imageSmoothingEnabled = true; rctx.imageSmoothingQuality = "high";
        rctx.drawImage(logoImage, 0,0,naturalW,naturalH, ox,oy, drawW,drawH);

        rctx.strokeStyle = "#d4d4d8"; rctx.lineWidth = 3;
        rctx.strokeRect(.5,.5,rowW-1,rowH-1);
    };
    img.src = dataURL;

    return row;
}
function handleNextClick(){
    playSfx('click');
    saveCurrentRound();

    if (current === TOTAL_ROUNDS - 1) {
        openFinishModal();
    } else {
        current++;
        setupRoundUI();
    }
}
function handleBack(){
    if (current === 0) return;
    saveCurrentRound();
    current--;
    setupRoundUI();
}
function openFinishModal(){
    finishModal.classList.remove("hidden");
    finishModal.setAttribute("aria-hidden", "false");
}
function closeFinishModal(){
    finishModal.classList.add("hidden");
    finishModal.setAttribute("aria-hidden", "true");
}
async function showFinalComposite() {
    setTimeout(async () => {

        const validResults = results.filter(r => r && r.prompt && r.drawing);
        if (!validResults.length) {
            return;
        }

        const SCALE = 2;
        const PAGE_BG = "#eef0f4";
        const PANEL_BG = "#ffffff";
        const PANEL_SHADOW = "rgba(0,0,0,0.06)";
        const MARGIN_X = 80;
        const MARGIN_Y = 80;
        const PANEL_W = 500;
        const PANEL_H = 500;
        const GUTTER = 80;
        const SPACING_Y = 60;
        const BOX_RADIUS = 20;
        const FOOTER_H = 80;

        const OUT_W = PANEL_W * 2 + GUTTER + MARGIN_X * 2;
        const ROW_H = PANEL_H + SPACING_Y;
        const OUT_H = validResults.length * ROW_H + MARGIN_Y * 2 + FOOTER_H;

        const out = document.createElement("canvas");
        out.width = OUT_W * SCALE;
        out.height = OUT_H * SCALE;
        const ctx = out.getContext("2d");
        ctx.scale(SCALE, SCALE);
        ctx.fillStyle = PAGE_BG;
        ctx.fillRect(0, 0, OUT_W, OUT_H);

        const drawRoundedRect = (x, y, w, h, r) => {
            const rr = Math.min(r, w / 2, h / 2);
            ctx.beginPath();
            ctx.moveTo(x + rr, y);
            ctx.arcTo(x + w, y, x + w, y + h, rr);
            ctx.arcTo(x + w, y + h, x, y + h, rr);
            ctx.arcTo(x, y + h, x, y, rr);
            ctx.arcTo(x, y, x + w, y, rr);
            ctx.closePath();
        };

        const drawContain = (img, x, y, w, h) => {
            const ir = img.width / img.height;
            const cr = w / h;
            let dw = w, dh = h;
            if (ir > cr) dh = w / ir;
            else dw = h * ir;
            const dx = x + (w - dw) / 2;
            const dy = y + (h - dh) / 2;
            ctx.drawImage(img, dx, dy, dw, dh);
        };

        const loadImage = (src) =>
        new Promise((resolve, reject) => {
            if (!src || src === "null") {
                console.error("❌ loadImage(): src is invalid", src);
                return reject("missing src");
            }
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
            img.src = src;
        });
        const MID_X = OUT_W / 2;
        let y = MARGIN_Y;

        for (let i = 0; i < validResults.length; i++) {
            const { prompt, drawing } = validResults[i];
            const logoSrc = prompt.src || prompt.logo || "";

            const leftX = MID_X - GUTTER / 2 - PANEL_W;
            const rightX = MID_X + GUTTER / 2;

            ctx.save();
            ctx.shadowColor = PANEL_SHADOW;
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 2;

            ctx.fillStyle = PANEL_BG;
            drawRoundedRect(leftX, y, PANEL_W, PANEL_H, BOX_RADIUS);
            ctx.fill();
            drawRoundedRect(rightX, y, PANEL_W, PANEL_H, BOX_RADIUS);
            ctx.fill();
            ctx.restore();

            ctx.strokeStyle = "#ccd0d6";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(MID_X, y - 15);
            ctx.lineTo(MID_X, y + PANEL_H + 15);
            ctx.stroke();

            try {
                const drawImg = await loadImage(drawing);
                drawContain(drawImg, leftX, y, PANEL_W, PANEL_H);
            } catch (err) {
                console.error(`❌ Failed to draw user art for row ${i}:`, err);
            }

            try {
                const logoImg = await loadImage(logoSrc);
                drawContain(logoImg, rightX, y, PANEL_W, PANEL_H);
            } catch (err) {
                console.error(`⚠️ Failed to draw logo for row ${i}:`, logoSrc, err);
            }

            y += ROW_H;
        }

        ctx.font = "bold 22px Roboto, sans-serif";
        ctx.fillStyle = "#111";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";

        const summaryText = `Rerolls used: ${rerollCount}`;
        ctx.fillText(summaryText, MARGIN_X, OUT_H - FOOTER_H / 2);

        const sigPad = 16;
        const sigWcss = signatureCanvas.width / sigDpr;
        const sigHcss = signatureCanvas.height / sigDpr;
        const sigX = OUT_W - sigWcss - MARGIN_X;
        const sigY = OUT_H - sigHcss - sigPad - FOOTER_H;

        try {
            ctx.drawImage(signatureCanvas, sigX, sigY, sigWcss, sigHcss);
        } catch (e) {
            console.warn("⚠️ Could not draw signature", e);
        }

        ctx.strokeStyle = "#d4d4d8";
        ctx.lineWidth = 3;
        ctx.strokeRect(0.5, 0.5, OUT_W - 1, OUT_H - 1);

        finalCanvas.width = OUT_W;
        finalCanvas.height = OUT_H;
        const fctx = finalCanvas.getContext("2d");
        fctx.drawImage(out, 0, 0, OUT_W, OUT_H);

        finalOverlay.classList.remove("hidden");

        const link = document.createElement("a");
        link.href = out.toDataURL("image/png");
        link.download = "DrawnFromTheDead.png";
        link.click();
    }, 80);

}