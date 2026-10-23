# -*- coding: utf-8 -*-
"""生成《校园网 2.0 代码从零讲起》Word 讲解文档"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

doc = Document()

# ---------- 全局字体 ----------
style = doc.styles['Normal']
style.font.name = 'Calibri'
style.font.size = Pt(11)
style.element.rPr.rFonts.set(qn('w:eastAsia'), '等线')

def set_font(run, name='Calibri', east='等线', size=11, bold=False, color=None):
    run.font.name = name
    run.font.size = Pt(size)
    run.font.bold = bold
    run._element.rPr.rFonts.set(qn('w:eastAsia'), east)
    if color:
        run.font.color.rgb = RGBColor(*color)

def h1(text):
    p = doc.add_heading(level=1)
    set_font(p.add_run(text), size=17, bold=True, color=(0x40, 0x61, 0x6E))

def h2(text):
    p = doc.add_heading(level=2)
    set_font(p.add_run(text), size=14, bold=True, color=(0x58, 0x7F, 0x8D))

def para(text, bold=False, size=11, color=None):
    p = doc.add_paragraph()
    set_font(p.add_run(text), size=size, bold=bold, color=color)
    return p

def bullet(text, bold_prefix=None):
    p = doc.add_paragraph(style='List Bullet')
    if bold_prefix:
        set_font(p.add_run(bold_prefix), bold=True)
    set_font(p.add_run(text))
    return p

def code(lines, note=None):
    """灰色底、等宽字体的代码块；note 是代码块下方的小字解释"""
    if isinstance(lines, str):
        lines = lines.split('\n')
    for line in lines:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Cm(0.6)
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(line if line else ' ')
        set_font(r, name='Consolas', east='等线', size=9.5, color=(0x2B, 0x3A, 0x42))
        # 灰蓝底色
        pPr = p._p.get_or_add_pPr()
        shd = OxmlElement('w:shd')
        shd.set(qn('w:val'), 'clear')
        shd.set(qn('w:fill'), 'EDF3F5')
        pPr.append(shd)
    if note:
        p = doc.add_paragraph()
        set_font(p.add_run(note), size=9.5, color=(0x7C, 0x8F, 0x98))
    else:
        doc.add_paragraph().paragraph_format.space_after = Pt(2)

def tip(text):
    """💡 小贴士段落"""
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(0.5)
    set_font(p.add_run('💡 ' + text), size=10, color=(0x4E, 0x7A, 0x5A))

# ============================================================
# 封面
# ============================================================
for _ in range(6):
    doc.add_paragraph()
p = doc.add_paragraph(); p.alignment = 1
set_font(p.add_run('校园网 2.0'), size=28, bold=True, color=(0x40, 0x61, 0x6E))
p = doc.add_paragraph(); p.alignment = 1
set_font(p.add_run('代 码 从 零 讲 起'), size=20, bold=True, color=(0x6E, 0x9A, 0xA8))
p = doc.add_paragraph(); p.alignment = 1
set_font(p.add_run('—— 写给完全没写过代码的你 ——'), size=12, color=(0x7C, 0x8F, 0x98))
doc.add_paragraph()
p = doc.add_paragraph(); p.alignment = 1
set_font(p.add_run('配合项目 campus-net-2.0 食用 · 边翻文档边开文件对照看'), size=10, color=(0x7C, 0x8F, 0x98))
doc.add_page_break()

# ============================================================
# 第 0 章
# ============================================================
h1('第 0 章 · 开始之前：这本书怎么读')
para('这份文档假设你【完全没写过代码】。它会带你把项目里的每个文件都过一遍，'
     '讲清楚两件事：① 这行代码在做什么；② 为什么要这么做。')
bullet('不需要按顺序一口气读完。每一章都独立成篇，卡住了就跳过去。')
bullet('强烈建议边读边打开对应文件对照：用 VS Code 打开项目文件夹，讲到哪段代码就滚到哪段。')
bullet('看到不懂的词，先翻第 10 章的词汇表，90% 的名词都在里面。')
tip('读代码和读文章不一样：读不懂就【动手改一点、刷新页面看变化】，比盯十分钟有用得多。')

# ============================================================
# 第 1 章
# ============================================================
h1('第 1 章 · 这个项目是什么：一张地图')

h2('1.1 先搞清楚：浏览器到底打开了什么')
para('你在浏览器输入 http://localhost:8000 回车的那一瞬间，发生了这样一场对话：')
code([
    '你（浏览器）：「服务器，把 index.html 给我」',
    '服务器（python）：「好的，拿去」（把文件内容发过去）',
    '浏览器：「这文件里还提到 css/style.css 和 js/app.js，都给我」',
    '服务器：「都拿去」',
    '浏览器：（把三样东西拼起来，画成你看到的页面）',
], note='所谓"本地服务器"，就是在你自己电脑上假装成一个网站服务器，方便练习。')
para('所以一个网页 = 一堆文件。浏览器是画师，服务器是仓库管理员，文件是货。')

h2('1.2 项目目录：每个文件是干嘛的')
code([
    'campus-net-2.0/',
    '├── index.html        ← 首页（门面）',
    '├── admin.html        ← 管理后台页面',
    '├── register.html     ← 注册练习页',
    '├── community.html    ← 社区练习页',
    '├── css/  style.css admin.css        ← 网站的"衣服"（样式）',
    '├── js/   data.js app.js ...         ← 网站的"大脑"（逻辑）',
    '├── docs/ 两份需求文档.docx           ← 写给人看的说明',
    '└── 启动服务器.bat                    ← 双击 = 一键开服务器',
])
para('HTML 文件互相跳转（点"后台管理"就从首页跳到 admin.html），它们都会去 css/ 和 js/ 里找自己的衣服和大脑。')

# ============================================================
# 第 2 章
# ============================================================
h1('第 2 章 · 网页三剑客：HTML、CSS、JS')
para('记住这个比喻，全书通用：')
bullet('HTML = 骨架。决定页面上【有什么】：这里有个标题、那里有个输入框。')
bullet('CSS = 衣服。决定东西【长什么样】：蓝底的、圆角的、居中的。')
bullet('JS = 大脑。决定东西【怎么动】：点按钮会怎样、数据怎么变。')

h2('2.1 读 HTML：像读一个快递单')
code([
    '<input class="form-input" type="text" id="nickname" placeholder="2～16 个字符">',
], note='这一行出自 register.html，意思是"放一个输入框"。拆开看：')
bullet('input —— 快递里的【东西本身】："一个输入框"（这叫标签 tag，尖括号包起来）')
bullet('class="form-input" —— 给它贴的【分类标签】："它属于 form-input 这一类"（CSS 靠这个找到它、给它穿衣服）')
bullet('id="nickname" —— 它的【身份证号】，全页面唯一（JS 靠这个精确找到它）')
bullet('placeholder="..." —— 输入框里的灰色提示文字')
tip('class 可以重复（很多输入框都可以叫 form-input），id 全页唯一（只能有一个 nickname）。'
    'CSS 用 .nickname 找 class，JS 常用 getElementById 找 id。')

h2('2.2 读 CSS：先找对人，再下指令')
code([
    '.form-input {            ← "找到所有贴了 form-input 标签的家伙"',
    '  border: 1.5px solid var(--border);   ← 给它们下指令：边框 1.5 像素',
    '  border-radius: 9px;                  ← 圆角 9 像素',
    '}',
], note='var(--border) 是"变量"：颜色值统一存在文件开头，改一处、全站变。')

# ============================================================
# 第 3 章
# ============================================================
h1('第 3 章 · JavaScript 速成：只学看懂本项目所需的部分')
para('本章是全书最重要的地基。每个概念都配了项目里的真实代码。')

h2('3.1 变量 var：贴了标签的盒子')
code([
    "var nickname = '小郑';",
], note='造一个盒子，贴上标签 nickname，里面放字符串"小郑"。以后喊 nickname 就能拿到盒子里的东西。')

h2('3.2 函数 function：豆浆机')
para('函数 = 一台机器：塞进去东西（参数），吐出来结果（返回值）。造好之后随时可用。')
code([
    'function add(a, b) {      ← 造一台叫 add 的豆浆机，有两个进口 a 和 b',
    '  return a + b;           ← 吐出 a+b 的结果',
    '}',
    'var x = add(1, 2);        ← 使用它：x 现在是 3',
])

h2('3.3 对象 {} 和数组 []：通讯录与清单')
code([
    "var post = { title: '卖自行车', author: '小郑' };   ← 对象：一条通讯录（键: 值）",
    "post.title                ← 取出：'卖自行车'",
    '',
    "var boards = ['二手交易', '失物招领', '学习交流'];  ← 数组：一张清单",
    'boards[0]                 ← 取第 1 项（程序从 0 开始数！）',
])

h2('3.4 找到页面元素：document.getElementById')
code([
    "var input = document.getElementById('nickname');",
], note='翻译：document（这个页面）里，把 id 为 nickname 的那个元素拿给我。拿到后就能读它、改它。')

h2('3.5 事件：给门铃装上反应')
code([
    "btn.addEventListener('click', function () {",
    '  alert("有人按门铃！");',
    '});',
], note='addEventListener = 装门铃：等 click（点击）发生时，执行花括号里的代码。'
       '常用事件：click 点击 / input 输入框内容变化 / submit 表单提交 / change 下拉框换选项。')

h2('3.6 字符串拼接和模板字符串')
code([
    "var html = '<div>' + post.title + '</div>';     ← 老写法：用 + 缝起来",
    "var html2 = `<div>${post.title}</div>`;          ← 新写法：反引号 + ${}",
], note='反引号在键盘左上角（Esc 下面那个键）。${} 会被替换成变量的值。'
       '项目里 render 函数全用这个手法拼 HTML。')

h2('3.7 if 判断和 return')
code([
    'if (password.length >= 8) {        ← 如果密码长度 ≥ 8',
    "  return '';                        ← 返回空串（代表'没错'）",
    "} else {",
    "  return '密码太短';                ← 否则返回错误提示",
    '}',
])

# ============================================================
# 第 4 章
# ============================================================
h1('第 4 章 · localStorage：浏览器自带的便利贴')
para('问题：网页一刷新，所有变量全部清零（内存被擦掉了）。那注册成功的信息怎么保存？')
para('答案：localStorage —— 浏览器提供的一本【便利贴本子】，写在上面的东西关浏览器、刷新都不丢，'
     '除非用户手动清空。每个网站有自己独立的一本。')
code([
    "localStorage.setItem('名字', '小郑');              ← 写一张便利贴",
    "localStorage.getItem('名字');                      ← 读出来：'小郑'",
    "localStorage.removeItem('名字');                   ← 撕掉这张便利贴",
])
h2('4.1 但它只能存字符串：JSON 登场')
para('便利贴上只能写文字，存不了对象/数组。所以要先"翻译成文字"（存时），再"翻译回来"（取时）：')
code([
    'var user = { nickname: "小郑", email: "a@b.com" };',
    "localStorage.setItem('user', JSON.stringify(user));  ← 对象 → 文字，存",
    "var back = JSON.parse(localStorage.getItem('user')); ← 文字 → 对象，取",
], note='这对组合在 register.js 和 community.js 里各出现一次，找找看。')
tip('验收任务书里"清空 localStorage 后刷新显示空状态"：撕掉便利贴，本子空了，'
    '代码读出来是 null，就要准备好"什么都没有"的展示方案，而不是报错。')

# ============================================================
# 第 5 章
# ============================================================
h1('第 5 章 · 首页是怎么动起来的')
h2('5.1 数据和页面分离：data.js 的角色')
para('项目最核心的设计决定：【页面不写死内容，内容全放在 data.js 里】。')
code([
    "// data.js 里存着这样一份数据（节选）",
    'quick: [',
    "  { id: 'q1', icon: '📝', name: '请假申请', route: '企业微信 → ...' },",
    "  { id: 'q2', icon: '🔧', name: '宿舍报修', ... },",
    ']',
], note='app.js 读这份清单，循环画出每个快捷入口。数据换了，页面自动跟着换——这就是"动态"。')
para('data.js 把这份数据挂在 window.DB 上（window 是浏览器给 JS 的"全局工具箱"），'
     '并负责把它存进 localStorage、提供增删改查的方法。')

h2('5.2 renderQuick：把数据画成页面（逐行讲）')
code([
    "box.innerHTML = list.map(function (q) {",
    "  return '<a class=\"quick-item\" href=\"#\">' +",
    "         '<span class=\"qi-icon\">' + esc(q.icon) + '</span>' +",
    "         '<span>' + esc(q.name) + '</span></a>';",
    "}).join('');",
])
bullet('.map —— 给清单里【每一项】都执行一次括号里的函数，把每项变成一段 HTML 字符串')
bullet('.join(\'\') —— 把这些小段 HTML 缝成一大段')
bullet('innerHTML = —— 把页面里那个容器（box）的内容整个换成这一大段 HTML')
para('这就是"渲染"的全部秘密：数据 → 字符串 → 塞进页面。')

h2('5.3 esc()：为什么每个数据都要过一遍它')
code([
    "function esc(str) {",
    "  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')",
    "         .replace(/>/g, '&gt;').replace(/\"/g, '&quot;');",
    '}',
], note='把 < > & " 这四个字符替换成"长得像但不是"的替身。')
para('原因：HTML 靠 < > 划分标签。如果用户发的帖子标题是 "<b>哈哈"</b>，'
     '直接塞进页面会被浏览器当成标签执行，页面结构就乱了（这叫 XSS 漏洞）。'
     '先转义，显示时能看到原样的符号，但不会被执行。')

h2('5.4 搜索是怎么过滤的')
code([
    "function match(keyword, fields) {",
    '  var k = keyword.toLowerCase();        ← 全部转小写，实现"忽略大小写"',
    "  return fields.join(' ').toLowerCase().indexOf(k) > -1;   ",
    '}',
], note='把要查的字段（名字、路径…）缝成一句话、转小写，看关键词在不在里面（indexOf 找不到返回 -1）。')

# ============================================================
# 第 6 章
# ============================================================
h1('第 6 章 · 注册页 register.js：一条流水线')
para('整个注册页就是一条流水线，记住这张图：')
code([
    '用户点"注册"',
    '   ↓ ① 收集：把 7 个框里的值读出来，打包成 data 对象',
    '   ↓ ② 校验：5 项检查，每项要么通过、要么给出错误消息',
    '   ↓   ├─ 有错 → 红字红框亮出来，焦点跳到第一个错，流水线停止',
    '   ↓   └─ 全过 → 继续',
    '   ↓ ③ 提交：按钮变"提交中…"并禁用 → 调假后台 api.register(data)',
    '   ↓ ④ 结果：成功 → 绿框 + 存 localStorage；失败 → 红框显示后台的话',
])

h2('6.1 校验函数：每项返回错误消息，空串代表没错')
code([
    'nickname: (data.nickname.length >= 2 && data.nickname.length <= 16)',
    "          ? '' : '昵称需要 2～16 个字符',",
], note='? : 是 if-else 的浓缩写法：条件 ? 真时给的值 : 假时给的值。')
para('设计巧妙之处：校验【不直接操作页面】，只负责回答"哪里错了"。'
     '显示错误是下一环节的事——每个环节只干一件事，这就是好代码的味道。')

h2('6.2 显示错误：setError / clearError')
code([
    "function setError(id, msg) {",
    "  document.getElementById(id).classList.add('error');      ← 输入框加红框（CSS 生效）",
    "  var err = document.getElementById('err-' + id);",
    "  err.textContent = msg;                                    ← 错误文字填进去",
    "  err.classList.add('show');                                ← 显示出来",
    '}',
], note='classList.add/remove 就是在元素的 class 列表里加减标签——CSS 早就为 .error 和 .show '
       '写好了红框和显示样式，JS 只负责"贴标签"，样式交给 CSS 管。分工！')

h2('6.3 为什么必须 preventDefault')
code([
    "form.addEventListener('submit', function (e) {",
    '  e.preventDefault();      ← 拦下浏览器的默认动作',
], note='表单的默认动作是"提交并刷新页面"。我们要用 JS 接管整个流程，必须先把它拦住，'
       '否则页面一闪，什么都白干了。')

h2('6.4 防连点：为什么提交时要禁用按钮')
para('假后台要 600ms 才返回。这期间用户可能手抖点 3 次 → 注册 3 次。'
     '所以进入提交就 disabled = true（按钮变灰不可点），拿到结果再恢复。一行代码避免脏数据。')

h2('6.5 Promise：取餐牌')
para('api.register(data) 不是立刻给结果（网络有延迟），它返回一张【取餐牌】（Promise）。')
code([
    'api.register(data).then(function (res) {',
    '  // 600ms 后才执行到这里，res 就是结果',
    '});',
], note='.then 的意思：牌响了（结果到了）再执行括号里的函数。'
       '期间页面不会卡住，用户还能动——这就是"异步"。')

# ============================================================
# 第 7 章
# ============================================================
h1('第 7 章 · 社区页 community.js：全项目最重要的 60 行')
para('任务书说"这是本周最关键的一步"，因为这一页完整展示了动态页面的核心心法：')
code([
    '┌─────────────────────────────────────────────┐',
    '│   state（账本）          render()（画黑板）    │',
    '│   posts: 所有帖子    ──→  照着账本把列表画出来  │',
    '└─────────────────────────────────────────────┘',
    '任何操作都不直接改页面，而是：改账本 → 重新画黑板',
])

h2('7.1 发帖 = 三步：记账 → 保存 → 重画')
code([
    "state.posts.unshift({ id: 'p_' + Date.now(), board, author, title, content, time: Date.now() });",
    'save();      ← 把新账本抄到 localStorage（便利贴）上',
    'render();    ← 照着账本重新画黑板',
], note='unshift 是"插到数组最前面"（push 是加到最后）。插最前面 = 最新帖子显示在最上面，'
       '这就实现了任务书要求的"倒序"。Date.now() 是此刻的毫秒数，用来当唯一 id 和发帖时间。')

h2('7.2 visiblePosts：搜索和筛选叠加的秘诀')
code([
    'return state.posts.filter(function (p) {',
    "  var boardOk = state.board === '全部' || p.board === state.board;   ← 版块这关",
    '  var kwOk = !kw || p.title.toLowerCase().indexOf(kw) > -1',
    '             || p.content.toLowerCase().indexOf(kw) > -1;           ← 关键词这关',
    '  return boardOk && kwOk;      ← 两关都过才展示',
    '});',
], note='.filter：对清单每一项问一句"要不要"，收集所有回答"要"的，生成一张新清单。'
       '原账本一个字没动——搜索只是决定"这次画哪些"，不是删数据。')

h2('7.3 防抖 debounce：电梯门')
para('需求：输入时实时过滤。但如果每敲一个字母就全量重画一次，敲"高数"会画 2 次，浪费。')
para('解法叫防抖，原理和电梯门一样：有人进门，门就重新等待 3 秒；期间又有人进，再重等 3 秒；'
     '真正没人进了，门才关。对应到搜索：每敲一个字就重设 300ms 的闹钟，闹钟真响了才过滤。')
code([
    'var debounceTimer = null;                        ← 闹钟',
    "searchInput.addEventListener('input', function () {",
    '  clearTimeout(debounceTimer);                   ← 有人再敲字：把旧闹钟取消',
    '  debounceTimer = setTimeout(function () {        ← 上 300ms 的新闹钟',
    '    state.keyword = searchInput.value;',
    '    render();                                    ← 闹钟响了才真正过滤重画',
    '  }, 300);',
    '});',
])

h2('7.4 相对时间 timeAgo')
code([
    'var diff = Math.floor((Date.now() - ts) / 1000);   ← 现在减去发帖时刻 = 多少秒前',
    "if (diff < 60) return '刚刚';",
    "if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';",
    '// 同年显示 MM-DD，跨年显示 YYYY-MM-DD',
], note='这就是任务书"刚刚 / x 分钟前 / MM-DD"规则的落地，边界都定死了，不会扯皮。')

h2('7.5 两种"没内容"要分开')
bullet('账本本来就空 → 显示"还没有帖子，来发第一条吧"（引导发帖）')
bullet('账本有货但没搜到 → 显示"没找到相关内容"（提示换关键词）')
para('对用户来说这两种"空白"原因完全不同，文案不同才叫用心。代码里就是 '
     'state.posts.length 一个判断。')

# ============================================================
# 第 8 章
# ============================================================
h1('第 8 章 · mock-api.js：假装的后台')
para('真项目的注册数据要发给远端服务器保存。但我们还在练习阶段，没有真后台，'
     '于是写了个"假装的"：让 JS 代码【形状】和调用真后台一模一样，以后换真后台只改这一个文件。')
code([
    'register: function (data) {',
    '  return new Promise(function (resolve) {',
    '    setTimeout(function () {          ← 600ms 后再做下面的事（模拟网络延迟）',
    "      if (data.email === 'taken@example.com') {",
    "        resolve({ ok: false, message: '该邮箱已被注册' });   ← 失败也用 resolve 交付",
    '      } else {',
    '        resolve({ ok: true, data: { ... } });',
    '      }',
    '    }, 600);',
    '  });',
    '}',
], note='resolve(结果) = 把结果挂到取餐牌上，.then 那边就能收到了。'
       '注意：业务失败（邮箱被占用）不是程序出错，所以也走 resolve，只是 ok 字段不同。')

# ============================================================
# 第 9 章
# ============================================================
h1('第 9 章 · 后台与测试：同一套心法的放大版')
h2('9.1 admin.js：更大，但不更难')
para('后台有 7 个页面（概览/快捷入口/路径/真题/社区/用户/设置），看起来吓人，'
     '其实每个页面都是第 5~7 章的重复：从 DB 读数据 → 模板字符串拼 HTML → 塞进页面；'
     '点按钮 → 改数据 → 重新渲染。看懂 community.js 再看 admin.js，会觉得眼熟。')

h2('9.2 smoke-test：让机器人替你点页面')
para('.workbuddy/ 里有两个测试脚本。它们的工作方式：用 jsdom（一个装在 Node 里的假浏览器）'
     '打开页面 → 用代码模拟"点击""输入""提交" → 检查页面上该出现的东西出现了没有。')
code([
    "check('T1 空表单提交 → 5 条错误同时显示', shown() === 5);",
], note='check(名字, 条件)：条件为真打 ✅，为假打 ❌ 并让整个脚本报错退出。'
       '每次改完代码跑一遍 node .workbuddy/smoke-test.js，20 秒内知道有没有改坏东西。')

# ============================================================
# 第 10 章
# ============================================================
h1('第 10 章 · 词汇表：看不懂就翻这里')
table = doc.add_table(rows=1, cols=2)
table.style = 'Table Grid'
hdr = table.rows[0].cells
set_font(hdr[0].paragraphs[0].add_run('词'), bold=True)
set_font(hdr[1].paragraphs[0].add_run('大白话解释'), bold=True)
glossary = [
    ('变量 var/let', '贴了标签的盒子，里面存东西，喊标签名就能拿到'),
    ('函数 function', '豆浆机：塞进原料（参数），吐出成品（返回值）'),
    ('参数 / 返回值', '豆浆机的进口 / 出口'),
    ('对象 {}', '一条通讯录：{ 名字: 值, 电话: 值 }'),
    ('数组 []', '一张清单，按顺序编号（从 0 开始数）'),
    ('属性 / 方法', '对象自带的"资料" / 对象自带的"功能"'),
    ('DOM', '浏览器把 HTML 翻译成的"可操作对象树"，JS 通过它操控页面'),
    ('事件 event', '用户的动作：点击、输入、提交……像门铃'),
    ('事件监听', '装门铃：addEventListener，铃响了执行指定函数'),
    ('回调函数', '塞给别人的函数，"到时候你替我调用"（比如铃响后的反应）'),
    ('渲染 render', '把数据变成页面上的 HTML 画出来'),
    ('模板字符串', '反引号包住的字符串，${变量} 会被替换成值'),
    ('localStorage', '浏览器自带的便利贴本子，刷新不丢，只能存文字'),
    ('JSON', '对象和文字互译的规范：stringify 存、parse 取'),
    ('Promise', '取餐牌：现在拿不到结果，先给张牌，好了叫你（.then）'),
    ('异步', '不干等，先干别的，结果到了再处理'),
    ('setTimeout', '闹钟：多少毫秒后再执行一段代码'),
    ('防抖 debounce', '电梯门逻辑：不停重设计时器，安静够久才执行'),
    ('转义 esc', '把 < > & " 换成替身，防止用户输入被当成代码执行'),
    ('filter / map / join', '筛选 / 逐项加工 / 缝合成一个字符串'),
    ('IIFE', 'Immediately Invoked：写完立刻执行的函数，(function(){...})()，避免变量污染全局'),
    ('mock', '假装的后台，形状和真后台一样，方便前端先练习'),
    ('XSS', '把恶意代码注入页面的攻击，转义就是防它'),
    ('API', '前后台约定的"服务窗口"，前端点单、后台出餐'),
]
for term, expl in glossary:
    row = table.add_row().cells
    set_font(row[0].paragraphs[0].add_run(term), size=10)
    set_font(row[1].paragraphs[0].add_run(expl), size=10)

# ============================================================
# 第 11 章
# ============================================================
h1('第 11 章 · 下一步：三个小练习')
para('看懂 ≠ 会写。按顺序做这三个，每个都只动一个文件：')
bullet('给 register.html 的密码框加一个"👁 显示/隐藏"切换按钮。',
       bold_prefix='练习①密码可见切换：')
para('    提示：改 input 的 type 属性（password ↔ text），用 addEventListener。', size=10)
bullet('给 community.js 的帖子加删除按钮，点"×"删掉对应帖子。',
       bold_prefix='练习②删帖：')
para('    提示：render 时给每帖带上 id，删除 = posts.filter 掉它 → save → render。', size=10)
bullet('搜索命中的关键词在标题里变成蓝色加粗。',
       bold_prefix='练习③关键词高亮：')
para('    提示：把命中的部分包上 <b> 再渲染（注意要先 esc 再替换）。', size=10)
para('')
para('做完（或卡住）随时找我：我做一遍给你对照，或带着你一行一行写。'
     '推荐从练习①开始——它只需要 10 行代码，但会让你完整体验"HTML 结构 + CSS 样式 + JS 事件"三件套如何配合。')

doc.save('C:/Users/29478/campus-net-2.0/docs/代码从零讲起.docx')
print('已生成 docs/代码从零讲起.docx')
