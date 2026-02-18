(() => {
  const MAX_INPUT_EDGE = 4096;
  const BLOCK_SIZE = 16;
  const RETRO32_PALETTE_HEX = [
    '#ffffff','#fb6b1d','#e83b3b','#831c5d','#c32454','#f04f78','#f68181','#fca790',
    '#e3c896','#ab947a','#966c6c','#625565','#3e3546','#0b5e65','#0b8a8f','#1ebc73',
    '#91db69','#fbff86','#fbb954','#cd683d','#9e4539','#7a3045','#6b3e75','#905ea9',
    '#a884f3','#eaaded','#8fd3ff','#4d9be6','#4d65b4','#484a77','#30e1b9','#8ff8e2'
  ];
  const FC52_PALETTE_HEX = [
    '#ab0013','#e7005b','#ff77b7','#ffc7db','#a70000','#db2b00','#ff7763','#ffbfb3','#7f0b00','#cb4f0f',
    '#ff9b3b','#ffdbab','#432f00','#8b7300','#f3bf3f','#ffe7a3','#004700','#009700','#83d313','#e3ffa3',
    '#005100','#00ab00','#4fdf4b','#abf3bf','#003f17','#00933b','#58f898','#b3ffcf','#1b3f5f','#00838b',
    '#00ebdb','#9ffff3','#271b8f','#0073ef','#3fbfff','#abe7ff','#0000ab','#233bef','#5f73ff','#c7d7ff',
    '#47009f','#8300f3','#a78bfd','#d7cbff','#8f0077','#bf00bf','#f77bff','#ffc7ff','#000000','#757575',
    '#bcbcbc','#ffffff'
  ];

  const I18N = {
    ja: {
      languageLabel: '言語', languageJa: '日本語', languageEn: 'English',
      appTitle: 'レトロドットコンバータ',
      appDesc: '画像を固定パレットでレトロなドット絵に変換します。',
      loading: '読み込み中…', uploadTitle: '画像をドラッグ&ドロップ / 貼り付け / ファイル選択',
      uploadButtonAria: '画像ファイル選択',
      supportedTypes: '対応形式: PNG / JPG / WebP',
      viewBefore: '変換前', viewAfter: '変換後', viewCompare: '比較',
      sectionCrop: 'トリミング / リサイズ', cropRatio: 'トリミング比率', ratioFreeKeep: '自由（元画像比率維持）',
      zoom: 'ズーム', panX: 'パンX', panY: 'パンY', dotWidthLabel: 'dotWidth（ドット幅）', dotHeightAuto: 'dotHeight（自動）',
      brightness: '明るさ', contrast: 'コントラスト', gamma: 'ガンマ', dithering: 'ディザ', ditherOff: 'OFF',
      ditherBayer: 'Bayer 4x4', ditherFS: 'Floyd–Steinberg', ditherStrength: 'ディザ強度',
      paletteLabel: 'パレット', palette32: 'RetroDot 32色', paletteFC52: 'ファミコン 52色',
      hwMode: '実機制約モード', hwModeHint: '16×16ブロックごとに最大4色へ制限します。',
      blockSizeLabel: 'ブロックサイズ', blockSizeValue: '16 (固定)',
      universalBgColor: '共通背景色', ubcAuto: '自動', ubcWhite: '白固定', ubcBlack: '黒固定',
      limit13: '背景13色制限', scaleLabel: '拡大PNG倍率（1..8）',
      savingOriginal: '原寸PNGを保存', savingScaled: '拡大PNGを保存',
      statusNoImage: '画像未読み込み', statusLoaded: '読込完了: {name} ({w}x{h})',
      statusSize: 'crop:{cropW}x{cropH} / dot:{dotW}x{dotH}',
      processing: '処理中…', errorPrefix: 'エラー: {msg}',
      errorHint: '詳細はコンソールを確認してください', compareBeforeLabel: '変換前', compareAfterLabel: '変換後'
    },
    en: {
      languageLabel: 'Language', languageJa: '日本語', languageEn: 'English',
      appTitle: 'Retro Dot Converter',
      appDesc: 'Convert images into retro pixel art with a fixed palette.',
      loading: 'Loading...', uploadTitle: 'Drag & drop / paste / choose a file',
      uploadButtonAria: 'Choose image file',
      supportedTypes: 'Supported: PNG / JPG / WebP',
      viewBefore: 'Before', viewAfter: 'After', viewCompare: 'Compare',
      sectionCrop: 'Crop / Resize', cropRatio: 'Crop ratio', ratioFreeKeep: 'Free (keep original ratio)',
      zoom: 'Zoom', panX: 'Pan X', panY: 'Pan Y', dotWidthLabel: 'dotWidth (Dot width)', dotHeightAuto: 'dotHeight (Auto)',
      brightness: 'Brightness', contrast: 'Contrast', gamma: 'Gamma', dithering: 'Dither', ditherOff: 'OFF',
      ditherBayer: 'Bayer 4x4', ditherFS: 'Floyd–Steinberg', ditherStrength: 'Dither strength',
      paletteLabel: 'Palette', palette32: 'RetroDot 32-color', paletteFC52: 'Famicom 52-color',
      hwMode: 'Hardware constraint mode', hwModeHint: 'Limit each 16×16 block to max 4 colors.',
      blockSizeLabel: 'Block size', blockSizeValue: '16 (fixed)',
      universalBgColor: 'Universal background color', ubcAuto: 'Auto', ubcWhite: 'Fixed white', ubcBlack: 'Fixed black',
      limit13: 'Limit background to 13 colors', scaleLabel: 'Scale (1..8)',
      savingOriginal: 'Save original PNG', savingScaled: 'Save scaled PNG',
      statusNoImage: 'No image loaded', statusLoaded: 'Loaded: {name} ({w}x{h})',
      statusSize: 'crop:{cropW}x{cropH} / dot:{dotW}x{dotH}',
      processing: 'Processing...', errorPrefix: 'Error: {msg}',
      errorHint: 'Please check the console for details', compareBeforeLabel: 'Before', compareAfterLabel: 'After'
    }
  };

  const PALETTES = {
    retro32: RETRO32_PALETTE_HEX,
    fc52: FC52_PALETTE_HEX
  };

  const ditherMatrix4x4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const uiState = { lang: getInitialLang(), ui: null, renderTimer: null };

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
    paletteMode: 'retro32',
    hardwareMode: false,
    universalBgMode: 'auto',
    limit13: false,
    outputCanvas: document.createElement('canvas'),
    processedData: null,
    processing: false,
    lastLoadedLabel: '',
    lastLoadedName: '',
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
  } catch (error) {
    renderFatalError(error?.message || String(error));
  }

  function boot() {
    const app = document.getElementById('app');
    app.innerHTML = template();
    bindLanguageSwitcher();
    const ui = bindUI();
    uiState.ui = ui;
    applyI18n(uiState.lang);
    requestRender(ui);
  }

  function template() {
    return `
      <div class="app-grid">
        <section class="panel">
          <div id="dropZone" class="drop-zone">
            <p data-i18n="uploadTitle"></p>
            <div class="row" style="justify-content:center">
              <input id="fileInput" type="file" accept="image/*" data-i18n-aria-label="uploadButtonAria" />
            </div>
            <p class="small" data-i18n="supportedTypes"></p>
          </div>
          <div class="tabs">
            <button data-tab="before" data-i18n="viewBefore"></button>
            <button data-tab="after" class="active" data-i18n="viewAfter"></button>
            <button data-tab="compare" data-i18n="viewCompare"></button>
          </div>
          <div class="preview-shell">
            <div id="processingBadge" class="processing-badge" data-i18n="processing" hidden></div>
            <div id="singleView">
              <canvas id="previewCanvas" width="640" height="400"></canvas>
            </div>
            <div id="compareView" class="compare-grid" hidden>
              <div>
                <p class="col-label" data-i18n="compareBeforeLabel"></p>
                <canvas id="compareBefore" width="320" height="200"></canvas>
              </div>
              <div>
                <p class="col-label" data-i18n="compareAfterLabel"></p>
                <canvas id="compareAfter" width="320" height="200"></canvas>
              </div>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="settings-grid">
            <div class="control"><label data-i18n="cropRatio" for="ratio"></label>
              <select id="ratio">
                <option value="free" data-i18n="ratioFreeKeep"></option>
                <option value="1:1">1:1</option>
                <option value="4:3">4:3</option>
              </select>
            </div>
            <div class="control"><label data-i18n="zoom" for="zoom"></label><input id="zoom" type="range" min="0.5" max="3" step="0.01" value="1" /></div>
            <div class="control"><label data-i18n="panX" for="panX"></label><input id="panX" type="range" min="-1" max="1" step="0.01" value="0" /></div>
            <div class="control"><label data-i18n="panY" for="panY"></label><input id="panY" type="range" min="-1" max="1" step="0.01" value="0" /></div>
            <div class="control"><label data-i18n="dotWidthLabel" for="dotWidth"></label>
              <div class="row"><input id="dotWidth" type="range" min="16" max="640" step="1" value="160" /><input id="dotWidthNum" type="number" min="16" max="640" value="160" /></div>
              <div class="dot-preset" id="dotPresets"></div>
            </div>
            <div class="control"><label data-i18n="dotHeightAuto" for="dotHeight"></label><input id="dotHeight" type="number" readonly value="160" /></div>
            <div class="control"><label data-i18n="brightness" for="brightness"></label><input id="brightness" type="range" min="-100" max="100" step="1" value="0" /></div>
            <div class="control"><label data-i18n="contrast" for="contrast"></label><input id="contrast" type="range" min="-100" max="100" step="1" value="0" /></div>
            <div class="control"><label data-i18n="gamma" for="gamma"></label><input id="gamma" type="range" min="0.5" max="2.2" step="0.01" value="1" /></div>
            <div class="control"><label data-i18n="dithering" for="ditherMode"></label>
              <select id="ditherMode">
                <option value="off" data-i18n="ditherOff"></option>
                <option value="bayer" data-i18n="ditherBayer"></option>
                <option value="fs" data-i18n="ditherFS"></option>
              </select>
            </div>
            <div class="control"><label data-i18n="ditherStrength" for="ditherStrength"></label><input id="ditherStrength" type="range" min="0" max="100" step="1" value="50" /></div>
            <div class="control"><label data-i18n="paletteLabel" for="paletteMode"></label>
              <select id="paletteMode">
                <option value="retro32" data-i18n="palette32"></option>
                <option value="fc52" data-i18n="paletteFC52"></option>
              </select>
            </div>
            <div class="control">
              <label><input id="hardwareMode" type="checkbox" /> <span data-i18n="hwMode"></span></label>
              <p class="small" data-i18n="hwModeHint"></p>
              <div id="hwPanel" class="hw-panel" hidden>
                <div class="row" style="margin-bottom:0.4rem;"><span class="small" data-i18n="blockSizeLabel"></span><span class="small mono" data-i18n="blockSizeValue"></span></div>
                <label data-i18n="universalBgColor" for="ubcMode"></label>
                <select id="ubcMode">
                  <option value="auto" data-i18n="ubcAuto"></option>
                  <option value="white" data-i18n="ubcWhite"></option>
                  <option value="black" data-i18n="ubcBlack"></option>
                </select>
                <label style="margin-top:0.4rem;"><input id="limit13" type="checkbox" /> <span data-i18n="limit13"></span></label>
              </div>
            </div>
            <div class="control"><label data-i18n="scaleLabel" for="scale"></label><input id="scale" type="number" min="1" max="8" value="4" /></div>
          </div>

          <div class="row" style="margin-top:0.8rem;">
            <button id="savePng" data-i18n="savingOriginal"></button>
            <button id="saveScaled" data-i18n="savingScaled"></button>
          </div>
          <p class="small mono" id="status"></p>
        </section>
      </div>
    `;
  }

  function bindLanguageSwitcher() {
    const select = document.getElementById('languageSelect');
    select.value = uiState.lang;
    select.addEventListener('change', () => {
      uiState.lang = select.value === 'ja' ? 'ja' : 'en';
      localStorage.setItem('retrodot-lang', uiState.lang);
      applyI18n(uiState.lang);
      updateStatus(uiState.ui);
    });
  }

  function bindUI() {
    const ui = {
      fileInput: el('fileInput'), dropZone: el('dropZone'),
      preview: el('previewCanvas'), compareBefore: el('compareBefore'), compareAfter: el('compareAfter'),
      singleView: el('singleView'), compareView: el('compareView'), status: el('status'), processingBadge: el('processingBadge'),
      ratio: el('ratio'), zoom: el('zoom'), panX: el('panX'), panY: el('panY'),
      dotWidth: el('dotWidth'), dotWidthNum: el('dotWidthNum'), dotHeight: el('dotHeight'),
      brightness: el('brightness'), contrast: el('contrast'), gamma: el('gamma'),
      ditherMode: el('ditherMode'), ditherStrength: el('ditherStrength'),
      paletteMode: el('paletteMode'), hardwareMode: el('hardwareMode'), hwPanel: el('hwPanel'),
      ubcMode: el('ubcMode'), limit13: el('limit13'), scale: el('scale')
    };

    [64, 128, 160, 256, 320, 480].forEach((preset) => {
      const button = document.createElement('button');
      button.textContent = String(preset);
      button.addEventListener('click', () => {
        state.dotWidth = preset;
        ui.dotWidth.value = String(preset);
        ui.dotWidthNum.value = String(preset);
        requestRender(ui);
      });
      el('dotPresets').appendChild(button);
    });

    document.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.tab = btn.getAttribute('data-tab');
        document.querySelectorAll('[data-tab]').forEach((target) => target.classList.toggle('active', target === btn));
        requestRender(ui);
      });
    });

    ui.fileInput.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (file) void loadImageFile(file, ui);
    });

    ['dragenter', 'dragover'].forEach((eventName) => {
      ui.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        ui.dropZone.classList.add('active');
      });
    });
    ['dragleave', 'drop'].forEach((eventName) => {
      ui.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        ui.dropZone.classList.remove('active');
      });
    });
    ui.dropZone.addEventListener('drop', (event) => {
      const file = event.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) void loadImageFile(file, ui);
    });

    window.addEventListener('paste', (event) => {
      const item = Array.from(event.clipboardData?.items || []).find((x) => x.type.startsWith('image/'));
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
    bindControl(ui.paletteMode, 'paletteMode', ui, (v) => (v === 'fc52' ? 'fc52' : 'retro32'), () => { state.colorCache.clear(); });

    ui.hardwareMode.addEventListener('change', () => {
      state.hardwareMode = ui.hardwareMode.checked;
      ui.hwPanel.hidden = !state.hardwareMode;
      requestRender(ui, true);
    });
    ui.ubcMode.addEventListener('change', () => {
      state.universalBgMode = ui.ubcMode.value;
      requestRender(ui, true);
    });
    ui.limit13.addEventListener('change', () => {
      state.limit13 = ui.limit13.checked;
      requestRender(ui, true);
    });

    el('savePng').addEventListener('click', () => savePng(1));
    el('saveScaled').addEventListener('click', () => {
      const scale = clamp(parseInt(ui.scale.value, 10) || 1, 1, 8);
      savePng(scale);
    });

    updateStatus(ui);
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
    state.lastLoadedName = file.name;
    state.lastLoadedLabel = format(t('statusLoaded'), { name: file.name, w, h });

    requestRender(ui, true);
  }

  function requestRender(ui, heavy = false) {
    clearTimeout(uiState.renderTimer);
    const wait = heavy || state.hardwareMode ? 150 : 0;
    uiState.renderTimer = setTimeout(() => renderNow(ui), wait);
  }

  function renderNow(ui) {
    if (!ui) return;
    if (!state.imgLoaded) {
      drawPlaceholder(ui.preview, t('statusNoImage'));
      ui.singleView.hidden = false;
      ui.compareView.hidden = true;
      updateStatus(ui);
      return;
    }

    state.processing = !!state.hardwareMode;
    ui.processingBadge.hidden = !state.processing;

    computeCropRect();
    state.dotHeight = Math.max(1, Math.round(state.dotWidth * (state.cropRect.h / state.cropRect.w)));
    ui.dotHeight.value = String(state.dotHeight);

    processPipeline();

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

    state.processing = false;
    ui.processingBadge.hidden = true;
    updateStatus(ui);
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

    state.cropRect = { x: clamp(x, 0, maxX), y: clamp(y, 0, maxY), w: cw, h: ch };
  }

  function processPipeline() {
    const { x, y, w, h } = state.cropRect;
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = w;
    cropCanvas.height = h;
    const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
    cropCtx.drawImage(state.srcCanvas, x, y, w, h, 0, 0, w, h);

    const dotW = state.dotWidth;
    const dotH = state.dotHeight;
    const workCanvas = document.createElement('canvas');
    workCanvas.width = dotW;
    workCanvas.height = dotH;
    const workCtx = workCanvas.getContext('2d', { willReadFrequently: true });
    workCtx.imageSmoothingEnabled = true;
    workCtx.drawImage(cropCanvas, 0, 0, dotW, dotH);

    const imageData = workCtx.getImageData(0, 0, dotW, dotH);
    const data = imageData.data;
    applyAdjustments(data, state.brightness, state.contrast, state.gamma);

    const strength = clamp(state.ditherStrength, 0, 100);
    if (state.ditherMode !== 'off' && strength > 0) {
      if (state.ditherMode === 'bayer') applyBayerDither(imageData, strength);
      if (state.ditherMode === 'fs') applyFSDither(imageData, dotW, dotH, strength);
    }

    const paletteRgb = getActivePaletteRgb();
    quantizeToPalette(data, paletteRgb);
    remapSafetyFence(data, paletteRgb);

    if (state.hardwareMode) {
      if (state.limit13) applyGlobal13ColorLimit(data, dotW, dotH, paletteRgb);
      applyHardwareBlockLimit(data, dotW, dotH, paletteRgb);
      remapSafetyFence(data, paletteRgb);
    }

    state.outputCanvas.width = dotW;
    state.outputCanvas.height = dotH;
    const outCtx = state.outputCanvas.getContext('2d', { willReadFrequently: true });
    outCtx.putImageData(imageData, 0, 0);
    state.processedData = imageData;
  }

  function getActivePaletteRgb() {
    return PALETTES[state.paletteMode].map(hexToRgb);
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

  function applyAdjustments(data, brightness, contrast, gamma) {
    const bright = (clamp(brightness, -100, 100) / 100) * 255;
    const ct = clamp(contrast, -100, 100);
    const cf = (259 * (ct + 255)) / (255 * (259 - ct));
    const invGamma = 1 / clamp(gamma, 0.5, 2.2);

    for (let i = 0; i < data.length; i += 4) {
      data[i] = clamp255(cf * (data[i] - 128) + 128 + bright);
      data[i + 1] = clamp255(cf * (data[i + 1] - 128) + 128 + bright);
      data[i + 2] = clamp255(cf * (data[i + 2] - 128) + 128 + bright);
      data[i] = clamp255(255 * ((data[i] / 255) ** invGamma));
      data[i + 1] = clamp255(255 * ((data[i + 1] / 255) ** invGamma));
      data[i + 2] = clamp255(255 * ((data[i + 2] / 255) ** invGamma));
      data[i + 3] = 255;
    }
  }

  function applyBayerDither(imageData, strength) {
    const { width, height, data } = imageData;
    const amp = (strength / 100) * 48;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = (y * width + x) * 4;
        const shift = (ditherMatrix4x4[y % 4][x % 4] / 15 - 0.5) * amp;
        data[idx] = clamp255(data[idx] + shift);
        data[idx + 1] = clamp255(data[idx + 1] + shift);
        data[idx + 2] = clamp255(data[idx + 2] + shift);
      }
    }
  }

  function applyFSDither(imageData, w, h, strength) {
    const data = imageData.data;
    const working = new Float32Array(data.length);
    const amp = strength / 100;
    for (let i = 0; i < data.length; i += 1) working[i] = data[i];

    const distribute = (index, er, eg, eb, factor) => {
      if (index < 0 || index >= working.length) return;
      working[index] += er * factor * amp;
      working[index + 1] += eg * factor * amp;
      working[index + 2] += eb * factor * amp;
    };

    const palette = getActivePaletteRgb();
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4;
        const r = clamp255(working[i]);
        const g = clamp255(working[i + 1]);
        const b = clamp255(working[i + 2]);
        const nearest = nearestColor(r, g, b, palette);

        data[i] = nearest[0];
        data[i + 1] = nearest[1];
        data[i + 2] = nearest[2];

        const er = r - nearest[0];
        const eg = g - nearest[1];
        const eb = b - nearest[2];

        if (x + 1 < w) distribute(i + 4, er, eg, eb, 7 / 16);
        if (y + 1 < h) {
          if (x > 0) distribute(i + (w - 1) * 4, er, eg, eb, 3 / 16);
          distribute(i + w * 4, er, eg, eb, 5 / 16);
          if (x + 1 < w) distribute(i + (w + 1) * 4, er, eg, eb, 1 / 16);
        }
      }
    }
  }

  function quantizeToPalette(data, palette) {
    for (let i = 0; i < data.length; i += 4) {
      const nearest = nearestColor(data[i], data[i + 1], data[i + 2], palette);
      data[i] = nearest[0];
      data[i + 1] = nearest[1];
      data[i + 2] = nearest[2];
      data[i + 3] = 255;
    }
  }

  function remapSafetyFence(data, palette) {
    for (let i = 0; i < data.length; i += 4) {
      const nearest = nearestColor(data[i], data[i + 1], data[i + 2], palette);
      data[i] = nearest[0];
      data[i + 1] = nearest[1];
      data[i + 2] = nearest[2];
      data[i + 3] = 255;
    }
  }

  function applyGlobal13ColorLimit(data, width, height, palette) {
    const u = selectUniversalColor(data, palette);
    const counter = new Map();
    for (let i = 0; i < data.length; i += 4) {
      const key = rgbKey(data[i], data[i + 1], data[i + 2]);
      if (key !== rgbKey(u[0], u[1], u[2])) counter.set(key, (counter.get(key) || 0) + 1);
    }

    const top12 = [...counter.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([key]) => keyToRgb(key));
    const allowed = [u, ...top12];

    for (let i = 0; i < data.length; i += 4) {
      const nearest = nearestColor(data[i], data[i + 1], data[i + 2], allowed);
      data[i] = nearest[0];
      data[i + 1] = nearest[1];
      data[i + 2] = nearest[2];
      data[i + 3] = 255;
    }

    void width;
    void height;
  }

  function applyHardwareBlockLimit(data, width, height, palette) {
    const universal = selectUniversalColor(data, palette);

    for (let by = 0; by < height; by += BLOCK_SIZE) {
      for (let bx = 0; bx < width; bx += BLOCK_SIZE) {
        const bw = Math.min(BLOCK_SIZE, width - bx);
        const bh = Math.min(BLOCK_SIZE, height - by);
        const histogram = new Map();

        for (let y = 0; y < bh; y += 1) {
          for (let x = 0; x < bw; x += 1) {
            const idx = ((by + y) * width + (bx + x)) * 4;
            const key = rgbKey(data[idx], data[idx + 1], data[idx + 2]);
            histogram.set(key, (histogram.get(key) || 0) + 1);
          }
        }

        const uKey = rgbKey(universal[0], universal[1], universal[2]);
        const top3 = [...histogram.entries()]
          .filter(([key]) => key !== uKey)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([key]) => keyToRgb(key));

        if (top3.length < 3) {
          for (const p of palette) {
            if (top3.length >= 3) break;
            const pKey = rgbKey(p[0], p[1], p[2]);
            if (pKey === uKey || top3.some((c) => rgbKey(c[0], c[1], c[2]) === pKey)) continue;
            top3.push(p);
          }
        }

        const allowed = [universal, ...top3];

        for (let y = 0; y < bh; y += 1) {
          for (let x = 0; x < bw; x += 1) {
            const idx = ((by + y) * width + (bx + x)) * 4;
            const nearest = nearestColor(data[idx], data[idx + 1], data[idx + 2], allowed);
            data[idx] = nearest[0];
            data[idx + 1] = nearest[1];
            data[idx + 2] = nearest[2];
            data[idx + 3] = 255;
          }
        }
      }
    }
  }

  function selectUniversalColor(data, palette) {
    if (state.universalBgMode === 'white') return nearestColor(255, 255, 255, palette);
    if (state.universalBgMode === 'black') return nearestColor(0, 0, 0, palette);

    const histogram = new Map();
    for (let i = 0; i < data.length; i += 4) {
      const key = rgbKey(data[i], data[i + 1], data[i + 2]);
      histogram.set(key, (histogram.get(key) || 0) + 1);
    }
    const sorted = [...histogram.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return palette[0];
    const [r, g, b] = keyToRgb(sorted[0][0]);
    return nearestColor(r, g, b, palette);
  }

  function nearestColor(r, g, b, palette) {
    const cacheKey = `${state.paletteMode}:${palette.length}:${r},${g},${b}`;
    if (state.colorCache.has(cacheKey)) return state.colorCache.get(cacheKey);

    let best = palette[0];
    let bestDist = Infinity;
    for (const p of palette) {
      const dr = r - p[0];
      const dg = g - p[1];
      const db = b - p[2];
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        best = p;
      }
    }

    state.colorCache.set(cacheKey, best);
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
    const msg = format(t('errorPrefix'), { msg: message });
    app.innerHTML = `
      <div class="error-box">
        <h2>${escapeHtml(msg)}</h2>
        <p>${escapeHtml(t('errorHint'))}</p>
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

  function updateStatus(ui) {
    if (!ui) return;
    if (!state.imgLoaded) {
      ui.status.textContent = t('statusNoImage');
      return;
    }
    ui.status.textContent = `${state.lastLoadedLabel} | ${format(t('statusSize'), {
      cropW: Math.round(state.cropRect.w), cropH: Math.round(state.cropRect.h), dotW: state.dotWidth, dotH: state.dotHeight
    })}`;
  }

  function applyI18n(lang) {
    const dictionary = I18N[lang] || I18N.ja;
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (dictionary[key]) node.textContent = dictionary[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
      const key = node.getAttribute('data-i18n-placeholder');
      if (dictionary[key]) node.setAttribute('placeholder', dictionary[key]);
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
      const key = node.getAttribute('data-i18n-aria-label');
      if (dictionary[key]) node.setAttribute('aria-label', dictionary[key]);
    });

    const titleEl = document.querySelector('title');
    if (titleEl) titleEl.textContent = dictionary.appTitle;

    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
      languageSelect.options[0].textContent = dictionary.languageJa;
      languageSelect.options[1].textContent = dictionary.languageEn;
    }

    state.lastLoadedLabel = state.imgLoaded
      ? format(t('statusLoaded'), {
        name: state.lastLoadedName || 'image',
        w: state.srcCanvas.width,
        h: state.srcCanvas.height
      })
      : '';
  }

  function getInitialLang() {
    const saved = localStorage.getItem('retrodot-lang');
    if (saved === 'ja' || saved === 'en') return saved;
    return (navigator.language || '').toLowerCase().startsWith('ja') ? 'ja' : 'en';
  }

  function t(key) {
    return (I18N[uiState.lang] && I18N[uiState.lang][key]) || I18N.ja[key] || key;
  }

  function format(template, params = {}) {
    return String(template).replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
  }

  function hexToRgb(hex) {
    const x = hex.replace('#', '');
    return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)];
  }

  function rgbKey(r, g, b) {
    return `${r},${g},${b}`;
  }

  function keyToRgb(key) {
    return key.split(',').map((v) => parseInt(v, 10));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clamp255(value) {
    return clamp(Math.round(value), 0, 255);
  }

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
})();
