/* ============================================================
   LOGO SLIDER — JS
   1. CONFIG — one entry per slider on the page. Each entry needs
      the id of its .slider-track (set in the HTML) plus its own
      logo list. Direction/speed are NOT set here — they live as
      data-direction / data-speed attributes on that track's own
      markup, so tuning one slider never touches another.

      Each logo needs:
        src   -> path or URL to the logo image
        url   -> the site it should link to when clicked
        alt   -> accessible/alt text (used for screen readers)
      target/rel are optional (defaults shown below).

      NOTE: the "logos/*.svg" paths below are PLACEHOLDERS — they
      don't point to real files. Replace every src with the actual
      path/URL to your logo images, or you'll see broken-image
      icons like the ones in this sample data.
   ============================================================ */
const SLIDERS = [
  {
    trackId: "sliderTrack1",
    logos: [
      { src: "assets/logos/skylightgbl.png", url: "https://skylightgbl.com/", alt: "skylight-global" },
      { src: "assets/logos/rcm.png",         url: "https://skylightrcm.com/", alt: "skyligh-RCM" },
      { src: "assets/logos/codezzi.png",     url: "https://www.codezzi.com/", alt: "Codezzi" },
      { src: "assets/logos/sky-reva.png",    url: "https://skyreva.com/",     alt: "SkyReva" },
      { src: "assets/logos/markettor.png",   url: "https://canvas.example.com", alt: "Marketor" },
      { src: "assets/logos/jlp.png",         url: "https://janitorialleadspro.com/", alt: "janitorial-leads-pro" },
      { src: "assets/logos/acdc.png",        url: "https://allcityductcleaning.com/", alt: "All-City-Duct-Cleaning" },
      { src: "assets/logos/freight.png",     url: "https://www.skyfreightsquad.com/", alt: "SwiftFlow" },
    ],
  },
  {
    trackId: "sliderTrack2",
    logos: [
      { src: "assets/logos/skylightgbl.png", url: "https://skylightgbl.com/", alt: "skylight-global" },
      { src: "assets/logos/rcm.png",         url: "https://skylightrcm.com/", alt: "skyligh-RCM" },
      { src: "assets/logos/codezzi.png",     url: "https://www.codezzi.com/", alt: "Codezzi" },
      { src: "assets/logos/sky-reva.png",    url: "https://skyreva.com/",     alt: "SkyReva" },
      { src: "assets/logos/markettor.png",   url: "https://canvas.example.com", alt: "Marketor" },
      { src: "assets/logos/jlp.png",         url: "https://janitorialleadspro.com/", alt: "janitorial-leads-pro" },
      { src: "assets/logos/acdc.png",        url: "https://allcityductcleaning.com/", alt: "All-City-Duct-Cleaning" },
      { src: "assets/logos/freight.png",     url: "https://www.skyfreightsquad.com/", alt: "SwiftFlow" },
    ],
  },
];


/* ============================================================
   2. RENDER — builds each track from its logo list.
   ============================================================ */
