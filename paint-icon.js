/* 🎨 JJ 물감 아이콘: 화면의 💧 글자를 '웃는 물감 튜브' 그림으로 바꿔 보여줘요 (코드 속 글자는 그대로)
   - 글자(텍스트)만 바꾸고 입력칸·스크립트·캔버스는 건드리지 않아요
   - 나중에 새로 생기는 안내·버튼도 자동으로 바뀌어요 */
(function () {
  if (window.__jjPaintIco) return; window.__jjPaintIco = 1;
  var SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><g transform="rotate(-28 20 20)">' +
    '<path d="M17.2 1.5c2-1.6 5.6-.6 5.6 2.2v4.6h-5.6z" fill="#ec2e8c"/><rect x="16" y="6.6" width="8" height="3.6" rx="1" fill="#cbd5e1" stroke="#64748b" stroke-width=".8"/>' +
    '<path d="M13.2 10.2h13.6l1.4 21.6H11.8z" fill="#fff8fb" stroke="#3b2a45" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<path d="M13.2 10.2h13.6l.55 8.4H12.65z" fill="#ec2e8c"/>' +
    '<ellipse cx="17.6" cy="14" rx="1.5" ry="1.9" fill="#fff"/><ellipse cx="22.4" cy="14" rx="1.5" ry="1.9" fill="#fff"/>' +
    '<circle cx="17.8" cy="14.4" r="1" fill="#2d1e24"/><circle cx="22.6" cy="14.4" r="1" fill="#2d1e24"/>' +
    '<path d="M18.6 16.6q1.4 1.2 2.8 0" fill="none" stroke="#fff" stroke-width=".9" stroke-linecap="round"/>' +
    '<rect x="13.3" y="20.2" width="13.4" height="4.6" rx=".6" fill="#fff" stroke="#ec2e8c" stroke-width=".7"/>' +
    '<path d="M15.4 22.5h9.2" stroke="#ec2e8c" stroke-width=".9" stroke-dasharray="1.4 .9"/>' +
    '<path d="M12.15 26.5h15.7l.35 5.3H11.8z" fill="#ec2e8c"/>' +
    '<rect x="11" y="31.4" width="18" height="4.2" rx=".8" fill="#fff8fb" stroke="#3b2a45" stroke-width="1.2"/>' +
    '<path d="M13 32.4v2.2M15.4 32.4v2.2M17.8 32.4v2.2M20.2 32.4v2.2M22.6 32.4v2.2M25 32.4v2.2M27.2 32.4v2.2" stroke="#e5d4dd" stroke-width=".7"/>' +
    '</g></svg>';
  var URL_ = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(SVG);
  window.JJ_PAINT_ICON = URL_;
  var st = document.createElement('style');
  st.textContent = 'img.jj-paint{width:1.25em;height:1.25em;vertical-align:-.28em;display:inline-block;margin:0 .02em;pointer-events:none}';
  (document.head || document.documentElement).appendChild(st);
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, NOSCRIPT: 1, OPTION: 1, TITLE: 1, CANVAS: 1 };
  function fix(node) {
    if (!node) return;
    if (node.nodeType === 3) {
      var t = node.nodeValue; if (t.indexOf('💧') < 0) return;
      var p = node.parentNode; if (!p || SKIP[p.nodeName] || p.isContentEditable) return;
      var parts = t.split('💧'), frag = document.createDocumentFragment();
      for (var i = 0; i < parts.length; i++) {
        if (parts[i]) frag.appendChild(document.createTextNode(parts[i]));
        if (i < parts.length - 1) { var im = document.createElement('img'); im.className = 'jj-paint'; im.src = URL_; im.alt = '💧'; im.draggable = false; frag.appendChild(im); }
      }
      p.replaceChild(frag, node); return;
    }
    if (node.nodeType !== 1 || SKIP[node.nodeName]) return;
    var w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null), list = [], n;
    while ((n = w.nextNode())) if (n.nodeValue.indexOf('💧') >= 0) list.push(n);
    list.forEach(fix);
  }
  function start() {
    fix(document.body);
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === 'characterData') fix(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) fix(m.addedNodes[j]);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
