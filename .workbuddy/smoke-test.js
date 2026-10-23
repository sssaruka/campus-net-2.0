/* 冒烟测试：用 jsdom 加载 index.html / admin.html，检查渲染与主要交互 */
const path = require('path');
const fs = require('fs');
const { JSDOM, VirtualConsole } = require(
  path.join('C:/Users/29478/.workbuddy/binaries/node/workspace/node_modules/jsdom')
);

const DIR = 'C:/Users/29478/campus-net-2.0';

/* 把外链脚本内联，避免 jsdom 加载 file:// 资源失败 */
function inlineScripts(file, seed) {
  let html = fs.readFileSync(path.join(DIR, file), 'utf8');
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) =>
    '<script>' + fs.readFileSync(path.join(DIR, src), 'utf8') + '</script>');
  if (seed) {
    html = html.replace('<head>', '<head><script>localStorage.setItem("campus_net_2_db_v1", ' +
      JSON.stringify(seed) + ');</script>');
  }
  return html;
}

function makeDom(file, seed) {
  const vc = new VirtualConsole();
  const errors = [];
  vc.on('jsdomError', (e) => errors.push(e.message));
  vc.on('error', (m) => errors.push(String(m)));
  const dom = new JSDOM(inlineScripts(file, seed), {
    runScripts: 'dangerously',
    url: 'http://localhost/',
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  return Promise.resolve(dom).then((dom) => new Promise((res) => {
    dom.window.addEventListener('load', () => setTimeout(() => res({ dom, errors }), 300));
  }));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(name, cond, extra) {
  results.push((cond ? '✅ ' : '❌ ') + name + (extra ? ' → ' + extra : ''));
  if (!cond) process.exitCode = 1;
}

(async () => {
  /* ---------- 前台 ---------- */
  const front = await makeDom('index.html');
  const fd = front.dom.window.document;
  check('前台无脚本错误', front.errors.length === 0, front.errors.join(' | '));
  check('快捷入口渲染', fd.querySelectorAll('.quick-item').length === 8,
    fd.querySelectorAll('.quick-item').length + ' 个');
  check('企微路径渲染', fd.querySelectorAll('#pathList li').length > 0);
  check('真题渲染', fd.querySelectorAll('#examList li').length > 0);
  check('社区渲染', fd.querySelectorAll('#postList li').length > 0);
  check('社区板块 tab', fd.querySelectorAll('.board-tab').length === 4);

  /* 搜索过滤 */
  const input = fd.getElementById('searchInput');
  input.value = '请假';
  fd.getElementById('searchBtn').click();
  await sleep(50);
  const pathTxt = fd.getElementById('pathList').textContent;
  check('搜索过滤生效', pathTxt.indexOf('请假') > -1 && pathTxt.indexOf('报修') === -1);

  /* ---------- 后台 ---------- */
  const back = await makeDom('admin.html');
  const win = back.dom.window;
  const bd = win.document;
  check('后台无脚本错误', back.errors.length === 0, back.errors.join(' | '));
  check('默认进入概览', bd.getElementById('view').textContent.indexOf('后台概览') > -1);
  check('功能卡片 6 个', bd.querySelectorAll('.func-card').length === 6,
    bd.querySelectorAll('.func-card').length + ' 个');
  check('侧边栏待办角标', bd.querySelectorAll('.side-badge').length >= 2);

  async function go(view) {
    win.location.hash = '#/' + view;
    win.dispatchEvent(new win.Event('hashchange'));
    await sleep(30);
    return bd.getElementById('view').textContent;
  }

  const views = ['quick', 'paths', 'exams', 'posts', 'users', 'settings'];
  for (const v of views) {
    const txt = await go(v);
    check('视图 ' + v + ' 渲染', txt.length > 50 && txt.indexOf('undefined') === -1);
  }

  /* 企微路径：新增一条 */
  await go('paths');
  const before = win.DB.list('paths').length;
  bd.querySelector('[data-act="path-new"]').click();
  await sleep(30);
  check('新增路径弹窗打开', !!bd.querySelector('.modal'));
  bd.querySelector('[data-key="name"]').value = '测试路径';
  bd.querySelector('[data-key="route"]').value = '企业微信 → 测试';
  bd.querySelector('[data-key="views"]').value = '9999';
  bd.querySelector('[data-act="submit-form"]').click();
  await sleep(50);
  check('新增路径已写入', win.DB.list('paths').length === before + 1,
    before + ' → ' + win.DB.list('paths').length);

  /* 真题：审核通过 */
  await go('exams');
  const pendingBefore = win.DB.list('exams').filter((e) => e.status === 'pending').length;
  const approveBtn = bd.querySelector('[data-act="exam-approve"]');
  check('存在待审核真题', !!approveBtn && pendingBefore > 0);
  approveBtn.click();
  await sleep(50);
  const pendingAfter = win.DB.list('exams').filter((e) => e.status === 'pending').length;
  check('审核通过生效', pendingAfter === pendingBefore - 1, pendingBefore + ' → ' + pendingAfter);

  /* 真题：切换展示开关 */
  const approvedOne = win.DB.list('exams').filter(function (e) { return e.status === 'approved'; })[0];
  const sw = bd.querySelector('[data-change="exam-visible"][data-id="' + approvedOne.id + '"]');
  const id = sw.getAttribute('data-id');
  const visBefore = win.DB.find('exams', id).visible;
  sw.checked = !visBefore;
  sw.dispatchEvent(new win.Event('change', { bubbles: true }));
  await sleep(30);
  check('展示开关生效', win.DB.find('exams', id).visible === !visBefore);

  /* 社区：封禁帖子 */
  await go('posts');
  const banBtn = bd.querySelector('[data-act="post-ban"]');
  const pid = banBtn.getAttribute('data-id');
  banBtn.click();
  await sleep(30);
  bd.querySelector('[data-act="confirm-yes"]').click();
  await sleep(50);
  check('封禁帖子生效', win.DB.find('posts', pid).status === 'banned');

  /* 用户中心：禁言 */
  await go('users');
  const muteBtn = bd.querySelector('[data-act="user-mute"]');
  const uid = muteBtn.getAttribute('data-id');
  muteBtn.click();
  await sleep(50);
  check('用户禁言生效', win.DB.find('users', uid).status === '禁言');

  /* 后台改动同步到前台：把后台写好的 localStorage 注入新的前台实例 */
  const dumped = win.localStorage.getItem('campus_net_2_db_v1');
  const front2 = await makeDom('index.html', dumped);
  const fd2 = front2.dom.window.document;
  check('前台无脚本错误(2)', front2.errors.length === 0, front2.errors.join(' | '));
  check('前台不显示已封禁帖子', fd2.getElementById('postList').textContent.indexOf('代考') === -1);

  /* 用搜索验证后台新增 / 审核通过的内容确实出现在前台 */
  function search(kw) {
    fd2.getElementById('searchInput').value = kw;
    fd2.getElementById('searchBtn').click();
  }
  search('测试路径');
  check('前台可搜到后台新增的路径', fd2.getElementById('pathList').textContent.indexOf('测试路径') > -1);
  search('计算机网络');
  check('前台可搜到审核通过的真题', fd2.getElementById('examList').textContent.indexOf('计算机网络') > -1);

  console.log(results.join('\n'));
  process.exit(process.exitCode || 0);
})();
