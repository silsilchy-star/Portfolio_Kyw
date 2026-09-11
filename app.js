/* ==========================================================================
   포트폴리오 랜딩페이지 — 스크립트 (v0.6: 문서 서류철)
   담당: 탭 전환(SPA) / 사이드 앵커 스무스 스크롤 / 스크롤 스파이 /
         모바일 드로어 / 테마 패널 / 스크롤 리빌 / 궤도 맵 / 문서 서류철 / 이력서 / 게임
   외부 의존성 없음. iOS Safari 15+ 대응.
   ========================================================================== */
(function () {
  'use strict';

  /* ======================================================================
     [사용자 편집 구간] 게임 데이터
     5단계에서 이 배열만 채우면 카드 그리드와 장르 그래프가 자동 갱신됩니다.
     ====================================================================== */
  var GAMES = [
    { title: 'TODO: 게임 제목 1', platform: 'PC',     genres: ['RPG', '오픈월드'], image: '' },
    { title: 'TODO: 게임 제목 2', platform: 'PS5',    genres: ['액션'],            image: '' },
    { title: 'TODO: 게임 제목 3', platform: 'Switch', genres: ['시뮬레이션'],      image: '' },
    { title: 'TODO: 게임 제목 4', platform: 'PC',     genres: ['RPG', '전략'],     image: '' }
  ];


  /* ======================================================================
     [사용자 편집 구간] 이력서 — 경험 파트 전개 틀
     'star' : Situation / Task / Action / Result / Learning  (5단계)
     'sahb' : 상황 / 행동 / 결과 / 배움                       (4단계, 과제 단계 생략)
     이 한 줄만 바꾸면 두 케이스의 단계 표기가 함께 바뀝니다.
     ====================================================================== */
  var RESUME_FRAMEWORK = 'star';

  var RESUME_FRAMEWORKS = {
    star: {
      name: 'STAR',
      order: ['situation', 'task', 'action', 'result', 'learning'],
      steps: {
        situation: { key: 'S', ko: '상황', en: 'Situation' },
        task:      { key: 'T', ko: '과제 · 문제 정의', en: 'Task' },
        action:    { key: 'A', ko: '행동 · 방법 제시', en: 'Action' },
        result:    { key: 'R', ko: '결과', en: 'Result' },
        learning:  { key: 'L', ko: '배움 · 얻은 것', en: 'Learning' }
      }
    },
    sahb: {
      name: '상행결배',
      order: ['situation', 'action', 'result', 'learning'],
      steps: {
        situation: { key: '상', ko: '상황', en: 'Situation' },
        action:    { key: '행', ko: '행동', en: 'Action' },
        result:    { key: '결', ko: '결과', en: 'Result' },
        learning:  { key: '배', ko: '배움', en: 'Learning' }
      }
    }
  };

  /* 장르 그래프 색상 — DESIGN 1.md 액센트 팔레트 순환 */
  var GENRE_COLORS = ['#2563eb', '#ea580c', '#7c3aed', '#16a34a', '#525252', '#a3a3a3'];

  var VIEWS = ['intro', 'resume', 'projects', 'skills', 'docs', 'games'];

  /* ---------------------------------------------------------------------
     유틸
     --------------------------------------------------------------------- */
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var supportsSmooth = 'scrollBehavior' in document.documentElement.style;

  function navOffset() {
    var cs = getComputedStyle(document.documentElement);
    var nav = parseInt(cs.getPropertyValue('--nav-height'), 10) || 56;
    var safe = 0;
    try { safe = parseInt(getComputedStyle(document.body).paddingTop, 10) || 0; } catch (e) {}
    return nav + safe + 20;
  }

  /* Safari 15 미만 스무스 스크롤 폴리필 (easeInOutQuad) */
  function smoothScrollTo(top) {
    if (supportsSmooth) { window.scrollTo({ top: top, behavior: 'smooth' }); return; }
    var start = window.pageYOffset, delta = top - start, dur = 420, t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var e = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      window.scrollTo(0, start + delta * e);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---- 풀블리드 밴드 (궤도 맵 · 문서 서류철) ----
     좌측 사이드바 때문에 부모의 중앙이 화면 중앙이 아니라
     CSS calc(50% - 50vw) 관용구를 쓸 수 없다. 실제 오프셋을 재서 넣는다.
     재는 대상은 '부모' — 자기 rect 를 재려면 인라인 스타일을 지웠다 다시 넣어야 하는데,
     리플로우 타이밍에 따라 0 이 잡히는 경우가 있었다. 부모는 우리가 건드리지 않는다.
     숨겨진 탭 안에서는 rect 가 0 이므로, 탭이 열릴 때 다시 부른다. */
  var bleedSelectors = ['#orbital', '#filedeck'];

  function layoutBleedAll() {
    var docW = document.documentElement.clientWidth;
    bleedSelectors.forEach(function (sel) {
      var el = $(sel);
      if (!el || !el.parentNode || !el.parentNode.getBoundingClientRect) return;
      if (!el.offsetParent && el.offsetWidth === 0) return;   // 숨겨진 탭이면 건너뛴다
      var left = el.parentNode.getBoundingClientRect().left;
      el.style.width = docW + 'px';
      el.style.marginLeft = (-left) + 'px';
    });
  }

  function scrollToEl(el) {
    if (!el) return;
    var y = el.getBoundingClientRect().top + window.pageYOffset - navOffset();
    smoothScrollTo(Math.max(y, 0));
  }

  /* ---------------------------------------------------------------------
     1. 탭 전환 (SPA 뷰)
     --------------------------------------------------------------------- */
  var tabs = $$('.tab');
  var views = $$('.view');
  var currentView = 'intro';

  function setView(name, opts) {
    opts = opts || {};
    if (VIEWS.indexOf(name) === -1) name = 'intro';
    currentView = name;

    tabs.forEach(function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    views.forEach(function (v) {
      var on = v.getAttribute('data-view') === name;
      v.classList.toggle('is-active', on);
      if (on) v.removeAttribute('hidden'); else v.setAttribute('hidden', '');
    });

    buildSideNav(name);
    closeDrawer();
    if (typeof resetReveals === 'function') resetReveals(name);
    // 숨겨진 탭에서는 폭을 잴 수 없으므로, 열린 뒤에 다시 잰다
    requestAnimationFrame(function () {
      layoutBleedAll();
      if (typeof layoutDeck === 'function') layoutDeck();
    });

    if (!opts.silent) {
      try { history.replaceState(null, '', '#' + name); } catch (e) { location.hash = name; }
    }
    if (!opts.keepScroll) window.scrollTo(0, 0);

    // 활성 탭을 가로 스크롤 뷰 안으로
    var active = $('.tab.is-active');
    if (active && active.scrollIntoView) {
      try { active.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) {}
    }
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () { setView(t.getAttribute('data-tab')); });
  });

  /* data-tab-link 를 가진 모든 요소 → 해당 탭으로 이동 */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-tab-link]') : null;
    if (!el) return;
    e.preventDefault();
    setView(el.getAttribute('data-tab-link'));
  });

  /* ---------------------------------------------------------------------
     2. 사이드 내비 (활성 뷰의 앵커 목록 생성)
     --------------------------------------------------------------------- */
  var sidenav = $('#sidenav');
  var anchorEls = [];

  function buildSideNav(viewName) {
    var view = $('#' + viewName);
    sidenav.innerHTML = '';
    anchorEls = [];
    if (!view) return;

    $$('[data-anchor]', view).forEach(function (sec) {
      var id = sec.getAttribute('data-anchor');
      var label = sec.getAttribute('data-anchor-label') || id;
      sec.id = id;

      var a = document.createElement('a');
      a.href = '#' + id;
      a.textContent = label;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        scrollToEl(sec);
        closeDrawer();
      });
      sidenav.appendChild(a);
      anchorEls.push({ el: sec, link: a });
    });
    spy();
  }

  /* ---------------------------------------------------------------------
     3. 스크롤 스파이
     --------------------------------------------------------------------- */
  var ticking = false;

  function spy() {
    if (!anchorEls.length) return;
    var line = navOffset() + 40;
    var current = anchorEls[0];
    for (var i = 0; i < anchorEls.length; i++) {
      if (anchorEls[i].el.getBoundingClientRect().top <= line) current = anchorEls[i];
    }
    anchorEls.forEach(function (a) {
      a.link.classList.toggle('is-current', a === current);
    });
  }

  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { spy(); updateProgress(); ticking = false; });
  }, { passive: true });

  window.addEventListener('resize', function () {
    spy(); updateProgress(); layoutBleedAll();
  }, { passive: true });

  /* ---------------------------------------------------------------------
     4. 모바일 사이드 드로어
     --------------------------------------------------------------------- */
  var sidebar = $('#sidebar');
  var scrim = $('#sidebar-scrim');
  var btnDrawer = $('#btn-sidebar-toggle');

  function openDrawer() {
    sidebar.classList.add('is-open');
    scrim.hidden = false;
    btnDrawer.setAttribute('aria-expanded', 'true');
  }
  function closeDrawer() {
    sidebar.classList.remove('is-open');
    scrim.hidden = true;
    btnDrawer.setAttribute('aria-expanded', 'false');
  }
  btnDrawer.addEventListener('click', function () {
    sidebar.classList.contains('is-open') ? closeDrawer() : openDrawer();
  });
  scrim.addEventListener('click', closeDrawer);

  /* ---------------------------------------------------------------------
     5. 테마 패널 — 실동작 (2단계)
     --------------------------------------------------------------------- */
  var panel       = $('#theme-panel');
  var panelScrim  = $('#theme-scrim');
  var btnPanel    = $('#btn-theme-panel');
  var toastEl     = $('#toast');
  var root        = document.documentElement;

  /* 색상 계열 변수 : 모드(라이트/다크)를 바꾸면 사용자 지정값을 비웁니다. */
  var COLOR_VARS = ['--accent','--bg','--bg-alt','--surface','--text','--text-3','--border','--action-fill'];
  var colorOverrides  = {};   // 모드 전환 시 초기화
  var metricOverrides = {};   // 모드와 무관 (크기 · 간격 · 폰트)
  var mode = 'auto';

  /* ---- 색상 유틸 ---- */
  function toHex(v) {
    v = String(v || '').trim();
    if (!v) return '#000000';
    if (v.charAt(0) === '#') {
      if (v.length === 4) return '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
      return v.slice(0, 7);
    }
    var m = v.match(/rgba?\(([^)]+)\)/);
    if (m) {
      var p = m[1].split(/[,\s\/]+/).filter(Boolean);
      return '#' + [0, 1, 2].map(function (i) {
        return ('0' + Math.max(0, Math.min(255, parseInt(p[i], 10) || 0)).toString(16)).slice(-2);
      }).join('');
    }
    return '#000000';
  }
  function computedVar(name) {
    return getComputedStyle(root).getPropertyValue(name).trim();
  }

  /* ---- 컨트롤 수집 ---- */
  var controls = $$('#theme-panel [data-var]');

  function isColorVar(name) { return COLOR_VARS.indexOf(name) !== -1; }

  function labelFor(input) {
    var el = $('[data-val-for="' + input.id + '"]');
    if (!el) return;
    var u = input.getAttribute('data-unit') || '';
    el.textContent = input.value + u;
  }

  function applyControl(input) {
    var name = input.getAttribute('data-var');
    var unit = input.getAttribute('data-unit') || '';
    var val  = input.value + unit;
    root.style.setProperty(name, val);
    (isColorVar(name) ? colorOverrides : metricOverrides)[name] = val;
    labelFor(input);
  }

  controls.forEach(function (input) {
    labelFor(input);
    input.addEventListener('input', function () { applyControl(input); });
    input.addEventListener('change', function () { applyControl(input); });
  });

  /* ---- 컨트롤 값을 현재 테마의 실제 값으로 동기화 ---- */
  function syncControls() {
    controls.forEach(function (input) {
      var name = input.getAttribute('data-var');
      if (input.type === 'color') {
        input.value = toHex(computedVar(name));
      } else if (input.type === 'range') {
        var raw = parseFloat(computedVar(name));
        if (!isNaN(raw)) input.value = raw;
      }
      labelFor(input);
    });
  }

  /* ---- 모드 전환 ---- */
  function setMode(next) {
    mode = next;
    // 라이트 기준으로 고른 색이 다크에서 깨지지 않도록 색상 지정값을 비웁니다.
    Object.keys(colorOverrides).forEach(function (k) { root.style.removeProperty(k); });
    colorOverrides = {};

    if (next === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', next);

    $$('#mode-seg button').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-mode') === next);
    });
    // 변수 반영을 기다렸다가 피커 값 재동기화
    requestAnimationFrame(syncControls);
  }
  $$('#mode-seg button').forEach(function (b) {
    b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
  });

  /* ---- 프리셋 ---- */
  var PRESETS = [
    { name: '기본',   vars: { '--accent':'#2563eb','--bg':'#ffffff','--bg-alt':'#f5f5f5','--surface':'#ffffff','--text':'#171717','--text-3':'#737373','--border':'#e5e5e5','--action-fill':'#000000' } },
    { name: '먹지',   vars: { '--accent':'#404040','--bg':'#ffffff','--bg-alt':'#f4f4f4','--surface':'#ffffff','--text':'#0a0a0a','--text-3':'#6b6b6b','--border':'#e2e2e2','--action-fill':'#171717' } },
    { name: '한지',   vars: { '--accent':'#b45309','--bg':'#fbf8f3','--bg-alt':'#f3ede2','--surface':'#fffdf9','--text':'#221c14','--text-3':'#7c6f5d','--border':'#e6dccb','--action-fill':'#2a2118' } },
    { name: '청록',   vars: { '--accent':'#0d9488','--bg':'#ffffff','--bg-alt':'#f2f7f6','--surface':'#ffffff','--text':'#12211f','--text-3':'#6b7a78','--border':'#dfe9e7','--action-fill':'#0f2e2a' } },
    { name: '자주',   vars: { '--accent':'#7c3aed','--bg':'#ffffff','--bg-alt':'#f6f4fb','--surface':'#ffffff','--text':'#1a1424','--text-3':'#736b85','--border':'#e7e2f2','--action-fill':'#231a33' } },
    { name: '심야',   dark: true, vars: {} }
  ];

  var presetGrid = $('#preset-grid');
  PRESETS.forEach(function (p, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'preset';
    var keys = p.dark ? ['#4d8bff', '#0a0a0a', '#282828'] : [p.vars['--accent'], p.vars['--bg-alt'], p.vars['--action-fill']];
    b.innerHTML = '<span class="preset__swatches">' +
      keys.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') +
      '</span><span class="preset__name">' + p.name + '</span>';
    b.addEventListener('click', function () {
      $$('.preset', presetGrid).forEach(function (x) { x.classList.remove('is-active'); });
      b.classList.add('is-active');
      if (p.dark) { setMode('dark'); return; }
      setMode('light');
      Object.keys(p.vars).forEach(function (k) {
        root.style.setProperty(k, p.vars[k]);
        colorOverrides[k] = p.vars[k];
      });
      requestAnimationFrame(syncControls);
    });
    if (i === 0) b.classList.add('is-active');
    presetGrid.appendChild(b);
  });

  /* ---- 토스트 ---- */
  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  }

  /* ---- CSS 내보내기 ---- */
  function buildCss() {
    var all = {};
    Object.keys(metricOverrides).forEach(function (k) { all[k] = metricOverrides[k]; });
    Object.keys(colorOverrides).forEach(function (k) { all[k] = colorOverrides[k]; });
    var keys = Object.keys(all);
    var head = '/* 테마 패널에서 조정한 값 — style.css 의 :root 마지막에 붙여넣으세요 */\n';
    if (mode !== 'auto') head += '/* 모드: ' + mode + ' — <html data-theme="' + mode + '"> 를 지정하세요 */\n';
    if (!keys.length) return head + ':root{\n  /* 변경된 값 없음 */\n}\n';
    return head + ':root{\n' + keys.map(function (k) { return '  ' + k + ':' + all[k] + ';'; }).join('\n') + '\n}\n';
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (res, rej) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:-1000px;left:0;opacity:0;';
      document.body.appendChild(ta);
      ta.focus(); ta.select(); ta.setSelectionRange(0, ta.value.length); // iOS
      try { document.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); }
      document.body.removeChild(ta);
    });
  }

  $('#btn-export').addEventListener('click', function () {
    var css = buildCss();
    copyText(css).then(
      function () { toast('CSS를 클립보드에 복사했습니다'); },
      function () { console.log(css); toast('복사 실패 — 콘솔에 출력했습니다'); }
    );
  });

  /* ---- 초기화 ---- */
  $('#btn-reset').addEventListener('click', function () {
    Object.keys(colorOverrides).concat(Object.keys(metricOverrides)).forEach(function (k) {
      root.style.removeProperty(k);
    });
    colorOverrides = {}; metricOverrides = {};
    $$('.preset', presetGrid).forEach(function (x, i) { x.classList.toggle('is-active', i === 0); });
    setMode('auto');
    toast('기본값으로 되돌렸습니다');
  });

  /* ---- 패널 열고 닫기 ---- */
  function openPanel() {
    panel.hidden = false;
    panelScrim.hidden = false;
    syncControls();
    requestAnimationFrame(function () { panel.classList.add('is-open'); });
    btnPanel.setAttribute('aria-expanded', 'true');
  }
  function closePanel() {
    panel.classList.remove('is-open');
    panelScrim.hidden = true;
    btnPanel.setAttribute('aria-expanded', 'false');
    setTimeout(function () { if (!panel.classList.contains('is-open')) panel.hidden = true; }, 260);
  }
  btnPanel.addEventListener('click', function () {
    panel.classList.contains('is-open') ? closePanel() : openPanel();
  });
  $('#btn-theme-close').addEventListener('click', closePanel);
  panelScrim.addEventListener('click', closePanel);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closePanel(); closeDrawer();
      if (typeof closeNode === 'function') closeNode();
      if (typeof fdClose === 'function') fdClose();
    }
  });

  /* 시스템 모드일 때 OS 설정 변경 추종 */
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onScheme = function () { if (mode === 'auto') requestAnimationFrame(syncControls); };
    mq.addEventListener ? mq.addEventListener('change', onScheme) : mq.addListener(onScheme);
  }

  syncControls();

  /* ---------------------------------------------------------------------
     6. 문서 서류철 (File Deck)
     물리적 서류철에서 폴더를 꺼내 보는 은유.
     레이아웃 규칙 3가지:
       1) 폴더의 가로 폭(inset)은 절대 변하지 않는다 — 선택해도 폭이 출렁이지 않게.
       2) 선택한 폴더보다 위쪽은 사라지고, 남은 폴더들이 그만큼 위로 올라온다.
       3) 스택 높이가 줄어드는 만큼 열람 카드가 위에서 자란다 — 총 높이 변화가 상쇄된다.
     --------------------------------------------------------------------- */

  /* ===== [사용자 편집 구간] 문서 목록 =====
     code    : 폴더 위 검정 배지에 찍히는 분류 코드 (없으면 '')
     label   : 폴더 탭에 찍히는 짧은 이름 (영문·숫자가 이 톤에 어울립니다)
     kind    : 카드 상단 분류
     slides  : 미리보기 이미지 경로 배열. 비워두면 자리표시자가 나옵니다.
     url     : 실제 문서 링크 (PDF, 노션, 드라이브 등)                        */
  var FILES = [
    { code:'',    label:'SB-STAR', kind:'경험 정리', date:'2026.09', title:'심비온 프로젝트 회고',
      summary:'5인 팀 프로젝트 심비온의 PM 경험을 상황·과제·행동·결과·배움 순서로 정리한 문서. 일정 관리와 출시 준비 과정에서 겪은 문제와 해결 과정을 담았습니다.',
      tags:['PM','회고'], slides:[], url:'#' },
    { code:'A-2', label:'SB-WBS', kind:'일정 관리',    date:'2026.07', title:'심비온 마일스톤 · WBS',
      summary:'게임을 구성하는 요소를 시스템/콘텐츠로 분류하고, 필수·후순위를 나눠 개발 단계별 목표를 세운 일정표.', tags:['WBS','마일스톤'], slides:[], url:'#' },
    { code:'',    label:'SB-TC', kind:'테스트 케이스', date:'2026.08', title:'심비온 TC 문서',
      summary:'기능을 세부 단위로 쪼개고, 구두로만 공유된 기획 내용까지 포함해 작성한 테스트 케이스.', tags:['TC','QA'], slides:[], url:'#' },
    { code:'B-7', label:'SB-DATA', kind:'데이터 시트', date:'2026.08', title:'심비온 데이터 테이블',
      summary:'몬스터·캐릭터 수치를 밸런싱 단계에서 바로 조정할 수 있도록 설계한 데이터 테이블.', tags:['데이터 테이블'], slides:[], url:'#' },
    { code:'',    label:'TODO DOC 05', kind:'이력서', date:'2026.09', title:'TODO: 이력서 PDF 연결',
      summary:'TODO: 이력서 PDF를 문서로 공개할지 결정 후 url을 채우세요. (연락처 등 개인정보 노출 여부 확인)', tags:['이력서'], slides:[], url:'#' },
    { code:'C-1', label:'TODO DOC 06', kind:'회고',      date:'2024.04', title:'TODO: 문서 제목 6',
      summary:'TODO: 문서 요약.', tags:['TODO'], slides:[], url:'#' }
  ];

  /* 라벨과 배지의 가로 위치 — 손으로 꽂은 색인표처럼 어긋나게 */
  var FD_TAB_X  = ['58%', '26%', '70%', '38%', '64%', '30%'];
  var FD_CODE_X = ['',    '16%', '',    '74%', '18%', ''   ];

  var deckEl   = $('#filedeck');
  var stackEl  = $('#fd-stack');
  var baseEl   = $('#fd-base');
  var viewWrap = $('#fd-viewer-wrap');
  var viewEl   = $('#fd-viewer');

  var folders = [];
  var fdSel = null;
  var fdSlide = 0, fdTimer = null;

  function fdNum(v, fb) { var n = parseFloat(v); return isNaN(n) ? fb : n; }
  function fdVar(name, fb) {
    if (!deckEl) return fb;
    return fdNum(getComputedStyle(deckEl).getPropertyValue(name), fb);
  }

  function buildDeck() {
    if (!stackEl) return;
    FILES.forEach(function (f, k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'fd-folder';
      b.setAttribute('data-idx', k);
      b.setAttribute('aria-expanded', 'false');
      b.setAttribute('aria-label', f.title + ' 열기');
      b.innerHTML =
        '<span class="fd-folder__strip">' +
          (f.code ? '<span class="fd-folder__code" style="left:' + (FD_CODE_X[k] || '18%') + '">' + f.code + '</span>' : '') +
          '<span class="fd-folder__label" style="left:' + (FD_TAB_X[k] || '55%') + '">' + f.label + '</span>' +
        '</span>';
      b.addEventListener('click', function () { fdSelect(k); });
      stackEl.insertBefore(b, baseEl);
      folders.push(b);
    });

    var caption = $('span', baseEl);
    if (caption) caption.textContent = 'PORTFOLIO / ' + ('0' + FILES.length).slice(-2) + ' FILES';

    stackEl.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      var cur = fdSel === null ? -1 : fdSel;
      var next = e.key === 'ArrowDown' ? cur + 1 : cur - 1;
      if (next < 0) next = 0;
      if (next > FILES.length - 1) next = FILES.length - 1;
      fdSelect(next, true);
      folders[next].focus();
    });
  }

  function layoutDeck() {
    if (!stackEl || !folders.length) return;
    var N = FILES.length;
    var step  = fdVar('--fd-step', 36);
    var inset = fdVar('--fd-inset', 18);
    var last  = fdVar('--fd-last', 120);
    var base  = fdVar('--fd-base', 84);

    var visible = fdSel === null ? N : N - fdSel;
    var stackH = (visible - 1) * step + last + base;
    stackEl.style.height = stackH + 'px';

    /* top / height 는 '닫힌 상태' 기준으로 한 번만 정하고 그대로 둔다.
       실제 이동은 transform 하나로만 한다 — 그래야 프레임마다 레이아웃을
       다시 계산하지 않아 전환이 매끄럽다.
       폴더 높이를 (닫힌 상태의 바닥까지)로 고정해두면, 스택 전체가
       shift 만큼 올라갈 때 폴더 아랫변과 서랍 바닥이 정확히 같이 움직인다. */
    var shift = fdSel === null ? 0 : -fdSel * step;

    folders.forEach(function (el, k) {
      var gone = fdSel !== null && k < fdSel;
      var ins  = (N - 1 - k) * inset;      // 폭은 고정 — 선택해도 변하지 않는다

      el.style.top = (k * step) + 'px';
      el.style.left = ins + 'px';
      el.style.right = ins + 'px';
      el.style.height = ((N - 1 - k) * step + last) + 'px';
      el.style.zIndex = k + 1;

      if (gone) {
        // 위로 빠지면서 살짝 기운다 — 종이가 들리는 결
        var tilt = (k % 2 ? 0.7 : -0.7);
        el.style.transform = 'translateY(' + (shift - 34) + 'px) rotate(' + tilt + 'deg) scale(.985)';
      } else {
        el.style.transform = 'translateY(' + shift + 'px)';
      }

      /* 순서를 어긋나게 준다.
         열 때  : 선택한 폴더 바로 위부터 차례로 들린다 (위로 번지는 파동)
         닫을 때: 맨 위부터 차례로 내려앉는다 */
      var delay;
      if (fdSel === null) {
        delay = Math.min(k, 5) * 30;
      } else if (gone) {
        delay = Math.min(fdSel - 1 - k, 4) * 48;
      } else {
        delay = 0;
      }
      el.style.transitionDelay = delay + 'ms';

      el.classList.toggle('is-gone', gone);
      el.classList.toggle('is-open', fdSel === k);
      el.setAttribute('aria-expanded', fdSel === k ? 'true' : 'false');
      el.tabIndex = gone ? -1 : 0;
    });
  }

  function fdSlidesOf(f) {
    return (f.slides && f.slides.length) ? f.slides : ['', '', ''];
  }

  function fdShowSlide(i, total) {
    var slides = $$('.fdv__slide', viewEl);
    slides.forEach(function (s, n) { s.classList.toggle('is-on', n === i); });
    var bar = $('.fdv__bar i', viewEl);
    if (bar) bar.style.width = ((i + 1) / total * 100) + '%';
  }

  function fdStopSlides() { clearInterval(fdTimer); fdTimer = null; fdSlide = 0; }

  function fdStartSlides(total) {
    fdStopSlides();
    if (total < 2 || reduceMotion) return;
    fdTimer = setInterval(function () {
      fdSlide = (fdSlide + 1) % total;
      fdShowSlide(fdSlide, total);
    }, 2200);
  }

  function renderViewer(k) {
    var f = FILES[k];
    var slides = fdSlidesOf(f);
    var rec = ('0' + (k + 1)).slice(-2) + ' / ' + ('0' + FILES.length).slice(-2);

    viewEl.innerHTML =
      '<div class="fdv__media">' +
        slides.map(function (src, i) {
          return '<div class="fdv__slide' + (i === 0 ? ' is-on' : '') + '">' +
            (src ? '<img src="' + src + '" alt="' + f.title + ' 미리보기 ' + (i + 1) + '" loading="lazy">'
                 : 'TODO SLIDE ' + (i + 1)) + '</div>';
        }).join('') +
        '<div class="fdv__bar"><i></i></div>' +
      '</div>' +
      '<div class="fdv__body">' +
        '<div class="fdv__rec">FILE ' + rec + '<span class="fdv__caret"></span></div>' +
        '<div class="fdv__kind">' + f.kind + ' · ' + f.date + '</div>' +
        '<h3 class="fdv__title">' + f.title + '</h3>' +
        '<p class="fdv__summary">' + f.summary + '</p>' +
        (f.tags && f.tags.length
          ? '<div class="fdv__tags">' + f.tags.map(function (t) { return '<span class="fdv__tag">' + t + '</span>'; }).join('') + '</div>'
          : '') +
        '<div class="fdv__actions">' +
          '<a class="fdv__open" href="' + f.url + '" target="_blank" rel="noopener">문서 열람 →</a>' +
          '<button type="button" class="fdv__close">닫기</button>' +
        '</div>' +
      '</div>';

    /* 다른 폴더로 갈아탈 때도 내부 요소가 다시 한 박자씩 들어오게 한다.
       클래스를 뗐다 붙이는 것만으로는 애니메이션이 재시작되지 않아
       사이에 리플로우를 한 번 강제한다. */
    viewEl.classList.remove('is-fresh');
    void viewEl.offsetWidth;
    viewEl.classList.add('is-fresh');

    var closeBtn = $('.fdv__close', viewEl);
    if (closeBtn) closeBtn.addEventListener('click', fdClose);

    fdShowSlide(0, slides.length);
    fdStartSlides(slides.length);
  }

  function fdSelect(k, force) {
    if (fdSel === k && !force) { fdClose(); return; }
    fdSel = k;
    renderViewer(k);
    viewWrap.classList.add('is-open');
    layoutDeck();
  }

  function fdClose() {
    if (fdSel === null) return;
    fdSel = null;
    viewWrap.classList.remove('is-open');
    fdStopSlides();
    layoutDeck();
  }

  function initDeck() {
    if (!deckEl) return;
    buildDeck();
    layoutDeck();
    window.addEventListener('resize', layoutDeck, { passive: true });
  }

  /* ---------------------------------------------------------------------
     7. 게임 — 카드 렌더 + 장르 비율 그래프
     --------------------------------------------------------------------- */
  var grid = $('#game-grid');
  var bar = $('#genre-bar');
  var legend = $('#genre-legend');

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderGames() {
    grid.innerHTML = '';
    GAMES.forEach(function (g) {
      var card = document.createElement('article');
      card.className = 'game-card';
      var thumb = g.image
        ? '<img src="' + esc(g.image) + '" alt="' + esc(g.title) + '" loading="lazy">'
        : '<div class="slot"><span>TODO: 이미지</span></div>';
      card.innerHTML =
        '<div class="game-card__thumb">' + thumb + '</div>' +
        '<div class="game-card__body">' +
          '<p class="game-card__title">' + esc(g.title) + '</p>' +
          '<div class="game-card__chips">' +
            (g.platform ? '<span class="chip chip--platform">' + esc(g.platform) + '</span>' : '') +
            (g.genres || []).map(function (x) { return '<span class="chip">' + esc(x) + '</span>'; }).join('') +
          '</div>' +
        '</div>';
      grid.appendChild(card);
    });
  }

  function renderGenreChart() {
    var counts = {}, total = 0;
    GAMES.forEach(function (g) {
      (g.genres || []).forEach(function (x) {
        x = String(x).trim();
        if (!x) return;
        counts[x] = (counts[x] || 0) + 1;
        total++;
      });
    });

    bar.innerHTML = '';
    legend.innerHTML = '';
    if (!total) {
      legend.innerHTML = '<li class="muted caption">등록된 장르가 없습니다.</li>';
      return;
    }

    Object.keys(counts)
      .sort(function (a, b) { return counts[b] - counts[a]; })
      .forEach(function (name, i) {
        var pct = counts[name] / total * 100;
        var color = GENRE_COLORS[i % GENRE_COLORS.length];

        var seg = document.createElement('span');
        seg.className = 'genre-bar__seg';
        seg.style.setProperty('--seg-w', pct + '%');
        seg.style.background = color;
        seg.title = name + ' ' + pct.toFixed(1) + '%';
        bar.appendChild(seg);

        var li = document.createElement('li');
        li.innerHTML = '<i style="background:' + color + '"></i>' +
                       '<span>' + esc(name) + '</span>' +
                       '<span class="pct">' + pct.toFixed(0) + '%</span>';
        legend.appendChild(li);
      });

    // 화면에 들어오면 0에서 차오르도록
    bar.classList.remove('is-in');
    if (typeof observeEl === 'function') observeEl(bar);
    else bar.classList.add('is-in');
  }

  /* 등록 폼 (뼈대: 메모리에만 추가) */
  var form = $('#game-form');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = new FormData(form);
    var title = (d.get('title') || '').trim();
    if (!title) { $('#g-title').focus(); return; }
    GAMES.push({
      title: title,
      platform: (d.get('platform') || '').trim(),
      genres: String(d.get('genres') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean),
      image: (d.get('image') || '').trim()
    });
    form.reset();
    renderGames();
    renderGenreChart();
  });

  /* ---------------------------------------------------------------------
     7.5 스크롤 리빌 + 진행 바 (3단계: 눈 높이기 — 절제형)
     페이드 + 8px 상승 + 순차 지연. 그 이상은 하지 않습니다.
     --------------------------------------------------------------------- */
  var reduceMotion = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var revealObserver = null;

  if (!reduceMotion && 'IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        revealObserver.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  }

  function observeEl(el) {
    if (!el) return;
    if (!revealObserver) { el.classList.add('is-in'); return; }
    revealObserver.observe(el);
  }

  /* 형제 순서에 따라 순차 지연 (최대 6칸까지만 — 더 늘리면 느리게 느껴짐) */
  function stagger(list) {
    list.forEach(function (el, i) {
      el.style.setProperty('--reveal-delay', (Math.min(i, 6) * 55) + 'ms');
    });
  }

  function resetReveals(viewName) {
    var view = $('#' + viewName);
    if (!view) return;
    var items = $$('[data-reveal]', view);
    if (!revealObserver) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    items.forEach(function (el) {
      revealObserver.unobserve(el);
      el.classList.remove('is-in');
      el.style.removeProperty('--reveal-delay');
    });
    // 같은 부모를 공유하는 것끼리 묶어 지연 부여
    var groups = {};
    items.forEach(function (el) {
      var key = el.parentNode ? (el.parentNode.className || 'root') : 'root';
      (groups[key] = groups[key] || []).push(el);
    });
    Object.keys(groups).forEach(function (k) { stagger(groups[k]); });

    // 클래스 제거가 반영된 다음 프레임에 관찰 시작 (전환이 씹히는 것 방지)
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { items.forEach(observeEl); });
    });
  }

  /* 스크롤 진행 바 */
  var progressEl = $('#scroll-progress i');
  function updateProgress() {
    if (!progressEl) return;
    var doc = document.documentElement;
    var max = (doc.scrollHeight - doc.clientHeight);
    var pct = max > 0 ? (window.pageYOffset / max) * 100 : 0;
    progressEl.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }

  /* ---------------------------------------------------------------------
     7.6 궤도 맵 (Radial Orbital Map)
     원본: 21st.dev radial-orbital-timeline (React) → 바닐라 포팅.
     원본과 다른 점 3가지 (의도적):
       1) setInterval(50ms) → requestAnimationFrame + 델타 시간
          (탭 백그라운드에서 자동 정지, 프레임 드랍 시 속도 유지)
       2) 화면 밖이면 루프 정지 (IntersectionObserver)
       3) 상세 카드를 노드에 붙이지 않고 궤도 아래 고정 위치에 표시
          — 노드를 따라다니면 좁은 화면에서 잘려나감
     --------------------------------------------------------------------- */

  /* ===== [사용자 편집 구간] 궤도 노드 =====
     tab      : 클릭 시 이동할 탭 (VIEWS 중 하나)
     related  : 함께 빛낼 노드 id
     energy   : 0~100, 완성도/비중을 나타내는 값
     status   : completed | in-progress | pending                        */
  var ORBIT_DATA = [
    { id:1, tab:'intro',    title:'소개',     date:'01', status:'completed',   energy:100, related:[2,3],
      content:'경청과 목계, 소통을 강점으로 삼는 게임 기획자 지망생 김영웅입니다. 이 페이지 전체의 출발점입니다.' },
    { id:2, tab:'projects', title:'프로젝트', date:'02', status:'completed', energy:90,  related:[1,3,5],
      content:'헬 브레이커 · 체크매터 · 심비온 3개 팀 프로젝트. 심비온은 PM으로 참여해 실제 출시까지 진행했습니다.' },
    { id:3, tab:'skills',   title:'기술',     date:'03', status:'in-progress',   energy:60,  related:[1,2,4],
      content:'Unity · Figma · Github · MS Office · AI. 디벨로켓 에듀 과정에서 계속 늘려가는 중입니다.' },
    { id:4, tab:'docs',     title:'문서',     date:'04', status:'in-progress', energy:55,  related:[2,3],
      content:'심비온 프로젝트의 WBS · TC · 데이터 테이블. 카드에 올리면 슬라이드가 재생됩니다.' },
    { id:5, tab:'games',    title:'게임',     date:'05', status:'pending',     energy:15,  related:[2,4],
      content:'TODO: 플레이한 게임과 장르 분포. 취향이 곧 레퍼런스입니다.' }
  ];

  var ORBIT_ICONS = {
    intro:    '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M4 20a8 8 0 0 1 16 0"/>',
    projects: '<path d="M3 7a2 2 0 0 1 2-2h3l2 2h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 12h8"/>',
    skills:   '<path d="m14.5 5.5 4 4"/><path d="M12 8 4.5 15.5a2.1 2.1 0 0 0 3 3L15 11"/><path d="m16 3 5 5-3 3-5-5Z"/>',
    docs:     '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    games:    '<path d="M7 12h4M9 10v4"/><path d="M15.5 11.5h.01M17.5 13.5h.01"/><path d="M17 6H7a5 5 0 0 0-5 5v2a5 5 0 0 0 5 5h10a5 5 0 0 0 5-5v-2a5 5 0 0 0-5-5Z"/>'
  };
  function svgIcon(k){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
           (ORBIT_ICONS[k] || '') + '</svg>';
  }

  var orbitEl   = $('#orbit');
  var nodesEl   = $('#orbit-nodes');
  var panelEl   = $('#orbit-panel');
  var orbitalEl = $('#orbital');

  var orbitNodes = [];      // {data, el, dot, glow}
  var rot = 0;              // 현재 회전각(도)
  var rotTarget = null;     // 노드 선택 시 이동 목표각
  var activeId = null;
  var orbitRAF = null;
  var orbitVisible = false;
  var orbitHover = false;   // 커서가 올라가면 자동 회전 정지 → 노드를 누르기 쉬워짐
  var lastTs = 0;
  var R = 190, CX = 0, CY = 0;

  function buildOrbit() {
    if (!orbitEl || !nodesEl) return;
    ORBIT_DATA.forEach(function (d) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'onode';
      b.setAttribute('data-id', d.id);
      b.setAttribute('aria-expanded', 'false');
      b.setAttribute('aria-label', d.title + ' 섹션 열기');
      var glowSize = d.energy * 0.5 + 46;
      b.innerHTML =
        '<span class="onode__glow" style="width:' + glowSize + 'px;height:' + glowSize + 'px"></span>' +
        '<span class="onode__dot">' + svgIcon(d.tab) + '</span>' +
        '<span class="onode__label">' + d.title + '</span>';
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleNode(d.id);
      });
      nodesEl.appendChild(b);
      orbitNodes.push({ data: d, el: b, dot: $('.onode__dot', b) });
    });

    /* 데스크톱: 궤도 위에 커서가 있으면 회전을 멈춘다.
       움직이는 표적을 누르게 만들지 않기 위한 장치. */
    if (window.matchMedia && window.matchMedia('(hover: hover)').matches) {
      orbitEl.addEventListener('mouseenter', function () { orbitHover = true; });
      orbitEl.addEventListener('mouseleave', function () { orbitHover = false; });
      orbitEl.addEventListener('focusin',  function () { orbitHover = true; });
      orbitEl.addEventListener('focusout', function () { orbitHover = false; });
    }

    orbitalEl.addEventListener('click', function (e) {
      var t = e.target;
      if (t === orbitEl || t === nodesEl || t === orbitalEl ||
          (t.classList && (t.classList.contains('orbit__ring') ||
                           t.classList.contains('orbital__hint')))) {
        closeNode();
      }
    });
  }

  /* 풀블리드 : 좌측 사이드바 때문에 부모의 중앙이 화면 중앙이 아니다.
     CSS calc(50% - 50vw) 로는 어긋나므로 실제 오프셋을 재서 넣는다. */
  function layoutBleed() { layoutBleedAll(); }

  var sideMode = false;   // true = 패널이 궤도 오른쪽, false = 궤도 아래

  function measureOrbit() {
    if (!orbitEl) return;
    var w = orbitEl.clientWidth, h = orbitEl.clientHeight;
    sideMode = w >= 860;

    if (sideMode) {
      // 오른쪽에 패널 자리를 비워두고 궤도를 왼쪽으로
      CX = w * 0.33;
      CY = h * 0.5;
      R  = Math.max(96, Math.min(w * 0.26, h * 0.38, 190));
    } else {
      CX = w / 2;
      CY = h * 0.47;
      R  = Math.max(84, Math.min(w * 0.34, h * 0.36, 170));
    }
    orbitEl.style.setProperty('--cx', CX + 'px');
    orbitEl.style.setProperty('--cy', CY + 'px');
    orbitEl.style.setProperty('--r', R + 'px');
    positionPanel();
  }

  /* 패널 배치. 넓으면 궤도 오른쪽에 절대배치, 좁으면 궤도 아래 일반 흐름. */
  function positionPanel() {
    if (!panelEl || panelEl.hidden) return;
    panelEl.classList.toggle('is-side', sideMode);
    panelEl.classList.toggle('is-stack', !sideMode);
    if (!sideMode) {
      panelEl.style.left = '';
      panelEl.style.top = '';
      return;
    }
    // .orbital 기준 좌표 (.orbit 은 max-width 로 가운데 정렬돼 있을 수 있다)
    var oRect = orbitEl.getBoundingClientRect();
    var pRect = orbitalEl.getBoundingClientRect();
    var offX = oRect.left - pRect.left;
    var offY = oRect.top - pRect.top;
    var ph = panelEl.offsetHeight;
    var left = offX + CX + R + 56;
    var top  = offY + CY - ph / 2;
    // 밴드 밖으로 나가지 않도록 클램프
    var maxTop = pRect.height - ph - 16;
    if (top < 16) top = 16;
    if (maxTop > 16 && top > maxTop) top = maxTop;
    panelEl.style.left = left + 'px';
    panelEl.style.top  = top + 'px';
  }

  /* 각도 차를 -180~180 으로 정규화 */
  function angleDelta(a, b) {
    var d = (b - a) % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
  }

  function layoutOrbit() {
    var total = orbitNodes.length;
    orbitNodes.forEach(function (n, i) {
      var angle = ((i / total) * 360 + rot) % 360;
      var rad = angle * Math.PI / 180;
      var x = R * Math.cos(rad);
      var y = R * Math.sin(rad);
      var depth = (Math.sin(rad) + 1) / 2;            // 0(뒤) ~ 1(앞)
      var isActive = n.data.id === activeId;
      var isRelated = n.el.classList.contains('is-related');
      // 연결된 노드는 궤도 뒤편에 있어도 확실히 보이게 바닥값을 올린다
      var op = isActive ? 1 : Math.max(0.45 + 0.55 * depth, isRelated ? 0.92 : 0);
      var sc = isActive ? 1.32 : (0.86 + 0.14 * depth) * (isRelated ? 1.06 : 1);
      n.el.style.transform =
        'translate(-50%,-50%) translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px) scale(' + sc.toFixed(3) + ')';
      n.el.style.opacity = op.toFixed(3);
      n.el.style.zIndex = isActive ? 210 : Math.round(100 + 50 * depth);
    });
  }

  function orbitFrame(ts) {
    if (!lastTs) lastTs = ts;
    var dt = Math.min(ts - lastTs, 120);
    lastTs = ts;

    if (rotTarget !== null) {
      var d = angleDelta(rot, rotTarget);
      if (Math.abs(d) < 0.15) { rot = rotTarget; rotTarget = null; }
      else { rot = (rot + d * 0.14 + 360) % 360; }
    } else if (activeId === null && !orbitHover && !reduceMotion) {
      rot = (rot + dt * 0.006) % 360;   // 약 6°/초
    }

    layoutOrbit();
    orbitRAF = requestAnimationFrame(orbitFrame);
  }

  function startOrbit() {
    if (orbitRAF !== null) return;
    lastTs = 0;
    orbitRAF = requestAnimationFrame(orbitFrame);
  }
  function stopOrbit() {
    if (orbitRAF === null) return;
    cancelAnimationFrame(orbitRAF);
    orbitRAF = null;
  }

  function statusLabel(s) {
    return s === 'completed' ? '완료' : s === 'in-progress' ? '진행 중' : '예정';
  }

  function renderPanel(d) {
    var chips = d.related.map(function (rid) {
      var r = ORBIT_DATA.filter(function (x) { return x.id === rid; })[0];
      return r ? '<button type="button" class="opanel__chip" data-rel="' + rid + '">' + r.title +
                 '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>' : '';
    }).join('');

    panelEl.innerHTML =
      '<div class="opanel__top">' +
        '<span class="opanel__badge" data-status="' + d.status + '">' + statusLabel(d.status) + '</span>' +
        '<span class="opanel__date">' + d.date + '</span>' +
      '</div>' +
      '<h3 class="opanel__title">' + d.title + '</h3>' +
      '<p class="opanel__body">' + d.content + '</p>' +
      '<div class="opanel__meter">' +
        '<div class="opanel__meter-row"><span>비중</span><span class="mono">' + d.energy + '%</span></div>' +
        '<div class="opanel__track"><div class="opanel__fill"></div></div>' +
      '</div>' +
      (d.related.length ? '<div class="opanel__links">' +
        '<div class="opanel__links-title">연결된 섹션</div>' +
        '<div class="opanel__chips">' + chips + '</div></div>' : '') +
      '<button type="button" class="opanel__go" data-go="' + d.tab + '">' + d.title + ' 보러 가기' +
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
      '</button>';

    panelEl.hidden = false;
    positionPanel();
    // 게이지는 다음 프레임에 채워야 트랜지션이 보인다
    requestAnimationFrame(function () {
      positionPanel();   // 렌더 후 실제 높이로 다시 맞춘다
      var fill = $('.opanel__fill', panelEl);
      if (fill) fill.style.width = d.energy + '%';
    });

    $$('.opanel__chip', panelEl).forEach(function (c) {
      c.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleNode(parseInt(c.getAttribute('data-rel'), 10), true);
      });
    });
    var go = $('.opanel__go', panelEl);
    if (go) go.addEventListener('click', function (e) {
      e.stopPropagation();
      setView(go.getAttribute('data-go'));
    });
  }

  function toggleNode(id, force) {
    if (activeId === id && !force) { closeNode(); return; }

    activeId = id;
    var idx = -1;
    ORBIT_DATA.forEach(function (d, i) { if (d.id === id) idx = i; });
    if (idx < 0) return;

    // 선택한 노드를 카드 쪽으로 이동시켜 시선이 이어지게 한다
    //   넓은 화면 : 오른쪽(0°)  /  좁은 화면 : 아래(90°)
    var dock = sideMode ? 0 : 90;
    rotTarget = (dock - (idx / ORBIT_DATA.length) * 360 + 720) % 360;

    var d = ORBIT_DATA[idx];
    orbitNodes.forEach(function (n) {
      var on = n.data.id === id;
      n.el.classList.toggle('is-active', on);
      n.el.classList.toggle('is-related', !on && d.related.indexOf(n.data.id) !== -1);
      n.el.setAttribute('aria-expanded', on ? 'true' : 'false');
    });

    renderPanel(d);
    startOrbit();
  }

  function closeNode() {
    if (activeId === null) return;
    activeId = null;
    rotTarget = null;
    orbitNodes.forEach(function (n) {
      n.el.classList.remove('is-active', 'is-related');
      n.el.setAttribute('aria-expanded', 'false');
    });
    panelEl.hidden = true;
    panelEl.innerHTML = '';
    panelEl.classList.remove('is-side', 'is-stack');
    panelEl.style.left = '';
    panelEl.style.top = '';
  }

  /* 뷰포트 밖이면 루프 정지 — 배터리 낭비 방지 */
  function initOrbit() {
    if (!orbitEl) return;
    buildOrbit();
    layoutBleed();
    measureOrbit();
    layoutOrbit();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (ents) {
        ents.forEach(function (en) {
          orbitVisible = en.isIntersecting;
          if (orbitVisible) { layoutBleed(); measureOrbit(); startOrbit(); }
          else stopOrbit();
        });
      }, { threshold: 0.02 }).observe(orbitEl);
    } else {
      startOrbit();
    }

    window.addEventListener('resize', function () {
      layoutBleed();
      measureOrbit();
      layoutOrbit();
    }, { passive: true });
    window.addEventListener('orientationchange', function () {
      setTimeout(function () { layoutBleed(); measureOrbit(); layoutOrbit(); }, 120);
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopOrbit();
      else if (orbitVisible) startOrbit();
    });
  }

  /* ---------------------------------------------------------------------
     7.7 이력서 — 경험 파트 전개 틀 적용
     단계 라벨과 원 안의 글자를 프레임워크에서 가져와 찍습니다.
     프레임워크에 없는 단계(상행결배의 '과제')는 숨기고, 마지막 단계에
     .step--last 를 다시 부여해 세로선이 정확히 거기서 끊기게 합니다.
     --------------------------------------------------------------------- */
  function applyResumeFramework(nameOverride) {
    var fw = RESUME_FRAMEWORKS[nameOverride || RESUME_FRAMEWORK] || RESUME_FRAMEWORKS.star;

    var badge = $('#framework-badge');
    if (badge) badge.textContent = fw.name;

    $$('[data-case]').forEach(function (caseEl) {
      var local = caseEl.getAttribute('data-framework');
      var f = (local && RESUME_FRAMEWORKS[local]) || fw;
      var shown = [];

      $$('.step', caseEl).forEach(function (step) {
        var kind = step.getAttribute('data-step');
        var def = f.steps[kind];
        var inUse = f.order.indexOf(kind) !== -1;

        step.hidden = !inUse;
        step.classList.remove('step--last');
        if (!inUse || !def) return;

        var no = $('.step__no', step);
        var label = $('.step__label', step);
        if (no) no.textContent = def.key;
        if (label) {
          label.innerHTML = '<span class="step__label-ko">' + def.ko + '</span>' +
                            '<span class="step__label-en mono">' + def.en + '</span>';
        }
        shown.push(step);
      });

      if (shown.length) shown[shown.length - 1].classList.add('step--last');
    });
  }

  /* ---------------------------------------------------------------------
     8. 초기화
     --------------------------------------------------------------------- */
  renderGames();
  renderGenreChart();

  var initial = (location.hash || '').replace('#', '');
  setView(VIEWS.indexOf(initial) !== -1 ? initial : 'intro', { silent: true, keepScroll: true });

  applyResumeFramework();
  initDeck();
  initOrbit();
  updateProgress();

  window.addEventListener('hashchange', function () {
    var h = (location.hash || '').replace('#', '');
    if (VIEWS.indexOf(h) !== -1 && h !== currentView) setView(h, { silent: true });
  });

  /* iOS: 주소창 높이 변화 대응 (dvh 미지원 브라우저 폴백) */
  if (!CSS.supports || !CSS.supports('height', '100dvh')) {
    var setVH = function () {
      document.documentElement.style.setProperty('--vh-fallback', window.innerHeight + 'px');
    };
    setVH();
    window.addEventListener('resize', setVH, { passive: true });
    window.addEventListener('orientationchange', setVH, { passive: true });
  }
})();
