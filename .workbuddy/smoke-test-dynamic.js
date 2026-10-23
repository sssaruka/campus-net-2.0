/* 动态页冒烟测试：按任务书验收标准逐条检查 register.html / community.html */
const path = require('path');
const fs = require('fs');
const { JSDOM, VirtualConsole } = require(
  path.join('C:/Users/29478/.workbuddy/binaries/node/workspace/node_modules/jsdom')
);

const DIR = 'C:/Users/29478/campus-net-2.0';

function inlineScripts(file, seed) {
  let html = fs.readFileSync(path.join(DIR, file), 'utf8');
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) =>
    '<script>' + fs.readFileSync(path.join(DIR, src), 'utf8') + '</script>');
  if (seed) {
    html = html.replace('<head>', '<head><script>localStorage.clear();' +
      (seed.key ? 'localStorage.setItem(' + JSON.stringify(seed.key) + ', ' + JSON.stringify(seed.val) + ');' : '') +
      '</script>');
  }
  return html;
}

function makeDom(file, seed) {
  const vc = new VirtualConsole();
  const errors = [];
  vc.on('jsdomError', (e) => errors.push(e.message));
  vc.on('error', (m) => errors.push(String(m)));
  const dom = new JSDOM(inlineScripts(file, seed || {}), {
    runScripts: 'dangerously',
    url: 'http://localhost/',
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  return Promise.resolve(dom).then((dom) => new Promise((res) => {
    dom.window.addEventListener('load', () => setTimeout(() => res({ dom, errors }), 100));
  }));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(name, cond, extra) {
  results.push((cond ? '✅ ' : '❌ ') + name + (extra ? ' → ' + extra : ''));
  if (!cond) process.exitCode = 1;
}

(async () => {
  /* ================= T1 注册页 ================= */
  const r = await makeDom('register.html');
  const rd = r.dom.window.document;
  check('T1 注册页无脚本错误', r.errors.length === 0, r.errors.join(' | '));

  const shown = () => rd.querySelectorAll('.form-error.show').length;

  /* 什么都不填直接提交 → 5 条错误同时显示 */
  rd.getElementById('regForm').dispatchEvent(new r.dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(20);
  check('T1 空表单提交 → 5 条错误同时显示', shown() === 5, shown() + ' 条');

  /* 改一个字段，错误实时消失（input 事件） */
  const nick = rd.getElementById('nickname');
  nick.value = '小郑';
  nick.dispatchEvent(new r.dom.window.Event('input', { bubbles: true }));
  await sleep(20);
  check('T1 修改昵称后其错误实时消失', shown() === 4, shown() + ' 条');

  /* 邮箱边界：abc@ 拦截，a@b.com 通过 */
  nick.value = '小郑'; nick.dispatchEvent(new r.dom.window.Event('input', { bubbles: true }));
  const email = rd.getElementById('email');
  const pwd = rd.getElementById('password');
  const pwd2 = rd.getElementById('password2');
  email.value = 'abc@'; email.dispatchEvent(new r.dom.window.Event('input', { bubbles: true }));
  pwd.value = 'abc12345'; pwd.dispatchEvent(new r.dom.window.Event('input', { bubbles: true }));
  pwd2.value = 'abc12345'; pwd2.dispatchEvent(new r.dom.window.Event('input', { bubbles: true }));
  rd.getElementById('agree').checked = true;
  rd.getElementById('agree').dispatchEvent(new r.dom.window.Event('change', { bubbles: true }));
  rd.getElementById('regForm').dispatchEvent(new r.dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(20);
  check('T1 邮箱 abc@ 被拦截', shown() === 1 && rd.getElementById('err-email').classList.contains('show'));

  email.value = 'a@b.com'; email.dispatchEvent(new r.dom.window.Event('input', { bubbles: true }));
  rd.getElementById('regForm').dispatchEvent(new r.dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(20);
  check('T1 校验全过 → 进入提交中状态', shown() === 0 &&
    rd.getElementById('submitBtn').disabled === true &&
    rd.getElementById('submitBtn').textContent.indexOf('提交中') > -1);

  /* 防连点：提交过程中再次 submit 无效 */
  rd.getElementById('regForm').dispatchEvent(new r.dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(800);   /* 等假后台 600ms 返回 */
  check('T1 注册成功 → 绿色提示 + localStorage 存储',
    rd.getElementById('successBox').classList.contains('show') &&
    r.dom.window.localStorage.getItem('campus_net_2_reg_user') !== null);
  check('T1 提交结束 → 按钮恢复可用', rd.getElementById('submitBtn').disabled === false);

  /* 刷新（新 DOM 实例 + 同一 storage）：昵称恢复显示 */
  const dumped = r.dom.window.localStorage.getItem('campus_net_2_reg_user');
  const r2 = await makeDom('register.html', { key: 'campus_net_2_reg_user', val: dumped });
  const rd2 = r2.dom.window.document;
  await sleep(50);
  check('T1 刷新后昵称从 localStorage 恢复',
    rd2.getElementById('userBanner').classList.contains('show') &&
    rd2.getElementById('nickname').value === '小郑');

  /* 失败场景：taken@example.com → 显示假后台 message */
  const r3 = await makeDom('register.html');
  const rd3 = r3.dom.window.document;
  rd3.getElementById('nickname').value = '测试用户';
  rd3.getElementById('email').value = 'taken@example.com';
  rd3.getElementById('password').value = 'abc12345';
  rd3.getElementById('password2').value = 'abc12345';
  rd3.getElementById('agree').checked = true;
  rd3.getElementById('regForm').dispatchEvent(new r3.dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(800);
  check('T1 失败时显示假后台 message',
    rd3.getElementById('failBox').classList.contains('show') &&
    rd3.getElementById('failBox').textContent.indexOf('已被注册') > -1);

  /* ================= T2/T3 社区页 ================= */
  const c = await makeDom('community.html');
  const cd = c.dom.window.document;
  check('T2 社区页无脚本错误', c.errors.length === 0, c.errors.join(' | '));

  await sleep(400);   /* 等 300ms 模拟加载 */
  check('T2 首次进入（无数据）显示空状态',
    cd.getElementById('postList').textContent.indexOf('还没有帖子') > -1);

  /* 连发 3 条，最新在上（倒序） */
  const titles = ['第一条帖子', '第二条帖子', '第三条帖子'];
  for (const t of titles) {
    cd.getElementById('postAuthor').value = '小郑';
    cd.getElementById('postTitle').value = t;
    cd.getElementById('postContent').value = '内容：' + t + '，包含 keyword123';
    cd.getElementById('postForm').dispatchEvent(new c.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await sleep(30);
  }
  const order = Array.from(cd.querySelectorAll('.post-title')).map((el) => el.textContent);
  check('T2 连发 3 条 → 倒序（最新在上）',
    order[0] === '第三条帖子' && order[2] === '第一条帖子', order.join(' / '));
  check('T2 用模板渲染出 3 个 article', cd.querySelectorAll('.community-post').length === 3);

  /* 刷新后仍在 */
  const dumpedPosts = c.dom.window.localStorage.getItem('campus_net_2_community_v1');
  const c2 = await makeDom('community.html', { key: 'campus_net_2_community_v1', val: dumpedPosts });
  const cd2 = c2.dom.window.document;
  await sleep(400);
  check('T2 刷新后 3 条帖子仍在', cd2.querySelectorAll('.community-post').length === 3);

  /* T3 实时搜索（input 事件 + 防抖 300ms） */
  const search = cd2.getElementById('searchInput');
  search.value = 'keyword123';
  search.dispatchEvent(new c2.dom.window.Event('input', { bubbles: true }));
  await sleep(50);
  check('T3 防抖期间未过滤（还在等 300ms）', cd2.querySelectorAll('.community-post').length === 3);
  await sleep(350);
  check('T3 关键词命中正文 → 3 条都显示', cd2.querySelectorAll('.community-post').length === 3);

  search.value = '第二条';
  search.dispatchEvent(new c2.dom.window.Event('input', { bubbles: true }));
  await sleep(400);
  const filtered = Array.from(cd2.querySelectorAll('.post-title')).map((el) => el.textContent);
  check('T3 关键词过滤只剩 1 条', filtered.length === 1 && filtered[0] === '第二条帖子');

  search.value = '   ';   /* 只有空格 → trim 后等于没搜 */
  search.dispatchEvent(new c2.dom.window.Event('input', { bubbles: true }));
  await sleep(400);
  check('T3 纯空格关键词 trim 后恢复全部', cd2.querySelectorAll('.community-post').length === 3);

  /* 版块筛选：发帖表单默认版块是「二手交易」，筛「失物招领」应为 0 条 */
  const bf = cd2.getElementById('boardFilter');
  bf.value = '失物招领';
  bf.dispatchEvent(new c2.dom.window.Event('change', { bubbles: true }));
  await sleep(50);
  check('T3 版块筛选无匹配 → 显示「没找到相关内容」',
    cd2.querySelectorAll('.community-post').length === 0 &&
    cd2.getElementById('postList').textContent.indexOf('没找到相关内容') > -1);

  /* 清空 localStorage → 空状态不报错 */
  const c3 = await makeDom('community.html');
  const cd3 = c3.dom.window.document;
  await sleep(400);
  check('T2 清空 localStorage → 空状态而非报错',
    c3.errors.length === 0 && cd3.getElementById('postList').textContent.indexOf('还没有帖子') > -1);

  console.log(results.join('\n'));
  process.exit(process.exitCode || 0);
})();
