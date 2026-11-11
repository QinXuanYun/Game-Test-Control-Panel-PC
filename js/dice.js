/* dice.js — 右下：真随机骰子（crypto.getRandomValues + 拒绝采样） */
(function () {
  const RANGES = { '0-10': 11, '1-100': 100, '1-6': 6 }; // 各范围的可选数量

  let groups = [];

  /* 真随机整数 [0, max)，拒绝采样消除取模偏差 */
  function randInt(max) {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / max) * max;
    let x;
    do {
      crypto.getRandomValues(buf);
      x = buf[0];
    } while (x >= limit);
    return x % max;
  }

  function rollValue(rangeKey) {
    const n = RANGES[rangeKey];
    const v = randInt(n);
    return rangeKey === '0-10' ? v : v + 1;   // 0-10 从 0 起；其余从 1 起
  }

  /* 标签：正序 A,B,C…；倒序 = 从字母表末尾向前数 N 位，显示仍按正序 */
  function labelFor(order, digits, i) {
    if (order === 'dao') return String.fromCharCode(90 - (digits - 1 - i));
    return String.fromCharCode(65 + i);
  }

  function defaultGroups() {
    return [
      { digits: 3, order: 'zheng', range: '1-100', collapsed: false, results: [] },
      { digits: 5, order: 'zheng', range: '1-100', collapsed: false, results: [] },
    ];
  }

  function init() {
    const saved = Store.load(Store.KEYS.dice, null);
    groups = saved && Array.isArray(saved) && saved.length
      ? saved.map(g => ({ ...defaultGroups()[0], ...g, results: [] }))
      : defaultGroups();
    render();
    document.getElementById('rollBtn').addEventListener('click', rollAll);
  }

  function persist() {
    Store.save(Store.KEYS.dice,
      groups.map(g => ({ digits: g.digits, order: g.order, range: g.range, collapsed: g.collapsed })));
  }

  function rollAll() {
    let anyVisible = false;
    groups.forEach(g => {
      if (g.collapsed) return;
      anyVisible = true;
      g.results = Array.from({ length: g.digits }, (_, i) => ({
        label: labelFor(g.order, g.digits, i),
        value: rollValue(g.range),
      }));
    });
    if (!anyVisible) { Store.toast('所有骰子列都被折叠了'); return; }
    render();
  }

  function render() {
    const box = document.getElementById('diceGroups');
    box.innerHTML = '';
    groups.forEach((g, gi) => {
      const div = document.createElement('div');
      div.className = 'dice-group' + (g.collapsed ? ' collapsed' : '');

      // 头部：折叠勾选 + 位数 + 正倒序 + 范围
      const head = document.createElement('div');
      head.className = 'dice-group-head';

      const foldLabel = document.createElement('label');
      const foldChk = document.createElement('input');
      foldChk.type = 'checkbox';
      foldChk.checked = g.collapsed;
      foldChk.addEventListener('change', () => {
        g.collapsed = foldChk.checked;
        persist();
        render();
      });
      foldLabel.appendChild(foldChk);
      foldLabel.appendChild(document.createTextNode('折叠此列'));

      const digitsInput = document.createElement('input');
      digitsInput.className = 'neu-input small';
      digitsInput.type = 'number';
      digitsInput.min = 1; digitsInput.max = 26;
      digitsInput.value = g.digits;
      digitsInput.style.width = '70px';
      digitsInput.addEventListener('change', () => {
        const v = Math.min(26, Math.max(1, Number(digitsInput.value) || 1));
        g.digits = v; digitsInput.value = v;
        g.results = [];
        persist(); render();
      });

      const orderSel = document.createElement('select');
      orderSel.className = 'neu-input small';
      [['zheng', '正序'], ['dao', '倒序']].forEach(([val, txt]) => {
        const o = document.createElement('option');
        o.value = val; o.textContent = txt;
        if (g.order === val) o.selected = true;
        orderSel.appendChild(o);
      });
      orderSel.addEventListener('change', () => {
        g.order = orderSel.value; g.results = [];
        persist(); render();
      });

      const rangeSel = document.createElement('select');
      rangeSel.className = 'neu-input small';
      [['0-10', '0~10'], ['1-100', '1~100'], ['1-6', '1~6']].forEach(([val, txt]) => {
        const o = document.createElement('option');
        o.value = val; o.textContent = txt;
        if (g.range === val) o.selected = true;
        rangeSel.appendChild(o);
      });
      rangeSel.addEventListener('change', () => {
        g.range = rangeSel.value; g.results = [];
        persist(); render();
      });

      head.appendChild(foldLabel);
      head.appendChild(Object.assign(document.createElement('span'),
        { textContent: '位数:', className: 'sub-title' }));
      head.appendChild(digitsInput);
      head.appendChild(orderSel);
      head.appendChild(rangeSel);

      // 结果区
      const results = document.createElement('div');
      results.className = 'dice-results';
      if (g.results.length) {
        g.results.forEach(r => {
          const cell = document.createElement('span');
          cell.className = 'cell';
          cell.innerHTML = `${r.label}: <b>${r.value}</b>`;
          results.appendChild(cell);
        });
      } else {
        results.innerHTML = '<span class="hint">点击“投掷”出数</span>';
      }

      div.appendChild(head);
      div.appendChild(results);
      box.appendChild(div);
    });
  }

  window.Dice = { init };
})();
