// DLR Planner: day PDF (Plan a day) and trip PDF (Trip wizard).
// Part of the app script. The js files load in the order of their script tags in index.html (listed in CLAUDE.md).
// ---------- PDFs: one-page day itinerary (Plan a day) and the whole trip (Trip wizard) ----------
const pdfText = (t) => String(t).replace(/‑/g, '-').replace(/→/g, '->').replace(/⚠/g, '!').replace(/…/g, '...').replace(/[^\x00-\xff–—‘’“”•]/g, '');
const PDF_DL = [214, 51, 108], PDF_DCA = [15, 157, 143], PDF_SUN = [245, 158, 11], PDF_ROYAL = [91, 63, 208];
const pdfColor = (kind) => kind === 'dl' ? PDF_DL : kind === 'dca' ? PDF_DCA : PDF_ROYAL;
function pdfBanner(doc, kind) { // colored strip across the top of a page
  const W = doc.internal.pageSize.getWidth(), h = 14;
  if (kind === 'hop') { doc.setFillColor(...PDF_DL); doc.rect(0, 0, W / 2, h, 'F'); doc.setFillColor(...PDF_DCA); doc.rect(W / 2, 0, W / 2, h, 'F'); }
  else { doc.setFillColor(...pdfColor(kind)); doc.rect(0, 0, W, h, 'F'); }
  doc.setFillColor(...PDF_SUN); doc.rect(0, h, W, 3, 'F');
}
// wrapped text at x; returns the new y
function pdfPara(doc, t, x, y, width, size, o = {}) {
  doc.setFont('helvetica', o.bold ? 'bold' : o.italic ? 'italic' : 'normal'); doc.setFontSize(size);
  if (o.color) doc.setTextColor(...o.color); else doc.setTextColor(o.muted ? 100 : 20);
  doc.splitTextToSize(pdfText(t), width).forEach(l => { doc.text(l, x, y); y += size * 1.3; });
  return y;
}
const isBreakLine = (n) => /Lunch|Dinner|Break|Rest break|Free time|Park hop|Leave|Arrive|Head back|^Tonight/.test(n);
// One day as a tick-off itinerary. The schedule tries one column at full size, then two columns with the
// text stepping down to 7 pt; only if it still won't fit does it carry on to another page.
// head: { title, kind, lines: [text], ll: [names], notes: [text] }
function pdfDayPage(doc, pi, head) {
  const W = doc.internal.pageSize.getWidth(), Hh = doc.internal.pageSize.getHeight(), M = 40, bottom = Hh - 34;
  pdfBanner(doc, head.kind);
  let y = M + 4;
  y = pdfPara(doc, head.title, M, y, W - 2 * M, 15, { bold: true, color: pdfColor(head.kind) }) + 1;
  head.lines.forEach(t => { y = pdfPara(doc, t, M, y, W - 2 * M, 9, { muted: true }); });
  if (head.ll && head.ll.length) {
    y += 3; const t0 = y;
    y = pdfPara(doc, 'Lightning Lane, book in this order: ' + head.ll.map((n, k) => `${k + 1}. ${n}`).join('   '), M + 6, y + 2, W - 2 * M - 12, 9, { bold: true });
    doc.setDrawColor(...pdfColor(head.kind)); doc.setLineWidth(1); doc.roundedRect(M, t0 - 8, W - 2 * M, y - t0 + 4, 4, 4); doc.setLineWidth(0.2); y += 4;
  }
  (head.notes || []).forEach(t => { y = pdfPara(doc, t, M, y, W - 2 * M, 8, { muted: true }); });
  y += 6;
  const top = y, gap = 18;
  // measure every row at a size and column width
  const rowsAt = (fs, cw) => pi.items.map(it => {
    const nw = cw - fs * 6.6;
    doc.setFont('helvetica', isBreakLine(it.n) ? 'italic' : 'normal'); doc.setFontSize(fs);
    const nl = doc.splitTextToSize(pdfText(it.n), nw);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(fs - 1.5);
    const xl = it.x ? doc.splitTextToSize(pdfText(it.x), nw) : [];
    return { it, nl, xl, h: nl.length * fs * 1.25 + xl.length * (fs - 1.5) * 1.25 + fs * 0.7 };
  });
  const fits = (rows, cols) => { let col = 0, cy = top; for (const r of rows) { if (cy + r.h > bottom) { if (++col >= cols) return false; cy = top; } cy += r.h; } return true; };
  const tries = [[1, 10.5]].concat([10, 9.5, 9, 8.5, 8, 7.5, 7].map(f => [2, f]));
  let pick = null;
  for (const [cols, fs] of tries) { const cw = cols === 1 ? W - 2 * M : (W - 2 * M - gap) / 2; const rows = rowsAt(fs, cw); if (fits(rows, cols)) { pick = { cols, fs, cw, rows }; break; } }
  if (!pick) { const cw = (W - 2 * M - gap) / 2; pick = { cols: 2, fs: 7, cw, rows: rowsAt(7, cw) }; }
  const { cols, fs, cw, rows } = pick;
  let col = 0, cy = top, pageTop = top;
  rows.forEach(r => {
    if (cy + r.h > bottom) {
      if (++col >= cols) { doc.addPage(); pdfBanner(doc, head.kind); col = 0; pageTop = M + 8; }
      cy = pageTop;
    }
    const x0 = M + col * (cw + gap), meal = isBreakLine(r.it.n);
    doc.setDrawColor(40); doc.rect(x0, cy - fs * 0.75, fs * 0.75, fs * 0.75);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(fs); doc.setTextColor(20); doc.text(pdfText(fmtClock(r.it.t % 24)), x0 + fs * 1.2, cy);
    const nx = x0 + fs * 6.6;
    doc.setFont('helvetica', meal ? 'italic' : 'normal'); r.nl.forEach((l, k) => doc.text(l, nx, cy + k * fs * 1.25));
    doc.setFont('helvetica', 'normal'); doc.setFontSize(fs - 1.5); doc.setTextColor(95); r.xl.forEach((l, k) => doc.text(l, nx, cy + r.nl.length * fs * 1.25 + k * (fs - 1.5) * 1.25));
    cy += r.h; doc.setDrawColor(205); doc.line(x0, cy - fs * 0.95, x0 + cw, cy - fs * 0.95);
  });
}
function pdfFooters(doc) {
  const W = doc.internal.pageSize.getWidth(), Hh = doc.internal.pageSize.getHeight(), pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) { doc.setPage(p); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(140);
    doc.text(pdfText(`Estimates from historical averages and forecasts. Check the Disneyland app on the day for live waits, hours and showtimes. Locations © OpenStreetMap contributors.${pages > 1 ?
          ` Page ${p} of ${pages}` : ''}`), 40, Hh - 16, { maxWidth: W - 80 }); }
}
async function pdfSave(doc, name, title) {
  const blob = doc.output('blob');
  const file = new File([blob], name, { type: 'application/pdf' });
  if (navigator.canShare && navigator.canShare({ files: [file] }) && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try { await navigator.share({ files: [file], title }); return; } catch (e) { /* fall back to download */ }
  }
  doc.save(name);
}
// the header lines for one planned day (hours, sunset, weather)
function dayHeadLines(ctx, P) {
  const wx = `${ctx.fc ? `forecast (${ctx.fc.src}): ${ctx.fc.conditions}, ` : 'typical '}high ${f0(Number(ctx.wxd.avg_high_f))}°F, ${f0(Number(ctx.wxd.rain_chance_pct))}% chance of rain`;
  const hrs = P.hop ? ['Disneyland', 'California Adventure'].map(p => `${p} ${fmtClock(P.H.ctxs[p].open)}-${fmtClock(P.H.ctxs[p].close % 24)}`).join(' · ') :
    `${ctx.hoursSrc === 'live' ? 'Live' : ctx.published ? 'Published' : 'Typical'} hours ${fmtClock(ctx.open)}-${fmtClock(ctx.close % 24)}`;
  return [`${hrs} · sunset ${fmtClock(ctx.sunset)} · ${wx}`];
}
const kindOf = (P, ctx) => P.hop ? 'hop' : ctx.park === 'Disneyland' ? 'dl' : 'dca';

