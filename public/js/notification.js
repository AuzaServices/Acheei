// Notification icon helper (guard para evitar carregamento duplo)
if (!window.__acheei_notification_loaded) {
  window.__acheei_notification_loaded = true;
  (function(){
  function init() {
    try {
      var icon = document.getElementById('notifIcon');
      var badge = document.getElementById('notifBadge');
      if (!icon) return;
      var clienteToken = localStorage.getItem('acheei_cliente_token');
      var profToken = localStorage.getItem('acheei_prof_token');
      if (clienteToken || profToken) {
        icon.style.display = 'inline-flex';
        // Ensure badge hidden when zero
        if (badge) {
          badge.textContent = '';
          badge.style.display = 'none';
        }
      } else {
        icon.style.display = 'none';
        return;
      }

      // delegated click handler is registered at module scope (see below)

      // Note: message handler is registered below outside the login check so pushes are always received
    } catch (e) { console.error('init notification icon', e); }
  }

  function setBadge(n) {
    var b = document.getElementById('notifBadge'); if (!b) return;
    if (!n || n <= 0) { b.textContent = ''; b.style.display = 'none'; return; }
    b.textContent = n > 99 ? '99+' : String(n);
    b.style.display = 'inline-flex';
  }

  function incrementBadge() {
    var b = document.getElementById('notifBadge'); if (!b) return;
    var cur = parseInt(b.textContent) || 0; cur++; setBadge(cur);
  }

  // Dropdown management
  function ensureDropdown() {
    var dd = document.getElementById('notifDropdown');
    if (dd) return dd;
    dd = document.createElement('div');
    dd.id = 'notifDropdown';
    dd.className = 'notif-dropdown';
    dd.innerHTML = '<div class="notif-dropdown-list" id="notifList"></div><div class="notif-dropdown-empty" id="notifEmpty">Nenhuma notificação</div>';
    // attach to body (positioned via CSS near button)
    document.body.appendChild(dd);
    // close on outside click — register only once
    if (!window.__acheei_notif_close_registered) {
      window.__acheei_notif_close_registered = true;
      setTimeout(function(){
        document.addEventListener('click', function(ev){
          var dropdown = document.getElementById('notifDropdown');
          var btn = document.getElementById('notifButton');
          if (!dropdown || !btn) return;
          // respect temporary suppression to avoid immediate close after open
          if (window.__acheei_notif_suppress_until && Date.now() < window.__acheei_notif_suppress_until) return;
          if (dropdown.contains(ev.target) || btn.contains(ev.target)) return;
          dropdown.classList.remove('open');
        });
      }, 10);
    }
    return dd;
  }

  function toggleDropdown() {
    var dd = ensureDropdown();
    if (!dd) return;
    dd.classList.toggle('open');
    // position after opening so offsets are available
    setTimeout(positionDropdown, 10);
    try {
      window.__acheei_notif_suppress_until = Date.now() + 350;
    } catch (e) {}
  }

  function positionDropdown() {
    var btn = document.getElementById('notifButton');
    var dd = document.getElementById('notifDropdown');
    if (!btn || !dd) return;
    var rect = btn.getBoundingClientRect();
    // place below the button, aligned to right edge
    dd.style.top = (window.scrollY + rect.bottom + 8) + 'px';
    dd.style.left = (window.scrollX + rect.right - dd.offsetWidth) + 'px';
  }

  function addNotificationItem(data) {
    var dd = ensureDropdown();
    var list = document.getElementById('notifList');
    var empty = document.getElementById('notifEmpty');
    if (!list) return;
    var item = document.createElement('div');
    item.className = 'notif-item';
    var title = data.title || 'Nova mensagem';
    var body = data.body || '';
    var time = new Date().toLocaleTimeString();
    item.innerHTML = '<div class="notif-item-body"><div class="notif-item-title">'+escapeHtml(title)+'</div><div class="notif-item-text">'+escapeHtml(body)+'</div></div><div class="notif-item-time">'+escapeHtml(time)+'</div>';
    // click behavior: if data.url provided, navigate; otherwise open dropdown only
    if (data.url) {
      item.addEventListener('click', function(){ window.location.href = data.url; });
    }
    list.insertBefore(item, list.firstChild);
    if (empty) empty.style.display = 'none';
  }

  // Play a short bell-like notification sound using WebAudio (no external file needed)
  function playNotificationSound() {
    try {
      var now = Date.now();
      if (!window.__acheei_notif_last_sound) window.__acheei_notif_last_sound = 0;
      if (now - window.__acheei_notif_last_sound < 300) return; // throttle
      window.__acheei_notif_last_sound = now;
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) throw new Error('no audio context');
      if (!window.__acheei_audio_ctx) window.__acheei_audio_ctx = new AudioCtx();
      var ctx = window.__acheei_audio_ctx;
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') ctx.resume().catch(function(){});
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(1000, ctx.currentTime);
      g.gain.setValueAtTime(0, ctx.currentTime);
      o.connect(g); g.connect(ctx.destination);
      // envelope
      g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.001);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.9);
    } catch (e) {
      // fallback to short data URI beep using HTMLAudio (very small base64 wav)
      try {
        if (!window.__acheei_fallback_audio) {
          window.__acheei_fallback_audio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=');
        }
        window.__acheei_fallback_audio.currentTime = 0; window.__acheei_fallback_audio.play().catch(function(){});
      } catch (e2) {}
    }
  }

  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // Expose to global
  window.acheeiNotifications = { init: init, setBadge: setBadge, incrementBadge: incrementBadge, pushNotification: function(d){ try{ addNotificationItem(d); playNotificationSound(); }catch(e){} }, refreshUnread: function(){ try{ fetchAndUpdateUnread(); }catch(e){} } };

  // Auto init on DOMContentLoaded
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  // Also register a global Service Worker message handler so pushes are received
  // on any page (including initial pages) and shown in the dropdown immediately.
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', function(ev){
      try {
        if (!ev || !ev.data) return;
        if (ev.data.type === 'push') {
          var d = ev.data.data || {};
          var clienteToken = localStorage.getItem('acheei_cliente_token');
          var profToken = localStorage.getItem('acheei_prof_token');
          var icon = document.getElementById('notifIcon');
          if ((clienteToken || profToken) && icon && icon.style.display === 'none') {
            try { icon.style.display = 'inline-flex'; } catch(e) {}
          }
          if (window.acheeiNotifications && window.acheeiNotifications.pushNotification) {
            window.acheeiNotifications.pushNotification(d);
          }
          if (window.acheeiNotifications && window.acheeiNotifications.incrementBadge) {
            window.acheeiNotifications.incrementBadge();
          }
          if (window.showToast && d.body) showToast(d.body, 'info');
        }
      } catch (err) { console.error('sw global handler', err); }
    });
  }

  // Poll server for unread messages and show a persistent notification entry
  var __acheei_notif_poll_interval = null;
  function startUnreadPolling() {
    stopUnreadPolling();
    fetchAndUpdateUnread();
    __acheei_notif_poll_interval = setInterval(fetchAndUpdateUnread, 20000);
  }
  function stopUnreadPolling() {
    if (__acheei_notif_poll_interval) { clearInterval(__acheei_notif_poll_interval); __acheei_notif_poll_interval = null; }
  }

  async function fetchAndUpdateUnread() {
    try {
      var clienteToken = localStorage.getItem('acheei_cliente_token');
      var profToken = localStorage.getItem('acheei_prof_token');
      var unread = 0;
      var destination = null;

      if (clienteToken) {
        // fetch client solicitacoes which includes qtd_nao_lidas per request
        var res = await fetch('/api/clientes/solicitacoes', { headers: { 'Authorization': 'Bearer ' + clienteToken } });
        if (res.ok) {
          var j = await res.json();
          if (j && j.success && Array.isArray(j.data)) {
            j.data.forEach(function(s){
              unread += Number(s.qtd_nao_lidas) || 0;
              // chat liberado (pagamento confirmado) ainda não visto pelo cliente
              if (s.status_pagamento === 'pago' && !s.vista_pagamento_cliente) unread += 1;
            });
            destination = '/cliente';
          }
        }
      } else if (profToken) {
        // get profissional id then solicitacoes
        var me = await fetch('/api/profissionais/me', { headers: { 'Authorization': 'Bearer ' + profToken } });
        if (me.ok) {
          var jm = await me.json();
          if (jm && jm.success && jm.data && jm.data.id) {
            var pid = jm.data.id;
            var res2 = await fetch('/api/solicitacoes/profissional/' + pid);
            if (res2.ok) {
              var j2 = await res2.json();
              if (j2 && j2.success && Array.isArray(j2.data)) {
                j2.data.forEach(function(s){
                  unread += Number(s.qtd_nao_lidas) || 0;
                  // nova solicitação ainda não vista pelo profissional
                  if (!s.vista_profissional) unread += 1;
                });
                destination = '/profissional';
              }
            }
          }
        }
      } else {
        // not logged
        stopUnreadPolling();
        return;
      }

      // Update UI
      var prevUnread = window.__acheei_notif_last_unread || 0;
      if (unread && unread > 0) {
        if (unread > prevUnread) {
          try { playNotificationSound(); } catch(e){}
        }
        window.__acheei_notif_last_unread = unread;
        setBadge(unread);
        // ensure icon visible
        var icon = document.getElementById('notifIcon'); if (icon) icon.style.display = 'inline-flex';
        // ensure dropdown has a persistent item at top
        var dd = ensureDropdown();
        var list = document.getElementById('notifList'); if (!list) return;
        // remove existing unread-summary
        var existing = list.querySelector('.notif-unread-summary'); if (existing) existing.remove();
        var item = document.createElement('div');
        item.className = 'notif-item notif-unread-summary';
        item.innerHTML = '<div class="notif-item-body"><div class="notif-item-title">Você possui mensagens não lidas</div><div class="notif-item-text">Clique para abrir suas conversas</div></div>';
        item.addEventListener('click', function(){ window.location.href = destination || '/'; });
        list.insertBefore(item, list.firstChild);
      } else {
        // no unread: clear badge and remove summary
        window.__acheei_notif_last_unread = 0;
        setBadge(0);
        var list = document.getElementById('notifList'); if (list) {
          var existing = list.querySelector('.notif-unread-summary'); if (existing) existing.remove();
        }
      }
    } catch (e) {
      // ignore polling errors
      console.error('fetchAndUpdateUnread', e);
    }
  }

  // Start polling if logged in
  try {
    if (localStorage.getItem('acheei_cliente_token') || localStorage.getItem('acheei_prof_token')) startUnreadPolling();
    // also react to storage events (login/logout in other tabs)
    window.addEventListener('storage', function(ev){
      if (ev.key === 'acheei_cliente_token' || ev.key === 'acheei_prof_token') {
        if (localStorage.getItem('acheei_cliente_token') || localStorage.getItem('acheei_prof_token')) startUnreadPolling(); else stopUnreadPolling();
      }
    });
  } catch(e){}

  // Fallback: listen to window 'message' events (some environments deliver postMessage here)
  window.addEventListener('message', function(ev){
    try {
      var data = ev && ev.data ? ev.data : null;
      if (!data) return;
      if (data.type === 'push' || (data && data.action === 'push')) {
        var d = data.data || data.payload || {};
        if (window.acheeiNotifications && window.acheeiNotifications.pushNotification) window.acheeiNotifications.pushNotification(d);
        if (window.acheeiNotifications && window.acheeiNotifications.incrementBadge) window.acheeiNotifications.incrementBadge();
        if (window.showToast && d.body) showToast(d.body, 'info');
      }
    } catch(e){ /* ignore */ }
  });

  // Delegated click handler (module-scope) so the dropdown opens even if
  // the button/node is inserted dynamically or init() returned early.
  document.addEventListener('click', function(e){
    var target = e.target;
    if (!target) return;
    var btnEl = target.closest ? target.closest('#notifButton') : (target.id === 'notifButton' ? target : null);
    if (btnEl) {
      e.stopPropagation();
      try {
        // If permissions not yet granted, trigger the activation flow which will
        // register the service worker, subscribe and save the subscription.
        if (typeof ativarNotificacoes === 'function' && Notification && Notification.permission !== 'granted') {
          (async function(){
            try {
              await ativarNotificacoes();
            } catch(e){}
            try { toggleDropdown(); } catch (err) { console.error('toggleDropdown', err); }
          })();
        } else {
          toggleDropdown();
        }
      } catch (err) { console.error('toggleDropdown', err); }
    }
  });

  // Also listen for pointerdown as fallback on some mobile environments
  // (removed pointerdown fallback because it caused immediate close in some browsers)
  })();
}
