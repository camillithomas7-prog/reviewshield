/* ReviewShield Admin — Gestione overlay injector
 * Adds a "Gestione" tab next to "Lead Salvati" in the React admin nav,
 * plus a "Sposta N lead → Gestione" bar on the Lead Salvati view.
 * Import is a real MOVE: lead data goes to localStorage, then row is deleted
 * from Supabase so it disappears from Lead Salvati.
 */
(function(){
  'use strict';

  const STORAGE_KEY = 'rs_assigned_leads_data';   // new: full lead data map
  const LEGACY_KEY  = 'rs_assigned_leads';        // old: just ids (cleared on first load)
  const GESTIONE_URL = '/admin/gestione/';

  const SUPABASE_URL = 'https://amxoxllnhcgprmfrmnho.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFteG94bGxuaGNncHJtZnJtbmhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTMxNjQsImV4cCI6MjA5MDk4OTE2NH0.60JGHtG7bCFevYyJr-q2Og9poNbT1QUnZZCYBT6E2c8';

  // ===== Storage =====
  function getMap(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'); }
    catch(e){ return {}; }
  }
  function saveMap(m){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
  }
  function getCount(){ return Object.keys(getMap()).length; }
  function clearLegacy(){
    if (localStorage.getItem(LEGACY_KEY)) localStorage.removeItem(LEGACY_KEY);
  }
  clearLegacy();

  // ===== Supabase auth (read token from React app's session) =====
  function getAuthToken(){
    const ref = 'amxoxllnhcgprmfrmnho';
    for (let i=0; i<localStorage.length; i++){
      const k = localStorage.key(i);
      if (k && k.startsWith('sb-') && k.includes(ref) && k.includes('auth-token')){
        try {
          const v = JSON.parse(localStorage.getItem(k));
          if (v && v.access_token) return v.access_token;
        } catch(e){}
      }
    }
    return null;
  }
  function authHeaders(){
    const tok = getAuthToken() || SUPABASE_ANON;
    return {
      apikey: SUPABASE_ANON,
      Authorization: 'Bearer ' + tok,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  // ===== Find tab nav and inject Gestione tab =====
  function findTabButton(text){
    const all = document.querySelectorAll('button, a');
    for (const el of all){
      if ((el.textContent||'').trim() === text) return el;
    }
    return null;
  }

  function injectTab(){
    const existing = document.querySelector('[data-rs-gestione-tab]');
    if (existing){
      const cnt = getCount();
      const c = existing.querySelector('.__rs-cnt');
      if (c) c.textContent = cnt > 0 ? ' ('+cnt+')' : '';
      return true;
    }
    const leadSalvati = findTabButton('Lead Salvati');
    if (!leadSalvati) return false;
    const parent = leadSalvati.parentElement;
    if (!parent) return false;
    const styleSrc = ['Mappa','Template WA','SOP','Script Vendita']
      .map(n => findTabButton(n)).find(Boolean) || leadSalvati;

    const tag = (styleSrc.tagName||'').toLowerCase();
    const tab = document.createElement(tag === 'button' ? 'button' : 'a');
    tab.dataset.rsGestioneTab = '1';
    tab.className = styleSrc.className;
    tab.style.cursor = 'pointer';
    if (tag === 'a') tab.href = GESTIONE_URL;
    else tab.addEventListener('click', () => { window.location.href = GESTIONE_URL; });
    const cnt = getCount();
    tab.innerHTML = '⚡ Gestione<span class="__rs-cnt">'+(cnt>0?' ('+cnt+')':'')+'</span>';

    if (leadSalvati.nextSibling) parent.insertBefore(tab, leadSalvati.nextSibling);
    else parent.appendChild(tab);
    return true;
  }

  // ===== Find lead-salvati area =====
  function findLeadSalvatiArea(){
    const inputs = document.querySelectorAll('input[placeholder]');
    for (const i of inputs){
      const p = (i.placeholder||'').toLowerCase();
      if (p.includes('cerca per nome')) return i.closest('div').parentElement || i.parentElement;
    }
    return null;
  }

  // ===== Move bar =====
  function renderBarHTML(){
    const cnt = getCount();
    return `
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;width:100%">
        <span style="font-size:18px">⚡</span>
        <span style="font-size:13px;color:rgba(255,255,255,.85);font-weight:600">Sposta lead in Gestione</span>
        <span style="font-size:11px;color:rgba(255,255,255,.4);margin-left:4px">(li rimuove da Lead Salvati)</span>
        <span style="flex:1"></span>
        <span style="font-size:11px;color:rgba(255,255,255,.4)">In gestione: <strong style="color:#a78bfa" data-rs-cnt-display>${cnt}</strong></span>
        <input type="number" data-rs-qty min="1" max="3500" placeholder="quanti?" style="width:90px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:#fff;padding:6px 10px;border-radius:7px;font-size:12px;font-family:inherit">
        <button data-rs-preset="50"  style="background:rgba(124,58,237,.12);color:#a78bfa;border:1px solid rgba(124,58,237,.25);padding:5px 9px;border-radius:7px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit">50</button>
        <button data-rs-preset="100" style="background:rgba(124,58,237,.12);color:#a78bfa;border:1px solid rgba(124,58,237,.25);padding:5px 9px;border-radius:7px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit">100</button>
        <button data-rs-preset="500" style="background:rgba(124,58,237,.12);color:#a78bfa;border:1px solid rgba(124,58,237,.25);padding:5px 9px;border-radius:7px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit">500</button>
        <button data-rs-preset="1000" style="background:rgba(124,58,237,.12);color:#a78bfa;border:1px solid rgba(124,58,237,.25);padding:5px 9px;border-radius:7px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit">1000</button>
        <button data-rs-preset="all" style="background:rgba(124,58,237,.12);color:#a78bfa;border:1px solid rgba(124,58,237,.25);padding:5px 9px;border-radius:7px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit">Tutti</button>
        <button data-rs-go style="background:#7c3aed;color:#fff;border:0;padding:7px 14px;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">⚡ Sposta →</button>
        <button data-rs-open style="background:rgba(6,182,212,.15);color:#06b6d4;border:1px solid rgba(6,182,212,.3);padding:7px 14px;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Apri Gestione →</button>
        ${cnt>0 ? '<button data-rs-restore style="background:rgba(34,197,94,.12);color:#22c55e;border:1px solid rgba(34,197,94,.25);padding:6px 12px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit" title="Riporta tutti i lead della Gestione in Lead Salvati">↩ Ripristina tutti</button>' : ''}
      </div>
    `;
  }

  function injectImportBar(){
    if (document.querySelector('[data-rs-import-bar]')) return true;
    const area = findLeadSalvatiArea();
    if (!area) return false;
    const bar = document.createElement('div');
    bar.dataset.rsImportBar = '1';
    bar.style.cssText = 'background:linear-gradient(135deg,rgba(124,58,237,.1),rgba(6,182,212,.08));border:1px solid rgba(124,58,237,.25);border-radius:12px;padding:12px 16px;margin:14px 0;font-family:Inter,system-ui,sans-serif';
    bar.innerHTML = renderBarHTML();
    area.parentElement.insertBefore(bar, area);
    wireBar(bar);
    return true;
  }

  function refreshBar(){
    const old = document.querySelector('[data-rs-import-bar]');
    if (!old) return;
    old.innerHTML = renderBarHTML();
    wireBar(old);
    injectTab();
  }

  function wireBar(bar){
    const qtyInput = bar.querySelector('[data-rs-qty]');
    bar.querySelectorAll('[data-rs-preset]').forEach(b => {
      b.addEventListener('click', () => {
        const v = b.dataset.rsPreset;
        qtyInput.value = (v === 'all') ? '99999' : v;
      });
    });
    bar.querySelector('[data-rs-go]').addEventListener('click', async () => {
      let n = parseInt(qtyInput.value);
      if (!n || n < 1){ alert('Inserisci un numero (es. 100, 500, 1000)'); return; }
      if (n > 99999) n = 99999;
      await moveTopN(n, bar.querySelector('[data-rs-go]'));
    });
    bar.querySelector('[data-rs-open]').addEventListener('click', () => {
      window.location.href = GESTIONE_URL;
    });
    const restore = bar.querySelector('[data-rs-restore]');
    if (restore){
      restore.addEventListener('click', restoreAll);
    }
  }

  // ===== Move N leads (real move: fetch full + save local + delete from supabase) =====
  async function moveTopN(n, btn){
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Sposto…';
    try {
      const headers = authHeaders();
      // 1) Fetch full rows
      btn.innerHTML = '⏳ Lettura…';
      const r = await fetch(SUPABASE_URL+'/rest/v1/leads?select=*&order=created_at.desc&limit='+n, { headers });
      if (!r.ok){
        const txt = await r.text();
        alert('Errore lettura lead: HTTP '+r.status+'\n'+txt.slice(0,300));
        btn.disabled = false; btn.innerHTML = original; return;
      }
      const rows = await r.json();
      if (!Array.isArray(rows) || rows.length === 0){
        alert('Nessun lead trovato. Sei loggato?');
        btn.disabled = false; btn.innerHTML = original; return;
      }
      const askMsg = 'Stai per spostare '+rows.length+' lead in Gestione.\n\nSpariranno da "Lead Salvati" e finiranno nel pannello Gestione.\nPotrai ripristinarli con "↩ Ripristina tutti" o "✕ Rimuovi" su singolo lead.\n\nProcedere?';
      if (!confirm(askMsg)){
        btn.disabled = false; btn.innerHTML = original; return;
      }

      // 2) Save full data locally
      const map = getMap();
      const ids = rows.map(x => x.id);
      rows.forEach(row => { map[row.id] = Object.assign({}, row, { _movedAt: new Date().toISOString() }); });
      saveMap(map);

      // 3) Delete from Supabase in batches
      btn.innerHTML = '⏳ Rimozione da Lead Salvati… (0/'+rows.length+')';
      const BATCH = 100;
      let done = 0;
      for (let i=0; i<ids.length; i+=BATCH){
        const slice = ids.slice(i, i+BATCH);
        const inList = '(' + slice.map(id => '"'+id+'"').join(',') + ')';
        const dr = await fetch(SUPABASE_URL+'/rest/v1/leads?id=in.'+encodeURIComponent(inList), {
          method: 'DELETE',
          headers
        });
        if (!dr.ok){
          const txt = await dr.text();
          alert('Spostamento parziale: errore eliminazione (rimasti in Lead Salvati '+(ids.length-done)+').\n'+txt.slice(0,300));
          break;
        }
        done += slice.length;
        btn.innerHTML = '⏳ Rimozione da Lead Salvati… ('+done+'/'+rows.length+')';
      }
      btn.innerHTML = '✓ '+done+' spostati';
      injectTab();
      refreshBar();
      setTimeout(() => {
        if (confirm('✓ '+done+' lead spostati in Gestione (totale: '+getCount()+').\n\nVuoi aprire la Gestione adesso?')){
          window.location.href = GESTIONE_URL;
        } else {
          // Reload to refresh React's lead list (so deleted rows disappear)
          window.location.reload();
        }
      }, 200);
    } catch(e){
      alert('Errore: '+e.message);
      btn.disabled = false;
      btn.innerHTML = original;
    }
  }

  // ===== Restore all back to Lead Salvati =====
  async function restoreAll(){
    const map = getMap();
    const items = Object.values(map);
    if (items.length === 0){ alert('Nessun lead in Gestione.'); return; }
    if (!confirm('Riportare tutti i '+items.length+' lead in Lead Salvati?\n\nLe note e gli stati attuali verranno mantenuti.')) return;

    const headers = authHeaders();
    // Strip our internal fields, keep only original lead columns
    const rows = items.map(it => {
      const c = Object.assign({}, it);
      delete c._movedAt;
      return c;
    });

    // Insert in batches with on-conflict update
    const BATCH = 100;
    let inserted = 0;
    for (let i=0; i<rows.length; i+=BATCH){
      const slice = rows.slice(i, i+BATCH);
      const ir = await fetch(SUPABASE_URL+'/rest/v1/leads?on_conflict=id', {
        method: 'POST',
        headers: Object.assign({}, headers, { 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
        body: JSON.stringify(slice)
      });
      if (!ir.ok){
        const txt = await ir.text();
        alert('Errore ripristino: '+txt.slice(0,300));
        return;
      }
      inserted += slice.length;
    }
    saveMap({});
    alert('✓ Ripristinati '+inserted+' lead in Lead Salvati.');
    window.location.reload();
  }

  // ===== Observer =====
  function pump(){ injectTab(); injectImportBar(); }
  const obs = new MutationObserver(() => {
    if (pump._t) return;
    pump._t = setTimeout(() => { pump._t = null; pump(); }, 150);
  });
  function start(){
    obs.observe(document.body, { childList: true, subtree: true });
    pump();
    let tries = 0;
    const iv = setInterval(() => { pump(); if (++tries > 25) clearInterval(iv); }, 200);
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
  } else { start(); }

  // Expose for the gestione page
  window.__rsGestione = {
    getMap, saveMap, getCount,
    SUPABASE_URL, SUPABASE_ANON, getAuthToken,
  };
})();
