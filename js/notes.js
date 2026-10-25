/* notes.js — 右中：笔记有序列表（默认 4 条，可增删） */
(function () {
  let notes = [];

  function init() {
    const saved = Store.load(Store.KEYS.notes, null);
    notes = Array.isArray(saved) && saved.length ? saved : ['', '', '', ''];
    render();
    document.getElementById('noteAddBtn').addEventListener('click', () => {
      notes.push('');
      persist();
      render();
    });
  }

  function persist() { Store.save(Store.KEYS.notes, notes); }

  function render() {
    const ol = document.getElementById('noteList');
    ol.innerHTML = '';
    notes.forEach((text, i) => {
      const li = document.createElement('li');
      li.className = 'note-item';
      const input = document.createElement('input');
      input.className = 'neu-input';
      input.type = 'text';
      input.value = text;
      input.placeholder = `笔记 ${i + 1}`;
      input.addEventListener('input', () => {
        notes[i] = input.value;
        persist();
      });
      const del = document.createElement('button');
      del.className = 'del-btn';
      del.textContent = '✕';
      del.title = '删除该条';
      del.addEventListener('click', () => {
        notes.splice(i, 1);
        persist();
        render();
      });
      li.appendChild(input);
      li.appendChild(del);
      ol.appendChild(li);
    });
  }

  /* 重新开始时丢弃笔记，恢复默认 4 条空行 */
  function clearAll() {
    notes = ['', '', '', ''];
    persist();
    render();
  }

  window.Notes = { init, clearAll };
})();
