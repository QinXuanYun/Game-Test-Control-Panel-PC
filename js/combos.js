/* combos.js — 左栏：20 个行动组合的填写 / 保存 / 重置 / 筛选 */
(function () {
  const CONNS = ['和', '或', '做', '不做'];
  const SLOT_COUNT = 8;   // 8 个文本输入位
  const CONN_COUNT = 6;   // 6 个连接器下拉（I1 S1 I2 S2 I3 S3 I4「的情况下」I5 S4 I6 S5 I7 S6 I8）
  const TOTAL = 20;

  /* 内存数据：[{ slots:[8], conns:[6] }, ...] */
  let data = [];
  let filterKeywords = [];

  function emptyCombo() {
    return { slots: Array(SLOT_COUNT).fill(''), conns: Array(CONN_COUNT).fill('和') };
  }

  function init() {
    const saved = Store.load(Store.KEYS.combos, null);
    if (saved && Array.isArray(saved) && saved.length === TOTAL) {
      data = saved;
    } else {
      data = Array.from({ length: TOTAL }, emptyCombo);
    }
    render();
  }

  /* 压缩一段（4 个输入 + 3 个连接器）：
     空输入跳过；连接器只在“左边已有输出、右边紧跟的输入非空”时保留，
     从而删去所有悬空的连接词（如 “A 和 的情况下 B” → “A 的情况下 B”） */
  function joinCompact(inputs, conns) {
    const parts = [];
    inputs.forEach((s, k) => {
      if (!s.trim()) return;
      if (parts.length && k > 0) parts.push(conns[k - 1]);
      parts.push(s.trim());
    });
    return parts.join(' ');
  }

  /* 组装第 i 个组合的纯文本（用于快照 / 生成图片 / 关键词匹配） */
  function assemble(i) {
    const d = data[i];
    const front = joinCompact(
      [d.slots[0], d.slots[1], d.slots[2], d.slots[3]],
      [d.conns[0], d.conns[1], d.conns[2]]);
    const back = joinCompact(
      [d.slots[4], d.slots[5], d.slots[6], d.slots[7]],
      [d.conns[3], d.conns[4], d.conns[5]]);
    if (front && back) return `${front} 的情况下 ${back}`;
    return front || back || '';
  }

  function hasContent(i) {
    return data[i].slots.some(s => s.trim() !== '');
  }

  function isUnused(i) {
    // 全部输入为空且全部下拉保持默认值「和」
    return !hasContent(i) && data[i].conns.every(c => c === '和');
  }

  function getUsedList() {
    const list = [];
    for (let i = 0; i < TOTAL; i++) {
      if (hasContent(i)) list.push({ index: i + 1, text: assemble(i) });
    }
    return list;
  }

  /* ───── 渲染 ───── */
  function render() {
    const ol = document.getElementById('comboList');
    ol.innerHTML = '';
    for (let i = 0; i < TOTAL; i++) {
      ol.appendChild(buildComboNode(i));
    }
    applyFilter();
    updateBadge();
  }

  function buildComboNode(i) {
    const d = data[i];
    const li = document.createElement('li');
    li.className = 'combo';
    li.dataset.index = i;
    if (isUnused(i)) li.classList.add('collapsed');
    if (hasContent(i)) li.classList.add('used');

    const head = document.createElement('div');
    head.className = 'combo-head';
    head.innerHTML = `<span>第 ${i + 1} 组合</span>` +
      (hasContent(i) ? `<span class="badge">已填写</span>` : '');
    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.textContent = '▼';
    head.appendChild(arrow);
    head.addEventListener('click', () => li.classList.toggle('collapsed'));

    const body = document.createElement('div');
    body.className = 'combo-body';

    // I1 S1 I2 S2 I3 S3 I4 「的情况下」 I5 S4 I6 S5 I7 S6 I8
    const layout = [
      ['i', 0], ['s', 0], ['i', 1], ['s', 1], ['i', 2], ['s', 2], ['i', 3],
      ['kw', '的情况下'],
      ['i', 4], ['s', 3], ['i', 5], ['s', 4], ['i', 6], ['s', 5], ['i', 7],
    ];
    layout.forEach(node => {
      if (node[0] === 'i') {
        const idx = node[1];
        const input = document.createElement('input');
        input.className = 'neu-input';
        input.type = 'text';
        input.value = d.slots[idx];
        input.dataset.slot = idx;
        input.placeholder = `条目${idx + 1}`;
        body.appendChild(input);
      } else if (node[0] === 's') {
        const idx = node[1];
        const sel = document.createElement('select');
        sel.className = 'neu-input';
        sel.dataset.conn = idx;
        CONNS.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c; opt.textContent = c;
          if (d.conns[idx] === c) opt.selected = true;
          sel.appendChild(opt);
        });
        body.appendChild(sel);
      } else {
        const kw = document.createElement('span');
        kw.className = 'kw';
        kw.textContent = node[1];
        body.appendChild(kw);
      }
    });

    li.appendChild(head);
    li.appendChild(body);
    return li;
  }

  function updateBadge() {
    const used = getUsedList().length;
    document.getElementById('comboCountBadge').textContent = `${used} / 20`;
  }

  /* ───── 读取 DOM 到内存 ───── */
  function collectFromDOM() {
    document.querySelectorAll('#comboList .combo').forEach(li => {
      const i = Number(li.dataset.index);
      li.querySelectorAll('input[data-slot]').forEach(inp => {
        data[i].slots[Number(inp.dataset.slot)] = inp.value;
      });
      li.querySelectorAll('select[data-conn]').forEach(sel => {
        data[i].conns[Number(sel.dataset.conn)] = sel.value;
      });
    });
  }

  /* ───── 保存：格式规整 + 覆盖存储 + 折叠未使用组合 ───── */
  function save() {
    collectFromDOM();
    data.forEach(d => {
      d.slots = d.slots.map(s => s.replace(/\s+/g, ' ').trim());
    });
    Store.save(Store.KEYS.combos, data);

    // 折叠未使用组合，有内容的展开
    document.querySelectorAll('#comboList .combo').forEach(li => {
      const i = Number(li.dataset.index);
      li.classList.toggle('collapsed', isUnused(i));
      li.classList.toggle('used', hasContent(i));
      const badge = li.querySelector('.badge');
      if (hasContent(i) && !badge) {
        li.querySelector('.combo-head').insertAdjacentHTML(
          'beforeend', '<span class="badge">已填写</span>');
      } else if (!hasContent(i) && badge) {
        badge.remove();
      }
    });
    applyFilter();
    updateBadge();
    Store.toast('已保存到浏览器');
  }

  /* ───── 重置 ───── */
  function reset() {
    data = Array.from({ length: TOTAL }, emptyCombo);
    filterKeywords = [];
    document.getElementById('filterInput').value = '';
    localStorage.removeItem(Store.KEYS.combos);
    render();
    Store.toast('已恢复默认组合');
  }

  /* ───── 筛选 ───── */
  function applyFilter() {
    document.querySelectorAll('#comboList .combo').forEach(li => {
      const i = Number(li.dataset.index);
      let show = true;
      if (filterKeywords.length) {
        const text = assemble(i).toLowerCase();
        show = filterKeywords.every(k => text.includes(k.toLowerCase()));
      }
      li.classList.toggle('filtered-out', !show);
    });
  }

  function applyFilterFromInput() {
    const kw = document.getElementById('filterInput').value.trim();
    filterKeywords = kw ? kw.split(/\s+/) : [];
    collectFromDOM();
    applyFilter();
    Store.toast(filterKeywords.length ? `已筛选：${filterKeywords.length} 个条件` : '已显示全部组合');
  }

  window.Combos = { init, save, reset, applyFilterFromInput, getUsedList, hasContent, assemble, CONNS };
})();
