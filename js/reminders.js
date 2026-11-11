/* reminders.js — 中栏：定时循环提醒事件（设置 / 列表 / 倒计时 / 到点蜂鸣+闪烁） */
(function () {
  const MAX_EVENTS = 20;
  let events = [];   // [{ id, comboIdx, intervalMin, remainMs }]
  let ticker = null;
  let muted = false;
  let uid = 1;

  function init() {
    const saved = Store.load(Store.KEYS.reminders, []);
    events = (Array.isArray(saved) ? saved : []).map(e => ({
      id: uid++,
      comboIdx: e.comboIdx,
      intervalMin: e.intervalMin,
      remainMs: e.intervalMin * 60000,
    }));

    // 组合序号下拉（1~20）
    const sel = document.getElementById('remComboSel');
    for (let i = 1; i <= 20; i++) {
      const opt = document.createElement('option');
      opt.value = i - 1;
      opt.textContent = `第 ${i} 组合`;
      sel.appendChild(opt);
    }

    document.getElementById('remAddBtn').addEventListener('click', addEvent);
    document.getElementById('muteChk').addEventListener('change', e => { muted = e.target.checked; });

    render();
    ticker = setInterval(tick, 1000);
  }

  function persist() {
    Store.save(Store.KEYS.reminders,
      events.map(e => ({ comboIdx: e.comboIdx, intervalMin: e.intervalMin })));
  }

  function addEvent() {
    if (events.length >= MAX_EVENTS) { Store.toast('最多 20 个提醒事件'); return; }
    const comboIdx = Number(document.getElementById('remComboSel').value);
    const min = Number(document.getElementById('remMinInput').value);
    if (!min || min <= 0) { Store.toast('请输入有效的间隔分钟数'); return; }
    events.push({ id: uid++, comboIdx, intervalMin: min, remainMs: min * 60000 });
    persist();
    render();
    Store.toast(`已添加：第 ${comboIdx + 1} 组合 / 每 ${min} 分钟`);
  }

  function removeEvent(id) {
    events = events.filter(e => e.id !== id);
    persist();
    render();
  }

  function tick() {
    if (!Timer.isActive()) return;   // 暂停 / 未开始 / 结束冻结时倒计时不走
    events.forEach(e => {
      e.remainMs -= 1000;
      if (e.remainMs <= 0) {
        e.remainMs = e.intervalMin * 60000;
        fire(e);
      }
    });
    renderCountdowns();
  }

  function fire(e) {
    const row = document.querySelector(`.reminder-item[data-id="${e.id}"]`);
    if (row) {
      row.classList.remove('firing');
      void row.offsetWidth;          // 重启动画
      row.classList.add('firing');
    }
    if (!muted) Store.beep(2);
  }

  function fmtMs(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function render() {
    const ol = document.getElementById('reminderList');
    ol.innerHTML = '';
    if (!events.length) {
      ol.innerHTML = '<li class="hint">暂无提醒事件，在上方添加</li>';
      return;
    }
    events.forEach(e => ol.appendChild(buildRow(e)));
  }

  function buildRow(e) {
    const li = document.createElement('li');
    li.className = 'reminder-item';
    li.dataset.id = e.id;

    const meta = document.createElement('div');
    meta.className = 'meta';
    const left = document.createElement('span');
    left.innerHTML = `<b>第 ${e.comboIdx + 1} 组合</b> · 每 ${e.intervalMin} 分钟`;
    const right = document.createElement('span');
    right.style.display = 'flex';
    right.style.alignItems = 'center';
    right.innerHTML = `<span class="countdown">⏳ ${fmtMs(e.remainMs)}</span>`;
    const del = document.createElement('button');
    del.className = 'del-btn';
    del.textContent = '🗑';
    del.title = '删除该提醒';
    del.addEventListener('click', () => removeEvent(e.id));
    right.appendChild(del);
    meta.appendChild(left);
    meta.appendChild(right);

    const snap = document.createElement('div');
    snap.className = 'combo-snapshot';
    snap.textContent = Combos.hasContent(e.comboIdx)
      ? '📌 ' + Combos.assemble(e.comboIdx)
      : '（该组合暂无已保存内容）';

    li.appendChild(meta);
    li.appendChild(snap);
    return li;
  }

  function renderCountdowns() {
    events.forEach(e => {
      const row = document.querySelector(`.reminder-item[data-id="${e.id}"] .countdown`);
      if (row) row.textContent = `⏳ ${fmtMs(e.remainMs)}`;
    });
  }

  /* 重新开始：所有事件倒计时重置 */
  function restart() {
    events.forEach(e => { e.remainMs = e.intervalMin * 60000; });
    render();
  }

  window.Reminders = { init, restart };
})();
