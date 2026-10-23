/* ============================================================
   校园网 2.0 —— 假后台（mock api）
   作用：用 setTimeout 模拟真实网络的延迟和异步返回，
        让前端练习「提交中 → 拿到结果」的完整流程。
   约定：所有接口返回 Promise，成功 { ok: true, data }，失败 { ok: false, message }
   测试失败场景：注册邮箱填 taken@example.com 会返回失败
   ============================================================ */
(function (global) {
  'use strict';

  var DELAY = 600;   /* 模拟网络延迟（毫秒） */

  var api = {

    /* 注册：data = { nickname, email, password, degree, year } */
    register: function (data) {
      return new Promise(function (resolve) {
        setTimeout(function () {
          if (data.email === 'taken@example.com') {
            resolve({ ok: false, message: '该邮箱已被注册' });
          } else {
            resolve({ ok: true, data: { nickname: data.nickname, email: data.email } });
          }
        }, DELAY);
      });
    }
  };

  global.api = api;
})(window);
