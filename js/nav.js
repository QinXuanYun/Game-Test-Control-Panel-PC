/* nav.js — 底部导航：把三栏九区归并为 4 个 Tab，整列联动隐藏。
   宽屏（桌面）时 CSS 不生效，三栏同显；仅窄屏（手机）启用 Tab。 */
(function () {
  /* 每个 tab 激活哪一列（左/中/右） */
  const TAB_COLUMN = {
    game: 'col-center',     // 计时/提醒/随机事件/结束 都在中栏
    combos: 'col-left',     // 筛选/组合/按钮 都在左栏
    tools: 'col-right',    // 图片/骰子 在右栏
    notes: 'col-right',    // 笔记 在右栏
  };

  function switchTab(name) {
    /* 1) 隐藏不属于本 tab 的区域（只选 section，不影响 nav 按钮自身的 data-tab） */
    document.querySelectorAll('section[data-tab]').forEach(el => {
      el.classList.toggle('tab-hidden', el.dataset.tab !== name);
    });
    /* 2) 只显示本 tab 所属的那一列，其余两列整列隐藏 */
    document.querySelectorAll('.col').forEach(col => {
      col.classList.toggle('tab-hidden', !col.classList.contains(TAB_COLUMN[name]));
    });
    /* 3) 高亮当前 nav 按钮 */
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === name);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function init() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    switchTab('game');   // 默认进游戏 tab（宽屏时 CSS 不生效，无影响）
  }

  window.Nav = { init, switchTab };
})();
