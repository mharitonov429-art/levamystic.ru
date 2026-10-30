/* H2 ELEMENT Башкортостан: согласие на аналитику, Яндекс.Метрика, цели, отправка формы (Formspree). Без зависимостей. */
(function () {
  'use strict';
  var cfg = window.H2 || {};
  var KEY = 'h2_consent_analytics';

  function lsGet() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function lsSet(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  /* Яндекс.Метрика: загружается только после согласия посетителя */
  function loadMetrika() {
    if (!cfg.metrika || window.__ymLoaded) return;
    window.__ymLoaded = true;
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=' + cfg.metrika, 'ym');
    window.ym(Number(cfg.metrika), 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: !!cfg.webvisor });
  }
  function goal(name) {
    if (typeof window.ym === 'function' && cfg.metrika) { try { window.ym(Number(cfg.metrika), 'reachGoal', name); } catch (e) {} }
  }

  var banner = document.getElementById('consent');
  var saved = lsGet();
  if (saved === 'yes') loadMetrika();
  else if (banner && saved === null) banner.hidden = false;
  if (banner) {
    banner.addEventListener('click', function (e) {
      var b = e.target.closest('[data-consent]');
      if (!b) return;
      var v = b.getAttribute('data-consent');
      lsSet(v);
      banner.hidden = true;
      if (v === 'yes') loadMetrika();
    });
  }

  /* Цели Метрики (создайте их в интерфейсе Метрики: tel_click, tg_click, partner_click, lead_form) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.getAttribute('href') || '';
    if (h.indexOf('tel:') === 0) goal('tel_click');
    else if (h.indexOf('t.me/') > -1) goal('tg_click');
    else if (h.indexOf('h2-partners.ru') > -1) goal('partner_click');
  }, true);

  /* Форма заявки: отправка в Formspree без перезагрузки страницы */
  var forms = document.querySelectorAll('form[data-form="lead"]');
  Array.prototype.forEach.call(forms, function (form) {
    var status = form.querySelector('.form__status');
    var btn = form.querySelector('button[type="submit"]');
    function say(msg, cls) { if (status) { status.textContent = msg; status.className = 'form__status ' + (cls || ''); } }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.action.indexOf('YOUR_FORM_ID') > -1) {
        say('Форма ещё не подключена. Позвоните ' + (cfg.phone || '') + ' или напишите в Telegram.', 'is-err');
        return;
      }
      if (btn) btn.disabled = true;
      say('Отправляем…', '');
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) {
          if (r.ok) {
            form.reset();
            say('Спасибо! Заявка отправлена. Мы свяжемся с вами по указанному телефону.', 'is-ok');
            goal('lead_form');
          } else {
            return r.json().then(function (d) {
              var m = d && d.errors && d.errors.map(function (x) { return x.message; }).join(' ');
              throw new Error(m || 'Не удалось отправить заявку.');
            });
          }
        })
        .catch(function (err) {
          say((err && err.message ? err.message + ' ' : '') + 'Позвоните ' + (cfg.phone || '') + ' или напишите в Telegram.', 'is-err');
        })
        .then(function () { if (btn) btn.disabled = false; });
    });
  });
})();
