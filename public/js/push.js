// ============================================
// Acheei - Utilitário de Notificações Push
// Registra service worker, pede permissão e assina
// Proteção contra carregamento duplo
// ============================================

if (!window.__acheei_push_loaded) {
  window.__acheei_push_loaded = true;

  const VAPID_PUBLIC_KEY = 'BAIo2JpxKMvRWXkG2vxC1ROrSVkoTp5TGem_anQI0KlWwsN3va6GSSF8LRc13Xh8aG3yRAbdWHTGKVUZxYRJXvw';

  let pushReady = false;
  let pushSubscription = null;

// ============================================
// Converter chave VAPID (base64) para Uint8Array
// ============================================
function urlBase64ToUint8Array(base64String) {
  var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  var rawData = window.atob(base64);
  var outputArray = new Uint8Array(rawData.length);
  for (var i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ============================================
// Registrar Service Worker
// ============================================
async function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker não suportado neste navegador');
    return false;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('Service Worker registrado:', reg.scope);
    return reg;
  } catch (error) {
    console.error('Erro ao registrar Service Worker:', error);
    return false;
  }
}

// ============================================
// Verificar suporte a push
// ============================================
function suportaPush() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

// ============================================
// Obter permissão de notificação
// ============================================
async function obterPermissao() {
  if (!suportaPush()) {
    showToast('Seu navegador não suporta notificações', 'error');
    return 'unsupported';
  }
  try {
    return await Notification.requestPermission();
  } catch (error) {
    console.error('Erro ao pedir permissão:', error);
    return 'denied';
  }
}

// ============================================
// Assinar para receber push (subscribe)
// ============================================
async function assinarPush() {
  if (!suportaPush()) return null;

  try {
    // Garante que o service worker está ativo
    const reg = await registrarServiceWorker();
    if (!reg) return null;

    // Aguarda o service worker estar pronto
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
        // Timeout de segurança
        setTimeout(resolve, 3000);
      });
    }

    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    pushSubscription = subscription;
    pushReady = true;
    console.log('Push subscription obtida:', subscription.endpoint);
    return subscription;
  } catch (error) {
    console.error('Erro ao assinar push:', error);
    showToast('Não foi possível ativar as notificações: ' + error.message, 'error');
    return null;
  }
}

// ============================================
// Salvar assinatura no servidor
// (chamado após login/cadastro do cliente)
// ============================================
async function salvarAssinaturaPush() {
  // Se não tem assinatura em memória, tenta recuperar a pendente do localStorage
  if (!pushSubscription) {
    const pending = localStorage.getItem('acheei_pending_subscription');
    if (pending) {
      try {
        pushSubscription = JSON.parse(pending);
      } catch (e) {
        localStorage.removeItem('acheei_pending_subscription');
        return false;
      }
    }
  }

  if (!pushSubscription) return false;

  try {
    const clienteToken = localStorage.getItem('acheei_cliente_token');
    const profToken = localStorage.getItem('acheei_prof_token');
    if (!clienteToken && !profToken) {
      // Não está logado, guarda a assinatura para salvar depois
      localStorage.setItem('acheei_pending_subscription', JSON.stringify(pushSubscription));
      return false;
    }

    // Decide para qual endpoint salvar (cliente ou profissional) baseado no token presente
    const endpoint = clienteToken ? '/api/clientes/push-subscription' : '/api/profissionais/push-subscription';
    const auth = clienteToken ? clienteToken : profToken;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + auth
      },
      body: JSON.stringify({
        subscription: JSON.parse(JSON.stringify(pushSubscription))
      })
    });
    const result = await response.json();
    if (result.success) {
      localStorage.removeItem('acheei_pending_subscription');
      console.log('✅ Assinatura push salva no servidor');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Erro ao salvar assinatura push:', error);
    return false;
  }
}

// ============================================
// Fluxo completo: aceitar notificações
// Retorna true se o usuário aceitou e assinou
// ============================================
async function ativarNotificacoes() {
  if (pushReady && pushSubscription) {
    return true;
  }

  // Se já tem permissão, apenas assina
  if (Notification.permission === 'granted') {
    const sub = await assinarPush();
    if (sub) {
      await salvarAssinaturaPush();
      return true;
    }
    return false;
  }

  if (Notification.permission === 'denied') {
    showToast('Notificações bloqueadas. Ative nas configurações do navegador.', 'error');
    return false;
  }

  // Pedir permissão
  const permission = await obterPermissao();
  if (permission === 'granted') {
    const sub = await assinarPush();
    if (sub) {
      await salvarAssinaturaPush();
      return true;
    }
    return false;
  }

  showToast('Você precisa aceitar as notificações para continuar', 'error');
  return false;
}

// ============================================
// Salvar assinatura pendente após login
// ============================================
async function salvarAssinaturaPendente() {
  const pending = localStorage.getItem('acheei_pending_subscription');
  if (pending) {
    try {
      pushSubscription = JSON.parse(pending);
      await salvarAssinaturaPush();
    } catch (e) {
      localStorage.removeItem('acheei_pending_subscription');
    }
  }
}

// Proactively register the Service Worker on page load so it's available
// to receive push events and postMessage to pages (does not request permission).
(function ensureSW(){
  if (!('serviceWorker' in navigator)) return;
  try {
    registrarServiceWorker().then(function(r){
      if (r) console.log('Service Worker ensured at', r.scope);
    }).catch(function(){/* noop */});
  } catch(e) { /* noop */ }
})();

