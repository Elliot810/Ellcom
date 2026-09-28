/* Lincom – Datenanbindung: lädt die Firmendaten aus Supabase in L.S
   und speichert jede Änderung (L.save) automatisch zurück.
   Die Ansichten der Demo arbeiten unverändert auf L.S. */
(function (L) {
  'use strict';

  // Sammlungen mit einfacher Zuordnung: L.S[key] <-> Tabelle (data jsonb)
  // emp: Feld im Datensatz, das auf den Personalstamm zeigt (für „eigene“ Datensätze)
  var COLS = [
    { key: 'customers', table: 'customers' },
    { key: 'projects', table: 'projects' },
    { key: 'tickets', table: 'tickets' },
    { key: 'tasks', table: 'tasks' },
    { key: 'time', table: 'time_entries', emp: 'empId', since: 180 },
    { key: 'invoices', table: 'invoices' },
    { key: 'expenses', table: 'expenses' },
    { key: 'deadlines', table: 'deadlines' },
    { key: 'documents', table: 'documents' },
    { key: 'compliance', table: 'compliance_items' },
    { key: 'onboarding', table: 'onboarding', emp: 'empId' },
    { key: 'candidates', table: 'candidates' },
    { key: 'docs', table: 'personnel_docs', emp: 'empId' },
    { key: 'absences', table: 'absences', emp: 'empId' },
    { key: 'swaps', table: 'swaps', emp: 'from' },
    { key: 'webRequests', table: 'web_requests' }
  ];
  var CONTRACT_TYPES = ['Vollzeit', 'Teilzeit', 'Minijob', 'Werkstudent', 'Aushilfe'];
  var COLORS = ['#9a6b4f', '#c77a2e', '#6b5bb5', '#3f7fbf', '#c2507a', '#4d8f6a', '#b8962e', '#5f7482', '#2f8f8a'];
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  var R = L.remote = { cid: null, role: null, snap: {}, busy: false, dirty: false, loadedAt: 0 };

  // Echte IDs statt Demo-Kürzeln
  L.uid = function () {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  };

  /* ---------- Rollen ---------- */
  var MGR = ['owner', 'admin', 'planner', 'hr', 'accounting'];
  var ACCESS = { // welche Rolle welches Modul sieht
    finanzen: ['owner', 'admin', 'accounting'],
    kunden: MGR,
    personal: ['owner', 'admin', 'hr'],
    schichten: ['owner', 'admin', 'planner', 'hr', 'accounting', 'employee'],
    organisation: ['owner', 'admin', 'planner', 'hr', 'accounting', 'employee'],
    verwaltung: ['owner', 'admin', 'hr', 'accounting']
  };
  var WRITE = { // wer im Modul Änderungen vornehmen darf (Rest: nur lesen / eigene Einträge)
    schichten: ['owner', 'admin', 'planner'],
    personal: ['owner', 'admin', 'hr'],
    finanzen: ['owner', 'admin', 'accounting']
  };
  L.roleIs = function (list) { return list.indexOf(R.role) !== -1; };
  L.canWrite = function (mod) { return !WRITE[mod] || L.roleIs(WRITE[mod]); };
  L.canAdmin = function () { return L.roleIs(['owner', 'admin']); };
  var baseOn = L.on;
  L.on = function (m) {
    if (!R.role) return baseOn(m);
    return baseOn(m) && (!ACCESS[m] || L.roleIs(ACCESS[m]));
  };

  // Unbekannte Kolleg:innen (fehlende Leserechte) nicht als Fehler behandeln
  var baseEmp = L.emp;
  L.emp = function (id) {
    var e = baseEmp(id);
    if (e || !id || !UUID.test(id)) return e;
    return { id: id, first: 'Kolleg:in', last: '', role: '', dept: '', type: '', hoursWeek: 0, rate: 0, vacation: 0, start: '1970-01-01', color: '#9b9a97', status: 'aktiv', hidden: true };
  };

  /* ---------- Hilfen ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function localIso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function hhmm(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function toTs(date, time) { return new Date(date + 'T' + time + ':00').toISOString(); }
  function omit(o, keys) { var r = {}; Object.keys(o).forEach(function (k) { if (keys.indexOf(k) === -1) r[k] = o[k]; }); return r; }
  function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
  // Vergleichbarer Text mit sortierten Schlüsseln auf allen Ebenen
  function sortDeep(v) {
    if (Array.isArray(v)) return v.map(sortDeep);
    if (v && typeof v === 'object') { var o = {}; Object.keys(v).sort().forEach(function (k) { if (v[k] !== undefined) o[k] = sortDeep(v[k]); }); return o; }
    return v;
  }
  function stable(o) { return JSON.stringify(sortDeep(o)); }
  async function q(p) { var r = await p; if (r.error) throw r.error; return r.data; }
  function sinceIso(days) { var d = new Date(); d.setDate(d.getDate() - days); return d.toISOString(); }

  /* ---------- Zeilen <-> Demo-Objekte ---------- */
  function empToRows(e, cid) {
    var data = omit(e, ['id', 'first', 'last', 'role', 'dept', 'type', 'rate', 'vacation', 'userId', 'hidden']);
    data.availability = (L.S.availability && L.S.availability[e.id]) || [];
    var row = { id: e.id, company_id: cid, first_name: (e.first || '').trim() || '–', last_name: e.last || '', job_title: e.role || null,
      department: e.dept || null, active: e.status !== 'ausgetreten', data: data };
    var con = { employee_id: e.id, company_id: cid, contract_type: CONTRACT_TYPES.indexOf(e.type) !== -1 ? e.type : null,
      hours_per_week: num(e.hoursWeek, null), hourly_wage: num(e.rate, null), vacation_days: e.vacation == null ? null : Math.round(num(e.vacation, 0)),
      start_date: e.start || null, end_date: e.end || null };
    return { row: row, con: con };
  }
  function empFromRows(row, con, i) {
    var d = row.data || {};
    var e = Object.assign({}, d, {
      id: row.id, first: row.first_name, last: row.last_name || '', role: row.job_title || '', dept: row.department || '',
      type: con ? (con.contract_type || '') : (d.type || ''), rate: con ? num(con.hourly_wage, 0) : 0,
      vacation: con ? num(con.vacation_days, 0) : 0, userId: row.user_id || null
    });
    delete e.availability;
    e.hoursWeek = num(d.hoursWeek != null ? d.hoursWeek : (con && con.hours_per_week), 0);
    e.start = d.start || (con && con.start_date) || (row.created_at || '').slice(0, 10) || L.todayIso();
    if (!e.end && con && con.end_date) e.end = con.end_date;
    e.status = d.status || (row.active ? 'aktiv' : 'ausgetreten');
    e.color = d.color || COLORS[i % COLORS.length];
    if (e.manager === undefined) e.manager = null;
    return e;
  }
  function shiftToRow(s, cid) {
    var endDate = s.end <= s.start ? L.add(s.date, 1) : s.date; // Nachtschicht
    return { id: s.id, company_id: cid, employee_id: s.empId || null, starts_at: toTs(s.date, s.start), ends_at: toTs(endDate, s.end), area: s.area || null, note: s.note || null,
      data: omit(s, ['id', 'date', 'start', 'end', 'area', 'empId', 'note']) };
  }
  function shiftFromRow(r) {
    var a = new Date(r.starts_at), b = new Date(r.ends_at);
    return Object.assign({}, r.data || {}, { id: r.id, date: localIso(a), start: hhmm(a), end: hhmm(b), area: r.area || '', empId: r.employee_id || null, note: r.note || '' });
  }
  function genToRow(c, rec, cid) {
    var emp = c.emp ? rec[c.emp] : null;
    return { id: rec.id, company_id: cid, employee_id: emp && UUID.test(emp) ? emp : null, data: omit(rec, ['id']) };
  }

  /* ---------- Laden ---------- */
  R.load = async function (cid, role, company) {
    R.cid = cid; R.role = role;
    var reqs = {
      employees: sb.from('employees').select('*').eq('company_id', cid).order('created_at'),
      contracts: sb.from('employee_contracts').select('*').eq('company_id', cid),
      shifts: sb.from('shifts').select('*').eq('company_id', cid).gte('ends_at', sinceIso(60)).order('starts_at'),
      clocks: sb.from('clocks').select('*').eq('company_id', cid),
      finance: sb.from('finance_state').select('*').eq('company_id', cid).maybeSingle()
    };
    COLS.forEach(function (c) {
      var p = sb.from(c.table).select('*').eq('company_id', cid);
      if (c.since) p = p.gte('updated_at', sinceIso(c.since));
      reqs[c.key] = p.limit(2000);
    });
    var keys = Object.keys(reqs), res = await Promise.all(keys.map(function (k) { return reqs[k]; }));
    var D = {};
    res.forEach(function (r, i) { if (r.error) throw r.error; D[keys[i]] = r.data; });

    var cons = {}; (D.contracts || []).forEach(function (c) { cons[c.employee_id] = c; });
    var S = {
      version: 2, real: true, anchor: L.anchorWeek(),
      company: { name: company.name, branche: company.industry || '' },
      modules: Object.assign({ finanzen: true, kunden: true, personal: true, schichten: true, organisation: true, verwaltung: true }, company.modules || {}),
      settings: { revenue: 0, materialPct: 15, agPct: 21 },
      cashflow: { values: [0, 0, 0, 0, 0, 0, 0, 0, 0], end: L.iso(new Date(L.today().getFullYear(), L.today().getMonth(), 1)) },
      ui: (L.S && L.S.real && L.S.ui) || {},
      availability: {}
    };
    S.employees = (D.employees || []).map(function (r, i) {
      S.availability[r.id] = (r.data && r.data.availability) || [];
      return empFromRows(r, cons[r.id], i);
    });
    S.shifts = (D.shifts || []).map(shiftFromRow);
    COLS.forEach(function (c) { S[c.key] = (D[c.key] || []).map(function (r) { return Object.assign({}, r.data, { id: r.id }); }); });
    if (D.finance && D.finance.data) {
      if (D.finance.data.settings) Object.assign(S.settings, D.finance.data.settings);
      if (D.finance.data.cashflow) S.cashflow = D.finance.data.cashflow;
    }
    R.finExists = !!D.finance;
    // Stempeluhr: eigene laufende Uhr (Leitung sieht ggf. mehrere – die erste zählt)
    var myClock = (D.clocks || []).filter(function (c) { return c.employee_id && c.employee_id === L.myEmpId; })[0] || (D.clocks || [])[0];
    S.clock = myClock ? Object.assign({}, myClock.data, { _id: myClock.id, empId: myClock.employee_id }) : null;
    R.clockRows = (D.clocks || []).map(function (c) { return c.id; });

    L.S = S;
    R.snapshot();
    R.loadedAt = Date.now();
  };

  /* ---------- Schnappschuss & Vergleich ---------- */
  function currentRows() {
    var cid = R.cid, S = L.S, out = { employees: {}, contracts: {}, shifts: {} };
    (S.employees || []).forEach(function (e) {
      if (e.hidden) return;
      var x = empToRows(e, cid); out.employees[e.id] = x.row; out.contracts[e.id] = x.con;
    });
    (S.shifts || []).forEach(function (s) { out.shifts[s.id] = shiftToRow(s, cid); });
    COLS.forEach(function (c) {
      out[c.key] = {};
      (S[c.key] || []).forEach(function (rec) { if (!rec.id || !UUID.test(rec.id)) rec.id = L.uid(); out[c.key][rec.id] = genToRow(c, rec, cid); });
    });
    out.company = { name: (S.company && S.company.name) || '', industry: (S.company && S.company.branche) || null, modules: S.modules };
    out.finance = { settings: S.settings, cashflow: S.cashflow };
    out.clock = S.clock ? { id: S.clock._id || null, employee_id: S.clock.empId, data: omit(S.clock, ['_id', 'empId']) } : null;
    return out;
  }
  function serialize(rows) {
    var s = {};
    Object.keys(rows).forEach(function (k) {
      if (k === 'company' || k === 'finance' || k === 'clock') { s[k] = JSON.stringify(rows[k]); return; }
      s[k] = {}; Object.keys(rows[k]).forEach(function (id) { s[k][id] = stable(rows[k][id]); });
    });
    return s;
  }
  R.snapshot = function () { R.snap = serialize(currentRows()); };

  /* ---------- Speichern ---------- */
  var ORDER = ['employees', 'contracts', 'customers', 'projects', 'shifts'].concat(COLS.map(function (c) { return c.key; }).filter(function (k) { return ['customers', 'projects'].indexOf(k) === -1; }));
  function tableOf(key) {
    if (key === 'employees' || key === 'shifts') return key;
    if (key === 'contracts') return 'employee_contracts';
    return COLS.filter(function (c) { return c.key === key; })[0].table;
  }
  function permError(e) { return e && (e.code === '42501' || /row-level security|permission denied|Keine Berechtigung/i.test(e.message || '')); }
  function noRows(table) { var e = new Error('Keine Berechtigung für diese Änderung (' + table + ')'); e.code = '42501'; return e; }

  async function push() {
    var rows = currentRows(), now = serialize(rows), old = R.snap, ops = [];
    var writeContracts = L.roleIs(['owner', 'admin', 'hr']);

    ORDER.forEach(function (key) {
      if (key === 'contracts' && !writeContracts) return;
      var table = tableOf(key), cur = rows[key], was = old[key] || {}, ins = [];
      Object.keys(cur).forEach(function (id) {
        if (!(id in was)) ins.push(cur[id]);
        else if (was[id] !== now[key][id]) {
          if (key === 'contracts') ins.push(cur[id]); // Vertrag evtl. noch nicht vorhanden → immer upsert
          else ops.push({ kind: 'update', table: table, key: key, id: id, row: cur[id] });
        }
      });
      if (ins.length) ops.push({ kind: key === 'contracts' ? 'upsert' : 'insert', table: table, rows: ins });
    });
    // Löschen in umgekehrter Reihenfolge
    ORDER.slice().reverse().forEach(function (key) {
      if (key === 'contracts') return; // Verträge hängen am Mitarbeiter (cascade)
      var cur = rows[key], was = old[key] || {};
      var gone = Object.keys(was).filter(function (id) { return !(id in cur); });
      if (gone.length) ops.push({ kind: 'delete', table: tableOf(key), ids: gone });
    });

    for (var i = 0; i < ops.length; i++) {
      var o = ops[i], r;
      if (o.kind === 'insert') r = await sb.from(o.table).insert(o.rows);
      else if (o.kind === 'upsert') r = await sb.from(o.table).upsert(o.rows, { onConflict: 'employee_id' });
      else if (o.kind === 'update') {
        r = await sb.from(o.table).update(omit(o.row, ['id', 'company_id'])).eq('id', o.id).select('id');
        if (!r.error && (!r.data || !r.data.length)) throw noRows(o.table);
      } else r = await sb.from(o.table).delete().in('id', o.ids);
      if (r.error) throw r.error;
    }

    // Firma (Name, Branche, Module)
    if (now.company !== old.company && L.canAdmin()) {
      await q(sb.from('companies').update(rows.company).eq('id', R.cid));
      if (L.onCompanyChanged) L.onCompanyChanged(rows.company);
    }
    // Finanz-Annahmen
    if (now.finance !== old.finance && L.roleIs(['owner', 'admin', 'accounting'])) {
      await q(sb.from('finance_state').upsert({ company_id: R.cid, data: rows.finance }, { onConflict: 'company_id' }));
    }
    // Stempeluhr
    if (now.clock !== old.clock) {
      var ck = rows.clock;
      if (ck && ck.employee_id) {
        if (ck.id) await q(sb.from('clocks').update({ data: ck.data, employee_id: ck.employee_id }).eq('id', ck.id));
        else { var id = L.uid(); await q(sb.from('clocks').insert({ id: id, company_id: R.cid, employee_id: ck.employee_id, data: ck.data })); L.S.clock._id = id; }
      }
      if (!ck && R.clockRows.length) await q(sb.from('clocks').delete().in('id', R.clockRows));
      R.clockRows = L.S.clock && L.S.clock._id ? [L.S.clock._id] : [];
      rows = currentRows(); now = serialize(rows);
    }
    R.snap = now;
  }

  var timer = null;
  L.save = function () {
    if (!R.cid) return;
    clearTimeout(timer);
    timer = setTimeout(R.flush, 120);
  };
  R.flush = async function () {
    timer = null;
    if (R.busy) { R.dirty = true; return; }
    R.busy = true; R.dirty = false;
    setState('saving');
    try {
      await push();
      setState('saved');
    } catch (e) {
      console.error(e);
      setState('error');
      L.toast(permError(e) ? 'Das darfst du mit deiner Rolle nicht ändern – die Änderung wurde zurückgenommen.' : 'Nicht gespeichert: ' + lincomError(e), 'warn');
      try { await R.reload(); setState('saved'); } catch (e2) {}
    }
    R.busy = false;
    if (R.dirty) R.flush();
  };
  R.pending = function () { return R.busy || R.dirty || !!timer; };

  R.reload = async function () {
    await R.load(R.cid, R.role, R.companyInfo());
    L.render();
  };
  R.companyInfo = function () { return { name: L.S.company.name, industry: L.S.company.branche, modules: L.S.modules }; };

  /* ---------- Speicherstatus in der Kopfzeile ---------- */
  function setState(s) {
    R.state = s;
    var el = document.getElementById('save-state');
    if (!el) return;
    el.dataset.state = s;
    el.innerHTML = s === 'saving' ? L.icon('loader') + 'Speichert …' : s === 'error' ? L.icon('cloud-off') + 'Nicht gespeichert' : L.icon('cloud') + 'Gespeichert';
    L.refreshIcons();
  }
  R.stateHtml = function () {
    var s = R.state || 'saved';
    return '<span class="save-state" id="save-state" data-state="' + s + '">' + L.icon(s === 'error' ? 'cloud-off' : 'cloud') + (s === 'error' ? 'Nicht gespeichert' : 'Gespeichert') + '</span>';
  };

  // Vor dem Schließen warnen, falls noch gespeichert wird
  window.addEventListener('beforeunload', function (e) { if (R.pending()) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- Beispieldaten ---------- */
  R.hasSample = function () {
    var S = L.S;
    return (S.employees || []).some(function (e) { return e._sample; }) || COLS.some(function (c) { return (S[c.key] || []).some(function (r) { return r._sample; }); });
  };
  R.loadSample = function () {
    var s = L.seedData(), map = {};
    // alle Demo-IDs durch echte ersetzen
    ['employees', 'shifts'].concat(COLS.map(function (c) { return c.key; })).forEach(function (k) {
      (s[k] || []).forEach(function (r) { if (r.id) map[r.id] = L.uid(); });
    });
    function remap(v) {
      if (Array.isArray(v)) return v.map(remap);
      if (v && typeof v === 'object') { var o = {}; Object.keys(v).forEach(function (k) { o[map[k] || k] = remap(v[k]); }); return o; }
      return typeof v === 'string' && map[v] ? map[v] : v;
    }
    s = remap(s);
    var S = L.S;
    ['employees', 'shifts'].concat(COLS.map(function (c) { return c.key; })).forEach(function (k) {
      (s[k] || []).forEach(function (r) { r._sample = true; if (!r.id) r.id = L.uid(); S[k].push(r); });
    });
    Object.keys(s.availability || {}).forEach(function (id) { S.availability[id] = s.availability[id]; });
    if (!S.settings.revenue) S.settings = Object.assign({}, s.settings);
    if (!S.cashflow.values.some(function (v) { return v; })) S.cashflow = s.cashflow;
    L.save();
  };
  R.removeSample = function () {
    var S = L.S, gone = {};
    S.employees = S.employees.filter(function (e) { if (e._sample) { gone[e.id] = 1; return false; } return true; });
    S.shifts = S.shifts.filter(function (x) { return !x._sample && !gone[x.empId]; });
    COLS.forEach(function (c) { S[c.key] = (S[c.key] || []).filter(function (r) { return !r._sample; }); });
    Object.keys(gone).forEach(function (id) { delete S.availability[id]; });
    L.save();
  };
})(window.L);
