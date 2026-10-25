/* store.js — localStorage 读写与全局小工具 */
(function () {
  const KEYS = {
    combos: 'gm.combos.v1',
    notes: 'gm.notes.v1',
    dice: 'gm.dice.v1',
    reminders: 'gm.reminders.v1',
  };

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* 存储配额满或被禁用时静默降级（本次不持久化，不中断使用流程） */
    }
  }

  /* Toast 提示 */
  let toastTimer = null;
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
  }

  /* WebAudio 蜂鸣（提醒到点） */
  function beep(times = 2) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      if (ctx.state === 'suspended') ctx.resume();   // 浏览器自动播放策略兜底
      for (let i = 0; i < times; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = 880;
        const t = ctx.currentTime + i * 0.35;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.25, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        osc.start(t);
        osc.stop(t + 0.3);
      }
    } catch (e) { /* 无音频环境时静默 */ }
  }

  window.Store = { KEYS, load, save, toast, beep };
})();
