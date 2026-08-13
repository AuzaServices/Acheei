// Notification icon helper
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

  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // Expose to global
  window.acheeiNotifications = { init: init, setBadge: setBadge, incrementBadge: incrementBadge, pushNotification: addNotificationItem };

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
      try { toggleDropdown(); } catch (err) { console.error('toggleDropdown', err); }
    }
  });

  // Also listen for pointerdown as fallback on some mobile environments
  // (removed pointerdown fallback because it caused immediate close in some browsers)
})();
