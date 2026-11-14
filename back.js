/* back.js: the way back to Home, shared by Home, To Do, Calories (and later the Planner).
   One line in each page's <head>:  <script src="../home/back.js"></script>
   Home stores which app it opened (localStorage 'home.openedApp' = {path, at}); an app page reads it:
   - shows a small floating Home button, but only when that flag is there and this is the same session as Home
     (sessionStorage 'home.session', set by Home) or the installed app;
   - if the installed Home was just relaunched (standalone, and either no session marker, which is what a page
     restored from saved history has, or a fresh navigation with no same-origin referrer) and the flag is
     there, goes straight back to Home instead of staying inside the app it was last in.
   Each installed web app has its own storage, so a separately installed To Do never has the flag. */
(function () {
  'use strict';
  var KEY = 'home.openedApp', SESSION = 'home.session', APPS = /\/(todo|calories|planner)\//, HOME = '../home/';
  var path = location.pathname, isHome = /\/home\/(index\.html)?$/.test(path), isApp = APPS.test(path);

  function read() {
    try { var v = JSON.parse(localStorage.getItem(KEY)); return v && typeof v.path === 'string' ? v : null; } catch (e) { return null; }
  }
  function write(v) { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch (e) {} }
  function hasSession() { try { return !!sessionStorage.getItem(SESSION); } catch (e) { return false; } }
  function markSession() { try { sessionStorage.setItem(SESSION, '1'); } catch (e) {} }

  if (isHome) {                                   // Home: clear the flag now (and when restored from the back/forward cache), set it on app links
    write(null); markSession();
    addEventListener('pageshow', function (e) { if (e.persisted) { write(null); markSession(); } });
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest && e.target.closest('a[href]');
      if (!a || e.button > 0 || e.defaultPrevented) return;
      try { var u = new URL(a.getAttribute('href'), location.href); if (u.origin !== location.origin || !APPS.test(u.pathname)) return;
        write({ path: u.pathname, at: Date.now() });
        setTimeout(function () { if (e.defaultPrevented) write(null); }, 0);   // the page decided not to leave (e.g. signed out): no flag
      } catch (x) {}
    }, true);
    return;
  }
  if (!isApp) return;
  var flag = read();
  if (!flag) return;                              // not opened from Home: no redirect, no button

  // Is this a fresh launch of the installed Home? window.__homeStandalone is a test-only override.
  function standalone() {
    if (window.__homeStandalone !== undefined) return !!window.__homeStandalone;
    return navigator.standalone === true || (!!window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  }
  function navType() {
    var n = window.performance && performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    return n ? n.type : (performance.navigation && performance.navigation.type === 1 ? 'reload' : 'navigate');
  }
  function sameOriginReferrer() {
    try { return !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) { return false; }
  }
  var hadSession = hasSession(), sa = standalone();   // read once, before this page marks the session itself
  window.__homeBackDecision = function () { return sa && (!hadSession || (navType() === 'navigate' && !sameOriginReferrer())); };   // exposed for tests
  if (window.__homeBackDecision()) {
    document.documentElement.style.visibility = 'hidden';   // nothing shows while the replace happens
    location.replace(HOME);
    return;
  }
  if (sa) markSession();                          // staying inside the installed app: this is now a live session
  if (!hadSession && !sa) return;                 // a browser tab that never saw Home (e.g. a bookmark): no button

  // The floating Home button: Tahoe glass, 44x44, bottom corner clear of the safe areas (see the media query for phones).
  var css = '.home-back{position:fixed;z-index:50;left:max(20px,env(safe-area-inset-left));bottom:max(20px,env(safe-area-inset-bottom));width:44px;height:44px;border-radius:50%;'
    + 'display:grid;place-items:center;color:rgba(0,0,0,.78);background:rgba(255,255,255,.4);-webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%);'
    + 'box-shadow:0 4px 14px rgba(0,0,0,.18),inset 0 0 0 .5px rgba(255,255,255,.7);-webkit-tap-highlight-color:transparent;transition:transform .2s cubic-bezier(.23,1,.32,1)}'
    + '.home-back svg{width:22px;height:22px;display:block}'
    + '.home-back:hover,.home-back:focus-visible{transform:scale(1.06)}.home-back:active{transform:scale(.94)}'
    + '.home-back:focus-visible{outline:2px solid #0a84ff;outline-offset:2px}'
    + '@media (max-width:640px){.home-back{left:auto;right:max(10px,env(safe-area-inset-right));bottom:calc(max(8px,env(safe-area-inset-bottom)) + 68px)}.home-back--board{display:none}}'   // Whiteboard on a phone: its tools fill the screen, go back via To Do
    + '@media (prefers-color-scheme:dark){.home-back{color:rgba(255,255,255,.94);background:rgba(26,28,40,.55);box-shadow:0 4px 14px rgba(0,0,0,.45),inset 0 0 0 .5px rgba(255,255,255,.28)}}'
    + '@media (prefers-reduced-transparency:reduce){.home-back{-webkit-backdrop-filter:none;backdrop-filter:none;background:rgba(246,246,248,.97)}'
    + '@media (prefers-color-scheme:dark){.home-back{background:rgba(40,40,44,.97)}}}'
    + '@media (prefers-reduced-motion:reduce){.home-back{transition:none}}';
  function add() {
    if (document.querySelector('.home-back')) return;
    var s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    var a = document.createElement('a');
    a.className = /\/board\.html$/.test(path) ? 'home-back home-back--board' : 'home-back'; a.href = HOME; a.setAttribute('aria-label', 'Home'); a.title = 'Home';
    a.innerHTML = '<svg viewBox="0 0 40 40" aria-hidden="true" fill="currentColor"><rect x="9.5" y="7" width="9.8" height="9.8" rx="2.6"/><rect x="20.7" y="7" width="9.8" height="9.8" rx="2.6"/>'
      + '<rect x="9.5" y="18.2" width="9.8" height="9.8" rx="2.6"/><rect x="20.7" y="18.2" width="9.8" height="9.8" rx="2.6" opacity=".45"/><rect x="11.5" y="31" width="17" height="2.6" rx="1.3"/></svg>';
    document.body.appendChild(a);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();
