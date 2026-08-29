// top navbar
(function () {
    'use strict';

    var nav = document.getElementById('nav');
    var burgerBtn = document.getElementById('burgerBtn');
    var burgerIcon = document.getElementById('burgerIcon');
    var mobileMenu = document.getElementById('mobileMenu');
    if (!nav) return;

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Entrance */
    requestAnimationFrame(function () {
        requestAnimationFrame(function () { nav.classList.add('nav-loaded'); });
    });

    /* Hide on scroll down, show on scroll up */
    var lastY = window.scrollY;
    var ticking = false;
    var HIDE_AFTER = 120;
    var SCROLLED_AT = 20;

    function closeMobileMenu() {
        mobileMenu.classList.remove('open');
        burgerIcon.classList.remove('open');
        burgerBtn.setAttribute('aria-expanded', 'false');
    }

    function onScroll() {
        var y = Math.max(0, window.scrollY);
        nav.classList.toggle('nav-scrolled', y > SCROLLED_AT);

        if (y > lastY && y > HIDE_AFTER) {
            nav.classList.add('nav-hidden');
            closeMobileMenu();
        } else if (y < lastY) {
            nav.classList.remove('nav-hidden');
        }
        lastY = y;
        ticking = false;
    }
    window.addEventListener('scroll', function () {
        if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
    }, { passive: true });
    onScroll();

    /* Mobile menu toggle */
    function openMobileMenu() {
        mobileMenu.classList.add('open');
        burgerIcon.classList.add('open');
        burgerBtn.setAttribute('aria-expanded', 'true');
    }
    burgerBtn.addEventListener('click', function () {
        mobileMenu.classList.contains('open') ? closeMobileMenu() : openMobileMenu();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeMobileMenu();
    });
    document.addEventListener('click', function (e) {
        if (!mobileMenu.classList.contains('open')) return;
        if (mobileMenu.contains(e.target) || burgerBtn.contains(e.target)) return;
        closeMobileMenu();
    });

    /* Smooth-scroll navigation (skips gracefully if a target id doesn't exist) */
    function scrollToId(id) {
        if (id === 'home') {
            window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
            return;
        }
        var target = document.getElementById(id);
        if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
    document.querySelectorAll('[data-scroll]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            scrollToId(btn.getAttribute('data-scroll'));
            closeMobileMenu();
        });
    });

    /* Active link highlight (only for sections that actually exist on the page) */
    var navLinks = document.querySelectorAll('.nav-link[data-scroll]');
    var targets = [];
    navLinks.forEach(function (link) {
        var section = document.getElementById(link.getAttribute('data-scroll'));
        if (section) targets.push({ link: link, section: section });
    });
    function updateActiveLink() {
        var y = window.scrollY + 140;
        var current = null;
        targets.forEach(function (t) { if (t.section.offsetTop <= y) current = t.link; });
        navLinks.forEach(function (link) { link.classList.remove('active'); });
        if (current) current.classList.add('active');
    }
    window.addEventListener('scroll', function () { requestAnimationFrame(updateActiveLink); }, { passive: true });
    updateActiveLink();
})();
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------------- Smooth anchor scrolling ---------------- */
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
        link.addEventListener('click', function (e) {
            var id = link.getAttribute('href');
            if (id.length > 1) {
                var target = document.querySelector(id);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
                }
            }
        });
    });

    /* ---------------- Circle Navbar ---------------- */
    var circleNavbar = document.getElementById('circle-navbar');
    var navCircle = document.getElementById('nav-circle');
    var navItems = document.querySelectorAll('.nav-item');
    var radius = 130;
    var totalItems = navItems.length;
    var navbarHovered = false;

    // Position items in a circle + build letter spans for labels
    navItems.forEach(function (item, index) {
        var angle = (index / totalItems) * Math.PI * 2;
        var x = Math.cos(angle) * radius;
        var y = Math.sin(angle) * radius;
        item.style.left = 'calc(50% + ' + x + 'px - 20px)';
        item.style.top = 'calc(50% + ' + y + 'px - 20px)';

        var label = item.querySelector('.nav-label');
        var text = item.getAttribute('data-label') || '';
        label.innerHTML = text
            .split('')
            .map(function (ch) {
                return '<span class="letter">' + (ch === ' ' ? '&nbsp;' : ch) + '</span>';
            })
            .join('');
    });

    function showLabel(item, delay) {
        var letters = item.querySelectorAll('.nav-label .letter');
        letters.forEach(function (letter, i) {
            letter.style.transitionDelay = (delay || 0) + i * 20 + 'ms';
            letter.classList.add('visible');
        });
    }

    function hideLabel(item) {
        var letters = item.querySelectorAll('.nav-label .letter');
        letters.forEach(function (letter, i) {
            letter.style.transitionDelay = i * 12 + 'ms';
            letter.classList.remove('visible');
        });
    }

    // Show only the active section's label by default; reveal every
    // label together (cascading) whenever the navbar itself is hovered.
    function refreshLabels() {
        navItems.forEach(function (item, i) {
            if (navbarHovered) {
                showLabel(item, i * 30);
            } else if (item.classList.contains('active')) {
                showLabel(item, 0);
            } else {
                hideLabel(item);
            }
        });
    }

    circleNavbar.addEventListener('mouseenter', function () {
        navbarHovered = true;
        refreshLabels();
    });
    circleNavbar.addEventListener('mouseleave', function () {
        navbarHovered = false;
        refreshLabels();
    });

    // Reveal the active section's label right away, no hover needed
    refreshLabels();

    // Icons stay fixed in place relative to each other; the whole ring
    // rotates in lockstep with the current section instead. Rotation is
    // calibrated directly from which section is active and how far
    // scrolled through it (same 150px anchor line used for the active
    // state), NOT from raw scroll-% of the whole document — so the ring
    // always matches the section actually on screen, one slice (360° /
    // number of sections) per section, and never runs ahead or behind.
    //
    // On top of that "base" rotation, hovering the ring and turning the
    // mouse wheel (or dragging with a finger) adds a temporary "manual"
    // offset so people can spin through the icons to preview them. That
    // spin never touches page scroll — only clicking a nav item navigates.
    // If left alone, the ring eases back to the active section's slice.
    var sections = ['hero', 'life-story', 'experience', 'ventures', 'motive', 'gallery', 'blogs'];
    var baseRotation = 0;
    var manualOffset = 0;
    var isDragging = false;
    var returnTimer = null;
    var RETURN_DELAY = 650;
    var RETURN_DURATION = 700;

    function applyRotation() {
        var rotation = baseRotation + manualOffset;
        navCircle.style.transform = 'rotate(' + rotation + 'deg)';
        navItems.forEach(function (item) {
            item.style.transform = 'rotate(' + (-rotation) + 'deg)';
        });
    }

    function setSpinTransition(enabled) {
        var value = enabled ? 'transform ' + RETURN_DURATION + 'ms var(--ease-out)' : '';
        navCircle.style.transition = value;
        navItems.forEach(function (item) { item.style.transition = value; });
    }

    function scheduleReturn(delay) {
        clearTimeout(returnTimer);
        returnTimer = setTimeout(function () {
            if (isDragging) return;
            manualOffset = 0;
            setSpinTransition(true);
            applyRotation();
            setTimeout(function () { setSpinTransition(false); }, RETURN_DURATION);
        }, delay === undefined ? RETURN_DELAY : delay);
    }

    function updateActiveNav() {
        var activeIndex = 0;
        var progress = 0;
        var activeChanged = false;

        sections.forEach(function (id, index) {
            var section = document.getElementById(id);
            if (!section) return;
            var rect = section.getBoundingClientRect();
            if (rect.top <= 150 && rect.bottom >= 150) {
                activeIndex = index;
                progress = Math.min(1, Math.max(0, (150 - rect.top) / (rect.height || 1)));
                if (!navItems[index].classList.contains('active')) {
                    navItems.forEach(function (nav) { nav.classList.remove('active'); });
                    navItems[index].classList.add('active');
                    activeChanged = true;
                }
            }
        });

        baseRotation = -((activeIndex + progress) / totalItems) * 360;
        applyRotation();

        if (activeChanged) refreshLabels();
    }
    window.addEventListener('scroll', updateActiveNav, { passive: true });
    window.addEventListener('resize', updateActiveNav);
    updateActiveNav();

    /* ---- Manual spin: mouse wheel while hovering the ring ---- */
    circleNavbar.addEventListener('wheel', function (e) {
        e.preventDefault();
        setSpinTransition(false);
        manualOffset += e.deltaY * 0.35;
        applyRotation();
        scheduleReturn();
    }, { passive: false });

    /* ---- Manual spin: drag with a mouse or a finger ----
       A plain click/tap must still reach the nav-item's <a> untouched, so
       we don't commit to "dragging" (and don't preventDefault or capture
       the pointer) until movement crosses a small threshold. Anything
       under that threshold is left alone and falls through as a normal
       click on release. */
    var isPressed = false;
    var dragStartY = 0;
    var dragStartOffset = 0;
    var DRAG_THRESHOLD = 6;

    circleNavbar.addEventListener('pointerdown', function (e) {
        isPressed = true;
        dragStartY = e.clientY;
        dragStartOffset = manualOffset;
        clearTimeout(returnTimer);
    });
    circleNavbar.addEventListener('pointermove', function (e) {
        if (!isPressed) return;
        var deltaY = e.clientY - dragStartY;
        if (!isDragging) {
            if (Math.abs(deltaY) < DRAG_THRESHOLD) return;
            isDragging = true;
            setSpinTransition(false);
            circleNavbar.classList.add('dragging');
            try { circleNavbar.setPointerCapture(e.pointerId); } catch (err) { /* no-op */ }
        }
        e.preventDefault();
        manualOffset = dragStartOffset + deltaY * 0.6;
        applyRotation();
    });
    function endDrag() {
        isPressed = false;
        if (!isDragging) return;
        isDragging = false;
        circleNavbar.classList.remove('dragging');
        scheduleReturn(150);
    }
    circleNavbar.addEventListener('pointerup', endDrag);
    circleNavbar.addEventListener('pointercancel', endDrag);
    circleNavbar.addEventListener('mouseleave', function () {
        if (!isDragging) scheduleReturn(150);
    });

    /* ---------------- Hero entrance ---------------- */
    var heroEls = document.querySelectorAll('.hero-in');
    heroEls.forEach(function (el, i) {
        el.style.transitionDelay = (200 + i * 120) + 'ms';
    });
    // Trigger on the next frame so the initial (hidden) state paints first
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            heroEls.forEach(function (el) { el.classList.add('in-view'); });
        });
    });

    /* ---------------- Generic scroll reveals ---------------- */
    function observeReveal(selector, staggerMs) {
        var els = document.querySelectorAll(selector);
        if (!els.length) return;
        var observer = new IntersectionObserver(function (entries, obs) {
            var visible = entries.filter(function (entry) { return entry.isIntersecting; });
            visible.forEach(function (entry, i) {
                entry.target.style.transitionDelay = (i * staggerMs) + 'ms';
                entry.target.classList.add('in-view');
                obs.unobserve(entry.target);
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
        els.forEach(function (el) { observer.observe(el); });
    }

    observeReveal('.story-section', 0);
    observeReveal('.reveal', 100);
    observeReveal('.reveal-scale', 90);

    /* ---------------- Experience Line Animation ---------------- */
    var line = document.getElementById('line');
    var experienceSection = document.getElementById('experience');
    function updateExperienceLine() {
        if (!line || !experienceSection) return;
        var rect = experienceSection.getBoundingClientRect();
        var viewportCenter = window.innerHeight / 2;
        var start = rect.top - viewportCenter;
        var end = rect.bottom - viewportCenter;
        var total = end - start;
        var progress = total !== 0 ? (0 - start) / total : 0;
        progress = Math.min(1, Math.max(0, progress));
        line.style.height = (progress * 100) + '%';
    }
    window.addEventListener('scroll', updateExperienceLine, { passive: true });
    window.addEventListener('resize', updateExperienceLine);
    updateExperienceLine();

    /* ---------------- Message Section: typing animation ---------------- */
    var quote = "I started as a call center agent. Today, I lead an industry — because outsourcing isn't just business, it's opportunity.";
    var typingEl = document.getElementById('typing-text');
    var messageAuthor = document.getElementById('message-author');
    var hasTyped = false;

    var messageObserver = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting || hasTyped) return;
            hasTyped = true;
            obs.disconnect();

            if (reduceMotion) {
                typingEl.textContent = quote;
                messageAuthor.classList.add('in-view');
                return;
            }

            var i = 0;
            var typeSpeed = 32;
            var typer = setInterval(function () {
                typingEl.textContent += quote[i];
                i++;
                if (i >= quote.length) {
                    clearInterval(typer);
                    setTimeout(function () {
                        messageAuthor.classList.add('in-view');
                    }, 300);
                }
            }, typeSpeed);
        });
    }, { threshold: 0.4 });

    var messageSection = document.getElementById('message');
    if (messageSection) messageObserver.observe(messageSection);
})();