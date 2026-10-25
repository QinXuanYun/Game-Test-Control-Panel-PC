/* timer.js — 中栏：游戏主计时（开始/暂停/继续/小重置/结束冻结/重新开始） */
(function () {
  let elapsed = 0;        // 已计时秒数
  let status = 'idle';   // idle | running | paused | frozen
  let ticker = null;

  const timeEl = () => document.getElementById('timerTime');
  const tipEl = () => document.getElementById('timerRedTip');

  function fmt(sec) {
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function render() {
    timeEl().textContent = fmt(elapsed);
  }

  function loop() {
    elapsed++;
    render();
  }

  function startTicker() {
    stopTicker();
    ticker = setInterval(loop, 1000);
  }
  function stopTicker() {
    if (ticker) { clearInterval(ticker); ticker = null; }
  }

  function setRunningUI(running) {
    tipEl().classList.toggle('hidden', running);
    timeEl().classList.toggle('hidden', !running);
  }

  function start() {
    if (status === 'running') { Store.toast('已经在计时中'); return; }
    if (status === 'paused') { resume(); return; }
    if (status === 'frozen') { Store.toast('游戏已结束，请先重新开始'); return; }
    status = 'running';
    setRunningUI(true);
    startTicker();
  }

  function pause() {
    if (status !== 'running') { Store.toast('请先“开始”计时'); return; }
    status = 'paused';
    stopTicker();
  }

  function resume() {
    if (status === 'running') { Store.toast('已经在计时中'); return; }
    if (status === 'frozen') { Store.toast('游戏已结束，请先重新开始'); return; }
    /* 待开始态（含重置后）继续无效，必须点“开始”启动；仅暂停中可恢复 */
    if (status !== 'paused') { Store.toast('请先“开始”计时'); return; }
    status = 'running';
    startTicker();
  }

  /* 小重置：确认后归零并停表，回到待开始态（红字提示）；
     选否/关闭则计时继续，不受影响 */
  function resetTimer() {
    if (status === 'idle' || status === 'frozen') { Store.toast('请先“开始”计时'); return; }
    const ok = confirm('确定将计时归零吗？\n（选“取消”则计时继续，不受影响）');
    if (ok) {
      elapsed = 0;
      status = 'idle';
      stopTicker();
      render();
      setRunningUI(false);   // 红字“请先开始计时”，隐藏时间
      if (window.Reminders) window.Reminders.restart();   // 提醒倒计时随游戏计时一并重置
      Store.toast('计时已归零，按“开始”重新计时');
    }
  }

  /* 结束：冻结 */
  function freeze() {
    status = 'frozen';
    stopTicker();
  }

  /* 重新开始：归零并回到待开始状态 */
  function restart() {
    elapsed = 0;
    status = 'idle';
    stopTicker();
    render();
    setRunningUI(false);
  }

  function isActive() { return status === 'running'; }
  function isFrozen() { return status === 'frozen'; }

  function init() {
    render();
    document.getElementById('startBtn').addEventListener('click', start);
    document.getElementById('pauseBtn').addEventListener('click', pause);
    document.getElementById('resumeBtn').addEventListener('click', resume);
    document.getElementById('timerResetBtn').addEventListener('click', resetTimer);
  }

  window.Timer = { init, start, pause, resume, freeze, restart, isActive, isFrozen };
})();
