/* ============================================================
   社区练习页脚本（T2 发帖渲染 + T3 搜索筛选）
   核心思路：
     - posts 数组是唯一数据源（存 localStorage）
     - 页面上看到的一切都是 render() 从数组画出来的
     - 发帖 = 往数组头部加一条 → 重新 render
     - 搜索/筛选 = 不改数组，只改「这次要展示哪些」再 render
   ============================================================ */
(function () {
  'use strict';

  var STORE_KEY = 'campus_net_2_community_v1';

  var state = {
    posts: [],        /* 全部帖子 */
    keyword: '',      /* 搜索关键词 */
    board: '全部'     /* 版块筛选 */
  };

  /* ---------- 读写 localStorage ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];      /* 数据损坏时当作空列表，不报错 */
    }
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.posts)); } catch (e) {}
  }

  /* ---------- 相对时间：<60s 刚刚 / <60min x 分钟前 / 今年 MM-DD / 跨年 YYYY-MM-DD ---------- */
  function timeAgo(ts) {
    var diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    var d = new Date(ts);
    var mm = (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1);
    var dd = (d.getDate() < 10 ? '0' : '') + d.getDate();
    if (d.getFullYear() === new Date().getFullYear()) return mm + '-' + dd;
    return d.getFullYear() + '-' + mm + '-' + dd;
  }

  /* ---------- T3：把搜索 + 版块筛选叠加起来，返回「这次要展示的帖子」 ---------- */
  function visiblePosts() {
    var kw = state.keyword.trim().toLowerCase();
    return state.posts.filter(function (p) {
      var boardOk = state.board === '全部' || p.board === state.board;
      var kwOk = !kw ||
        p.title.toLowerCase().indexOf(kw) > -1 ||
        p.content.toLowerCase().indexOf(kw) > -1;
      return boardOk && kwOk;
    });
  }

  /* ---------- T2：渲染列表（map + 模板字符串，不手写重复 HTML） ---------- */
  function render() {
    var box = document.getElementById('postList');
    var list = visiblePosts();

    if (!list.length) {
      /* 空状态：一个帖子都没有 vs 搜出来了 0 条，文案不同 */
      box.innerHTML = '<div class="list-state">' +
        (state.posts.length ? '没找到相关内容' : '还没有帖子，来发第一条吧') +
        '</div>';
      return;
    }

    box.innerHTML = list.map(function (p) {
      return '<article class="community-post">' +
               '<div class="post-top">' +
                 '<span class="tag tag-blue">' + esc(p.board) + '</span>' +
                 '<span class="post-author">' + esc(p.author) + '</span>' +
                 '<span class="post-time">' + timeAgo(p.time) + '</span>' +
               '</div>' +
               '<div class="post-title">' + esc(p.title) + '</div>' +
               '<div class="post-content">' + esc(p.content) + '</div>' +
             '</article>';
    }).join('');
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------- T2：发帖 = 加到数组最前面 → 保存 → 重新渲染 ---------- */
  document.getElementById('postForm').addEventListener('submit', function (e) {
    e.preventDefault();

    var board = document.getElementById('postBoard').value;
    var author = document.getElementById('postAuthor').value.trim();
    var title = document.getElementById('postTitle').value.trim();
    var content = document.getElementById('postContent').value.trim();

    if (!author || !title || !content) return;   /* 练习页从简：必填靠 placeholder 约束 */

    state.posts.unshift({                        /* unshift：插到最前面 = 最新在上 */
      id: 'p_' + Date.now(),
      board: board,
      author: author,
      title: title,
      content: content,
      time: Date.now()
    });
    save();
    render();

    document.getElementById('postTitle').value = '';
    document.getElementById('postContent').value = '';
  });

  /* ---------- T3：实时搜索（input 事件 + 300ms 防抖） ---------- */
  var debounceTimer = null;

  document.getElementById('searchInput').addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      state.keyword = document.getElementById('searchInput').value;
      render();
    }, 300);
  });

  document.getElementById('boardFilter').addEventListener('change', function () {
    state.board = this.value;
    render();
  });

  /* ---------- 启动：模拟 300ms 异步加载，先显示「加载中…」 ---------- */
  document.getElementById('postList').innerHTML = '<div class="list-state">加载中…</div>';

  setTimeout(function () {
    state.posts = load();
    render();
  }, 300);
})();
