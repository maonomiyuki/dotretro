(() => {
  const MAX_INPUT_EDGE = 4096;
  const PALETTE_HEX = [
    '#ffffff','#fb6b1d','#e83b3b','#831c5d','#c32454','#f04f78','#f68181','#fca790',
    '#e3c896','#ab947a','#966c6c','#625565','#3e3546','#0b5e65','#0b8a8f','#1ebc73',
    '#91db69','#fbff86','#fbb954','#cd683d','#9e4539','#7a3045','#6b3e75','#905ea9',
    '#a884f3','#eaaded','#8fd3ff','#4d9be6','#4d65b4','#484a77','#30e1b9','#8ff8e2'
  ];
  const PALETTE = PALETTE_HEX.map(hexToRgb);
  const ditherMatrix4x4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5]
  ];

  const state = {
    imgLoaded: false,
    srcCanvas: document.createElement('canvas'),
    srcCtx: null,
    cropRect: { x: 0, y: 0, w: 1, h: 1 },
    sourceAspect: 1,
    tab: 'after',
    ratio: 'free',
    zoom: 1,
    panX: 0,
    panY: 0,
    dotWidth: 160,
    dotHeight: 160,
    brightness: 0,
    contrast: 0,
    gamma: 1,
    ditherMode: 'bayer',
    ditherStrength: 50,
    outputCanvas: document.createElement('canvas'),
    processedData: null,
    colorCache: new Map()
  };
  state.srcCtx = state.srcCanvas.getContext('2d', { willReadFrequently: true });

  window.onerror = (message) => renderFatalError(String(message || 'Unknown error'));
  window.onunhandledrejection = (event) => {
    const msg = event?.reason?.message || String(event?.reason || 'Unhandled promise rejection');
    renderFatalError(msg);
  };

  try {
    boot();
    console.log('RetroDot boot success');
  } catch (e) {
    renderFatalError(e?.message || String(e));
  }

  function boot() {
    const app = document.getElementById('app');
    app.innerHTML = template();
    const ui = bindUI();
    requestRender(ui);
  }

  function template() {
    return `
      <div class="app-grid">
        <section class="panel">
          <div id="dropZone" class="drop-zone">
            <p>画像をドラッグ&ドロップ / 貼り付け / ファイル選択</p>
            <div class="row" style="justify-content:center">
              <input id="fileInput" type="file" accept="image/*" />
            </div>
            <p class="small">対応形式: PNG / JPG / WebP</p>
          </div>
          <div class="tabs">
            <button data-tab="before">変換前</button>
            <button data-tab="after" class="active">変換後</button>
            <button data-tab="compare">比較</button>
          </div>
          <div class="preview-shell">
            <div id="singleView">
              <canvas id="previewCanvas" width="640" height="400"></canvas>
            </div>
            <div id="compareView" class="compare-grid" hidden>
              <div>
                <p class="col-label">変換前</p>
                <canvas id="compareBefore" width="320" height="200"></canvas>
              </div>
              <div>
                <p class="col-label">変換後</p>
                <canvas id="compareAfter" width="320" height="200"></canvas>
              </div>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="settings-grid">
            <div class="control"><label for="ratio">トリミング比率</label>
              <select id="ratio"><option value="free">自由（元画像比率維持）</option><option value="1:1">1:1</option><option value="4:3">4:3</option></select>
            </div>
            <div class="control"><label for="zoom">ズーム</label><input id="zoom" type="range" min="0.5" max="3" step="0.01" value="1" /></div>
            <div class="control"><label for="panX">パンX</label><input id="panX" type="range" min="-1" max="1" step="0.01" value="0" /></div>
            <div class="control"><label for="panY">パンY</label><input id="panY" type="range" min="-1" max="1" step="0.01" value="0" /></div>

            <div class="control"><label for="dotWidth">dotWidth</label>
              <div class="row"><input id="dotWidth" type="range" min="16" max="640" step="1" value="160" /><input id="dotWidthNum" type="number" min="16" max="640" value="160" /></div>
              <div class="dot-preset" id="dotPresets"></div>
            </div>
            <div class="control"><label for="dotHeight">dotHeight（自動）</label><input id="dotHeight" type="number" readonly value="160" /></div>

            <div class="control"><label for="brightness">明るさ</label><input id="brightness" type="range" min="-100" max="100" step="1" value="0" /></div>
            <div class="control"><label for="contrast">コントラスト</label><input id="contrast" type="range" min="-100" max="100" step="1" value="0" /></div>
            <div class="control"><label for="gamma">ガンマ</label><input id="gamma" type="range" min="0.5" max="2.2" step="0.01" value="1" /></div>
            <div class="control"><label for="ditherMode">ディザ</label>
              <select id="ditherMode"><option value="off">OFF</option><option value="bayer" selected>Bayer 4x4</option><option value="fs">Floyd–Steinberg</option></select>
            </div>
            <div class="control"><label for="ditherStrength">ディザ強度</label><input id="ditherStrength" type="range" min="0" max="100" step="1" value="50" /></div>
            <div class="control"><label for="scale">拡大PNG倍率 (1..8)</label><input id="scale" type="number" min="1" max="8" value="4" /></div>
          </div>

          <div class="row" style="margin-top:0.8rem;">
            <button id="savePng">原寸PNGを保存</button>
            <button id="saveScaled">拡大PNGを保存</button>
          </div>
          <p class="small mono" id="status">画像未読み込み</p>
        </section>
      </div>
    `;
  }

  function bindUI() {
    const ui = {
      fileInput: el('fileInput'), dropZone: el('dropZone'),
      preview: el('previewCanvas'), compareBefore: el('compareBefore'), compareAfter: el('compareAfter'),
      singleView: el('singleView'), compareView: el('compareView'), status: el('status'),
      ratio: el('ratio'), zoom: el('zoom'), panX: el('panX'), panY: el('panY'),
      dotWidth: el('dotWidth'), dotWidthNum: el('dotWidthNum'), dotHeight: el('dotHeight'),
      brightness: el('brightness'), contrast: el('contrast'), gamma: el('gamma'),
      ditherMode: el('ditherMode'), ditherStrength: el('ditherStrength'), scale: el('scale')
    };

    [64, 128, 160, 256, 320, 480].forEach((preset) => {
      const b = document.createElement('button');
      b.textContent = String(preset);
      b.addEventListener('click', () => {
        state.dotWidth = preset;
        ui.dotWidth.value = String(preset);
        ui.dotWidthNum.value = String(preset);
        requestRender(ui);
      });
      el('dotPresets').appendChild(b);
    });

    document.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.tab = btn.getAttribute('data-tab');
        document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b === btn));
        requestRender(ui);
      });
    });

    ui.fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) void loadImageFile(file, ui);
    });

    ['dragenter', 'dragover'].forEach((ev) => ui.dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      ui.dropZone.classList.add('active');
    }));
    ['dragleave', 'drop'].forEach((ev) => ui.dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      ui.dropZone.classList.remove('active');
    }));
    ui.dropZone.addEventListener('drop', (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) void loadImageFile(file, ui);
    });

    window.addEventListener('paste', (e) => {
      const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'));
      const file = item?.getAsFile();
      if (file) void loadImageFile(file, ui);
    });

    bindControl(ui.ratio, 'ratio', ui);
    bindControl(ui.zoom, 'zoom', ui, parseFloat);
    bindControl(ui.panX, 'panX', ui, parseFloat);
    bindControl(ui.panY, 'panY', ui, parseFloat);
    bindControl(ui.dotWidth, 'dotWidth', ui, (v) => clamp(parseInt(v, 10) || 16, 16, 640), (v) => ui.dotWidthNum.value = String(v));
    bindControl(ui.dotWidthNum, 'dotWidth', ui, (v) => clamp(parseInt(v, 10) || 16, 16, 640), (v) => ui.dotWidth.value = String(v));
    bindControl(ui.brightness, 'brightness', ui, (v) => parseInt(v, 10) || 0);
    bindControl(ui.contrast, 'contrast', ui, (v) => parseInt(v, 10) || 0);
    bindControl(ui.gamma, 'gamma', ui, parseFloat);
    bindControl(ui.ditherMode, 'ditherMode', ui);
    bindControl(ui.ditherStrength, 'ditherStrength', ui, (v) => parseInt(v, 10) || 0);

    el('savePng').addEventListener('click', () => savePng(1));
    el('saveScaled').addEventListener('click', () => {
      const scale = clamp(parseInt(ui.scale.value, 10) || 1, 1, 8);
      savePng(scale);
    });

    return ui;
  }

  function bindControl(node, key, ui, parser = (v) => v, mirror) {
    node.addEventListener('input', () => {
      state[key] = parser(node.value);
      if (mirror) mirror(state[key]);
      requestRender(ui);
    });
  }

  async function loadImageFile(file, ui) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_INPUT_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    state.srcCanvas.width = w;
    state.srcCanvas.height = h;
    state.srcCtx.imageSmoothingEnabled = true;
    state.srcCtx.clearRect(0, 0, w, h);
    state.srcCtx.drawImage(bitmap, 0, 0, w, h);
    state.imgLoaded = true;
    state.sourceAspect = h / w;
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    ui.zoom.value = '1'; ui.panX.value = '0'; ui.panY.value = '0';
    ui.status.textContent = `読込完了: ${file.name} (${w}x${h})`;
    requestRender(ui);
  }

  function requestRender(ui) {
    if (!state.imgLoaded) {
      drawPlaceholder(ui.preview, '画像を読み込んでください');
      return;
    }
    computeCropRect();
    state.dotHeight = Math.max(1, Math.round(state.dotWidth * (state.cropRect.h / state.cropRect.w)));
    ui.dotHeight.value = String(state.dotHeight);

    const result = processPipeline();
    state.processedData = result;

    if (state.tab === 'compare') {
      ui.singleView.hidden = true;
      ui.compareView.hidden = false;
      drawBefore(ui.compareBefore);
      drawAfter(ui.compareAfter);
    } else {
      ui.singleView.hidden = false;
      ui.compareView.hidden = true;
      if (state.tab === 'before') drawBefore(ui.preview);
      else drawAfter(ui.preview);
    }
    ui.status.textContent = `crop:${Math.round(state.cropRect.w)}x${Math.round(state.cropRect.h)} / dot:${state.dotWidth}x${state.dotHeight}`;
  }

  function computeCropRect() {
    const sw = state.srcCanvas.width;
    const sh = state.srcCanvas.height;
    const targetAspect = state.ratio === '1:1' ? 1 : state.ratio === '4:3' ? 3 / 4 : state.sourceAspect;

    let baseW = sw;
    let baseH = Math.round(baseW * targetAspect);
    if (baseH > sh) {
      baseH = sh;
      baseW = Math.round(baseH / targetAspect);
    }

    const zoom = clamp(state.zoom, 0.5, 3);
    let cw = Math.max(1, Math.round(baseW / zoom));
    let ch = Math.max(1, Math.round(baseH / zoom));

    if (state.ratio === 'free') {
      const aspect = sh / sw;
      ch = Math.max(1, Math.round(cw * aspect));
      if (ch > sh) {
        ch = sh;
        cw = Math.max(1, Math.round(ch / aspect));
      }
    }

    const maxX = sw - cw;
    const maxY = sh - ch;
    const x = Math.round(((clamp(state.panX, -1, 1) + 1) / 2) * maxX);
    const y = Math.round(((clamp(state.panY, -1, 1) + 1) / 2) * maxY);

    state.cropRect = {
      x: clamp(x, 0, maxX), y: clamp(y, 0, maxY), w: cw, h: ch
    };
  }

  function processPipeline() {
    const { x, y, w, h } = state.cropRect;
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = w; cropCanvas.height = h;
    const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
    cropCtx.drawImage(state.srcCanvas, x, y, w, h, 0, 0, w, h);

    const dotW = state.dotWidth;
    const dotH = state.dotHeight;
    const workCanvas = document.createElement('canvas');
    workCanvas.width = dotW; workCanvas.height = dotH;
    const workCtx = workCanvas.getContext('2d', { willReadFrequently: true });
    workCtx.imageSmoothingEnabled = true;
    workCtx.drawImage(cropCanvas, 0, 0, dotW, dotH);

    let imageData = workCtx.getImageData(0, 0, dotW, dotH);
    applyAdjustments(imageData.data, state.brightness, state.contrast, state.gamma);

    const strength = clamp(state.ditherStrength, 0, 100);
    if (state.ditherMode !== 'off' && strength > 0) {
      if (state.ditherMode === 'bayer') applyBayerDither(imageData, strength);
      if (state.ditherMode === 'fs') applyFSDither(imageData, dotW, dotH, strength);
    }

    quantizeImageData(imageData.data);
    remapSafetyFence(imageData.data);

    state.outputCanvas.width = dotW;
    state.outputCanvas.height = dotH;
    const outCtx = state.outputCanvas.getContext('2d', { willReadFrequently: true });
    outCtx.putImageData(imageData, 0, 0);

    return { imageData, dotW, dotH, before: cropCanvas };
  }

  function drawBefore(canvas) {
    const { w, h } = state.cropRect;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(state.srcCanvas, state.cropRect.x, state.cropRect.y, w, h, 0, 0, w, h);
  }

  function drawAfter(canvas) {
    const w = state.outputCanvas.width;
    const h = state.outputCanvas.height;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(state.outputCanvas, 0, 0);
  }

  function applyAdjustments(data, b, c, gamma) {
    const bright = (clamp(b, -100, 100) / 100) * 255;
    const contrast = clamp(c, -100, 100);
    const cf = (259 * (contrast + 255)) / (255 * (259 - contrast));
    const invGamma = 1 / clamp(gamma, 0.5, 2.2);

    for (let i = 0; i < data.length; i += 4) {
      data[i] = clamp255(cf * (data[i] - 128) + 128 + bright);
      data[i + 1] = clamp255(cf * (data[i + 1] - 128) + 128 + bright);
      data[i + 2] = clamp255(cf * (data[i + 2] - 128) + 128 + bright);

      data[i] = clamp255(255 * ((data[i] / 255) ** invGamma));
      data[i + 1] = clamp255(255 * ((data[i + 1] / 255) ** invGamma));
      data[i + 2] = clamp255(255 * ((data[i + 2] / 255) ** invGamma));
    }
  }

  function applyBayerDither(imageData, strength) {
    const { width, height, data } = imageData;
    const amp = (strength / 100) * 48;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = (y * width + x) * 4;
        const t = (ditherMatrix4x4[y % 4][x % 4] / 15 - 0.5) * amp;
        data[idx] = clamp255(data[idx] + t);
        data[idx + 1] = clamp255(data[idx + 1] + t);
        data[idx + 2] = clamp255(data[idx + 2] + t);
      }
    }
  }

  function applyFSDither(imageData, w, h, strength) {
    const d = imageData.data;
    const amp = strength / 100;
    const arr = new Float32Array(d.length);
    for (let i = 0; i < d.length; i += 1) arr[i] = d[i];

    const distribute = (index, er, eg, eb, factor) => {
      if (index < 0 || index >= arr.length) return;
      arr[index] += er * factor * amp;
      arr[index + 1] += eg * factor * amp;
      arr[index + 2] += eb * factor * amp;
    };

    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4;
        const r = clamp255(arr[i]);
        const g = clamp255(arr[i + 1]);
        const b = clamp255(arr[i + 2]);
        const [nr, ng, nb] = nearestColor(r, g, b);

        d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
        const er = r - nr;
        const eg = g - ng;
        const eb = b - nb;

        if (x + 1 < w) distribute(i + 4, er, eg, eb, 7 / 16);
        if (y + 1 < h) {
          if (x > 0) distribute(i + (w - 1) * 4, er, eg, eb, 3 / 16);
          distribute(i + w * 4, er, eg, eb, 5 / 16);
          if (x + 1 < w) distribute(i + (w + 1) * 4, er, eg, eb, 1 / 16);
        }
      }
    }
  }

  function quantizeImageData(data) {
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = nearestColor(data[i], data[i + 1], data[i + 2]);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  function remapSafetyFence(data) {
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = nearestColor(data[i], data[i + 1], data[i + 2]);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  function nearestColor(r, g, b) {
    const key = (r << 16) | (g << 8) | b;
    if (state.colorCache.has(key)) return state.colorCache.get(key);

    let best = PALETTE[0];
    let bestDist = Infinity;
    for (const p of PALETTE) {
      const dr = r - p[0];
      const dg = g - p[1];
      const db = b - p[2];
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        best = p;
      }
    }
    state.colorCache.set(key, best);
    return best;
  }

  function savePng(scale) {
    if (!state.imgLoaded || !state.processedData) return;
    const w = state.outputCanvas.width;
    const h = state.outputCanvas.height;
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(state.outputCanvas, 0, 0, canvas.width, canvas.height);

    const link = document.createElement('a');
    const suffix = scale === 1 ? '' : `_x${scale}`;
    link.download = `retrodot_${w}x${h}${suffix}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function renderFatalError(message) {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
      <div class="error-box">
        <h2>Error: ${escapeHtml(message)}</h2>
        <p>詳細はコンソールを確認してください</p>
        <p class="small mono">${escapeHtml(location.href)}</p>
      </div>
    `;
  }

  function drawPlaceholder(canvas, text) {
    const ctx = canvas.getContext('2d');
    canvas.width = 640;
    canvas.height = 400;
    ctx.fillStyle = '#0b0f15';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#a4b0ca';
    ctx.font = '16px sans-serif';
    ctx.fillText(text, 20, 40);
  }

  function hexToRgb(hex) {
    const x = hex.replace('#', '');
    return [
      parseInt(x.slice(0, 2), 16),
      parseInt(x.slice(2, 4), 16),
      parseInt(x.slice(4, 6), 16)
    ];
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function clamp255(v) {
    return clamp(Math.round(v), 0, 255);
  }

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
})();
