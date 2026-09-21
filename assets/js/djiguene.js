/* =============================================================
   DJIGUENE MAGAZINE — Comportements de l'interface
   -------------------------------------------------------------
   Chaque bloc est autonome et ne s'active que si son markup est
   présent : les pages n'embarquent que ce dont elles ont besoin.
   Aucune dépendance externe.
   ============================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Écran d'attente ---------- */
  function preloader() {
    var el = document.getElementById('preloader');
    if (!el) return;
    var hide = function () {
      el.style.opacity = '0';
      el.style.visibility = 'hidden';
      window.setTimeout(function () { el.remove(); }, 700);
    };
    if (document.readyState === 'complete') window.setTimeout(hide, 350);
    else window.addEventListener('load', function () { window.setTimeout(hide, 350); });
  }

  /* ---------- En-tête : voile au scroll + progression de lecture ---------- */
  function header() {
    var el = document.querySelector('.site-header');
    if (!el) return;
    var bar = el.querySelector('.progress');
    var ticking = false;

    function update() {
      var y = window.scrollY;
      el.classList.toggle('is-stuck', y > 40);
      if (bar) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
      }
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- Menu mobile plein écran ---------- */
  function drawer() {
    var btn = document.querySelector('.burger');
    var panel = document.getElementById('menu-mobile');
    if (!btn || !panel) return;

    function setOpen(open) {
      btn.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) {
        var first = panel.querySelector('a, button');
        if (first) first.focus();
      }
    }

    btn.addEventListener('click', function () {
      setOpen(btn.getAttribute('aria-expanded') !== 'true');
    });
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        btn.focus();
      }
    });
  }

  /* ---------- Apparition progressive au scroll ---------- */
  function reveals() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Parallaxe légère (silhouette du héros) ---------- */
  function parallax() {
    var el = document.querySelector('[data-parallax]');
    if (!el || reduced) return;
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        var depth = parseFloat(el.getAttribute('data-parallax')) || 0.06;
        el.style.transform = 'translate3d(0,' + Math.min(window.scrollY, 700) * depth + 'px,0)';
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------- Filtres par rubrique + recherche plein texte ---------- */
  function articleFilters() {
    var root = document.querySelector('[data-filterable]');
    if (!root) return;

    var chips = root.querySelectorAll('.chip');
    var input = root.querySelector('[data-search]');
    var cards = Array.prototype.slice.call(root.querySelectorAll('.card'));
    var empty = root.querySelector('.empty-state');
    var counter = root.querySelector('[data-count]');
    var category = 'toutes';

    // Accents retirés pour que « beaute » trouve « beauté ».
    function normalise(str) {
      return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function apply() {
      var query = normalise(input ? input.value.trim() : '');
      var shown = 0;

      cards.forEach(function (card) {
        var matchCat = category === 'toutes' || card.dataset.category === category;
        var matchText = !query || normalise(card.textContent).indexOf(query) !== -1;
        var visible = matchCat && matchText;
        card.hidden = !visible;
        if (visible) shown++;
      });

      if (empty) empty.hidden = shown !== 0;
      if (counter) {
        counter.textContent = shown + (shown > 1 ? ' articles' : ' article');
      }
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        select(chip.dataset.filter);
      });
    });

    function select(value) {
      category = value || 'toutes';
      chips.forEach(function (c) {
        c.setAttribute('aria-pressed', String(c.dataset.filter === category));
      });
      apply();
    }

    // Les entrées « Mode », « Beauté »… de la navigation et du pied de page
    // amènent à la grille avec le bon filtre déjà appliqué.
    document.querySelectorAll('[data-rubrique]').forEach(function (link) {
      link.addEventListener('click', function () {
        select(link.dataset.rubrique);
      });
    });

    if (input) {
      var timer;
      input.addEventListener('input', function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(apply, 140);
      });
    }
    apply();
  }

  /* ---------- Newsletter : validation côté client ---------- */
  function newsletter() {
    var form = document.getElementById('nl-form');
    if (!form) return;
    var input = form.querySelector('input[type="email"]');
    var msg = document.getElementById('nl-msg');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = input.value.trim();
      var valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

      input.setAttribute('aria-invalid', String(!valid));
      msg.dataset.state = valid ? 'ok' : 'error';
      msg.textContent = valid
        ? 'Merci. Un message de confirmation vient de partir vers ' + value + '.'
        : 'Cette adresse e-mail semble incomplète. Vérifiez-la et réessayez.';

      if (valid) {
        form.reset();
        // Brancher ici l'appel vers le service d'emailing (Brevo, Mailchimp…).
      } else {
        input.focus();
      }
    });
  }

  /* ---------- Inclinaison de la maquette du magazine ---------- */
  function tilt() {
    var stage = document.querySelector('[data-tilt]');
    if (!stage || reduced || !window.matchMedia('(pointer:fine)').matches) return;
    var target = stage.firstElementChild;
    if (!target) return;

    stage.addEventListener('mousemove', function (e) {
      var r = stage.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      target.style.transform = 'rotateY(' + px * 9 + 'deg) rotateX(' + -py * 9 + 'deg)';
    });
    stage.addEventListener('mouseleave', function () {
      target.style.transform = '';
    });
  }

  /* ---------- Année courante dans le pied de page ---------- */
  function year() {
    var el = document.querySelector('[data-year]');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  [preloader, header, drawer, reveals, parallax,
    articleFilters, newsletter, tilt, year].forEach(function (init) {
      try { init(); } catch (err) { /* un bloc en échec n'empêche pas les autres */ }
    });
})();
