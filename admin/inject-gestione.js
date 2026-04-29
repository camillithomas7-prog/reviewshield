/* ReviewShield Admin — Gestione overlay injector
 * Adds a "Gestione" tab next to "Lead Salvati" in the React admin nav,
 * plus an "Importa primi N → Gestione" bar on the Lead Salvati view.
 * Does NOT modify any React logic — only DOM injection via MutationObserver.
 */
(function(){
  'use strict';

  const ASSIGNED_KEY = 'rs_assigned_leads';
  const GESTIONE_URL = '/admin/gestione/';

  function getAssigned(){
    try { return new Set(JSON.parse(localStorage.getItem(ASSIGNED_KEY)||'[]')); }
    catch(e){ return new Set(); }
  }
  function saveAssigned(set){
    localStorage.setItem(ASSIGNED_KEY, JSON.stringify([...set]));
  }
  window.__rsAssigned = { get: getAssigned, save: saveAssigned };

  // ===== Inject Gestione tab into the nav =====
  function findTabButton(text){
    const all = document.querySelectorAll('button, a');
    for (const el of all){
      const t = (el.textContent||'').trim();
      if (t === text) return el;
    }
    return null;
  }

  function injectTab(){
    if (document.querySelector('[data-rs-gestione-tab]')) {
      // Update count
      const cnt = getAssigned().size;
      const tab = document.querySelector('[data-rs-gestione-tab] .__rs-cnt');
      if (tab) tab.textContent = cnt > 0 ? ' ('+cnt+')' : '';
      return true;
    }
    const leadSalvati = findTabButton('Lead Salvati');
    if (!leadSalvati) return false;
    const parent = leadSalvati.parentElement;
    if (!parent) return false;
    // Find a non-active sibling to copy style from
    const styleSrc = ['Mappa','Template WA','SOP','Script Vendita']
      .map(n => findTabButton(n)).find(Boolean) || leadSalvati;

    const tag = (styleSrc.tagName||'').toLowerCase();
    const tab = document.createElement(tag === 'button' ? 'button' : 'a');
    tab.dataset.rsGestioneTab = '1';
    tab.className = styleSrc.className;
    tab.style.cursor = 'pointer';
    if (tag === 'a') tab.href = GESTIONE_URL;
    else tab.addEventListener('click', () => { window.location.href = GESTIONE_URL; });
    const cnt = getAssigned().size;
    tab.innerHTML = '⚡ Gestione<span class="__rs-cnt">'+(cnt>0?' ('+cnt+')':'')+'</span>';

    if (leadSalvati.nextSibling) parent.insertBefore(tab, leadSalvati.nextSibling);
    else parent.appendChild(tab);
    return true;
  }

  // ===== Inject "Importa N a Gestione" bar on Lead Salvati view =====
  function findLeadSalvatiArea(){
    // Look for the search input "Cerca per nome o indirizzo…"
    const inputs = document.querySelectorAll('input[placeholder]');
    for (const i of inputs){
      const p = (i.placeholder||'').toLowerCase();
      if (p.includes('cerca per nome')) return i.closest('div').parentElement || i.parentElement;
    }
    return null;
  }

  function injectImportBar(){
    if (document.querySelector('[data-rs-import-bar]')) return true;
    // Only inject when Lead Salvati view is visible (active green tab)
    const leadSalvati = findTabButton('Lead Salvati');
    if (!leadSalvati) return false;
    // Heuristic: Lead Salvati tab is "active" when we're on this view
    // We check if the search input is present
    const area = findLeadSalvatiArea();
    if (!area) return false;

    const bar = document.createElement('div');
    bar.dataset.rsImportBar = '1';
    bar.style.cssText = 'background:linear-gradient(135deg,rgba(124,58,237,.1),rgba(6,182,212,.08));border:1px solid rgba(124,58,237,.25);border-radius:12px;padding:10px 14px;margin:14px 0;display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-family:Inter,system-ui,sans-serif';
    const cnt = getAssigned().size;
    bar.innerHTML = `
      <span style="font-size:18px">⚡</span>
      <span style="font-size:13px;color:rgba(255,255,255,.85);font-weight:600">Trasferisci lead al pannello Gestione</span>
      <span style="flex:1"></span>
      <span style="font-size:11px;color:rgba(255,255,255,.4)">In gestione: <strong style="color:#a78bfa" data-rs-cnt-display>${cnt}</strong></span>
      <button data-rs-imp="50" style="background:rgba(124,58,237,.15);color:#a78bfa;border:1px solid rgba(124,58,237,.3);padding:6px 12px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">+ Importa primi 50</button>
      <button data-rs-imp="100" style="background:rgba(124,58,237,.15);color:#a78bfa;border:1px solid rgba(124,58,237,.3);padding:6px 12px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">+ Importa primi 100</button>
      <button data-rs-open style="background:#7c3aed;color:#fff;border:0;padding:6px 14px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">⚡ Apri Gestione →</button>
      ${cnt>0 ? '<button data-rs-clear style="background:rgba(239,68,68,.12);color:#ef4444;border:1px solid rgba(239,68,68,.25);padding:6px 12px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">🗑 Svuota gestione</button>' : ''}
    `;

    // Insert before the search bar (or area)
    area.parentElement.insertBefore(bar, area);

    bar.querySelectorAll('[data-rs-imp]').forEach(b => {
      b.addEventListener('click', async () => {
        const n = parseInt(b.dataset.rsImp);
        await importTopN(n, b);
      });
    });
    bar.querySelector('[data-rs-open]').addEventListener('click', () => {
      window.location.href = GESTIONE_URL;
    });
    const clearBtn = bar.querySelector('[data-rs-clear]');
    if (clearBtn){
      clearBtn.addEventListener('click', () => {
        if (!confirm('Rimuovere tutti i lead dal pannello Gestione? (le info dei lead originali NON vengono toccate)')) return;
        saveAssigned(new Set());
        injectTab();
        // Re-render the bar
        const old = document.querySelector('[data-rs-import-bar]');
        if (old) old.remove();
        injectImportBar();
      });
    }
    return true;
  }

  // ===== Import top N from Supabase =====
  const SUPABASE_URL = 'https://amxoxllnhcgprmfrmnho.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFteG94bGxuaGNncHJtZnJtbmhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTMxNjQsImV4cCI6MjA5MDk4OTE2NH0.60JGHtG7bCFevYyJr-q2Og9poNbT1QUnZZCYBT6E2c8';

  function getSupabaseAuthToken(){
    // Supabase JS stores session under "sb-<ref>-auth-token" or similar
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

  async function importTopN(n, btn){
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Importazione…';
    try {
      const token = getSupabaseAuthToken() || SUPABASE_ANON;
      const r = await fetch(SUPABASE_URL+'/rest/v1/leads?select=id&order=created_at.desc&limit='+n, {
        headers: {
          apikey: SUPABASE_ANON,
          Authorization: 'Bearer ' + token,
          'Accept': 'application/json'
        }
      });
      if (!r.ok){
        const txt = await r.text();
        alert('Errore importazione: HTTP '+r.status+'\n'+txt.slice(0,300));
        btn.disabled = false; btn.innerHTML = original; return;
      }
      const rows = await r.json();
      if (!Array.isArray(rows) || rows.length === 0){
        alert('Nessun lead trovato. Sei loggato? (Prova a ricaricare la pagina dopo il login)');
        btn.disabled = false; btn.innerHTML = original; return;
      }
      const set = getAssigned();
      let added = 0;
      rows.forEach(r => { if (!set.has(r.id)){ set.add(r.id); added++; } });
      saveAssigned(set);
      btn.innerHTML = '✓ +'+added+' aggiunti';
      injectTab();
      const cntEl = document.querySelector('[data-rs-cnt-display]');
      if (cntEl) cntEl.textContent = set.size;
      setTimeout(() => {
        if (confirm('Aggiunti '+added+' lead al pannello Gestione (totale: '+set.size+').\n\nVuoi aprirlo adesso?')){
          window.location.href = GESTIONE_URL;
        } else {
          btn.disabled = false;
          btn.innerHTML = original;
          // Re-render bar
          const old = document.querySelector('[data-rs-import-bar]');
          if (old) old.remove();
          injectImportBar();
        }
      }, 200);
    } catch(e){
      alert('Errore: '+e.message);
      btn.disabled = false;
      btn.innerHTML = original;
    }
  }

  // ===== Observer =====
  function pump(){
    injectTab();
    injectImportBar();
  }

  const obs = new MutationObserver(() => {
    // Throttle
    if (pump._t) return;
    pump._t = setTimeout(() => { pump._t = null; pump(); }, 150);
  });

  function start(){
    obs.observe(document.body, { childList: true, subtree: true });
    pump();
    // Also try on interval for first 5s in case React renders later
    let tries = 0;
    const iv = setInterval(() => { pump(); if (++tries > 25) clearInterval(iv); }, 200);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
