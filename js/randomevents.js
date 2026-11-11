/* randomevents.js — 中栏：随机事件（最多10个，随机触发时机+随机持续时长，开局宽限期） */
(function () {
  const MAX = 10;
  let events = [];     // [{ id, text, intervalMin, intervalMax, durationMin, durationMax, state, nextMs, remainMs }]
  let graceMin = 10;
  let started = false; // 是否已为本局游戏排程过（开始计时后首次 tick 触发）
  let uid = 1;

  /* 真随机整数 [min, max]（分钟），拒绝采样 */
  function randMin(min, max) {
    const buf = new Uint32Array(1);
    const span = max - min + 1;
    const limit = Math.floor(0x100000000 / span) * span;
    let x;
    do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
    return min + (x % span);
  }

  function blankEvent() {
    return {
      id: uid++, text: '',
      intervalMin: 5, intervalMax: 15,
      durationMin: 2, durationMax: 5,
      state: 'waiting', nextMs: null, remainMs: null,
    };
  }

  function init() {
    const saved = Store.load(Store.KEYS.randevents, null);
    if (saved && Array.isArray(saved.events)) {
      graceMin = typeof saved.graceMin === 'number' ? saved.graceMin : 10;
      events = saved.events.map(e => ({ ...blankEvent(), ...e, state: 'waiting', nextMs: null, remainMs: null }));
    } else {
      events = [];
    }
    document.getElementById('graceMinInput').value = graceMin;
    document.getElementById('graceMinInput').addEventListener('change', e => {
      graceMin = Math.max(0, Number(e.target.value) || 0);
      e.target.value = graceMin;
      persist();
    });
    document.getElementById('randEventAddBtn').addEventListener('click', addEvent);
    render();
    setInterval(tick, 1000);
  }

  function persist() {
    Store.save(Store.KEYS.randevents, {
      graceMin,
      events: events.map(e => ({
        text: e.text, intervalMin: e.intervalMin, intervalMax: e.intervalMax,
        durationMin: e.durationMin, durationMax: e.durationMax,
      })),
    });
  }

  function addEvent() {
    if (events.length >= MAX) { Store.toast('最多 10 个随机事件'); return; }
    events.push(blankEvent());
    persist();
    render();
  }

  function removeEvent(id) {
    events = events.filter(e => e.id !== id);
    persist();
    render();
  }

  function scheduleNext(e) {
    e.state = 'waiting';
    e.nextMs = randMin(e.intervalMin, e.intervalMax) * 60000;
    e.remainMs = null;
  }

  function fireStart(e) {
    e.state = 'active';
    e.remainMs = randMin(e.durationMin, e.durationMax) * 60000;
    const row = document.querySelector(`.rand-event-item[data-id="${e.id}"]`);
    if (row) { row.classList.remove('firing'); void row.offsetWidth; row.classList.add('firing'); }
    Store.beep(3);
    Store.toast('⚡ 随机事件触发：' + (e.text || '(未命名)'));
  }

  function fireEnd(e) {
    scheduleNext(e);
  }

  function tick() {
    if (!Timer.isActive()) { started = false; return; }
    if (!events.length) return;

    /* 本局首次开始：给所有 waiting 事件排程 */
    if (!started) {
      started = true;
      events.forEach(e => { if (e.state !== 'active' && e.nextMs === null) scheduleNext(e); });
    }

    /* 宽限期内（开局前 N 分钟）倒计时冻结 */
    if (Timer.elapsedSeconds() < graceMin * 60) return;

    events.forEach(e => {
      if (e.state === 'waiting' && e.nextMs !== null) {
        e.nextMs -= 1000;
        if (e.nextMs <= 0) fireStart(e);
      } else if (e.state === 'active' && e.remainMs !== null) {
        e.remainMs -= 1000;
        if (e.remainMs <= 0) fireEnd(e);
      }
    });
    renderCountdowns();
  }

  function fmtMs(ms) {
    if (ms === null) return '--:--';
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function render() {
    const box = document.getElementById('randEventList');
    box.innerHTML = '';
    document.getElementById('randEventCountBadge').textContent = `${events.length} / 10`;
    if (!events.length) {
      box.innerHTML = '<p class="hint">暂无随机事件，点右上角“添加事件”</p>';
      return;
    }
    events.forEach(e => box.appendChild(buildRow(e)));
  }

  function buildRow(e) {
    const li = document.createElement('div');
    li.className = 'rand-event-item';
    li.dataset.id = e.id;

    const head = document.createElement('div');
    head.className = 'rand-event-head';

    const input = document.createElement('input');
    input.className = 'neu-input';
    input.type = 'text';
    input.value = e.text;
    input.placeholder = `事件 ${e.id} 内容`;
    input.addEventListener('input', () => { e.text = input.value; persist(); });

    const del = document.createElement('button');
    del.className = 'del-btn';
    del.textContent = '🗑';
    del.title = '删除该事件';
    del.addEventListener('click', () => removeEvent(e.id));
    head.appendChild(input);
    head.appendChild(del);

    const cfg = document.createElement('div');
    cfg.className = 'rand-event-cfg';
    cfg.innerHTML =
      `<label class="mute-switch">触发
        <input type="number" class="neu-input small re-int" data-k="intervalMin" min="1" value="${e.intervalMin}" style="width:60px">
        ~
        <input type="number" class="neu-input small re-int" data-k="intervalMax" min="1" value="${e.intervalMax}" style="width:60px">
        分钟一次</label>
       <label class="mute-switch">持续
        <input type="number" class="neu-input small re-int" data-k="durationMin" min="1" value="${e.durationMin}" style="width:60px">
        ~
        <input type="number" class="neu-input small re-int" data-k="durationMax" min="1" value="${e.durationMax}" style="width:60px">
        分钟</label>`;
    cfg.querySelectorAll('.re-int').forEach(inp => {
      inp.addEventListener('change', () => {
        const k = inp.dataset.k;
        e[k] = Math.max(1, Number(inp.value) || 1);
        inp.value = e[k];
        scheduleNext(e);   // 参数变了，重新排程
        persist();
        renderCountdowns();
      });
    });

    const status = document.createElement('div');
    status.className = 'rand-event-status';
    status.innerHTML = e.state === 'active'
      ? `<span class="re-live">🔴 进行中，剩余 ${fmtMs(e.remainMs)}</span>`
      : `<span class="re-wait">⏳ ${fmtMs(e.nextMs)} 后触发</span>`;

    li.appendChild(head);
    li.appendChild(cfg);
    li.appendChild(status);
    return li;
  }

  function renderCountdowns() {
    events.forEach(e => {
      const row = document.querySelector(`.rand-event-item[data-id="${e.id}"] .rand-event-status`);
      if (!row) return;
      row.innerHTML = e.state === 'active'
        ? `<span class="re-live">🔴 进行中，剩余 ${fmtMs(e.remainMs)}</span>`
        : `<span class="re-wait">⏳ ${fmtMs(e.nextMs)} 后触发</span>`;
    });
  }

  /* 计时重置 / 重新开始：清空排程，等下一次开始重新排 */
  function restart() {
    started = false;
    events.forEach(e => { e.state = 'waiting'; e.nextMs = null; e.remainMs = null; });
    render();
  }

  window.RandomEvents = { init, restart };
})();
