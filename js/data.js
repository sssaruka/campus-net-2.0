/* ============================================================
   校园网 2.0 —— 共享数据层
   前台(index.html) 与 后台(admin.html) 共用同一份数据
   存储位置：浏览器 localStorage，刷新不丢
   ============================================================ */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'campus_net_2_db_v1';

  /* ---------- 默认数据（第一次打开网站时写入） ---------- */
  function defaultDB() {
    return {
      version: 1,

      /* 顶部滚动公告 */
      announce: [
        '新学期真题已上线，欢迎下载',
        '「场馆预约」路径已变更，点击查看新路径',
        '社区新增「失物招领」板块，捡到东西发这里'
      ],

      /* ① 常用快捷入口（一行展示） */
      quick: [
        { id: 'q1', icon: '📝', name: '请假申请', route: '企业微信 → 学生事务服务 → 请假申请', order: 1, enabled: true },
        { id: 'q2', icon: '🔧', name: '宿舍报修', route: '企业微信 → 后勤服务 → 我要报修', order: 2, enabled: true },
        { id: 'q3', icon: '💳', name: '在线缴费', route: '企业微信 → 财务缴费 → 学费缴纳', order: 3, enabled: true },
        { id: 'q4', icon: '🏀', name: '场馆预约', route: '企业微信 → 场馆预约 → 羽毛球 / 篮球', order: 4, enabled: true },
        { id: 'q5', icon: '📜', name: '证明开具', route: '企业微信 → 证明服务 → 在校证明', order: 5, enabled: true },
        { id: 'q6', icon: '🪪', name: '校园卡挂失', route: '企业微信 → 校园卡 → 挂失', order: 6, enabled: true },
        { id: 'q7', icon: '📚', name: '图书续借', route: '企业微信 → 图书馆 → 借阅管理', order: 7, enabled: true },
        { id: 'q8', icon: '📊', name: '成绩查询', route: '企业微信 → 教务服务 → 我的成绩', order: 8, enabled: true }
      ],

      /* ② 企微路径导航 */
      paths: [
        { id: 'p1', name: '学生请假申请',   route: '企业微信 → 工作台 → 学生事务服务 → 请假申请',   url: '', views: 2300, status: 'online', updated: '2026-10-12' },
        { id: 'p2', name: '宿舍设施报修',   route: '企业微信 → 工作台 → 后勤服务 → 我要报修',       url: '', views: 1800, status: 'online', updated: '2026-10-09' },
        { id: 'p3', name: '学费 / 住宿费缴纳', route: '企业微信 → 工作台 → 财务缴费 → 学费缴纳',    url: '', views: 1500, status: 'online', updated: '2026-10-05' },
        { id: 'p4', name: '体育馆场地预约', route: '企业微信 → 工作台 → 场馆预约 → 羽毛球 / 篮球',  url: '', views: 1200, status: 'online', updated: '2026-10-15' },
        { id: 'p5', name: '在校证明开具',   route: '企业微信 → 工作台 → 证明服务 → 在校证明',       url: '', views: 986,  status: 'online', updated: '2026-09-28' },
        { id: 'p6', name: '一卡通充值',     route: '企业微信 → 工作台 → 校园卡 → 卡片充值',         url: '', views: 640,  status: 'offline', updated: '2026-09-20' }
      ],

      /* ③ 真题资源：status 待审核 / 已通过 / 已驳回，visible 控制前台是否展示 */
      exams: [
        { id: 'e1', title: '2025-2026 学年第一学期期末试卷', course: '高等数学 A（一）', category: '高等数学', term: '2025-2026 第一学期', uploader: '李同学', downloads: 356, likes: 128, status: 'approved', visible: true,  date: '2026-10-14' },
        { id: 'e2', title: '2024-2025 学年第二学期期末试卷', course: '数据结构',        category: '数据结构', term: '2024-2025 第二学期', uploader: '王同学', downloads: 298, likes: 102, status: 'approved', visible: true,  date: '2026-10-11' },
        { id: 'e3', title: '2024-2025 学年第一学期期末试卷', course: '大学英语（四）',  category: '大学英语', term: '2024-2025 第一学期', uploader: '陈同学', downloads: 271, likes: 95,  status: 'approved', visible: true,  date: '2026-10-08' },
        { id: 'e4', title: '2024-2025 学年第一学期期末试卷', course: '线性代数',        category: '线性代数', term: '2024-2025 第一学期', uploader: '赵同学', downloads: 233, likes: 88,  status: 'approved', visible: true,  date: '2026-10-02' },
        { id: 'e5', title: '2023-2024 学年期末回忆版（含答案）', course: '大学物理（二）', category: '大学物理', term: '2023-2024 第二学期', uploader: '孙同学', downloads: 0,   likes: 0,   status: 'pending',  visible: false, date: '2026-10-17' },
        { id: 'e6', title: '计算机网络期中测验扫描件',        course: '计算机网络',      category: '计算机网络', term: '2025-2026 第一学期', uploader: '周同学', downloads: 0,   likes: 0,   status: 'pending',  visible: false, date: '2026-10-18' },
        { id: 'e7', title: '概率论历年卷（清晰扫描）',        course: '概率论与数理统计', category: '概率论与数理统计', term: '2024-2025 第二学期', uploader: '吴同学', downloads: 156, likes: 61, status: 'approved', visible: false, date: '2026-09-26' }
      ],

      /* ④ 校园社区帖子：status 待审核 / 已发布 / 已封禁 */
      posts: [
        { id: 't1', board: '二手交易', title: '九成新自行车（毕业甩卖）',      author: '陈同学', meta: '¥120',       replies: 6,  status: 'approved', time: '10 分钟前' },
        { id: 't2', board: '二手交易', title: 'Kindle Paperwhite 4',           author: '刘同学', meta: '¥350',       replies: 3,  status: 'approved', time: '1 小时前' },
        { id: 't3', board: '二手交易', title: '高数课本 + 习题册全套',         author: '王同学', meta: '¥15',        replies: 12, status: 'approved', time: '3 小时前' },
        { id: 't4', board: '失物招领', title: '【拾物】南苑食堂捡到校园卡一张', author: '匿名',   meta: '待认领',     replies: 2,  status: 'approved', time: '30 分钟前' },
        { id: 't5', board: '失物招领', title: '【寻物】蓝色保温杯，落在一教',   author: '张同学', meta: '寻找中',     replies: 5,  status: 'approved', time: '2 小时前' },
        { id: 't6', board: '失物招领', title: '【拾物】图书馆四楼捡到 AirPods', author: '匿名',   meta: '待认领',     replies: 1,  status: 'approved', time: '昨天' },
        { id: 't7', board: '学习交流', title: '数据结构期末复习经验分享',       author: '李同学', meta: '经验分享',   replies: 42, status: 'approved', time: '昨天' },
        { id: 't8', board: '学习交流', title: '挑战杯组队，求小程序方向队友',   author: '黄同学', meta: '组队互助',   replies: 15, status: 'approved', time: '2 天前' },
        { id: 't9', board: '学习交流', title: '代考、包过，加微信详聊',        author: '可疑账号', meta: '违规内容',  replies: 0,  status: 'banned',   time: '3 小时前' },
        { id: 't10', board: '二手交易', title: '转让电动车（八成新）',         author: '杨同学', meta: '¥800',       replies: 0,  status: 'pending',  time: '20 分钟前' },
        { id: 't11', board: '学习交流', title: '大二选课建议求教（附培养方案）', author: '林同学', meta: '课程问答',   replies: 0,  status: 'pending',  time: '1 小时前' }
      ],

      /* ⑤ 用户中心 */
      users: [
        { id: 'u1', name: '郑同学', sid: '2024010101', college: '计算机学院',   role: '管理员', status: '正常', uploads: 3, posts: 12, join: '2026-03-01' },
        { id: 'u2', name: '王同学', sid: '2024010235', college: '软件学院',     role: '学生',   status: '正常', uploads: 2, posts: 8,  join: '2026-03-12' },
        { id: 'u3', name: '陈同学', sid: '2024020788', college: '电子信息学院', role: '学生',   status: '正常', uploads: 1, posts: 21, join: '2026-04-02' },
        { id: 'u4', name: '赵同学', sid: '2024031120', college: '数学学院',     role: '学生',   status: '禁言', uploads: 1, posts: 3,  join: '2026-04-19' },
        { id: 'u5', name: '可疑账号', sid: '2024999001', college: '—',         role: '学生',   status: '封禁', uploads: 0, posts: 1,  join: '2026-10-18' },
        { id: 'u6', name: '张同学', sid: '2024050342', college: '机械学院',     role: '学生',   status: '正常', uploads: 0, posts: 5,  join: '2026-09-06' }
      ],

      /* 真题分类（后台可对资源归类到这些分类） */
      categories: [
        '高等数学', '数据结构', '大学英语', '线性代数',
        '概率论与数理统计', '大学物理', 'C 语言程序设计', '计算机网络'
      ]
    };
  }

  /* ---------- 读写 ---------- */
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  var cache = null;

  var DB = {
    /* 取出整份数据（没有就初始化） */
    get: function () {
      if (cache) return cache;
      var raw = null;
      try { raw = global.localStorage.getItem(STORAGE_KEY); } catch (e) { raw = null; }
      if (raw) {
        try { cache = JSON.parse(raw); } catch (e) { cache = defaultDB(); }
      } else {
        cache = defaultDB();
        DB.save();
      }
      return cache;
    },

    /* 保存 */
    save: function () {
      try {
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache || defaultDB()));
      } catch (e) {
        console.warn('本地存储写入失败', e);
      }
    },

    /* 恢复出厂数据 */
    reset: function () {
      cache = defaultDB();
      DB.save();
      return cache;
    },

    /* 生成 id */
    uid: function (prefix) {
      return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    },

    /* 取某个集合 */
    list: function (name) {
      var db = DB.get();
      if (!db[name]) db[name] = [];
      return db[name];
    },

    /* 新增一条 */
    add: function (name, obj) {
      var arr = DB.list(name);
      obj.id = obj.id || DB.uid(name.slice(0, 1));
      arr.push(obj);
      DB.save();
      return obj;
    },

    /* 按 id 修改 */
    update: function (name, id, patch) {
      var arr = DB.list(name);
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].id === id) {
          for (var k in patch) { if (Object.prototype.hasOwnProperty.call(patch, k)) arr[i][k] = patch[k]; }
          DB.save();
          return arr[i];
        }
      }
      return null;
    },

    /* 按 id 删除 */
    remove: function (name, id) {
      var arr = DB.list(name);
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].id === id) { arr.splice(i, 1); DB.save(); return true; }
      }
      return false;
    },

    /* 按 id 查找 */
    find: function (name, id) {
      var arr = DB.list(name);
      for (var i = 0; i < arr.length; i++) { if (arr[i].id === id) return arr[i]; }
      return null;
    },

    /* 今日日期 yyyy-mm-dd */
    today: function () {
      var d = new Date(), m = d.getMonth() + 1, day = d.getDate();
      return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
    }
  };

  global.DB = DB;
  global.DB_DEFAULT = defaultDB;
})(window);
