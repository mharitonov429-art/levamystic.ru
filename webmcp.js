/* WebMCP: инструменты сайта для ИИ-агентов, встроенных в браузер.
   Работает только там, где есть navigator.modelContext; в остальных браузерах скрипт ничего не делает.
   Данные берутся из /ai-catalog.json и /articles.json, которые build.py обновляет при каждой сборке. */
(function () {
  'use strict';
  if (!('modelContext' in navigator)) return;
  var mc = navigator.modelContext;

  function ok(data) { return { content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }] }; }
  function getJSON(u) {
    return fetch(u, { headers: { Accept: 'application/json' } }).then(function (r) {
      if (!r.ok) throw new Error(u + ': ' + r.status);
      return r.json();
    });
  }
  var none = { type: 'object', properties: {}, additionalProperties: false };
  var readOnly = { readOnlyHint: true };

  var tools = [
    {
      name: 'get_contacts',
      description: 'Контакты дилера H2 ELEMENT в Башкортостане: телефон, Telegram, адрес.',
      inputSchema: none, annotations: readOnly,
      execute: function () { return getJSON('/ai-catalog.json').then(function (c) { return ok(c.publisher.contact); }); }
    },
    {
      name: 'list_products',
      description: 'Список водородных генераторов ВГА и масел X-ELEMENT с характеристиками производителя. Цены только по запросу.',
      inputSchema: none, annotations: readOnly,
      execute: function () {
        return getJSON('/ai-catalog.json').then(function (c) {
          return ok(c.entries.filter(function (e) { return e.type === 'product'; }));
        });
      }
    },
    {
      name: 'search_articles',
      description: 'Поиск статей блога о водородной энергетике и водородном оборудовании по ключевым словам.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Слова для поиска, например: зелёный водород' },
          limit: { type: 'integer', minimum: 1, maximum: 20, description: 'Сколько результатов вернуть (по умолчанию 5)' }
        },
        required: ['query'], additionalProperties: false
      },
      annotations: readOnly,
      execute: function (args) {
        var words = String((args && args.query) || '').toLowerCase().split(/\s+/).filter(Boolean);
        var limit = Math.min(Number(args && args.limit) || 5, 20);
        return getJSON('/articles.json').then(function (list) {
          var scored = list.map(function (a) {
            var hay = (a.title + ' ' + a.description + ' ' + (a.tags || []).join(' ') + ' ' + a.category).toLowerCase();
            var s = words.reduce(function (n, w) { return n + (hay.indexOf(w) > -1 ? 1 : 0); }, 0);
            return { s: s, a: a };
          }).filter(function (x) { return x.s > 0; })
            .sort(function (x, y) { return y.s - x.s; })
            .slice(0, limit).map(function (x) { return x.a; });
          return ok(scored.length ? scored : 'Ничего не найдено. Полный список: /blog/');
        });
      }
    },
    {
      name: 'request_consultation',
      description: 'Подготовить заявку на консультацию или подбор генератора: заполняет форму на странице. Отправляет заявку только человек, нажав кнопку после согласия на обработку персональных данных.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Имя клиента' },
          phone: { type: 'string', description: 'Телефон клиента' },
          message: { type: 'string', description: 'Двигатель, объект, вопрос' }
        },
        additionalProperties: false
      },
      execute: function (args) {
        var form = document.getElementById('lead-form');
        if (!form) {
          location.href = '/kontakty/#zayavka';
          return ok('Открываю страницу с формой. После загрузки вызовите инструмент ещё раз.');
        }
        ['name', 'phone', 'message'].forEach(function (k) {
          if (args && args[k] && form.elements[k]) form.elements[k].value = String(args[k]);
        });
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return ok('Форма заполнена. Попросите пользователя проверить данные, отметить согласие и нажать «Отправить заявку».');
      }
    }
  ];

  try {
    if (typeof mc.registerTool === 'function') {
      tools.forEach(function (t) { try { mc.registerTool(t); } catch (e) {} });
    } else if (typeof mc.provideContext === 'function') {
      mc.provideContext({ tools: tools });
    }
  } catch (e) { /* ничего не ломаем на странице */ }
})();
