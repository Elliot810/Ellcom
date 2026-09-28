/* Lincom Demo – UI-Bausteine und Hilfsfunktionen */
window.L = window.L || {};
(function (L) {
  'use strict';

  L.views = L.views || {};

  /* ---------- Text & Zahlen ---------- */
  L.h = function (s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  L.eur = function (n, dec) {
    var d = dec === 0 ? 0 : 2;
    return Number(n || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: d, maximumFractionDigits: d });
  };
  L.num = function (n, dec) {
    return Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec === undefined ? 1 : dec });
  };
  L.uid = function (p) { return (p || 'id') + Math.random().toString(36).slice(2, 9); };
  L.initials = function (a, b) { return ((a || '').charAt(0) + (b || '').charAt(0)).toUpperCase(); };

  /* ---------- Datum ---------- */
  L.iso = function (d) {
    var x = new Date(d);
    return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  };
  L.parse = function (s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  L.today = function () { var d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  L.todayIso = function () { return L.iso(L.today()); };
  L.add = function (iso, n) { var d = L.parse(iso); d.setDate(d.getDate() + n); return L.iso(d); };
  L.addMonths = function (iso, n) { var d = L.parse(iso); d.setDate(1); d.setMonth(d.getMonth() + n); return L.iso(d); };
  L.weekStart = function (iso) { var d = L.parse(iso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return L.iso(d); };
  L.days = function (a, b) { return Math.round((L.parse(b) - L.parse(a)) / 864e5); };
  L.WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  L.MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  L.MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  L.wdIdx = function (iso) { return (L.parse(iso).getDay() + 6) % 7; };
  L.fd = function (iso) { var d = L.parse(iso); return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear(); };
  L.fds = function (iso) { var d = L.parse(iso); return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.'; };
  L.fdl = function (iso) { return L.parse(iso).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }); };
  L.rel = function (iso) {
    var n = L.days(L.todayIso(), iso);
    if (n === 0) return 'heute';
    if (n === 1) return 'morgen';
    if (n === -1) return 'gestern';
    return n > 0 ? 'in ' + n + ' Tagen' : 'vor ' + (-n) + ' Tagen';
  };
  L.kw = function (iso) {
    var d = L.parse(iso);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    var w1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7);
  };
  L.minutes = function (t) { var p = t.split(':').map(Number); return p[0] * 60 + p[1]; };
  L.hours = function (start, end, pause) {
    var m = L.minutes(end) - L.minutes(start);
    if (m <= 0) m += 1440;
    return Math.max(0, (m - (pause || 0)) / 60);
  };
  L.workdays = function (from, to) {
    var n = 0, d = from;
    while (d <= to) { if (L.wdIdx(d) < 5) n++; d = L.add(d, 1); }
    return n;
  };

  /* ---------- Markup-Helfer ---------- */
  L.icon = function (name, cls) { return '<i data-lucide="' + name + '" class="icon ' + (cls || '') + '"></i>'; };
  L.tag = function (text, color) { return '<span class="tag tag-' + (color || 'gray') + '">' + L.h(text) + '</span>'; };
  L.avatar = function (e, size) {
    if (!e) return '<span class="av av-open" style="--s:' + (size || 22) + 'px">?</span>';
    return '<span class="av" style="--s:' + (size || 22) + 'px;--c:' + e.color + '">' + L.initials(e.first, e.last) + '</span>';
  };
  L.progress = function (done, total) {
    var p = total ? Math.round(done / total * 100) : 0;
    return '<span class="progress"><span style="width:' + p + '%"></span></span>';
  };
  L.empty = function (icon, text) {
    return '<div class="empty">' + L.icon(icon) + '<span>' + L.h(text) + '</span></div>';
  };
  L.refreshIcons = function () { if (window.lucide) window.lucide.createIcons(); };

  /* ---------- Toast ---------- */
  L.toast = function (msg, kind) {
    var box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
    var t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.innerHTML = L.icon(kind === 'warn' ? 'triangle-alert' : 'check') + '<span>' + L.h(msg) + '</span>';
    box.appendChild(t);
    L.refreshIcons();
    setTimeout(function () { t.classList.add('out'); }, 3400);
    setTimeout(function () { t.remove(); }, 3800);
  };

  /* ---------- Modal ---------- */
  L.modal = function (o) {
    L.closeModal();
    var root = document.createElement('div');
    root.id = 'modal-root';
    root.innerHTML =
      '<div class="modal-backdrop"></div>' +
      '<form class="modal ' + (o.wide ? 'modal-wide' : '') + '" novalidate>' +
        '<div class="modal-head"><span>' + L.h(o.title) + '</span><button type="button" class="icon-btn" data-close aria-label="Schließen">' + L.icon('x') + '</button></div>' +
        '<div class="modal-body">' + o.body + '</div>' +
        (o.onSubmit || o.footer !== false ?
          '<div class="modal-foot">' + (o.footerLeft || '') + '<span class="spacer"></span>' +
          '<button type="button" class="btn" data-close>' + (o.onSubmit ? 'Abbrechen' : 'Schließen') + '</button>' +
          (o.onSubmit ? '<button type="submit" class="btn ' + (o.danger ? 'btn-danger' : 'btn-primary') + '">' + L.h(o.submit || 'Speichern') + '</button>' : '') +
          '</div>' : '') +
      '</form>';
    document.body.appendChild(root);
    var form = root.querySelector('form');
    root.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', L.closeModal); });
    root.querySelector('.modal-backdrop').addEventListener('click', L.closeModal);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!o.onSubmit) return L.closeModal();
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = typeof v === 'string' ? v.trim() : v; });
      form.querySelectorAll('input[type=checkbox][name]').forEach(function (c) { data[c.name] = c.checked; });
      var missing = Array.prototype.filter.call(form.querySelectorAll('[required]'), function (f) { return !String(f.value).trim(); });
      if (missing.length) { missing[0].focus(); missing.forEach(function (f) { f.classList.add('invalid'); }); return; }
      if (o.onSubmit(data, form) !== false) L.closeModal();
    });
    L.refreshIcons();
    if (o.onMount) o.onMount(form);
    var first = form.querySelector('input:not([type=checkbox]):not([type=hidden]), select, textarea');
    if (first && !o.noFocus) setTimeout(function () { first.focus(); }, 30);
    return form;
  };
  L.closeModal = function () { var r = document.getElementById('modal-root'); if (r) r.remove(); };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') L.closeModal(); });

  L.confirm = function (title, text, label, onYes) {
    L.modal({ title: title, body: '<p class="muted">' + L.h(text) + '</p>', submit: label, danger: true, noFocus: true, onSubmit: function () { onYes(); } });
  };

  /* ---------- Formularfelder ---------- */
  L.field = function (label, input, hint) {
    return '<label class="field"><span class="field-label">' + L.h(label) + '</span>' + input + (hint ? '<span class="field-hint">' + L.h(hint) + '</span>' : '') + '</label>';
  };
  L.input = function (name, value, attrs) {
    return '<input name="' + name + '" value="' + L.h(value === undefined ? '' : value) + '" ' + (attrs || '') + '>';
  };
  L.select = function (name, options, value, attrs) {
    return '<select name="' + name + '" ' + (attrs || '') + '>' + options.map(function (o) {
      var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o;
      return '<option value="' + L.h(v) + '"' + (String(v) === String(value) ? ' selected' : '') + '>' + L.h(t) + '</option>';
    }).join('') + '</select>';
  };
  L.check = function (name, label, checked) {
    return '<label class="check"><input type="checkbox" name="' + name + '"' + (checked ? ' checked' : '') + '><span>' + L.h(label) + '</span></label>';
  };

  /* ---------- Drag & Drop ---------- */
  L.dnd = function (root, o) {
    var dragged = null;
    root.querySelectorAll(o.item).forEach(function (el) {
      el.setAttribute('draggable', 'true');
      el.addEventListener('dragstart', function (e) {
        dragged = el.dataset.id;
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', dragged); } catch (err) {}
      });
      el.addEventListener('dragend', function () { el.classList.remove('dragging'); });
    });
    root.querySelectorAll(o.zone).forEach(function (z) {
      z.addEventListener('dragover', function (e) { e.preventDefault(); z.classList.add('drop-over'); });
      z.addEventListener('dragleave', function () { z.classList.remove('drop-over'); });
      z.addEventListener('drop', function (e) {
        e.preventDefault();
        z.classList.remove('drop-over');
        var id = dragged || e.dataTransfer.getData('text/plain');
        dragged = null;
        if (id) o.onDrop(id, z);
      });
    });
  };

  /* ---------- Liniendiagramm (Ist + Prognose) ---------- */
  L.lineChart = function (wrap, labels, actual, forecast, opts) {
    opts = opts || {};
    var svg = wrap.querySelector('svg'), tip = wrap.querySelector('.chart-tip');
    var NSfmt = opts.fmt || function (v) { return L.eur(v, 0); };
    function draw() {
      var w = wrap.clientWidth, h = wrap.clientHeight;
      if (!w || !h) return;
      var pad = { l: 4, r: 8, t: 12, b: 20 };
      var all = actual.concat(forecast || []).filter(function (v) { return v !== null && v !== undefined; });
      var min = Math.min.apply(null, all) * 0.9, max = Math.max.apply(null, all) * 1.06;
      if (!isFinite(min) || !isFinite(max) || max - min < 1) { var mid = isFinite(max) ? max : 0; min = mid - 1000; max = mid + 1000; } // leere oder flache Daten
      var n = labels.length;
      var x = function (i) { return pad.l + i * (w - pad.l - pad.r) / (n - 1); };
      var y = function (v) { return pad.t + (1 - (v - min) / (max - min)) * (h - pad.t - pad.b); };
      var base = h - pad.b;
      var pts = []; actual.forEach(function (v, i) { if (v !== null) pts.push([x(i), y(v)]); });
      var fpts = []; (forecast || []).forEach(function (v, i) { if (v !== null && v !== undefined) fpts.push([x(i), y(v)]); });
      var s = '<line x1="0" x2="' + w + '" y1="' + base + '" y2="' + base + '" stroke="#e9e9e7"/>';
      s += '<polygon points="' + pts[0][0] + ',' + base + ' ' + pts.map(function (p) { return p.join(','); }).join(' ') + ' ' + pts[pts.length - 1][0] + ',' + base + '" fill="rgba(35,131,226,0.08)"/>';
      s += '<polyline points="' + pts.map(function (p) { return p.join(','); }).join(' ') + '" fill="none" stroke="#2383e2" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
      if (fpts.length > 1) s += '<polyline points="' + fpts.map(function (p) { return p.join(','); }).join(' ') + '" fill="none" stroke="#2383e2" stroke-width="2" stroke-dasharray="4 4" stroke-linecap="round" opacity="0.7"/>';
      var step = n > 9 ? 2 : (n > 6 ? 2 : 1);
      labels.forEach(function (m, i) {
        if (i % step === 0 || i === n - 1) s += '<text x="' + x(i) + '" y="' + (h - 4) + '" font-size="11" fill="rgba(55,53,47,0.45)" text-anchor="' + (i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle') + '">' + m + '</text>';
      });
      s += '<line class="cx" y1="' + pad.t + '" y2="' + base + '" stroke="rgba(55,53,47,0.25)" stroke-dasharray="3 3" style="display:none"/>';
      s += '<circle class="cd" r="4.5" fill="#2383e2" stroke="#fff" stroke-width="2" style="display:none"/>';
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      svg.innerHTML = s;
      var cx = svg.querySelector('.cx'), cd = svg.querySelector('.cd');
      wrap.onmousemove = function (e) {
        var rx = e.clientX - wrap.getBoundingClientRect().left;
        var i = Math.max(0, Math.min(n - 1, Math.round((rx - pad.l) / ((w - pad.l - pad.r) / (n - 1)))));
        var isF = actual[i] === null || actual[i] === undefined;
        var v = isF ? forecast[i] : actual[i];
        if (v === null || v === undefined) return;
        cx.setAttribute('x1', x(i)); cx.setAttribute('x2', x(i)); cx.style.display = '';
        cd.setAttribute('cx', x(i)); cd.setAttribute('cy', y(v)); cd.style.display = '';
        tip.textContent = labels[i] + (isF ? ' (Prognose)' : '') + ' · ' + NSfmt(v);
        tip.style.left = Math.max(70, Math.min(w - 70, x(i))) + 'px';
        tip.style.top = y(v) + 'px';
        tip.style.opacity = 1;
      };
      wrap.onmouseleave = function () { cx.style.display = 'none'; cd.style.display = 'none'; tip.style.opacity = 0; };
    }
    draw();
    L.charts = L.charts || [];
    L.charts.push(draw);
  };
  L.redrawCharts = function () { (L.charts || []).forEach(function (f) { f(); }); };
  window.addEventListener('resize', function () { L.redrawCharts(); });
})(window.L);
