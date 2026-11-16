(function () {
  'use strict';

  var body = document.body;
  var chapters = Array.prototype.slice.call(document.querySelectorAll('.chapter'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-link'));
  var progressBar = document.getElementById('progressBar');
  var chapterCount = document.getElementById('chapterCount');
  var prevButton = document.getElementById('prevChapter');
  var nextButton = document.getElementById('nextChapter');
  var currentChapter = 0;
  var ticking = false;

  function twoDigits(number) {
    return String(number + 1).padStart(2, '0');
  }

  function goToChapter(index) {
    if (index < 0 || index >= chapters.length) return;
    currentChapter = index;
    chapters[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    updateChapterUI();
    window.dispatchEvent(new CustomEvent('liaozhai:chapter', { detail: { id: chapters[index].id } }));
  }

  function updateChapterUI() {
    navLinks.forEach(function (link) {
      var isCurrent = link.getAttribute('href') === '#' + chapters[currentChapter].id;
      if (isCurrent) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    chapterCount.textContent = twoDigits(currentChapter) + ' / ' + twoDigits(chapters.length - 1);
    prevButton.disabled = currentChapter === 0;
    nextButton.disabled = currentChapter === chapters.length - 1;
    syncTocCurrent();
  }

  var tocToggle = document.getElementById('tocToggle');
  var tocPanel = document.getElementById('tocPanel');
  var tocList = document.getElementById('tocList');
  var tocItems = [];
  var lastFocused = null;

  chapters.forEach(function (chapter, index) {
    var item = document.createElement('li');
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'toc-item';
    button.innerHTML =
      '<span class="toc-no">' + twoDigits(index) + '</span>' +
      '<span><span class="toc-name">' + chapter.getAttribute('data-title') + '</span>' +
      '<span class="toc-desc">' + (chapter.getAttribute('data-sub') || '') + '</span></span>';
    button.addEventListener('click', function () {
      closeToc(true);
      goToChapter(index);
    });
    item.appendChild(button);
    tocList.appendChild(item);
    tocItems.push(button);
  });

  function syncTocCurrent() {
    tocItems.forEach(function (item, index) {
      if (index === currentChapter) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });
  }

  function openToc() {
    if (!tocPanel.hidden) return;
    lastFocused = document.activeElement;
    tocPanel.hidden = false;
    tocToggle.setAttribute('aria-expanded', 'true');
    syncTocCurrent();
    if (tocItems[currentChapter]) tocItems[currentChapter].focus({ preventScroll: true });
  }

  function closeToc(restoreFocus) {
    if (tocPanel.hidden) return;
    tocPanel.hidden = true;
    tocToggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) {
      var target = lastFocused && lastFocused !== document.body ? lastFocused : tocToggle;
      target.focus({ preventScroll: true });
    }
  }

  tocToggle.addEventListener('click', function () {
    if (tocPanel.hidden) openToc();
    else closeToc(true);
  });

  document.addEventListener('click', function (event) {
    if (tocPanel.hidden) return;
    if (tocPanel.contains(event.target) || tocToggle.contains(event.target)) return;
    closeToc(false);
  });

  tocList.addEventListener('keydown', function (event) {
    var index = tocItems.indexOf(document.activeElement);
    if (index < 0) return;
    var nextIndex = index;
    if (event.key === 'ArrowDown') nextIndex = (index + 1) % tocItems.length;
    else if (event.key === 'ArrowUp') nextIndex = (index - 1 + tocItems.length) % tocItems.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tocItems.length - 1;
    else return;
    event.preventDefault();
    tocItems[nextIndex].focus({ preventScroll: true });
  });

  var gates = Array.prototype.slice.call(document.querySelectorAll('.gate'));
  var doorPage = document.getElementById('doorPage');
  var doorSheets = Array.prototype.slice.call(document.querySelectorAll('.door-sheet'));
  var doorClose = document.getElementById('doorClose');
  var doorKicker = document.getElementById('doorPageKicker');
  var doorTitle = document.getElementById('doorPageTitle');
  var doorSub = document.getElementById('doorPageSub');
  var lastGate = null;

  function openDoor(key, gate) {
    var sheet = doorSheets.filter(function (item) {
      return item.getAttribute('data-door') === key;
    })[0];
    if (!sheet) return;
    doorSheets.forEach(function (item) { item.hidden = item !== sheet; });
    doorKicker.textContent = sheet.getAttribute('data-kicker');
    doorTitle.textContent = sheet.getAttribute('data-title');
    doorSub.textContent = sheet.getAttribute('data-sub');
    lastGate = gate || null;
    doorPage.hidden = false;
    doorPage.scrollTop = 0;
    body.classList.add('door-open');
    doorClose.focus({ preventScroll: true });
  }

  function closeDoor(restoreFocus) {
    if (doorPage.hidden) return;
    doorPage.hidden = true;
    body.classList.remove('door-open');
    if (restoreFocus && lastGate) lastGate.focus({ preventScroll: true });
  }

  gates.forEach(function (gate) {
    gate.addEventListener('click', function () {
      openDoor(gate.getAttribute('data-door'), gate);
    });
  });

  doorClose.addEventListener('click', function () { closeDoor(true); });

  doorPage.addEventListener('click', function (event) {
    if (event.target === doorPage) {
      closeDoor(true);
      return;
    }
    if (event.target.closest && event.target.closest('.cite a')) closeDoor(false);
  });


  function updateOnScroll() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    var progress = maxScroll > 0 ? Math.min(scrollTop / maxScroll, 1) : 0;
    progressBar.style.width = (progress * 100).toFixed(2) + '%';

    var marker = scrollTop + window.innerHeight * 0.34;
    var activeIndex = 0;
    chapters.forEach(function (chapter, index) {
      if (chapter.offsetTop <= marker) activeIndex = index;
    });
    if (activeIndex !== currentChapter) {
      currentChapter = activeIndex;
      updateChapterUI();
    }
    ticking = false;
  }

  function requestScrollUpdate() {
    if (!ticking) {
      window.requestAnimationFrame(updateOnScroll);
      ticking = true;
    }
  }

  prevButton.addEventListener('click', function () { goToChapter(currentChapter - 1); });
  nextButton.addEventListener('click', function () { goToChapter(currentChapter + 1); });
  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  window.addEventListener('resize', requestScrollUpdate);

  var notesToggle = document.getElementById('notesToggle');
  notesToggle.addEventListener('click', function () {
    var notesVisible = body.classList.toggle('show-notes');
    notesToggle.setAttribute('aria-pressed', String(notesVisible));
  });

  var fullscreenToggle = document.getElementById('fullscreenToggle');
  var fullscreenLabel = document.getElementById('fullscreenLabel');

  function updateFullscreenUI() {
    var isFullscreen = Boolean(document.fullscreenElement);
    fullscreenLabel.textContent = isFullscreen ? '退出全屏' : '全屏';
    fullscreenToggle.setAttribute('aria-pressed', String(isFullscreen));
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(function () {});
    } else if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(function () {
        fullscreenToggle.title = '当前浏览器未允许全屏，可使用浏览器的全屏功能';
      });
    }
  }

  fullscreenToggle.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', updateFullscreenUI);

  document.getElementById('printButton').addEventListener('click', function () {
    window.print();
  });

  var tabList = document.querySelector('.story-tabs');
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.story-tab'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.story-panel'));

  function activateTab(tab, moveFocus) {
    tabs.forEach(function (item) {
      var selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(function (panel) {
      var selected = panel.id === tab.getAttribute('aria-controls');
      panel.hidden = !selected;
      panel.classList.toggle('active', selected);
    });
    if (moveFocus) tab.focus();
    window.dispatchEvent(new CustomEvent('liaozhai:tab', { detail: { panel: tab.getAttribute('aria-controls') } }));
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { activateTab(tab, false); });
  });

  tabList.addEventListener('keydown', function (event) {
    var currentIndex = tabs.indexOf(document.activeElement);
    if (currentIndex < 0) return;
    var nextIndex = currentIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    activateTab(tabs[nextIndex], true);
  });

  document.addEventListener('keydown', function (event) {
    var target = event.target;
    var isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    if (isTyping || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!doorPage.hidden) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDoor(true);
      }
      return;
    }
    if (event.key.toLowerCase() === 'f') {
      event.preventDefault();
      toggleFullscreen();
      return;
    }
    if (event.key === 'Escape') {
      if (!tocPanel.hidden) {
        event.preventDefault();
        closeToc(true);
      }
      return;
    }
    if (event.key.toLowerCase() === 'm') {
      event.preventDefault();
      if (tocPanel.hidden) openToc();
      else closeToc(true);
      return;
    }
    if (tabList.contains(target) || tocPanel.contains(target)) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goToChapter(currentChapter + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goToChapter(currentChapter - 1);
    }
  });

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealItems = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (!reduceMotion && 'IntersectionObserver' in window) {
    body.classList.add('motion-ready');
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealItems.forEach(function (item) { revealObserver.observe(item); });
  } else {
    revealItems.forEach(function (item) { item.classList.add('is-visible'); });
  }

  updateChapterUI();
  updateOnScroll();
})();
