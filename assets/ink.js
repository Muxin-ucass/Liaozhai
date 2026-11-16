(function () {
  'use strict';

  var canvas = document.getElementById('inkCanvas');
  if (!canvas || !canvas.getContext) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduceMotion.matches) {
    canvas.style.display = 'none';
    return;
  }

  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  var width = 0;
  var height = 0;
  var rafId = null;
  var particles = [];
  var sprites = [];

  var colors = {
    jade: [176, 226, 199],
    pale: [232, 248, 236],
    ember: [255, 122, 92]
  };

  function rgba(color, alpha) {
    return 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + alpha + ')';
  }

  function makeSprite(color, size) {
    var sprite = document.createElement('canvas');
    sprite.width = size;
    sprite.height = size;
    var brush = sprite.getContext('2d');
    var half = size / 2;
    var gradient = brush.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, rgba(color, 0.85));
    gradient.addColorStop(0.24, rgba(color, 0.5));
    gradient.addColorStop(0.55, rgba(color, 0.16));
    gradient.addColorStop(1, rgba(color, 0));
    brush.fillStyle = gradient;
    brush.fillRect(0, 0, size, size);
    return sprite;
  }

  function buildSprites() {
    sprites = [
      makeSprite(colors.jade, 64),
      makeSprite(colors.pale, 64),
      makeSprite(colors.ember, 64)
    ];
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    particles = [];
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    ctx.clearRect(0, 0, width, height);
  }

  function spawn(x, y, count, options) {
    var settings = options || {};
    var spread = settings.spread || 0;
    var upward = settings.upward || 1;
    var now = performance.now();

    for (var i = 0; i < count; i += 1) {
      var angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
      var speed = 0.22 + Math.random() * 0.62;
      var roll = Math.random();
      particles.push({
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread * 0.4,
        vx: Math.cos(angle) * speed * 0.55 + (Math.random() - 0.5) * 0.36,
        vy: Math.sin(angle) * speed * upward + (Math.random() - 0.5) * 0.16,
        size: 1.1 + Math.random() * 2.1,
        life: 950 + Math.random() * 1350,
        born: now,
        seed: Math.random() * Math.PI * 2,
        sprite: roll > 0.86 ? sprites[2] : (roll > 0.46 ? sprites[0] : sprites[1])
      });
    }
    start();
  }

  function draw(now) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.11)';
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';

    var alive = [];
    for (var i = 0; i < particles.length; i += 1) {
      var p = particles[i];
      var age = (now - p.born) / p.life;
      if (age >= 1) continue;

      p.vy -= 0.0022;
      p.vx *= 0.992;
      p.x += p.vx + Math.sin(now * 0.0016 + p.seed) * 0.32;
      p.y += p.vy;

      var flicker = 0.62 + 0.38 * Math.sin(now * 0.014 + p.seed) * Math.sin(now * 0.005 + p.seed * 1.7);
      var alpha = Math.pow(1 - age, 1.45) * Math.max(flicker, 0.15) * 0.62;
      var size = p.size * (1 + age * 0.8);

      ctx.globalAlpha = alpha;
      ctx.drawImage(p.sprite, p.x - size * 2.2, p.y - size * 2.2, size * 4.4, size * 4.4);
      alive.push(p);
    }

    ctx.globalAlpha = 1;
    particles = alive;

    if (particles.length > 0) {
      rafId = window.requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, width, height);
      rafId = null;
    }
  }

  function start() {
    if (rafId === null) {
      rafId = window.requestAnimationFrame(draw);
    }
  }

  function burstAtPointer(event) {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    if (event.clientX === 0 && event.clientY === 0) return;
    var target = event.target;
    if (target && target.closest && target.closest('.nav-link, .dock-button, .story-tab, .toc-panel')) return;
    spawn(event.clientX, event.clientY, 10, { spread: 26, upward: 1.05 });
  }

  function burstAtEdge() {
    var count = 24;
    for (var i = 0; i < count; i += 1) {
      var x = width * (0.14 + Math.random() * 0.72);
      var y = height * (0.9 + Math.random() * 0.07);
      spawn(x, y, 1, { spread: 8, upward: 1.15 });
    }
  }

  function burstAtPanel() {
    var panel = document.querySelector('.story-panel:not([hidden])');
    if (!panel) {
      burstAtEdge();
      return;
    }
    var rect = panel.getBoundingClientRect();
    var x = rect.left + rect.width * 0.5;
    var y = Math.max(rect.top + 46, 80);
    if (rect.bottom < 0 || rect.top > height) {
      burstAtEdge();
      return;
    }
    spawn(x, Math.min(y, height - 60), 14, { spread: rect.width * 0.55, upward: 1.1 });
  }

  window.addEventListener('click', burstAtPointer, { passive: true });
  window.addEventListener('hashchange', burstAtEdge);
  window.addEventListener('liaozhai:chapter', burstAtEdge);
  window.addEventListener('liaozhai:tab', burstAtPanel);

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 180);
  });

  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener('change', function (event) {
      if (event.matches) {
        particles = [];
        if (rafId !== null) {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }
        ctx.clearRect(0, 0, width, height);
        canvas.style.display = 'none';
      } else {
        canvas.style.display = '';
      }
    });
  }

  buildSprites();
  resize();
  window.setTimeout(function () {
    if (window.scrollY < window.innerHeight * 0.6) {
      spawn(width * 0.74, height * 0.58, 18, { spread: 90, upward: 1.2 });
    }
  }, 650);
})();
