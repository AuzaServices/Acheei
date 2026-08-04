function getMobileMenuOverlay() {
  return document.getElementById('mobileMenuOverlay') || document.getElementById('menuOverlay');
}

function getMobileMenuButton() {
  return document.getElementById('hamburgerBtn');
}

function openMobileMenu() {
  var overlay = getMobileMenuOverlay();
  var menu = document.getElementById('mobileMenu');
  var button = getMobileMenuButton();
  if (overlay) overlay.classList.add('active');
  if (menu) menu.classList.add('active');
  if (button) button.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
  var overlay = getMobileMenuOverlay();
  var menu = document.getElementById('mobileMenu');
  var button = getMobileMenuButton();
  if (overlay) overlay.classList.remove('active');
  if (menu) menu.classList.remove('active');
  if (button) button.classList.remove('active');
  document.body.style.overflow = '';
}

function toggleMobileMenu() {
  var menu = document.getElementById('mobileMenu');
  if (menu && menu.classList.contains('active')) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
}

function navigateMobileMenu(tab) {
  closeMobileMenu();
  var selector = ".dashboard-tab[onclick=\"switchTab('" + tab + "', this)\"]";
  var button = document.querySelector(selector);
  if (button) {
    button.click();
  }
}

function fecharMenuMobile() {
  closeMobileMenu();
}

document.addEventListener('DOMContentLoaded', function() {
  var hamburger = getMobileMenuButton();
  var overlay = getMobileMenuOverlay();
  if (hamburger) hamburger.addEventListener('click', toggleMobileMenu);
  if (overlay) overlay.addEventListener('click', closeMobileMenu);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeMobileMenu();
  });
});
