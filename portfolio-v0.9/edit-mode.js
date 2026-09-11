/* ==========================================================================
   편집 모드 (Edit Mode) — 임시 도구
   --------------------------------------------------------------------------
   목적 : 페이지를 보면서 TODO 문구를 직접 고치고, 완성된 index.html 로 내보낸다.
   성격 : 내용 기입이 끝나면 제거한다.

   [설치]  index.html 의 </body> 앞에 아래 한 줄만 추가
             <script src="edit-mode.js"></script>
   [제거]  그 한 줄을 지우고 이 파일을 삭제
           (내보낸 index.html 에는 그 줄이 이미 빠져 있으므로,
            내보낸 파일로 교체하면 제거까지 끝난다)

   style.css 와 app.js 는 건드리지 않는다. 이 파일 하나에 전부 들어 있다.
   ========================================================================== */
(function () {
  'use strict';

  /* ======================================================================
     0. 설정
     ====================================================================== */

  /* app.js 가 그리는 구간 — 여기 글자는 고쳐도 새로고침하면 되돌아간다.
     편집을 막고, 어느 배열을 고쳐야 하는지 배지로 알려준다. */
  var GENERATED = [
    { sel: '#orbit-nodes',  src: 'app.js → ORBIT_DATA' },
    { sel: '#orbit-panel',  src: 'app.js → ORBIT_DATA' },
    { sel: '#fd-stack',     src: 'app.js → FILES' },
    { sel: '#fd-viewer',    src: 'app.js → FILES' },
    { sel: '#game-grid',    src: 'app.js → GAMES' },
    { sel: '#genre-legend', src: 'app.js → GAMES' },
    { sel: '#sidenav',      src: 'index.html 의 data-anchor-label' }
  ];

  /* 편집에서 아예 제외 — 도구 자신, 설정 패널, 폼 */
  var SKIP = '#theme-panel, #toast, #em-bar, #em-fab, .fd-base, .genre-bar, ' +
             'input, select, textarea, svg, .fdv__caret, .orbit__core';

  /* 단일 클릭은 원래 동작(탭 전환 등)을 유지하고, 더블클릭해야 편집되는 것들 */
  var DBL = '.tab, .btn, .fdv__open, .fdv__close, .opanel__go';

  var INLINE_OK = { STRONG: 1, EM: 1, B: 1, I: 1, BR: 1, CODE: 1, SMALL: 1, SPAN: 1, U: 1 };

  var MAX_UNDO = 50;

  /* ======================================================================
     1. 스타일 주입 (style.css 는 손대지 않는다)
     ====================================================================== */
  var CSS = [
    '#em-fab{position:fixed;right:16px;bottom:16px;z-index:9000;',
    '  font:600 13px/1 ui-sans-serif,system-ui,sans-serif;',
    '  background:#111;color:#fff;border:0;border-radius:999px;',
    '  padding:12px 18px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.25);}',
    '#em-fab:hover{opacity:.88}',

    '#em-bar{position:fixed;left:0;right:0;bottom:0;z-index:9000;',
    '  display:flex;align-items:center;gap:10px;flex-wrap:wrap;',
    '  padding:10px 14px calc(10px + env(safe-area-inset-bottom));',
    '  background:#111;color:#fff;',
    '  font:500 13px/1.4 ui-sans-serif,system-ui,sans-serif;',
    '  box-shadow:0 -6px 20px rgba(0,0,0,.25);}',
    '#em-bar .em-t{font-weight:700;letter-spacing:.04em}',
    '#em-bar .em-c{font-family:ui-monospace,Menlo,monospace;font-size:12px;',
    '  background:rgba(255,255,255,.12);padding:4px 9px;border-radius:999px}',
    '#em-bar .em-c b{color:#ffd479}',
    '#em-bar .em-note{color:rgba(255,255,255,.5);font-size:11px;flex:1 1 100%;order:9}',
    '#em-bar .em-sp{flex:1}',
    '#em-bar button{font:600 12px/1 ui-sans-serif,system-ui,sans-serif;',
    '  padding:9px 14px;border-radius:7px;cursor:pointer;border:1px solid rgba(255,255,255,.25);',
    '  background:transparent;color:#fff}',
    '#em-bar button:hover{background:rgba(255,255,255,.14)}',
    '#em-bar button.em-primary{background:#fff;color:#111;border-color:#fff}',
    '#em-bar button.em-primary:hover{opacity:.86}',

    /* 편집 가능 표시 */
    'body.em-on [data-em]{outline:1px dashed rgba(37,99,235,.5);outline-offset:2px;',
    '  border-radius:3px;cursor:text;transition:outline-color .15s,background-color .15s}',
    'body.em-on [data-em]:hover{outline-color:#2563eb;background:rgba(37,99,235,.07)}',
    'body.em-on [data-em]:focus{outline:2px solid #2563eb;background:rgba(37,99,235,.1)}',
    'body.em-on [data-em-todo]{outline-color:rgba(234,88,12,.65)}',
    'body.em-on [data-em-todo]:hover{outline-color:#ea580c;background:rgba(234,88,12,.08)}',
    'body.em-on [data-em-dbl]{outline-style:dotted;cursor:pointer}',

    /* 생성 구간 배지 */
    'body.em-on [data-em-gen]{position:relative;outline:1px dashed rgba(120,120,120,.5);',
    '  outline-offset:3px;border-radius:4px}',
    'body.em-on [data-em-gen]::after{content:attr(data-em-gen);position:absolute;',
    '  left:0;top:-9px;z-index:50;pointer-events:none;',
    '  font:600 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.04em;',
    '  background:#555;color:#fff;padding:4px 8px;border-radius:4px;white-space:nowrap}',

    '@media (max-width:768px){',
    '  #em-bar{font-size:12px;gap:8px}',
    '  #em-bar button{padding:10px 12px}',
    '  #em-bar .em-sp{display:none}',
    '}',
    '@media print{#em-fab,#em-bar{display:none!important}}'
  ].join('\n');

  function injectStyle() {
    var st = document.createElement('style');
    st.id = 'em-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ======================================================================
     2. 유틸
     ====================================================================== */
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  function inGenerated(el) {
    for (var i = 0; i < GENERATED.length; i++) {
      var host = $(GENERATED[i].sel);
      if (host && (host === el || host.contains(el))) return GENERATED[i];
    }
    return null;
  }

  /* 텍스트를 직접 담고 있는 '말단' 요소인가.
     컨테이너를 편집 대상으로 삼으면 자식 태그가 통째로 날아갈 수 있다. */
  function isLeafText(el) {
    var hasText = false, i, n;
    for (i = 0; i < el.childNodes.length; i++) {
      n = el.childNodes[i];
      if (n.nodeType === 3 && n.nodeValue.trim()) hasText = true;
      else if (n.nodeType === 1 && !INLINE_OK[n.tagName]) return false;
    }
    return hasText;
  }

  /* ======================================================================
     3. 편집 대상 표시
     ====================================================================== */
  var editables = [];

  function markTargets() {
    editables = [];

    // 생성 구간에 출처 배지
    GENERATED.forEach(function (g) {
      var host = $(g.sel);
      if (host) host.setAttribute('data-em-gen', g.src);
    });

    var scope = [];
    ['#main', '.footer__inner', '.brand'].forEach(function (s) {
      var el = $(s);
      if (el) scope.push(el);
    });
    var tabsEl = $('#tabs');
    if (tabsEl) scope.push(tabsEl);

    scope.forEach(function (root) {
      $$('*', root).concat([root]).forEach(function (el) {
        if (el.closest(SKIP)) return;
        if (inGenerated(el)) return;
        if (el.hasAttribute('data-em') || el.hasAttribute('data-em-gen')) return;
        if (!isLeafText(el)) return;

        el.setAttribute('data-em', '1');
        el.setAttribute('spellcheck', 'false');
        if (el.closest(DBL)) el.setAttribute('data-em-dbl', '1');
        editables.push(el);
      });
    });

    refreshTodo();
  }

  function unmarkTargets() {
    $$('[data-em]').forEach(function (el) {
      el.removeAttribute('data-em');
      el.removeAttribute('data-em-dbl');
      el.removeAttribute('data-em-todo');
      el.removeAttribute('spellcheck');
      el.removeAttribute('contenteditable');
    });
    $$('[data-em-gen]').forEach(function (el) { el.removeAttribute('data-em-gen'); });
  }

  /* ======================================================================
     4. 편집 동작
     ====================================================================== */
  var on = false;
  var changed = 0;
  var undoStack = [];
  var before = null;   // 편집 시작 시점의 값

  function setEditable(el, yes) {
    if (yes) {
      // plaintext-only : 붙여넣기해도 서식·태그가 딸려 들어오지 않는다
      el.setAttribute('contenteditable', 'plaintext-only');
      if (el.contentEditable !== 'plaintext-only') el.setAttribute('contenteditable', 'true');
    } else {
      el.removeAttribute('contenteditable');
    }
  }

  function enableAll() {
    editables.forEach(function (el) {
      if (!el.hasAttribute('data-em-dbl')) setEditable(el, true);
    });
  }
  function disableAll() {
    editables.forEach(function (el) { setEditable(el, false); });
  }

  function refreshTodo() {
    var todo = 0;
    editables.forEach(function (el) {
      var isTodo = /TODO/.test(el.textContent);
      if (isTodo) { todo++; el.setAttribute('data-em-todo', '1'); }
      else el.removeAttribute('data-em-todo');
    });
    var t = $('#em-todo'), c = $('#em-changed');
    if (t) t.innerHTML = 'TODO <b>' + todo + '</b>';
    if (c) c.textContent = '변경 ' + changed;
    return todo;
  }

  document.addEventListener('focusin', function (e) {
    var el = e.target;
    if (!on || !el.hasAttribute || !el.hasAttribute('data-em')) return;
    before = { el: el, html: el.innerHTML };
  });

  document.addEventListener('focusout', function (e) {
    var el = e.target;
    if (!on || !before || before.el !== el) return;
    if (el.innerHTML !== before.html) {
      undoStack.push(before);
      if (undoStack.length > MAX_UNDO) undoStack.shift();
      changed++;
    }
    if (el.hasAttribute('data-em-dbl')) setEditable(el, false);
    before = null;
    refreshTodo();
  });

  /* 더블클릭해야 열리는 것들 (탭·버튼 — 단일 클릭은 원래 동작 유지) */
  document.addEventListener('dblclick', function (e) {
    if (!on) return;
    var el = e.target.closest ? e.target.closest('[data-em-dbl]') : null;
    if (!el) return;
    e.preventDefault();
    setEditable(el, true);
    el.focus();
  });

  document.addEventListener('keydown', function (e) {
    if (!on) return;
    var el = e.target;
    var editing = el && el.hasAttribute && el.hasAttribute('data-em') && el.isContentEditable;

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault(); undo(); return;
    }
    if (!editing) return;

    if (e.key === 'Escape') {           // 되돌리고 빠져나가기
      e.preventDefault();
      if (before && before.el === el) el.innerHTML = before.html;
      before = null;
      el.blur();
      refreshTodo();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();               // Enter = 편집 종료, Shift+Enter = 줄바꿈
      el.blur();
    }
  });

  function undo() {
    var last = undoStack.pop();
    if (!last) { flash('되돌릴 편집이 없습니다'); return; }
    last.el.innerHTML = last.html;
    changed = Math.max(0, changed - 1);
    refreshTodo();
    try { last.el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (err) {}
  }

  /* ======================================================================
     5. 내보내기
     ====================================================================== */

  /* app.js 가 실행 중에 넣은 흔적을 전부 걷어낸다.
     이걸 빼먹으면 계산된 좌표가 파일에 굳어버려 다른 화면 크기에서 깨진다. */
  function stripRuntime(doc) {
    function each(sel, fn) { Array.prototype.forEach.call(doc.querySelectorAll(sel), fn); }
    function clear(sel) { each(sel, function (el) { el.innerHTML = ''; }); }
    function unstyle(sel) { each(sel, function (el) { el.removeAttribute('style'); }); }

    // 풀블리드 밴드 : JS 가 넣은 폭·오프셋
    unstyle('#orbital');
    unstyle('#filedeck');

    // 궤도 맵 : 노드와 패널은 JS 가 그린다
    clear('#orbit-nodes');
    each('#orbit-panel', function (el) {
      el.innerHTML = ''; el.hidden = true;
      el.removeAttribute('style');
      el.classList.remove('is-side', 'is-stack');
    });

    // 문서 서류철 : 폴더는 JS 가 그린다. 바닥만 남기고 비운다
    each('#fd-stack', function (st) {
      Array.prototype.slice.call(st.querySelectorAll('.fd-folder')).forEach(function (f) {
        f.parentNode.removeChild(f);
      });
      st.removeAttribute('style');
    });
    each('#fd-base span', function (el) { el.textContent = ''; });
    each('#fd-viewer', function (el) { el.innerHTML = ''; el.className = 'fd-viewer'; });
    each('#fd-viewer-wrap', function (el) { el.classList.remove('is-open'); });

    // 게임 · 장르 그래프
    clear('#game-grid'); clear('#genre-bar'); clear('#genre-legend');

    // 사이드 내비 (활성 탭에 따라 매번 다시 그려진다)
    clear('#sidenav');

    // 이력서 전개 틀 : 라벨·기호는 JS 가 찍는다
    each('#framework-badge', function (el) { el.textContent = ''; });
    each('.step', function (el) {
      el.hidden = false;
      el.classList.toggle('step--last', el.getAttribute('data-step') === 'learning');
    });
    each('.step__no', function (el) { el.textContent = ''; });
    each('.step__label', function (el) { el.innerHTML = ''; });

    // 스크롤 리빌 · 진행 바
    each('[data-reveal]', function (el) {
      el.classList.remove('is-in');
      el.style.removeProperty('--reveal-delay');
      if (!el.getAttribute('style')) el.removeAttribute('style');
    });
    unstyle('#scroll-progress i');

    // 열려 있던 패널·드로어를 닫힌 상태로
    each('#theme-panel', function (el) { el.hidden = true; el.classList.remove('is-open'); });
    each('#theme-scrim, #sidebar-scrim', function (el) { el.hidden = true; });
    each('#sidebar', function (el) { el.classList.remove('is-open'); });
    each('#toast', function (el) { el.textContent = ''; el.classList.remove('is-on'); });

    // 탭은 항상 '소개'가 열린 상태로 내보낸다
    each('.tab', function (el) {
      var first = el.getAttribute('data-tab') === 'intro';
      el.classList.toggle('is-active', first);
      el.setAttribute('aria-selected', first ? 'true' : 'false');
    });
    each('.view', function (el) {
      var first = el.getAttribute('data-view') === 'intro';
      el.classList.toggle('is-active', first);
      if (first) el.removeAttribute('hidden'); else el.setAttribute('hidden', '');
    });

    // 테마 패널이 시험 삼아 바꾼 값은 파일에 남기지 않는다
    // (영구 적용은 테마 패널의 'CSS 복사' → style.css 경로)
    doc.documentElement.removeAttribute('data-theme');
    doc.documentElement.removeAttribute('style');
    each('#theme-panel [data-var]', function (el) { el.removeAttribute('style'); });
  }

  function stripEditor(doc) {
    ['#em-bar', '#em-fab', '#em-style'].forEach(function (s) {
      var el = doc.querySelector(s);
      if (el) el.parentNode.removeChild(el);
    });
    Array.prototype.forEach.call(doc.querySelectorAll('script[src]'), function (s) {
      if (/edit-mode\.js/.test(s.getAttribute('src') || '')) s.parentNode.removeChild(s);
    });

    // 설치 안내 주석도 함께 걷어낸다 (파일에 남으면 '아직 붙어 있나?' 하고 헷갈린다)
    (function walk(node) {
      var kids = Array.prototype.slice.call(node.childNodes);
      kids.forEach(function (n) {
        if (n.nodeType === 8 && /edit-mode\.js|임시 편집 도구/.test(n.nodeValue)) {
          n.parentNode.removeChild(n);
        } else if (n.nodeType === 1) walk(n);
      });
    })(doc);
    Array.prototype.forEach.call(
      doc.querySelectorAll('[data-em],[data-em-gen],[data-em-dbl],[data-em-todo],[contenteditable]'),
      function (el) {
        el.removeAttribute('data-em');
        el.removeAttribute('data-em-gen');
        el.removeAttribute('data-em-dbl');
        el.removeAttribute('data-em-todo');
        el.removeAttribute('contenteditable');
        el.removeAttribute('spellcheck');
      });
    Array.prototype.forEach.call(doc.querySelectorAll('body'), function (b) {
      b.classList.remove('em-on');
      if (!b.getAttribute('class')) b.removeAttribute('class');
    });
  }

  function buildHtml() {
    var clone = document.documentElement.cloneNode(true);
    var wrap = document.implementation.createHTMLDocument('');
    wrap.replaceChild(wrap.importNode(clone, true), wrap.documentElement);
    stripEditor(wrap);
    stripRuntime(wrap);
    return '<!DOCTYPE html>\n' + wrap.documentElement.outerHTML + '\n';
  }

  function exportHtml() {
    var html = buildHtml();
    try {
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'index.html';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      changed = 0; refreshTodo();
      flash('index.html 을 내려받았습니다 — 기존 파일과 교체하세요');
    } catch (err) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(html).then(function () {
          flash('내려받기 실패 — HTML 전문을 클립보드에 복사했습니다');
        });
      } else {
        console.log(html);
        flash('내려받기 실패 — 콘솔에 HTML 전문을 출력했습니다');
      }
    }
  }

  /* ======================================================================
     6. 막대 UI
     ====================================================================== */
  var bar, fab, flashTimer;

  var NOTE = '새로고침하면 편집 내용이 사라집니다 · 저장은 내보내기 한 번뿐입니다 · ' +
             'Enter 편집 종료 / Shift+Enter 줄바꿈 / Esc 취소 / Ctrl(⌘)+Z 되돌리기';

  function note() {
    var n = $('#em-note');
    if (n) n.textContent = NOTE;
  }

  function flash(msg) {
    var n = $('#em-note');
    if (!n) return;
    n.textContent = msg;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(note, 4000);
  }

  function buildUI() {
    fab = document.createElement('button');
    fab.id = 'em-fab'; fab.type = 'button';
    fab.textContent = '✏ 편집';
    fab.addEventListener('click', function () { setMode(true); });
    document.body.appendChild(fab);

    bar = document.createElement('div');
    bar.id = 'em-bar'; bar.hidden = true;
    bar.innerHTML =
      '<span class="em-t">✏ 편집 중</span>' +
      '<span class="em-c" id="em-todo"></span>' +
      '<span class="em-c" id="em-changed"></span>' +
      '<span class="em-sp"></span>' +
      '<button type="button" class="em-primary" id="em-export">HTML 내보내기</button>' +
      '<button type="button" id="em-undo">되돌리기</button>' +
      '<button type="button" id="em-off">끄기</button>' +
      '<span class="em-note" id="em-note"></span>';
    document.body.appendChild(bar);

    $('#em-export').addEventListener('click', exportHtml);
    $('#em-undo').addEventListener('click', undo);
    $('#em-off').addEventListener('click', function () { setMode(false); });
  }

  function setMode(next) {
    on = next;
    document.body.classList.toggle('em-on', on);
    bar.hidden = !on;
    fab.hidden = on;
    if (on) {
      markTargets();
      enableAll();
      note();
    } else {
      disableAll();
      unmarkTargets();
    }
  }

  /* 링크 카드(예: 소개의 페이지 안내) 안 글자를 편집 모드에서 클릭하면
     편집 대신 페이지 이동이 돼버린다. 편집 중인 텍스트 클릭이면
     이동을 막고 커서만 들어가게 한다. (탭·버튼은 편집 대상이 아니라 그대로 이동) */
  document.addEventListener('click', function (e) {
    if (!on) return;
    var t = e.target;
    if (t && t.closest && t.closest('[contenteditable]')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // 탭을 바꾸면 방금 열린 뷰에도 편집 표시를 다시 붙인다
    if (!t.closest) return;
    if (!t.closest('.tab, [data-tab-link]')) return;
    setTimeout(function () { if (on) { markTargets(); enableAll(); } }, 60);
  }, true);

  window.addEventListener('beforeunload', function (e) {
    if (!changed) return;
    e.preventDefault();
    e.returnValue = '';
    return '';
  });

  /* ======================================================================
     7. 시작
     ====================================================================== */
  function init() { injectStyle(); buildUI(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
