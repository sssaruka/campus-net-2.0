/* ============================================================
   注册页脚本（T1）
   流程：提交 → 5 项 JS 校验 → 通过后调假后台 api.register
        → 成功存 localStorage / 失败显示后台 message
   校验规则：
     1. 昵称必填，2～16 个字符
     2. 邮箱格式正确
     3. 密码 ≥ 8 位，且同时包含字母和数字
     4. 两次密码一致
     5. 必须勾选协议
   ============================================================ */
(function () {
  'use strict';

  var USER_KEY = 'campus_net_2_reg_user';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  var form = document.getElementById('regForm');
  var submitBtn = document.getElementById('submitBtn');
  var successBox = document.getElementById('successBox');
  var failBox = document.getElementById('failBox');
  var userBanner = document.getElementById('userBanner');

  /* ---------- 工具：显示 / 清除某个字段的红字红框 ---------- */
  function setError(id, msg) {
    var input = document.getElementById(id);
    var err = document.getElementById('err-' + id);
    if (input) input.classList.add('error');
    if (err) { err.textContent = msg; err.classList.add('show'); }
  }

  function clearError(id) {
    var input = document.getElementById(id);
    var err = document.getElementById('err-' + id);
    if (input) input.classList.remove('error');
    if (err) { err.textContent = ''; err.classList.remove('show'); }
  }

  /* ---------- 5 项校验：每项返回错误消息，空串代表通过 ---------- */
  function validators(data) {
    return {
      nickname: (data.nickname.length >= 2 && data.nickname.length <= 16)
        ? '' : '昵称需要 2～16 个字符',
      email: EMAIL_RE.test(data.email)
        ? '' : '邮箱格式不正确',
      password: (data.password.length >= 8 && /[a-zA-Z]/.test(data.password) && /\d/.test(data.password))
        ? '' : '密码至少 8 位，且需同时包含字母和数字',
      password2: (data.password2 === data.password && data.password2 !== '')
        ? '' : '两次输入的密码不一致',
      agree: data.agree ? '' : '请先阅读并勾选用户协议'
    };
  }

  /* ---------- 实时消除：用户一修改某字段，它的错误立刻消失 ---------- */
  ['nickname', 'email', 'password', 'password2'].forEach(function (id) {
    var input = document.getElementById(id);
    input.addEventListener('input', function () { clearError(id); });
  });
  document.getElementById('agree').addEventListener('change', function () { clearError('agree'); });

  /* ---------- 提交 ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();                     /* 不刷新页面 */

    /* 收集表单数据 */
    var data = {
      nickname: document.getElementById('nickname').value.trim(),
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
      password2: document.getElementById('password2').value,
      degree: document.getElementById('degree').value,
      year: document.getElementById('year').value,
      agree: document.getElementById('agree').checked
    };

    /* 先清掉上次的失败提示 */
    failBox.classList.remove('show');

    /* 逐项校验，收集全部错误（不能只报第一个） */
    var result = validators(data);
    var firstErrorId = null;
    Object.keys(result).forEach(function (id) {
      if (result[id]) {
        setError(id, result[id]);
        if (!firstErrorId) firstErrorId = id;
      } else {
        clearError(id);
      }
    });

    /* 有错误：焦点跳到第一个出错字段，停止提交 */
    if (firstErrorId) {
      document.getElementById(firstErrorId).focus();
      return;
    }

    /* 校验通过：按钮禁用防连点 → 调假后台 */
    submitBtn.disabled = true;
    submitBtn.textContent = '提交中…';

    api.register(data).then(function (res) {
      submitBtn.disabled = false;
      submitBtn.textContent = '注 册';

      if (res.ok) {
        /* 成功：存 localStorage，显示绿色提示 */
        try { localStorage.setItem(USER_KEY, JSON.stringify(res.data)); } catch (e) {}
        successBox.textContent = '🎉 注册成功！欢迎你，' + res.data.nickname;
        successBox.classList.add('show');
        showBanner(res.data.nickname);
      } else {
        /* 失败：把假后台给的 message 显示出来 */
        failBox.textContent = res.message;
        failBox.classList.add('show');
      }
    });
  });

  /* ---------- 页面加载：从 localStorage 恢复昵称 ---------- */
  function showBanner(nickname) {
    document.getElementById('userBannerText').textContent =
      '已注册用户：' + nickname + '（刷新页面也不会丢）';
    userBanner.classList.add('show');
  }

  try {
    var saved = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    if (saved && saved.nickname) {
      showBanner(saved.nickname);
      document.getElementById('nickname').value = saved.nickname;
    }
  } catch (e) { /* 数据损坏时忽略，按未注册处理 */ }
})();
