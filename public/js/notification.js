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
      } else {
        icon.style.display = 'none';
        return;
      }

      // Click opens messages area
      var btn = document.getElementById('notifButton');
      if (btn) btn.addEventListener('click', function(){
        var clienteToken = localStorage.getItem('acheei_cliente_token');
        var profToken = localStorage.getItem('acheei_prof_token');
        if (profToken) { window.location.href = '/profissional'; }
        else { window.location.href = '/cliente'; }
      });

      // Handle messages from service worker
      if (navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener('message', function(ev){
          if (!ev || !ev.data) return;
          if (ev.data.type === 'push') {
            var d = ev.data.data || {};
            incrementBadge();
            // optional: show small toast
            if (window.showToast && d.body) showToast(d.body, 'info');
          }
        });
      }
    } catch (e) { console.error('init notification icon', e); }
  }

  function setBadge(n) {
    var b = document.getElementById('notifBadge'); if (!b) return;
    b.textContent = n > 99 ? '99+' : String(n);
    b.style.display = n > 0 ? 'inline-flex' : 'none';
  }

  function incrementBadge() {
    var b = document.getElementById('notifBadge'); if (!b) return;
    var cur = parseInt(b.textContent) || 0; cur++; setBadge(cur);
  }

  // Expose to global
  window.acheeiNotifications = { init: init, setBadge: setBadge, incrementBadge: incrementBadge };

  // Auto init on DOMContentLoaded
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
