// The phone showcase's way in: the 4-digit code (0000 the app, 1234 dev mode).
// A plain script that runs the moment the page opens, so the code is the first thing
// on screen, over the loading screen. Typed before the app has loaded, the code gives
// way to the loading bar, which then gives way to the main menu; typed after, straight
// to the menu. mobile.js picks it up (window.pmGateFirst) and uses window.pmGate for
// the main menu's Back.
(function () {
  var CODES = ['0000', '1234'], OK_KEY = 'pm-mobile-ok', DEV_KEY = 'pm-dev';
  var KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'];
  window.pmGate = function (onOk) {
    var g = document.createElement('div');
    g.id = 'mGate';
    var app = (window.PIXMOB_APPS || {})[window.PIXMOB_APP] || { word: '' };
    g.innerHTML = '<div class="mgBox"><h1 class="mgName">CREATIVE <b>STAGE</b></h1><span class="mgApp">' + app.word + '</span><p>Enter the code</p>'
      + '<div class="mgDots"><i></i><i></i><i></i><i></i></div><div class="mgPad">'
      + KEYS.map(function (k) { return k === '' ? '<span></span>' : '<button data-k="' + k + '">' + k + '</button>'; }).join('')
      + '</div></div>';
    document.body.appendChild(g);
    var typed = '', dots = g.querySelectorAll('.mgDots i');
    function paint() { for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('on', i < typed.length); }
    g.addEventListener('click', function (e) {
      var b = e.target.closest('[data-k]');
      if (!b) return;
      var k = b.getAttribute('data-k');
      if (k === '⌫') typed = typed.slice(0, -1);
      else if (typed.length < 4) typed += k;
      paint();
      if (typed.length < 4) return;
      if (CODES.indexOf(typed) >= 0) {
        var code = typed;
        try { sessionStorage.setItem(OK_KEY, '1'); sessionStorage.setItem(DEV_KEY, code === '1234' ? '1' : '0'); } catch (_) { /* private mode */ }
        g.classList.add('ok');
        setTimeout(function () { g.remove(); onOk(code); }, 250);
      } else {
        g.classList.add('no');
        setTimeout(function () { g.classList.remove('no'); typed = ''; paint(); }, 450);
      }
    });
  };
  // the phone, not let in yet this visit: the code, first thing
  if (!window.PIXMOB_MOBILE) return;
  var me = (window.PIXMOB_APPS || {})[window.PIXMOB_APP];
  if (me) document.title = me.name;
  var ok = false;
  try { ok = sessionStorage.getItem(OK_KEY) === '1'; } catch (_) { /* private mode */ }
  if (!ok) window.pmGateFirst = new Promise(function (res) { window.pmGate(res); });
})();
