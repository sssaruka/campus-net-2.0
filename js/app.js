/* ============================================================
   校园网 2.0 首页脚本
   从 data.js 读取数据渲染：公告卡 / 快捷宫格 / 企微路径 / 真题 / 社区 / Banner 轮播
   后台(admin.html) 改动数据后，刷新首页即可看到最新结果
   ============================================================ */
(function () {
  'use strict';

  var state = { keyword: '', board: '全部' };

  var CAT_CLASS = ['tag-blue', 'tag-green', 'tag-purple', 'tag-orange'];
  var BOARDS = ['全部', '二手交易', '失物招领', '学习交流'];

  /* HTML 转义，避免内容破坏页面结构 */
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function match(keyword, fields) {
    if (!keyword) return true;
    var k = keyword.toLowerCase();
    return fields.join(' ').toLowerCase().indexOf(k) > -1;
  }

  function catClass(name) {
    var db = window.DB.get();
    var i = db.categories.indexOf(name);
    if (i < 0) i = (name || '').length;
    return CAT_CLASS[i % CAT_CLASS.length];
  }

  /* ---------- ① 快捷入口（侧栏宫格） ---------- */
  function renderQuick() {
    var box = document.getElementById('quickItems');
    var list = window.DB.list('quick')
      .filter(function (q) { return q.enabled !== false; })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });

    if (!list.length) {
      box.innerHTML = '<span class="mini-extra">后台未配置快捷入口</span>';
      return;
    }

    box.innerHTML = list.map(function (q) {
      return '<a class="quick-item" href="#" title="' + esc(q.route || q.name) + '">' +
             '<span class="qi-icon">' + esc(q.icon || '🔗') + '</span>' +
             '<span>' + esc(q.name) + '</span></a>';
    }).join('');
  }

  /* ---------- ② 公告大卡 ---------- */
  function renderAnnounce() {
    var box = document.getElementById('announceCards');
    if (!box) return;
    var items = window.DB.list('announce').slice(0, 3);

    box.innerHTML = items.length
      ? items.map(function (t, i) {
          var num = '0' + (i + 1);
          return '<a class="ann-card" href="#">' +
                   '<span class="ann-head"><span>📢 最新公告</span></span>' +
                   '<p>' + esc(t) + '</p>' +
                   '<span class="ann-more">查看详情 →</span>' +
                   '<span class="ann-num">' + num + '</span>' +
                 '</a>';
        }).join('')
      : '<a class="ann-card" href="#"><span class="ann-head"><span>📢 最新公告</span></span>' +
        '<p>暂无公告</p></a>';
  }

  /* ---------- ③ 企微路径 ---------- */
  function renderPaths() {
    var list = window.DB.list('paths')
      .filter(function (p) { return p.status === 'online'; })
      .filter(function (p) { return match(state.keyword, [p.name, p.route]); })
      .sort(function (a, b) { return (b.views || 0) - (a.views || 0); })
      .slice(0, 5);

    document.getElementById('pathList').innerHTML = list.length
      ? list.map(function (p) {
          return '<li><a class="mini-item" href="' + (p.url ? esc(p.url) : '#') + '">' +
                 '<span class="mini-main">' +
                   '<span class="mini-title">' + esc(p.name) + '</span>' +
                   '<span class="mini-sub">' + esc(p.route) + '</span>' +
                 '</span>' +
                 '<span class="mini-extra">🔥 ' + esc(p.views) + '</span>' +
                 '</a></li>';
        }).join('')
      : '<li class="mini-empty">暂无匹配的路径</li>';
  }

  /* ---------- ④ 真题资源 ---------- */
  function renderExams() {
    var list = window.DB.list('exams')
      .filter(function (e) { return e.status === 'approved' && e.visible; })
      .filter(function (e) { return match(state.keyword, [e.course, e.title, e.category, e.term]); })
      .sort(function (a, b) { return (b.downloads || 0) - (a.downloads || 0); })
      .slice(0, 5);

    document.getElementById('examList').innerHTML = list.length
      ? list.map(function (e) {
          return '<li><a class="mini-item" href="#">' +
                 '<span class="mini-main">' +
                   '<span class="tag ' + catClass(e.category) + '">' + esc(e.course || e.category) + '</span>' +
                   '<span class="mini-sub">' + esc(e.term) + ' · ' + esc(e.uploader) + '</span>' +
                 '</span>' +
                 '<span class="mini-extra">⬇ ' + esc(e.downloads) + ' · 👍 ' + esc(e.likes) + '</span>' +
                 '</a></li>';
        }).join('')
      : '<li class="mini-empty">暂无匹配的资源</li>';

    document.getElementById('examCats').innerHTML = window.DB.list('categories')
      .slice(0, 6)
      .map(function (c) {
        return '<a href="#" class="tag ' + catClass(c) + '">' + esc(c) + '</a>';
      }).join('');
  }

  /* ---------- ⑤ 校园社区（帖子卡片） ---------- */
  function renderPosts() {
    document.getElementById('boardTabs').innerHTML = BOARDS.map(function (b) {
      return '<button type="button" class="board-tab' + (b === state.board ? ' active' : '') + '">' + b + '</button>';
    }).join('');

    var list = window.DB.list('posts')
      .filter(function (t) { return t.status === 'approved'; })
      .filter(function (t) { return state.board === '全部' || t.board === state.board; })
      .filter(function (t) { return match(state.keyword, [t.title, t.author, t.board, t.meta]); })
      .slice(0, 4);

    document.getElementById('postList').innerHTML = list.length
      ? list.map(function (t) {
          var meta = esc(t.meta || '');
          if (meta) meta += ' · ';
          meta += esc(t.replies) + ' 回帖';
          return '<li><a class="post-card" href="#">' +
                   '<div class="post-top">' +
                     '<span class="post-avatar">' + esc(String(t.author || '匿').slice(0, 1)) + '</span>' +
                     '<span class="post-author">' + esc(t.author) + ' · ' + esc(t.board) + '</span>' +
                     '<span class="post-time">' + esc(t.time || '') + '</span>' +
                   '</div>' +
                   '<div class="post-title">' + esc(t.title) + '</div>' +
                   '<div class="post-meta">' + meta + '</div>' +
                 '</a></li>';
        }).join('')
      : '<li class="mini-empty">暂无匹配的帖子</li>';

    Array.prototype.forEach.call(document.querySelectorAll('.board-tab'), function (btn) {
      btn.onclick = function () { state.board = btn.textContent; renderPosts(); };
    });
  }

  /* ---------- ⑥ Banner 轮播（首尾克隆，始终向同一方向翻页） ---------- */
  function initBanner() {
    var banner = document.getElementById('banner');
    var track = document.getElementById('bannerTrack');
    var dotsBox = document.getElementById('bannerDots');
    if (!banner || !track || !track.children.length) return;

    var total = track.children.length;

    /* 首尾各克隆一张：最后一张翻过去后“继续向左”进入克隆的第 1 张，
       再瞬间无动画跳回真实第 1 张 —— 视觉上就是同一方向无限循环 */
    track.appendChild(track.children[0].cloneNode(true));
    track.insertBefore(track.children[total - 1].cloneNode(true), track.children[0]);

    var cur = 1;              /* 0 = 尾部克隆 | 1..total = 真实张 | total+1 = 头部克隆 */
    var timer = null;
    var jumping = false;

    dotsBox.innerHTML = '';
    var dots = [];
    for (var i = 0; i < total; i++) {
      var d = document.createElement('button');
      d.type = 'button';
      d.className = 'banner-dot' + (i === 0 ? ' active' : '');
      (function (n) { d.onclick = function () { if (!jumping) { go(n + 1); restart(); } }; })(i);
      dotsBox.appendChild(d);
      dots.push(d);
    }

    function paint() {
      track.style.transform = 'translateX(-' + (cur * 100) + '%)';
      var active = ((cur - 1) % total + total) % total;
      dots.forEach(function (d, i) {
        d.className = 'banner-dot' + (i === active ? ' active' : '');
      });
    }

    /* 无动画瞬跳（从克隆张跳回对应的真实张） */
    function jump(pos) {
      track.style.transition = 'none';
      track.style.transform = 'translateX(-' + (pos * 100) + '%)';
      void track.offsetWidth;            /* 强制回流，让瞬跳立即生效 */
      track.style.transition = '';
    }

    function go(pos) {
      cur = pos;
      paint();
      /* 滑到克隆张后，等动画结束（CSS 0.5s）再瞬跳回真实张 */
      if (cur === total + 1 || cur === 0) {
        jumping = true;
        setTimeout(function () {
          jump(cur === total + 1 ? 1 : total);
          jumping = false;
        }, 520);
      }
    }

    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { stop(); timer = setInterval(function () { if (!jumping) go(cur + 1); }, 5000); }

    document.getElementById('bannerPrev').onclick = function () { if (!jumping) { go(cur - 1); restart(); } };
    document.getElementById('bannerNext').onclick = function () { if (!jumping) { go(cur + 1); restart(); } };

    banner.onmouseover = stop;
    banner.onmouseout = restart;

    jump(1);   /* 初始定位到真实第 1 张 */
    restart();
  }

  /* ---------- ⑦ 搜索 ---------- */
  function bindSearch() {
    var input = document.getElementById('searchInput');
    function doSearch() {
      state.keyword = input.value.trim();
      renderPaths(); renderExams(); renderPosts();
    }
    document.getElementById('searchBtn').onclick = doSearch;
    input.onkeydown = function (e) { if (e.key === 'Enter') doSearch(); };
  }

  /* ---------- ⑧ 学校选择（记忆在本地，刷新不丢） ---------- */
  var SCHOOL_KEY = 'campus_net_2_school';

  function bindSchool() {
    var sel = document.getElementById('schoolSelect');
    if (!sel) return;
    var saved = null;
    try { saved = localStorage.getItem(SCHOOL_KEY); } catch (e) { saved = null; }
    if (saved) sel.value = saved;
    sel.onchange = function () {
      try { localStorage.setItem(SCHOOL_KEY, sel.value); } catch (e) { /* 忽略存储失败 */ }
    };
  }

  function renderAll() {
    renderQuick(); renderPaths(); renderExams(); renderPosts();
  }

  renderAll();
  renderAnnounce();
  initBanner();
  bindSearch();
  bindSchool();
})();
