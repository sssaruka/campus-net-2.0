/* ============================================================
   校园网 2.0 —— 管理后台脚本
   模块：概览 / 快捷入口 / 企微路径 / 真题资源 / 校园社区 / 用户中心 / 设置
   数据写入 localStorage，前台 index.html 读取同一份数据
   ============================================================ */
(function () {
  'use strict';

  var DB = window.DB;
  var viewEl = document.getElementById('view');
  var sideNav = document.getElementById('sideNav');
  var modalRoot = document.getElementById('modalRoot');
  var toastRoot = document.getElementById('toastRoot');

  /* 页面状态 */
  var state = {
    view: 'home',
    kw: { quick: '', paths: '', exams: '', posts: '', users: '' },
    filter: {
      pathStatus: 'all',
      examStatus: 'all', examCat: 'all',
      postBoard: 'all', postStatus: 'all'
    }
  };

  /* ================= 基础工具 ================= */

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function toast(msg, type) {
    var el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.textContent = msg;
    toastRoot.appendChild(el);
    setTimeout(function () { el.remove(); }, 2200);
  }

  function closeModal() { modalRoot.innerHTML = ''; }

  function showModal(inner, onMount) {
    modalRoot.innerHTML = '<div class="modal-mask">' + inner + '</div>';
    modalRoot.querySelector('.modal-mask').addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });
    if (onMount) onMount(modalRoot);
  }

  /* 确认弹窗：返回 Promise<boolean> */
  function confirmBox(title, text, okText) {
    return new Promise(function (resolve) {
      showModal(
        '<div class="modal" style="width:400px">' +
          '<div class="modal-head">' + esc(title) + '</div>' +
          '<div class="modal-body"><p class="modal-text">' + esc(text) + '</p></div>' +
          '<div class="modal-foot">' +
            '<button class="btn btn-ghost" data-act="confirm-no">取消</button>' +
            '<button class="btn btn-danger" data-act="confirm-yes">' + esc(okText || '确定') + '</button>' +
          '</div>' +
        '</div>'
      );
      var yes = modalRoot.querySelector('[data-act="confirm-yes"]');
      var no = modalRoot.querySelector('[data-act="confirm-no"]');
      yes.onclick = function () { closeModal(); resolve(true); };
      no.onclick = function () { closeModal(); resolve(false); };
    });
  }

  /* 表单弹窗 */
  var pendingSubmit = null;

  function fieldHTML(f, values) {
    var v = values && values[f.key] != null ? values[f.key] : (f.def != null ? f.def : '');
    var label = '<label>' + esc(f.label) + (f.required ? ' <span style="color:#C96A5E">*</span>' : '') + '</label>';
    var ctl = '';

    if (f.type === 'textarea') {
      ctl = '<textarea data-key="' + f.key + '" placeholder="' + esc(f.placeholder || '') + '">' + esc(v) + '</textarea>';
    } else if (f.type === 'select') {
      ctl = '<select data-key="' + f.key + '">' + f.options.map(function (o) {
        var val, txt;
        if (Array.isArray(o)) { val = o[0]; txt = o[1]; }
        else if (o && typeof o === 'object') { val = o.value; txt = o.label; }
        else { val = o; txt = o; }
        return '<option value="' + esc(val) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + esc(txt) + '</option>';
      }).join('') + '</select>';
    } else if (f.type === 'switch') {
      return '<div class="field"><label>' + esc(f.label) + '</label>' +
        '<label class="switch"><input type="checkbox" data-key="' + f.key + '"' + (v ? ' checked' : '') +
        '><span></span></label>' +
        (f.hint ? '<p class="hint">' + esc(f.hint) + '</p>' : '') + '</div>';
    } else {
      ctl = '<input type="' + (f.type || 'text') + '" data-key="' + f.key + '" value="' + esc(v) +
            '" placeholder="' + esc(f.placeholder || '') + '">';
    }

    return '<div class="field">' + label + ctl +
      (f.hint ? '<p class="hint">' + esc(f.hint) + '</p>' : '') + '</div>';
  }

  function formModal(opt) {
    var body = opt.fields.map(function (f) { return fieldHTML(f, opt.values); }).join('');
    showModal(
      '<div class="modal">' +
        '<div class="modal-head">' + esc(opt.title) + '</div>' +
        '<div class="modal-body">' + body + '</div>' +
        '<div class="modal-foot">' +
          '<button class="btn btn-ghost" data-act="close-modal">取消</button>' +
          '<button class="btn btn-primary" data-act="submit-form">' + esc(opt.submitText || '保存') + '</button>' +
        '</div>' +
      '</div>'
    );
    pendingSubmit = opt.onSubmit;
  }

  function collectForm() {
    var data = {};
    modalRoot.querySelectorAll('[data-key]').forEach(function (el) {
      data[el.getAttribute('data-key')] = el.type === 'checkbox' ? el.checked : el.value.trim();
    });
    return data;
  }

  /* 通用删除 */
  function removeItem(collection, id, name) {
    confirmBox('删除确认', '确定删除「' + name + '」吗？删除后不可恢复。', '删除').then(function (ok) {
      if (!ok) return;
      DB.remove(collection, id);
      toast('已删除', 'ok');
      render();
    });
  }

  /* ================= 统计 ================= */
  function stats() {
    var db = DB.get();
    var count = function (arr, fn) { return arr.filter(fn).length; };
    return {
      paths: db.paths.length,
      pathsOnline: count(db.paths, function (p) { return p.status === 'online'; }),
      exams: count(db.exams, function (e) { return e.status === 'approved'; }),
      examsPending: count(db.exams, function (e) { return e.status === 'pending'; }),
      examsHidden: count(db.exams, function (e) { return e.status === 'approved' && !e.visible; }),
      posts: count(db.posts, function (p) { return p.status === 'approved'; }),
      postsPending: count(db.posts, function (p) { return p.status === 'pending'; }),
      postsBanned: count(db.posts, function (p) { return p.status === 'banned'; }),
      users: db.users.length,
      usersBanned: count(db.users, function (u) { return u.status !== '正常'; }),
      quick: count(db.quick, function (q) { return q.enabled !== false; })
    };
  }

  /* ================= 视图：概览 ================= */
  function viewHome() {
    var s = stats();
    var db = DB.get();

    var statHTML =
      '<div class="stat-grid">' +
        statCard('企微路径', s.paths, 'blue', '上架 ' + s.pathsOnline + ' 条') +
        statCard('真题资源', s.exams, s.examsPending ? 'warn' : 'green', '待审核 ' + s.examsPending + ' 份') +
        statCard('社区帖子', s.posts, s.postsPending ? 'warn' : 'green', '待审核 ' + s.postsPending + ' · 封禁 ' + s.postsBanned) +
        statCard('注册用户', s.users, s.usersBanned ? 'danger' : 'green', '异常 ' + s.usersBanned + ' 人') +
      '</div>';

    var funcs = [
      { v: 'quick', icon: '⚡', name: '常用快捷入口', desc: '管理首页一行的高频入口：图标、名称、跳转路径与显示顺序', meta: '当前启用 ' + s.quick + ' 个' },
      { v: 'paths', icon: '🧭', name: '企微路径导航', desc: '新增、编辑办事路径，填写直达链接，可随时上/下架', meta: '共 ' + s.paths + ' 条路径' },
      { v: 'exams', icon: '📚', name: '真题资源库', desc: '审核用户上传的真题，通过后归类科目并选择是否前台展示', meta: '待审核 ' + s.examsPending + ' 份' },
      { v: 'posts', icon: '💬', name: '校园社区', desc: '按板块审核帖子，对违规内容执行封禁、下架或删除', meta: '待审核 ' + s.postsPending + ' 条' },
      { v: 'users', icon: '👥', name: '用户中心', desc: '查看用户资料与活跃度，处理禁言、封禁与角色调整', meta: '共 ' + s.users + ' 位用户' },
      { v: 'settings', icon: '⚙️', name: '公告与设置', desc: '维护首页滚动公告、真题分类字典，以及数据初始化', meta: db.announce.length + ' 条公告 · ' + db.categories.length + ' 个分类' }
    ];

    var funcHTML = '<div class="func-grid">' + funcs.map(function (f) {
      return '<a class="func-card" href="#/' + f.v + '">' +
        '<h3>' + f.icon + ' ' + f.name + '</h3>' +
        '<p>' + esc(f.desc) + '</p>' +
        '<span class="func-meta">' + esc(f.meta) + ' · 进入管理 →</span>' +
      '</a>';
    }).join('') + '</div>';

    var todoExam = db.exams.filter(function (e) { return e.status === 'pending'; }).slice(0, 3);
    var todoPost = db.posts.filter(function (p) { return p.status === 'pending'; }).slice(0, 3);
    var todos = todoExam.map(function (e) {
      return '<li><span class="badge badge-orange">真题</span><span class="todo-text">' + esc(e.course) + '（' + esc(e.uploader) + '）</span>' +
        '<button class="btn btn-sm btn-ok" data-act="exam-approve" data-id="' + e.id + '">通过</button>' +
        '<button class="btn btn-sm btn-ghost" data-act="exam-reject" data-id="' + e.id + '">驳回</button></li>';
    }).concat(todoPost.map(function (p) {
      return '<li><span class="badge badge-blue">帖子</span><span class="todo-text">' + esc(p.title) + '</span>' +
        '<button class="btn btn-sm btn-ok" data-act="post-approve" data-id="' + p.id + '">通过</button>' +
        '<button class="btn btn-sm btn-danger-ghost" data-act="post-ban" data-id="' + p.id + '">封禁</button></li>';
    }));

    var todoHTML = '<div class="card"><div class="card-title">⏳ 待处理事项' +
      '<span class="count">共 ' + (s.examsPending + s.postsPending) + ' 条</span></div>' +
      (todos.length ? '<ul class="todo-list">' + todos.join('') + '</ul>'
                    : '<p class="empty-row">全部处理完毕，今天可以早点收工 🎉</p>') + '</div>';

    return '<div class="page-head"><div><h1>后台概览</h1><p>站点数据总览，点击功能卡片进入对应管理页</p></div></div>' +
      statHTML + todoHTML +
      '<div class="card"><div class="card-title">🧩 功能模块</div>' + funcHTML + '</div>';
  }

  function statCard(label, value, tone, note) {
    var cls = tone === 'warn' ? ' warn' : tone === 'danger' ? ' danger' : tone === 'green' ? ' green' : '';
    return '<div class="stat"><div class="stat-label">' + label + '</div>' +
      '<div class="stat-value' + cls + '">' + value + '</div>' +
      '<div class="stat-note">' + esc(note) + '</div></div>';
  }

  /* ================= 视图：快捷入口 ================= */
  function viewQuick() {
    var list = DB.list('quick')
      .filter(function (q) { return !state.kw.quick || (q.name + q.route).toLowerCase().indexOf(state.kw.quick.toLowerCase()) > -1; })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });

    var rows = list.map(function (q) {
      return '<tr' + (q.enabled === false ? ' class="row-muted"' : '') + '>' +
        '<td>' + esc(q.order) + '</td>' +
        '<td style="font-size:18px">' + esc(q.icon) + '</td>' +
        '<td class="cell-title">' + esc(q.name) + '</td>' +
        '<td class="cell-sub">' + esc(q.route) + '</td>' +
        '<td><label class="switch"><input type="checkbox" data-change="quick-enabled" data-id="' + q.id + '"' +
          (q.enabled !== false ? ' checked' : '') + '><span></span></label></td>' +
        '<td><div class="ops">' +
          '<button class="btn btn-sm btn-ghost" data-act="quick-edit" data-id="' + q.id + '">编辑</button>' +
          '<button class="btn btn-sm btn-danger-ghost" data-act="quick-del" data-id="' + q.id + '">删除</button>' +
        '</div></td></tr>';
    }).join('');

    return pageHead('常用快捷入口', '首页顶部一行的高频入口，可调整顺序与启用状态') +
      '<div class="card"><div class="toolbar">' +
        '<input type="text" placeholder="搜索入口名称 / 路径" value="' + esc(state.kw.quick) + '" data-input="kw-quick">' +
        '<button class="btn btn-primary" data-act="quick-new">＋ 新增入口</button>' +
      '</div><div class="table-wrap"><table class="data"><thead><tr>' +
        '<th style="width:56px">排序</th><th style="width:56px">图标</th><th>名称</th><th>跳转路径</th>' +
        '<th style="width:70px">启用</th><th style="width:150px">操作</th>' +
      '</tr></thead><tbody>' + (rows || emptyRow(6)) + '</tbody></table></div></div>';
  }

  function quickForm(item) {
    formModal({
      title: item ? '编辑快捷入口' : '新增快捷入口',
      values: item,
      fields: [
        { key: 'name', label: '入口名称', required: true, placeholder: '如：请假申请' },
        { key: 'icon', label: '图标（emoji）', placeholder: '如：📝', def: '🔗' },
        { key: 'route', label: '跳转路径说明', placeholder: '企业微信 → 工作台 → …' },
        { key: 'order', label: '排序（数字越小越靠前）', type: 'number', def: 99 },
        { key: 'enabled', label: '立即启用', type: 'switch', def: true }
      ],
      onSubmit: function (d) {
        if (!d.name) { toast('请填写入口名称', 'err'); return false; }
        d.order = Number(d.order) || 99;
        if (item) { DB.update('quick', item.id, d); toast('已保存', 'ok'); }
        else { DB.add('quick', d); toast('已新增入口', 'ok'); }
        render();
      }
    });
  }

  /* ================= 视图：企微路径 ================= */
  function viewPaths() {
    var list = DB.list('paths')
      .filter(function (p) { return state.filter.pathStatus === 'all' || p.status === state.filter.pathStatus; })
      .filter(function (p) { return !state.kw.paths || (p.name + p.route).toLowerCase().indexOf(state.kw.paths.toLowerCase()) > -1; })
      .sort(function (a, b) { return (b.views || 0) - (a.views || 0); });

    var rows = list.map(function (p) {
      var online = p.status === 'online';
      return '<tr' + (online ? '' : ' class="row-muted"') + '>' +
        '<td class="cell-title">' + esc(p.name) + '</td>' +
        '<td class="cell-sub">' + esc(p.route) + '</td>' +
        '<td>' + (p.url ? '<a href="' + esc(p.url) + '" target="_blank" style="color:#40616E">打开链接</a>' : '<span class="cell-sub">未填写</span>') + '</td>' +
        '<td>' + esc(p.views) + '</td>' +
        '<td>' + (online ? '<span class="badge badge-green">已上架</span>' : '<span class="badge badge-gray">已下架</span>') + '</td>' +
        '<td class="cell-sub">' + esc(p.updated) + '</td>' +
        '<td><div class="ops">' +
          '<button class="btn btn-sm btn-ghost" data-act="path-edit" data-id="' + p.id + '">编辑</button>' +
          '<button class="btn btn-sm ' + (online ? 'btn-warn' : 'btn-ok') + '" data-act="path-toggle" data-id="' + p.id + '">' + (online ? '下架' : '上架') + '</button>' +
          '<button class="btn btn-sm btn-danger-ghost" data-act="path-del" data-id="' + p.id + '">删除</button>' +
        '</div></td></tr>';
    }).join('');

    return pageHead('企微路径导航', '维护办事路径与直达链接，下架后不再出现在前台') +
      '<div class="card"><div class="toolbar">' +
        '<input type="text" placeholder="搜索路径名称 / 步骤" value="' + esc(state.kw.paths) + '" data-input="kw-paths">' +
        selectHTML('filter-pathStatus', [['all', '全部状态'], ['online', '已上架'], ['offline', '已下架']], state.filter.pathStatus) +
        '<button class="btn btn-primary" data-act="path-new">＋ 新增路径</button>' +
      '</div><div class="table-wrap"><table class="data"><thead><tr>' +
        '<th>路径名称</th><th>路径步骤</th><th>直达链接</th><th style="width:70px">浏览</th>' +
        '<th style="width:80px">状态</th><th style="width:96px">更新时间</th><th style="width:200px">操作</th>' +
      '</tr></thead><tbody>' + (rows || emptyRow(7)) + '</tbody></table></div></div>';
  }

  function pathForm(item) {
    formModal({
      title: item ? '编辑企微路径' : '新增企微路径',
      values: item,
      fields: [
        { key: 'name', label: '路径名称', required: true, placeholder: '如：学生请假申请' },
        { key: 'route', label: '路径步骤', type: 'textarea', required: true, placeholder: '企业微信 → 工作台 → 学生事务服务 → 请假申请' },
        { key: 'url', label: '直达链接（可选）', placeholder: 'https://… 填写后前台可一键跳转' },
        { key: 'views', label: '浏览热度', type: 'number', def: 0 },
        { key: 'status', label: '状态', type: 'select', options: [['online', '上架'], ['offline', '下架']], def: 'online' }
      ],
      onSubmit: function (d) {
        if (!d.name || !d.route) { toast('名称与路径步骤为必填项', 'err'); return false; }
        d.views = Number(d.views) || 0;
        d.updated = DB.today();
        if (item) { DB.update('paths', item.id, d); toast('已保存', 'ok'); }
        else { DB.add('paths', d); toast('已新增路径', 'ok'); }
        render();
      }
    });
  }

  /* ================= 视图：真题资源 ================= */
  function viewExams() {
    var db = DB.get();
    var list = db.exams
      .filter(function (e) { return state.filter.examStatus === 'all' || e.status === state.filter.examStatus; })
      .filter(function (e) { return state.filter.examCat === 'all' || e.category === state.filter.examCat; })
      .filter(function (e) { return !state.kw.exams || (e.course + e.title + e.uploader + e.term).toLowerCase().indexOf(state.kw.exams.toLowerCase()) > -1; })
      .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });

    var catOptions = db.categories.map(function (c) { return [c, c]; });

    var rows = list.map(function (e) {
      var statusBadge =
        e.status === 'approved' ? '<span class="badge badge-green">已通过</span>' :
        e.status === 'pending' ? '<span class="badge badge-orange">待审核</span>' :
        '<span class="badge badge-red">已驳回</span>';

      var ops = '<button class="btn btn-sm btn-ghost" data-act="exam-edit" data-id="' + e.id + '">编辑</button>';
      if (e.status === 'pending') {
        ops += '<button class="btn btn-sm btn-ok" data-act="exam-approve" data-id="' + e.id + '">通过</button>' +
               '<button class="btn btn-sm btn-danger-ghost" data-act="exam-reject" data-id="' + e.id + '">驳回</button>';
      } else {
        ops += '<button class="btn btn-sm btn-warn" data-act="exam-recheck" data-id="' + e.id + '">重新审核</button>';
      }
      ops += '<button class="btn btn-sm btn-danger-ghost" data-act="exam-del" data-id="' + e.id + '">删除</button>';

      return '<tr' + (e.status === 'approved' ? '' : ' class="row-muted"') + '>' +
        '<td><div class="cell-title">' + esc(e.course) + '</div><div class="cell-sub">' + esc(e.title) + '</div></td>' +
        '<td class="cell-sub">' + esc(e.uploader) + '<br>' + esc(e.term) + '</td>' +
        '<td><select data-change="exam-cat" data-id="' + e.id + '" style="min-width:120px">' +
          catOptions.map(function (o) {
            return '<option value="' + esc(o[0]) + '"' + (e.category === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
          }).join('') + '</select></td>' +
        '<td>' + statusBadge + '</td>' +
        '<td><label class="switch"><input type="checkbox" data-change="exam-visible" data-id="' + e.id + '"' +
          (e.visible ? ' checked' : '') + (e.status === 'approved' ? '' : ' disabled') + '><span></span></label></td>' +
        '<td class="cell-sub">⬇ ' + esc(e.downloads) + '<br>👍 ' + esc(e.likes) + '</td>' +
        '<td class="cell-sub">' + esc(e.date) + '</td>' +
        '<td><div class="ops">' + ops + '</div></td></tr>';
    }).join('');

    return pageHead('真题资源库', '审核用户上传的真题 → 归类科目 → 决定是否在前台展示') +
      '<div class="card"><div class="toolbar">' +
        '<input type="text" placeholder="搜索课程 / 上传者" value="' + esc(state.kw.exams) + '" data-input="kw-exams">' +
        selectHTML('filter-examStatus', [['all', '全部状态'], ['pending', '待审核'], ['approved', '已通过'], ['rejected', '已驳回']], state.filter.examStatus) +
        selectHTML('filter-examCat', [['all', '全部分类']].concat(catOptions), state.filter.examCat) +
        '<button class="btn btn-primary" data-act="exam-new">＋ 录入真题</button>' +
      '</div><div class="table-wrap"><table class="data"><thead><tr>' +
        '<th>课程 / 标题</th><th>上传者</th><th style="width:130px">分类</th><th style="width:80px">审核</th>' +
        '<th style="width:70px">展示</th><th style="width:80px">数据</th><th style="width:90px">上传日期</th><th style="width:250px">操作</th>' +
      '</tr></thead><tbody>' + (rows || emptyRow(8)) + '</tbody></table></div>' +
      '<p class="hint" style="margin-top:10px">说明：只有「已通过 + 展示开启」的真题才会出现在前台首页。</p></div>';
  }

  function examForm(item) {
    var db = DB.get();
    formModal({
      title: item ? '编辑真题资源' : '录入真题资源',
      values: item,
      fields: [
        { key: 'course', label: '课程名称', required: true, placeholder: '如：高等数学 A（一）' },
        { key: 'title', label: '资源标题', placeholder: '如：2025-2026 学年第一学期期末试卷' },
        { key: 'term', label: '学年学期', placeholder: '如：2025-2026 第一学期' },
        { key: 'uploader', label: '上传者', placeholder: '如：李同学' },
        { key: 'category', label: '资源分类', type: 'select', options: db.categories, def: db.categories[0] },
        { key: 'status', label: '审核状态', type: 'select', options: [['pending', '待审核'], ['approved', '已通过'], ['rejected', '已驳回']], def: 'pending' },
        { key: 'visible', label: '前台展示', type: 'switch', hint: '需审核通过后才会真正展示', def: false }
      ],
      onSubmit: function (d) {
        if (!d.course) { toast('请填写课程名称', 'err'); return false; }
        d.date = item ? item.date : DB.today();
        if (item) { DB.update('exams', item.id, d); toast('已保存', 'ok'); }
        else {
          d.downloads = 0; d.likes = 0;
          DB.add('exams', d); toast('已录入真题', 'ok');
        }
        render();
      }
    });
  }

  /* ================= 视图：校园社区 ================= */
  function viewPosts() {
    var db = DB.get();
    var boards = ['二手交易', '失物招领', '学习交流'];
    var list = db.posts
      .filter(function (p) { return state.filter.postBoard === 'all' || p.board === state.filter.postBoard; })
      .filter(function (p) { return state.filter.postStatus === 'all' || p.status === state.filter.postStatus; })
      .filter(function (p) { return !state.kw.posts || (p.title + p.author + p.board).toLowerCase().indexOf(state.kw.posts.toLowerCase()) > -1; });

    var rows = list.map(function (p) {
      var badge =
        p.status === 'approved' ? '<span class="badge badge-green">已发布</span>' :
        p.status === 'pending' ? '<span class="badge badge-orange">待审核</span>' :
        '<span class="badge badge-red">已封禁</span>';

      var ops = '';
      if (p.status === 'pending') {
        ops += '<button class="btn btn-sm btn-ok" data-act="post-approve" data-id="' + p.id + '">通过</button>' +
               '<button class="btn btn-sm btn-danger-ghost" data-act="post-ban" data-id="' + p.id + '">封禁</button>';
      } else if (p.status === 'approved') {
        ops += '<button class="btn btn-sm btn-danger-ghost" data-act="post-ban" data-id="' + p.id + '">封禁</button>';
      } else {
        ops += '<button class="btn btn-sm btn-ok" data-act="post-restore" data-id="' + p.id + '">恢复</button>';
      }
      ops += '<button class="btn btn-sm btn-danger" data-act="post-del" data-id="' + p.id + '">删除</button>';

      return '<tr' + (p.status === 'approved' ? '' : ' class="row-muted"') + '>' +
        '<td><span class="badge badge-blue">' + esc(p.board) + '</span></td>' +
        '<td class="cell-title">' + esc(p.title) + '<div class="cell-sub">' + esc(p.meta || '') + '</div></td>' +
        '<td class="cell-sub">' + esc(p.author) + '</td>' +
        '<td>' + badge + '</td>' +
        '<td class="cell-sub">' + esc(p.replies) + ' 回帖</td>' +
        '<td class="cell-sub">' + esc(p.time) + '</td>' +
        '<td><div class="ops">' + ops + '</div></td></tr>';
    }).join('');

    return pageHead('校园社区', '按板块审核帖子内容，违规帖子可封禁或删除') +
      '<div class="card"><div class="toolbar">' +
        '<input type="text" placeholder="搜索标题 / 作者" value="' + esc(state.kw.posts) + '" data-input="kw-posts">' +
        selectHTML('filter-postBoard', [['all', '全部板块']].concat(boards.map(function (b) { return [b, b]; })), state.filter.postBoard) +
        selectHTML('filter-postStatus', [['all', '全部状态'], ['pending', '待审核'], ['approved', '已发布'], ['banned', '已封禁']], state.filter.postStatus) +
      '</div><div class="table-wrap"><table class="data"><thead><tr>' +
        '<th style="width:90px">板块</th><th>标题</th><th style="width:90px">作者</th><th style="width:80px">状态</th>' +
        '<th style="width:70px">回帖</th><th style="width:90px">时间</th><th style="width:200px">操作</th>' +
      '</tr></thead><tbody>' + (rows || emptyRow(7)) + '</tbody></table></div></div>';
  }

  /* ================= 视图：用户中心 ================= */
  function viewUsers() {
    var list = DB.list('users').filter(function (u) {
      return !state.kw.users || (u.name + u.sid + u.college).toLowerCase().indexOf(state.kw.users.toLowerCase()) > -1;
    });

    var rows = list.map(function (u) {
      var badge =
        u.status === '正常' ? '<span class="badge badge-green">正常</span>' :
        u.status === '禁言' ? '<span class="badge badge-orange">禁言</span>' :
        '<span class="badge badge-red">封禁</span>';

      var ops = '<button class="btn btn-sm btn-ghost" data-act="user-edit" data-id="' + u.id + '">编辑</button>';
      if (u.status === '正常') {
        ops += '<button class="btn btn-sm btn-warn" data-act="user-mute" data-id="' + u.id + '">禁言</button>' +
               '<button class="btn btn-sm btn-danger-ghost" data-act="user-ban" data-id="' + u.id + '">封禁</button>';
      } else {
        ops += '<button class="btn btn-sm btn-ok" data-act="user-restore" data-id="' + u.id + '">恢复正常</button>';
      }
      ops += '<button class="btn btn-sm btn-danger-ghost" data-act="user-del" data-id="' + u.id + '">删除</button>';

      return '<tr' + (u.status === '正常' ? '' : ' class="row-muted"') + '>' +
        '<td class="cell-title">' + esc(u.name) + '</td>' +
        '<td class="cell-sub">' + esc(u.sid) + '</td>' +
        '<td class="cell-sub">' + esc(u.college) + '</td>' +
        '<td><select data-change="user-role" data-id="' + u.id + '" style="min-width:90px">' +
          [['学生', '学生'], ['管理员', '管理员']].map(function (o) {
            return '<option value="' + o[0] + '"' + (u.role === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
          }).join('') + '</select></td>' +
        '<td>' + badge + '</td>' +
        '<td class="cell-sub">上传 ' + esc(u.uploads) + ' · 发帖 ' + esc(u.posts) + '</td>' +
        '<td class="cell-sub">' + esc(u.join) + '</td>' +
        '<td><div class="ops">' + ops + '</div></td></tr>';
    }).join('');

    return pageHead('用户中心', '查看用户资料与活跃度，处理禁言 / 封禁 / 角色调整') +
      '<div class="card"><div class="toolbar">' +
        '<input type="text" placeholder="搜索姓名 / 学号 / 学院" value="' + esc(state.kw.users) + '" data-input="kw-users">' +
        '<button class="btn btn-primary" data-act="user-new">＋ 新增用户</button>' +
      '</div><div class="table-wrap"><table class="data"><thead><tr>' +
        '<th>姓名</th><th>学号</th><th>学院</th><th style="width:100px">角色</th><th style="width:70px">状态</th>' +
        '<th style="width:120px">活跃度</th><th style="width:100px">注册时间</th><th style="width:220px">操作</th>' +
      '</tr></thead><tbody>' + (rows || emptyRow(8)) + '</tbody></table></div></div>';
  }

  function userForm(item) {
    formModal({
      title: item ? '编辑用户' : '新增用户',
      values: item,
      fields: [
        { key: 'name', label: '姓名', required: true, placeholder: '如：李同学' },
        { key: 'sid', label: '学号', placeholder: '如：2024010101' },
        { key: 'college', label: '学院', placeholder: '如：计算机学院' },
        { key: 'role', label: '角色', type: 'select', options: [['学生', '学生'], ['管理员', '管理员']], def: '学生' },
        { key: 'status', label: '账号状态', type: 'select', options: [['正常', '正常'], ['禁言', '禁言'], ['封禁', '封禁']], def: '正常' }
      ],
      onSubmit: function (d) {
        if (!d.name) { toast('请填写姓名', 'err'); return false; }
        if (item) { DB.update('users', item.id, d); toast('已保存', 'ok'); }
        else {
          d.uploads = 0; d.posts = 0; d.join = DB.today();
          DB.add('users', d); toast('已新增用户', 'ok');
        }
        render();
      }
    });
  }

  /* ================= 视图：公告与设置 ================= */
  function viewSettings() {
    var db = DB.get();

    var announceRows = db.announce.map(function (a, i) {
      return '<tr><td class="cell-sub">' + (i + 1) + '</td><td>' + esc(a) + '</td>' +
        '<td><div class="ops">' +
          '<button class="btn btn-sm btn-ghost" data-act="announce-edit" data-index="' + i + '">编辑</button>' +
          '<button class="btn btn-sm btn-danger-ghost" data-act="announce-del" data-index="' + i + '">删除</button>' +
        '</div></td></tr>';
    }).join('');

    var catHTML = db.categories.map(function (c) {
      return '<span class="badge badge-blue" style="margin:0 6px 6px 0;display:inline-flex;align-items:center;gap:6px">' +
        esc(c) + '<b data-act="cat-del" data-name="' + esc(c) + '" style="cursor:pointer;color:#A84E42">×</b></span>';
    }).join('');

    return pageHead('公告与设置', '维护首页滚动公告、真题分类字典，以及站点数据初始化') +
      '<div class="card"><div class="card-title">📢 首页滚动公告<span class="count">' + db.announce.length + ' 条，前台每 3.5 秒轮播</span></div>' +
        '<div class="table-wrap"><table class="data"><thead><tr><th style="width:50px">#</th><th>公告内容</th><th style="width:150px">操作</th></tr></thead>' +
        '<tbody>' + (announceRows || emptyRow(3)) + '</tbody></table></div>' +
        '<button class="btn btn-primary btn-sm" style="margin-top:12px" data-act="announce-new">＋ 新增公告</button></div>' +

      '<div class="card"><div class="card-title">🏷️ 真题分类字典<span class="count">' + db.categories.length + ' 个</span></div>' +
        '<div>' + catHTML + '</div>' +
        '<button class="btn btn-ghost btn-sm" style="margin-top:10px" data-act="cat-new">＋ 新增分类</button></div>' +

      '<div class="card"><div class="card-title">🗄️ 数据管理</div>' +
        '<p class="cell-sub" style="margin-bottom:12px">所有数据保存在浏览器本地（localStorage）。恢复默认数据会清空当前全部改动，请谨慎操作。</p>' +
        '<button class="btn btn-danger-ghost" data-act="reset-data">恢复默认数据</button></div>';
  }

  /* ================= 小组件 ================= */
  function pageHead(title, sub) {
    return '<div class="page-head"><div><h1>' + esc(title) + '</h1><p>' + esc(sub) + '</p></div></div>';
  }

  function selectHTML(key, options, value) {
    return '<select data-change="' + key + '">' + options.map(function (o) {
      var v = o[0], t = o[1];
      return '<option value="' + esc(v) + '"' + (String(v) === String(value) ? ' selected' : '') + '>' + esc(t) + '</option>';
    }).join('') + '</select>';
  }

  function emptyRow(cols) {
    return '<tr><td colspan="' + cols + '" class="empty-row">暂无数据</td></tr>';
  }

  /* ================= 路由与渲染 ================= */
  var VIEWS = {
    home: viewHome, quick: viewQuick, paths: viewPaths,
    exams: viewExams, posts: viewPosts, users: viewUsers, settings: viewSettings
  };

  function render() {
    state.view = (location.hash || '').replace('#/', '') || 'home';
    if (!VIEWS[state.view]) state.view = 'home';

    var db = DB.get();
    var counts = {
      exams: db.exams.filter(function (e) { return e.status === 'pending'; }).length,
      posts: db.posts.filter(function (p) { return p.status === 'pending'; }).length
    };

    sideNav.querySelectorAll('a').forEach(function (a) {
      var v = a.getAttribute('data-view');
      if (v === state.view) a.classList.add('active'); else a.classList.remove('active');
      var old = a.querySelector('.side-badge');
      if (old) old.remove();
      if (counts[v]) {
        var s = document.createElement('span');
        s.className = 'side-badge';
        s.textContent = counts[v];
        a.appendChild(s);
      }
    });

    viewEl.innerHTML = VIEWS[state.view]();
    viewEl.scrollTop = 0;
  }

  function go(view) { location.hash = '#/' + view; }

  window.addEventListener('hashchange', render);

  /* ================= 事件委托 ================= */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act');
    var id = el.getAttribute('data-id');
    e.preventDefault();

    /* 弹窗 */
    if (act === 'close-modal') { closeModal(); return; }
    if (act === 'submit-form') {
      if (!pendingSubmit) return;
      var keep = pendingSubmit(collectForm()) === false;
      if (!keep) { pendingSubmit = null; closeModal(); }
      return;
    }

    var A = {

      /* 快捷入口 */
      'quick-new': function () { quickForm(null); },
      'quick-edit': function () { quickForm(DB.find('quick', id)); },
      'quick-del': function () { var q = DB.find('quick', id); removeItem('quick', id, q ? q.name : ''); },

      /* 企微路径 */
      'path-new': function () { pathForm(null); },
      'path-edit': function () { pathForm(DB.find('paths', id)); },
      'path-toggle': function () {
        var p = DB.find('paths', id);
        var next = p.status === 'online' ? 'offline' : 'online';
        DB.update('paths', id, { status: next, updated: DB.today() });
        toast(next === 'online' ? '已上架' : '已下架', 'ok');
        render();
      },
      'path-del': function () { var p = DB.find('paths', id); removeItem('paths', id, p ? p.name : ''); },

      /* 真题 */
      'exam-new': function () { examForm(null); },
      'exam-edit': function () { examForm(DB.find('exams', id)); },
      'exam-approve': function () {
        DB.update('exams', id, { status: 'approved', visible: true });
        toast('审核通过，已展示到前台', 'ok');
        render();
      },
      'exam-reject': function () {
        DB.update('exams', id, { status: 'rejected', visible: false });
        toast('已驳回该资源', 'ok');
        render();
      },
      'exam-recheck': function () {
        DB.update('exams', id, { status: 'pending', visible: false });
        toast('已退回待审核状态', 'ok');
        render();
      },
      'exam-del': function () { var x = DB.find('exams', id); removeItem('exams', id, x ? x.course : ''); },

      /* 社区 */
      'post-approve': function () {
        DB.update('posts', id, { status: 'approved' });
        toast('帖子已发布', 'ok'); render();
      },
      'post-ban': function () {
        var p = DB.find('posts', id);
        confirmBox('封禁帖子', '封禁后该帖子不会出现在前台：' + (p ? p.title : ''), '确认封禁').then(function (ok) {
          if (!ok) return;
          DB.update('posts', id, { status: 'banned' });
          toast('已封禁帖子', 'ok'); render();
        });
      },
      'post-restore': function () {
        DB.update('posts', id, { status: 'approved' });
        toast('已恢复发布', 'ok'); render();
      },
      'post-del': function () {
        var p = DB.find('posts', id);
        confirmBox('删除帖子', '确定删除「' + (p ? p.title : '') + '」吗？', '删除').then(function (ok) {
          if (!ok) return;
          DB.remove('posts', id); toast('已删除', 'ok'); render();
        });
      },

      /* 用户 */
      'user-new': function () { userForm(null); },
      'user-edit': function () { userForm(DB.find('users', id)); },
      'user-mute': function () { DB.update('users', id, { status: '禁言' }); toast('已禁言', 'ok'); render(); },
      'user-ban': function () {
        var u = DB.find('users', id);
        confirmBox('封禁用户', '封禁后「' + (u ? u.name : '') + '」将无法登录与发帖。', '确认封禁').then(function (ok) {
          if (!ok) return;
          DB.update('users', id, { status: '封禁' });
          toast('已封禁用户', 'ok'); render();
        });
      },
      'user-restore': function () { DB.update('users', id, { status: '正常' }); toast('已恢复正常', 'ok'); render(); },
      'user-del': function () { var u = DB.find('users', id); removeItem('users', id, u ? u.name : ''); },

      /* 公告 */
      'announce-new': function () {
        formModal({
          title: '新增公告',
          fields: [{ key: 'text', label: '公告内容', required: true, placeholder: '如：期末考试安排已发布' }],
          onSubmit: function (d) {
            if (!d.text) { toast('请填写公告内容', 'err'); return false; }
            var arr = DB.list('announce'); arr.push(d.text); DB.save();
            toast('已新增公告', 'ok'); render();
          }
        });
      },
      'announce-edit': function () {
        var i = Number(el.getAttribute('data-index'));
        var arr = DB.list('announce');
        formModal({
          title: '编辑公告',
          values: { text: arr[i] },
          fields: [{ key: 'text', label: '公告内容', required: true }],
          onSubmit: function (d) {
            if (!d.text) { toast('请填写公告内容', 'err'); return false; }
            arr[i] = d.text; DB.save(); toast('已保存', 'ok'); render();
          }
        });
      },
      'announce-del': function () {
        var i = Number(el.getAttribute('data-index'));
        var arr = DB.list('announce');
        arr.splice(i, 1); DB.save(); toast('已删除公告', 'ok'); render();
      },

      /* 分类 */
      'cat-new': function () {
        formModal({
          title: '新增真题分类',
          fields: [{ key: 'name', label: '分类名称', required: true, placeholder: '如：操作系统' }],
          onSubmit: function (d) {
            if (!d.name) { toast('请填写分类名称', 'err'); return false; }
            var arr = DB.list('categories');
            if (arr.indexOf(d.name) > -1) { toast('该分类已存在', 'err'); return false; }
            arr.push(d.name); DB.save(); toast('已新增分类', 'ok'); render();
          }
        });
      },
      'cat-del': function () {
        var name = el.getAttribute('data-name');
        confirmBox('删除分类', '删除后该分类下的真题将被标记为「未分类」。', '删除').then(function (ok) {
          if (!ok) return;
          var arr = DB.list('categories');
          var i = arr.indexOf(name);
          if (i > -1) arr.splice(i, 1);
          DB.list('exams').forEach(function (x) { if (x.category === name) x.category = '未分类'; });
          DB.save(); toast('已删除分类', 'ok'); render();
        });
      },

      /* 数据 */
      'reset-data': function () {
        confirmBox('恢复默认数据', '将清空所有后台改动（路径 / 真题 / 帖子 / 用户），恢复为初始演示数据。', '确认恢复').then(function (ok) {
          if (!ok) return;
          DB.reset(); toast('已恢复默认数据', 'ok'); render();
        });
      }
    };

    if (A[act]) A[act]();
  });

  /* 下拉筛选 / 开关 / 输入 */
  document.addEventListener('change', function (e) {
    var el = e.target;
    var key = el.getAttribute('data-change');
    if (!key) return;
    var id = el.getAttribute('data-id');

    if (key === 'filter-pathStatus') { state.filter.pathStatus = el.value; render(); return; }
    if (key === 'filter-examStatus') { state.filter.examStatus = el.value; render(); return; }
    if (key === 'filter-examCat') { state.filter.examCat = el.value; render(); return; }
    if (key === 'filter-postBoard') { state.filter.postBoard = el.value; render(); return; }
    if (key === 'filter-postStatus') { state.filter.postStatus = el.value; render(); return; }

    if (key === 'quick-enabled') { DB.update('quick', id, { enabled: el.checked }); toast(el.checked ? '已启用' : '已停用', 'ok'); render(); return; }
    if (key === 'exam-cat') { DB.update('exams', id, { category: el.value }); toast('分类已更新', 'ok'); return; }
    if (key === 'exam-visible') { DB.update('exams', id, { visible: el.checked }); toast(el.checked ? '已设为前台展示' : '已取消展示', 'ok'); render(); return; }
    if (key === 'user-role') { DB.update('users', id, { role: el.value }); toast('角色已更新', 'ok'); render(); return; }
  });

  /* 搜索输入：防抖重新渲染，并保持输入框焦点 */
  var inputTimer = null, lastInput = null;
  document.addEventListener('input', function (e) {
    var el = e.target;
    var key = el.getAttribute('data-input');
    if (!key) return;
    var map = { 'kw-quick': 'quick', 'kw-paths': 'paths', 'kw-exams': 'exams', 'kw-posts': 'posts', 'kw-users': 'users' };
    var field = map[key];
    if (!field) return;

    state.kw[field] = el.value.trim();
    lastInput = { key: key, value: el.value };
    clearTimeout(inputTimer);
    inputTimer = setTimeout(function () {
      viewEl.innerHTML = VIEWS[state.view]();
      var next = viewEl.querySelector('[data-input="' + lastInput.key + '"]');
      if (next) { next.focus(); next.value = lastInput.value; }
    }, 400);
  });

  /* 启动 */
  render();
})();
