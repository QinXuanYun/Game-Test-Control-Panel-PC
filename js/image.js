/* image.js — 右上图区：本地图片选择 / 生成组合图 / 灯箱（缩放·拖拽·下载） */
(function () {
  let currentSrc = null;   // 当前图片 dataURL
  let scale = 1, tx = 0, ty = 0;

  const stageImg = () => document.getElementById('stageImg');
  const imagePanel = () => document.getElementById('imageStage');

  function setImage(src) {
    currentSrc = src;
    const img = stageImg();
    img.src = src;
    img.hidden = false;
    document.getElementById('imageHint').hidden = true;
  }

  /* ───── 本地图片选择 ───── */
  function pickLocal() {
    if (currentSrc) { openLightbox(); return; }   // 已有图片 → 开灯箱
    document.getElementById('fileInput').click();
  }

  function onFileChosen(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { Store.toast('请选择图片文件'); return; }
    const reader = new FileReader();
    reader.onload = ev => setImage(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  /* ───── 由“显示”按钮生成组合 PNG ───── */
  function generateFromCombos() {
    const used = Combos.getUsedList();
    if (!used.length) { Store.toast('请先保存后再生成显示'); return false; }

    const W = 920;
    const pad = 48;
    const lineH = 34;
    const titleH = 90;
    const rowGap = 26;

    // 先计算每行文本换后的行数
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = '20px "PingFang SC", "Microsoft YaHei", sans-serif';

    const rows = used.map(c => {
      const prefix = `第${c.index}组合：`;
      const lines = wrapText(ctx, prefix + c.text, W - pad * 2);
      return { ...c, lines };
    });
    const H = titleH + rows.reduce((sum, r) => sum + r.lines.length * lineH + rowGap, 0) + pad;

    canvas.width = W;
    canvas.height = H;

    // 背景（新拟态浅色卡片）
    ctx.fillStyle = '#F6F6F8';
    roundRect(ctx, 0, 0, W, H, 28);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, 14, 14, W - 28, H - 28, 20);
    ctx.fill();

    // 标题
    ctx.fillStyle = '#00ABFF';
    ctx.font = 'bold 30px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('🎯 行动组合速查卡', pad, 56);
    ctx.fillStyle = '#8e8e93';
    ctx.font = '16px sans-serif';
    ctx.fillText(new Date().toLocaleString('zh-CN'), W - pad - ctx.measureText(new Date().toLocaleString('zh-CN')).width, 56);

    // 组合列表
    let y = titleH;
    rows.forEach(r => {
      r.lines.forEach((line, li) => {
        if (li === 0) {
          ctx.fillStyle = '#FF99CC';
          ctx.font = 'bold 20px "PingFang SC", "Microsoft YaHei", sans-serif';
        } else {
          ctx.fillStyle = '#3a3a3c';
          ctx.font = '20px "PingFang SC", "Microsoft YaHei", sans-serif';
        }
        ctx.fillText(line, pad, y);
        y += lineH;
      });
      y += rowGap - lineH + 8;
    });

    setImage(canvas.toDataURL('image/png'));
    Store.toast('已生成组合图片');
    return true;
  }

  function wrapText(ctx, text, maxWidth) {
    const lines = [];
    let line = '';
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxWidth) {
        lines.push(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ───── 灯箱 ───── */
  function openLightbox() {
    if (!currentSrc) return;
    const lb = document.getElementById('lightbox');
    document.getElementById('lbImg').src = currentSrc;
    resetView();
    lb.classList.remove('hidden');
  }
  function closeLightbox() {
    document.getElementById('lightbox').classList.add('hidden');
  }
  function resetView() {
    scale = 1; tx = 0; ty = 0;
    applyTransform();
  }
  function applyTransform() {
    const img = document.getElementById('lbImg');
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    document.getElementById('lbZoomLabel').textContent = Math.round(scale * 100) + '%';
  }
  function zoom(delta) {
    scale = Math.min(5, Math.max(0.5, scale + delta));
    applyTransform();
  }

  function init() {
    imagePanel().addEventListener('click', pickLocal);
    document.getElementById('fileInput').addEventListener('change', onFileChosen);

    document.getElementById('lbClose').addEventListener('click', closeLightbox);
    document.getElementById('lbZoomIn').addEventListener('click', () => zoom(0.25));
    document.getElementById('lbZoomOut').addEventListener('click', () => zoom(-0.25));
    document.getElementById('lightbox').addEventListener('click', e => {
      if (e.target.id === 'lightbox') closeLightbox();
    });
    document.getElementById('lbDownload').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = currentSrc;
      a.download = `游戏台图片_${Date.now()}.png`;
      a.click();
    });

    // 滚轮缩放
    document.getElementById('lbStage').addEventListener('wheel', e => {
      e.preventDefault();
      zoom(e.deltaY < 0 ? 0.2 : -0.2);
    }, { passive: false });

    // 拖拽平移
    let dragging = false, lastX = 0, lastY = 0;
    const stage = document.getElementById('lbStage');
    stage.addEventListener('mousedown', e => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
    });
    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      tx += e.clientX - lastX;
      ty += e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      applyTransform();
    });
    window.addEventListener('mouseup', () => { dragging = false; });
  }

  window.ImagePanel = { init, generateFromCombos };
})();