const escAttr = s => (s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const MAX_REPEATS = 8; // safety cap so a broken/near-empty logo list can't loop forever

function buildLogoHTML(logos){
  return logos.map(l => `
    <a class="logo-slide"
       href="${escAttr(l.url)}"
       target="${escAttr(l.target || "_blank")}"
       rel="${escAttr(l.rel || "noopener noreferrer")}"
       aria-label="${escAttr(l.alt || "")}">
      <img src="${escAttr(l.src)}" alt="${escAttr(l.alt || "")}" loading="lazy" draggable="false">
    </a>
  `).join("");
}

function renderSlider(track, logos, repeats = 1){
  const oneSetHTML = buildLogoHTML(logos).repeat(repeats);
  // Render the (repeated) set TWICE back-to-back. Because
  // .slider-track has width:max-content, translateX of exactly
  // "one set's width" always lands on the seam between set 1 and
  // set 2 — the loop is seamless regardless of how many logos are
  // in the array or how wide/narrow each logo image is.
  track.innerHTML = oneSetHTML + oneSetHTML;
}

// Grows the repeat count until one full logo set is at least as
// wide as the viewport. Without this, a short logo list (or, say,
// broken placeholder images rendering as tiny icons) can leave a
// visible empty gap after the last logo before the loop wraps —
// there just isn't enough content yet to fill the visible row.
function ensureFillsViewport(track, viewport, logos, done){
  let repeats = 1;
  renderSlider(track, logos, repeats);

  function check(){
    const setWidth = track.scrollWidth / 2;
    const viewportWidth = viewport.clientWidth;
    if (setWidth < viewportWidth && repeats < MAX_REPEATS) {
      repeats++;
      renderSlider(track, logos, repeats);
      requestAnimationFrame(check); // re-check after the new DOM has laid out
    } else {
      done();
    }
  }
  requestAnimationFrame(check);
}

/* ============================================================
   3. MOTION ENGINE — one independent instance per .slider-track.
      Driving the slide with JS (instead of a CSS @keyframes
      animation) is what lets each belt be dragged: it's just one
      position variable written to translateX() every frame,
      whether it moves from auto-scroll or from a user drag.

      Behavior, per slider:
      - Glides automatically, honoring that track's own
        data-direction / data-speed attributes.
      - Hovering the belt pauses auto-scroll for that row only —
        other rows keep moving.
      - Click-and-drag / touch-and-drag slides the belt manually
        at any time; releasing resumes auto-scroll from there.
      - Clicking a logo (without dragging) still follows its link.
      - Respects prefers-reduced-motion: no auto-scroll, but
        dragging still works.
   ============================================================ */
function initMotion(track){
  const viewport = track.closest(".slider-viewport");

  const speedSeconds = parseFloat(track.dataset.speed) || 28;
  const reverse = track.dataset.direction === "reverse";
  const dirSign = reverse ? 1 : -1; // -1 = drifts left, +1 = drifts right

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  let halfWidth = 0;    // width of ONE logo set (track holds two sets)
  let pos = 0;           // current translateX, always kept within (-halfWidth, 0]
  let targetPos = 0;     // where the pointer says pos should be right now (drag only)
  let isHovering = false;
  let isDragging = false;
  let dragMoved = false;  // distinguishes a click from a drag, so links still work
  let dragStartX = 0;
  let dragStartPos = 0;
  let lastTimestamp = null;

  // Momentum: after release, the belt keeps coasting on its recent
  // drag velocity and decays to a stop (or hands off to auto-scroll).
  let velocity = 0;         // px/second, signed
  let isCoasting = false;
  let lastMoveX = 0;
  let lastMoveTime = 0;
  const FRICTION = 0.94;         // per-frame-at-60fps velocity decay
  const DRAG_SMOOTHING = 0.35;   // 0-1, how fast pos chases targetPos while dragging
  const MIN_COAST_VELOCITY = 12; // px/s below which coasting stops

  function measure(){
    halfWidth = track.scrollWidth / 2;
  }

  // Keeps pos inside (-halfWidth, 0] no matter how far it drifted,
  // so both auto-scroll and a big manual drag stay seamless.
  function wrap(p){
    if (!halfWidth) return 0;
    let m = p % halfWidth;
    if (m > 0) m -= halfWidth;
    return m;
  }

  function applyTransform(){
    track.style.transform = `translateX(${pos}px)`;
  }

  function tick(timestamp){
    if (lastTimestamp === null) lastTimestamp = timestamp;
    const dt = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    if (isDragging) {
      // Chase the pointer with a touch of lerp smoothing instead of
      // snapping straight to it — irons out jittery pointermove deltas.
      pos = wrap(pos + (targetPos - pos) * DRAG_SMOOTHING);
      applyTransform();
    } else if (isCoasting) {
      // Momentum: keep gliding on release velocity, decaying by friction.
      const frameDecay = Math.pow(FRICTION, dt * 60);
      velocity *= frameDecay;
      if (Math.abs(velocity) < MIN_COAST_VELOCITY || reducedMotionQuery.matches) {
        isCoasting = false;
      } else {
        pos = wrap(pos + velocity * dt);
        applyTransform();
      }
    } else {
      const shouldAutoScroll = !isHovering && !reducedMotionQuery.matches;
      if (shouldAutoScroll && halfWidth) {
        const pxPerSecond = halfWidth / speedSeconds;
        pos = wrap(pos + dirSign * pxPerSecond * dt);
        applyTransform();
      }
    }
    requestAnimationFrame(tick);
  }

  function startDrag(clientX, timestamp){
    isDragging = true;
    isCoasting = false;
    dragMoved = false;
    dragStartX = clientX;
    dragStartPos = pos;
    targetPos = pos;
    velocity = 0;
    lastMoveX = clientX;
    lastMoveTime = timestamp;
    viewport.classList.add("is-dragging");
  }

  function moveDrag(clientX, timestamp){
    if (!isDragging) return;
    const delta = clientX - dragStartX;
    if (Math.abs(delta) > 4) dragMoved = true; // small jitter still counts as a click
    targetPos = wrap(dragStartPos + delta);

    // Track instantaneous velocity from the last couple of samples
    // so release can carry that speed into the coast.
    const dt = (timestamp - lastMoveTime) / 1000;
    if (dt > 0) {
      const instVelocity = (clientX - lastMoveX) / dt;
      // Light smoothing so one noisy sample doesn't dominate the throw.
      velocity = velocity * 0.7 + instVelocity * 0.3;
    }
    lastMoveX = clientX;
    lastMoveTime = timestamp;
  }

  function endDrag(){
    if (!isDragging) return;
    isDragging = false;
    viewport.classList.remove("is-dragging");
    pos = targetPos;
    applyTransform();
    if (Math.abs(velocity) >= MIN_COAST_VELOCITY) {
      isCoasting = true;
    }
  }

  // Pointer Events cover mouse, touch, and pen in one API.
  viewport.addEventListener("pointerdown", (e) => {
    viewport.setPointerCapture(e.pointerId);
    startDrag(e.clientX, e.timeStamp);
  });
  viewport.addEventListener("pointermove", (e) => {
    if (isDragging) moveDrag(e.clientX, e.timeStamp);
  });
  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);

  // Suppress the click-through to a logo's link if the pointer
  // actually dragged the belt, so dragging never fires navigation.
  viewport.addEventListener("click", (e) => {
    if (dragMoved) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  viewport.addEventListener("mouseenter", () => { isHovering = true; });
  viewport.addEventListener("mouseleave", () => { isHovering = false; });

  // Re-measure any time the track's actual rendered size changes —
  // not just on window resize. This is what keeps the loop seamless:
  // <img> logos report width asynchronously as they load, fonts can
  // swap in, etc. A one-off measure() at boot would grab a wrong
  // (often 0 or too small) halfWidth and the belt would visibly
  // "reset" once the real width caught up. Watching continuously
  // means it's always correct, however/whenever content finishes loading.
  if (typeof ResizeObserver !== "undefined") {
    let rafId = null;
    const ro = new ResizeObserver(() => {
      // Coalesce bursts of resize events (e.g. several images
      // finishing in the same frame) into a single re-measure.
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const wasEmpty = !halfWidth;
        measure();
        if (!wasEmpty) pos = wrap(pos);
        if (isDragging) targetPos = wrap(targetPos);
      });
    });
    ro.observe(track);
  } else {
    // Fallback for older browsers without ResizeObserver support.
    window.addEventListener("resize", () => {
      const wasEmpty = !halfWidth;
      measure();
      if (!wasEmpty) pos = wrap(pos);
    });
  }

  // Belt-and-braces: once every logo image has actually finished
  // loading (or failed), force one final re-measure in case the
  // ResizeObserver's last update raced with the very last image.
  const imgs = track.querySelectorAll("img");
  Promise.all(Array.from(imgs).map(img => img.complete
    ? Promise.resolve()
    : new Promise(resolve => { img.addEventListener("load", resolve, { once: true }); img.addEventListener("error", resolve, { once: true }); })
  )).then(() => {
    const wasEmpty = !halfWidth;
    measure();
    if (!wasEmpty) pos = wrap(pos);
  });

  measure();
  applyTransform();
  requestAnimationFrame(tick);
}

/* ============================================================
   4. BOOT — one call per slider on the page. To add a third row:
      1) duplicate a <section class="logo-slider"> block in the
         HTML with a new track id + its own data-direction/data-speed
      2) add a matching { trackId, logos } entry to SLIDERS above.
   ============================================================ */
SLIDERS.forEach(({ trackId, logos }) => {
  const track = document.getElementById(trackId);
  if (!track) return;
  const viewport = track.closest(".slider-viewport");
  ensureFillsViewport(track, viewport, logos, () => initMotion(track));
});