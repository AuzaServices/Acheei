// ============================================
// Acheei - Scroll Reveal Animations
// Efeitos modernos de aparecimento na rolagem
// ============================================

(function() {
  'use strict';

  // Respeita preferência por movimento reduzido
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Torna tudo visível imediatamente
    document.querySelectorAll('.reveal').forEach(function(el) {
      el.classList.add('visible');
    });
    document.body.classList.add('page-loaded');
    return;
  }

  // ============================================
  // Config
  // ============================================
  var THRESHOLD = 0.08;
  var ROOT_MARGIN = '0px 0px -60px 0px';

  // ============================================
  // Observer
  // ============================================
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: THRESHOLD,
    rootMargin: ROOT_MARGIN
  });

  // ============================================
  // Registrar elementos
  // ============================================
  function initReveal() {
    var targets = document.querySelectorAll('.reveal');
    targets.forEach(function(el) {
      // Se já estiver no viewport, marca visível imediatamente
      var rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        window.requestAnimationFrame(function() {
          el.classList.add('visible');
        });
        return;
      }
      observer.observe(el);
    });
  }

  // ============================================
  // Aplicar classes automaticamente nos
  // componentes das páginas existentes
  // ============================================
  function applyReveal() {
    // Hero sections - fade + scale sutil
    document.querySelectorAll('.hero, .contato-hero, .sobre-hero').forEach(function(el) {
      el.classList.add('reveal', 'reveal-hero');
    });

    // Search box
    var searchBox = document.querySelector('.search-box');
    if (searchBox) searchBox.classList.add('reveal', 'reveal-fade-up');

    // Categories (index)
    document.querySelectorAll('.categories').forEach(function(el) {
      el.classList.add('reveal', 'reveal-fade-up');
    });
    document.querySelectorAll('.category-card').forEach(function(el) {
      el.classList.add('reveal', 'reveal-fade-up');
    });

    // Results section
    document.querySelectorAll('.results-section').forEach(function(el) {
      el.classList.add('reveal', 'reveal-fade-up');
    });

    // Contato cards (cards de info)
    document.querySelectorAll('.contato-cards').forEach(function(el) {
      el.classList.add('reveal', 'reveal-fade-up');
    });
    document.querySelectorAll('.contato-info-card').forEach(function(el) {
      el.classList.add('reveal', 'reveal-fade-up');
    });

    // Contato main (form + side)
    document.querySelectorAll('.contato-main').forEach(function(el) {
      el.classList.add('reveal', 'reveal-fade-up');
    });
    document.querySelectorAll('.form-wrapper, .side-section').forEach(function(el) {
      el.classList.add('reveal', 'reveal-fade-up');
    });

    // Sobre - stats
    document.querySelectorAll('.stats-section').forEach(function(el) {
      el.classList.add('reveal', 'reveal-fade-up');
    });
    document.querySelectorAll('.stat-card').forEach(function(el) {
      el.classList.add('reveal', 'reveal-fade-up');
    });

    // Sobre - sections
    document.querySelectorAll('.sobre-section').forEach(function(el) {
      el.classList.add('reveal', 'reveal-fade-up');
    });
    document.querySelectorAll('.mvv-card, .step-card, .value-item').forEach(function(el) {
      el.classList.add('reveal', 'reveal-fade-up');
    });

    // Sobre - CTA band
    document.querySelectorAll('.cta-band').forEach(function(el) {
      el.classList.add('reveal', 'reveal-fade-up');
    });

    // Footer sections
    document.querySelectorAll('.footer, .contato-footer, .sobre-footer').forEach(function(el) {
      el.classList.add('reveal', 'reveal-fade-up');
    });
  }

  // ============================================
  // Stagger: adiciona delay incremental a filhos
  // de um grid, para animação em cascata
  // ============================================
  function applyStagger() {
    var grids = [
      '.categories-grid',
      '.profissionais-grid',
      '.contato-cards-grid',
      '.stats-grid',
      '.mvv-grid',
      '.steps',
      '.values-grid'
    ];

    grids.forEach(function(selector) {
      var grid = document.querySelector(selector);
      if (!grid) return;
      var items = grid.querySelectorAll(':scope > .reveal');
      items.forEach(function(item, i) {
        item.style.transitionDelay = (i * 0.07) + 's';
      });
    });
  }

  // ============================================
  // Start
  // ============================================
  function start() {
    applyReveal();
    applyStagger();
    initReveal();
    window.requestAnimationFrame(function() {
      document.body.classList.add('page-loaded');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();