// Plan a day: the plan on screen, on one page
// the more-time note for the plan a PDF shows (see flexText)
const flexOf = (P, kind) => flexText(P.hop ? (kind === 'split' && P.Hb) || P.H : (kind === 'split' && P.split) || P.stay);
async function exportDayPDF() {
  const pi = planItems(takeState.which); if (!pi || !dpLast) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  pdfDayPage(doc, pi, { title: pi.title, kind: kindOf(dpLast.P, pi.ctx), lines: dayHeadLines(pi.ctx, dpLast.P), ll: (pi.llp && pi.llp.multi || []).map(r => r.name),
    notes: [flexOf(dpLast.P, pi.kind)].filter(Boolean) });
  pdfFooters(doc);
  await pdfSave(doc, `park-day-${pi.ctx.iso}.pdf`, 'DLR Planner day plan');
}

// Trip wizard: overview page, then one itinerary page per park day
async function exportTripPDF() {
  const st = statusOf(TRIP_IDS);
  if (st !== 'ok' || !lastTrip || !lastTrip.best) { alert('The trip plan is still loading. Try again in a moment.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.getWidth(), Hh = doc.internal.pageSize.getHeight(), M = 40;
  let y = M + 4;
  const line = (t, size, o = {}) => {
    doc.setFont('helvetica', o.bold ? 'bold' : 'normal'); doc.setFontSize(size);
    const n = doc.splitTextToSize(pdfText(t), W - 2 * M - (o.x || 0)).length;
    if (y + n * size * 1.3 > Hh - 34) { doc.addPage(); pdfBanner(doc, 'trip'); y = M + 4; }
    y = pdfPara(doc, t, M + (o.x || 0), y, W - 2 * M - (o.x || 0), size, o);
  };
  const D = Object.fromEntries(TRIP_IDS.map(id => [id, dash.data(id).data]));
  const fmtLong = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const shortD = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  const { days, best } = lastTrip;
  const ticketLbl = { one: 'one park per day', hopper: 'Park Hopper', dl: 'Disneyland only', dca: 'California Adventure only' }[tpState.ticket];
  const chosen = new Map(best.combo.map((i, j) => [i, best.pick[j]]));
  const parkDays = [...chosen.keys()].sort((a, b) => a - b);
  const dayNo = new Map(parkDays.map((i, k) => [days[i], k + 1]));
  const hotel = HOTEL_NAME[dpState.hotel] === 'your hotel' ? `about ${travelMin()} min from the gates` : HOTEL_NAME[dpState.hotel];
  // ---- page 1: overview
  pdfBanner(doc, 'trip');
  line('Your Disneyland Resort trip', 20, { bold: true, color: PDF_ROYAL });
  line(`${days.length + 1} nights · ${parkDays.length} park day${parkDays.length === 1 ? '' : 's'}${days.length - parkDays.length ?
      ` · ${days.length - parkDays.length} break day${days.length - parkDays.length === 1 ? '' : 's'}` :
      ''} · ${parkDays.length}-day ticket (${ticketLbl}) · ${hotel}`, 10, { muted: true });
  y += 8; line('Your days', 13, { bold: true });
  line(`${fmtLong(lastTrip.checkin)}: Check-in day. Hotel check-in from ${fmtClock(hhmm(tpState.inT))}.`, 10);
  days.forEach((iso, i) => { const o = chosen.get(i), wd = wz.days && wz.days[iso];
      line(o ? `${fmtLong(iso)}: Day ${dayNo.get(iso)}, ${o.label}${wd ? ` (${wzCount(wd)} rides)` : ''}` : `${fmtLong(iso)}: Break day, no park`, 10, {
          bold: !!o }); });
  line(`${fmtLong(lastTrip.checkout)}: Checkout day. Check out by ${fmtClock(hhmm(tpState.outT))}.`, 10);
  // rides grouped by park, then by day, with how many times
  if (wz.days) {
    y += 8; line('Your rides', 13, { bold: true });
    WZ_PARKS.forEach(p => {
      const rowsP = parkDays.map(i => days[i]).map(iso => { const d = wz.days[iso]; if (!d || !d.rides[p].size) return null;
          return [iso, [...d.rides[p]].map(nm => nm + (dLaps(d, p, nm) > 1 ? ' ×' + dLaps(d, p, nm) : ''))]; }).filter(Boolean);
      if (!rowsP.length) return;
      y += 2; line(p, 11, { bold: true, color: p === 'Disneyland' ? PDF_DL : PDF_DCA });
      rowsP.forEach(([iso, names]) => line(`Day ${dayNo.get(iso)} · ${shortD(iso)}: ${names.join(', ')}`, 9.5, { x: 8 }));
    });
  }
  { const pd = parkDays.map((i, k) => ({ iso: days[i], opt: chosen.get(i) })), bk = tripBookings(pd);
    if (bk.length) { y += 8; line('Restaurant bookings', 13, { bold: true }); bk.forEach(b => line(bookingLine(b), 9.5, { x: 8 })); } }
  // ---- one page per park day
  const savedLast = dpLast;
  try {
    for (const i of parkDays) {
      const iso = days[i], o = chosen.get(i);
      const dayCfg = wz.days && wz.days[iso];
      const cfg = dayCfg ? wzSettings(dayCfg) : dpState;
      {
        const kindPref = dayCfg ? (dayCfg.brk > 0 ? 'split' : 'stay') : takeState.which;
        let ctx, P;
        if (o.parks.length > 1) { P = planHopperBoth(iso, D, cfg); ctx = P.ctx; }
        else {
          ctx = dayContext(iso, o.parks[0], D);
          const sel = cfg.rides[o.parks[0]] || new Set(ctx.rides.filter(r => r.head).map(r => r.name));
          P = planDay(ctx, expandPool(ctx.rides.filter(r => sel.has(r.name)), cfg.reps[o.parks[0]]), cfg);
        }
        dpLast = { ctx, P, T: travelMin(P.hop ? P.H.first : ctx.park, null, cfg) };
        const pi = planItems(kindPref);
        const notes = [];
        const tk = D.ticket_tiers.find(r => r.date === iso); if (tk) notes.push(`1-day ticket for this date: $${tk.price_usd} (tier ${tk.tier})`);
        (P.hop ? [P.H.ctxs['Disneyland'], P.H.ctxs['California Adventure']] : [ctx]).forEach(c => {
            c.evs.forEach(e => notes.push(`${e.name}: ${e.notes}`)); closedNotes(c, P.hop).forEach(n => notes.push(n));
            dataNotes(c).forEach(n => notes.push(n)); });
        { const sn = shortNote(pickedOf(P.hop ? [P.H.ctxs['Disneyland'], P.H.ctxs['California Adventure']] : [ctx], cfg)); if (sn) notes.push(sn); }
        if (dayCfg) notes.push(`Pace: ${{ relaxed: 'relaxed', normal: 'normal', fast: 'go-go'
            }[dpState.pace]} · ${walkPref(dayCfg.walk)} · ${brkOf(dayCfg) ? dayCfg.brk + '-hour midday break' : 'no midday break'}${winLabel(dayCfg.win) ?
            ' · ' + winLabel(dayCfg.win) : ''} · ${wzCount(dayCfg)} rides`);
        { const why = dayCfg && dayCfg.brk > 0 ? winWhy(P.hop ? P.H.win : P.win) : null; if (why) notes.push(why); }
        { const ft = flexOf(P, pi.kind); if (ft) notes.push(ft); }
        const llNames = (pi.llp && pi.llp.multi || []).map(r => r.name);
        doc.addPage();
        pdfDayPage(doc, pi, { title: `Day ${dayNo.get(iso)} · ${fmtLong(iso)} · ${o.label}`, kind: kindOf(P, ctx), lines: dayHeadLines(ctx, P), ll: llNames, notes: [...new Set(notes)] });
      }
    }
  } finally { dpLast = savedLast; }
  pdfFooters(doc);
  await pdfSave(doc, `park-trip-${lastTrip.checkin}.pdf`, 'DLR Planner trip plan');
}
