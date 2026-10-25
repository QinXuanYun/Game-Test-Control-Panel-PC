/* app.js — 总装配：按钮绑定 / 结束冻结 / 重新开始 */
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    Combos.init();
    Timer.init();
    Reminders.init();
    ImagePanel.init();
    Notes.init();
    Dice.init();

    /* 左栏按钮 */
    document.getElementById('saveBtn').addEventListener('click', () => Combos.save());
    document.getElementById('resetBtn').addEventListener('click', () => {
      if (confirm('确定重置全部组合吗？已保存的内容将被清空。')) Combos.reset();
    });
    document.getElementById('showBtn').addEventListener('click', () => ImagePanel.generateFromCombos());
    document.getElementById('filterBtn').addEventListener('click', () => Combos.applyFilterFromInput());

    /* 结束 / 重新开始 */
    const endBtn = document.getElementById('endBtn');
    const restartBtn = document.getElementById('restartBtn');

    endBtn.addEventListener('click', () => {
      Timer.freeze();                       // 主计时与提醒倒计时全部冻结
      document.body.classList.add('frozen');
      restartBtn.disabled = false;          // 解冻唯一出口
      Store.toast('⏹ 游戏已结束');
    });

    restartBtn.addEventListener('click', () => {
      Timer.restart();                      // 计时归零，回到待开始
      Reminders.restart();                 // 提醒倒计时重置
      Notes.clearAll();                     // 丢弃笔记
      document.body.classList.remove('frozen');
      restartBtn.disabled = true;
      Store.toast('↻ 已重新开始（组合保留，笔记已清空）');
    });
  });
})();
