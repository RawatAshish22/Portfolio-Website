(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const smallViewport = window.matchMedia("(max-width: 720px)");
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const saveData = Boolean(connection && connection.saveData);
  const lowPowerDevice = Boolean(
    saveData ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4)
  );
  let lightMotion = reduceMotion || lowPowerDevice || smallViewport.matches;

  function syncPerformanceMode() {
    lightMotion = reduceMotion || lowPowerDevice || smallViewport.matches;
    document.documentElement.classList.toggle("performance-mode", lightMotion);
  }

  syncPerformanceMode();

  window.addEventListener("load", () => {
    document.body.classList.add("ready");
  });

  function setActiveNav() {
    const page = document.body.dataset.page;
    document.querySelectorAll("[data-nav]").forEach((link) => {
      link.classList.toggle("active", link.dataset.nav === page);
    });
  }

  function setupMobileNav() {
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".site-nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
      const isOpen = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    nav.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link) return;
      document.body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  }

  function setupPageTransitions() {
    document.querySelectorAll("a[href]").forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;
      const isExternal = link.target === "_blank" || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:");
      const isAsset = link.hasAttribute("download") || href.includes(".pdf");
      const isAnchor = href.startsWith("#");
      if (isExternal || isAsset || isAnchor) return;

      link.addEventListener("click", (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        document.body.classList.add("is-leaving");
        window.setTimeout(() => {
          window.location.href = href;
        }, reduceMotion ? 0 : 360);
      });
    });
  }

  function setupScrollProgress() {
    const progress = document.createElement("div");
    progress.className = "scroll-progress";
    progress.setAttribute("aria-hidden", "true");
    document.body.appendChild(progress);
    let ticking = false;

    function update() {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const amount = Math.min(window.scrollY / max, 1);
      progress.style.transform = `scaleX(${amount})`;
      ticking = false;
    }

    function requestUpdate() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
  }

  function setupScrollMotion() {
    if (lightMotion) return;
    const elements = Array.from(document.querySelectorAll("[data-scroll-speed]"));
    if (!elements.length) return;
    let ticking = false;

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function update() {
      const viewport = window.innerHeight || 1;
      elements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.bottom < -120 || rect.top > viewport + 120) return;
        const speed = Number(element.dataset.scrollSpeed || 0);
        const center = rect.top + rect.height / 2;
        const distance = (center - viewport / 2) / viewport;
        const shift = clamp(distance * speed, -54, 54);
        element.style.translate = `0 ${shift.toFixed(2)}px`;
      });
      ticking = false;
    }

    function requestUpdate() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
  }

  function setupCustomCursor() {
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (!finePointer || lightMotion) return;

    const dot = document.createElement("div");
    const ring = document.createElement("div");
    dot.className = "cursor-dot";
    ring.className = "cursor-ring";
    dot.setAttribute("aria-hidden", "true");
    ring.setAttribute("aria-hidden", "true");
    document.body.append(dot, ring);
    document.body.classList.add("custom-cursor");

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let raf = 0;
    let initialized = false;

    function move() {
      const follow = 0.48;
      ringX += (mouseX - ringX) * follow;
      ringY += (mouseY - ringY) * follow;
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      document.body.style.setProperty("--cursor-x", `${Math.round(mouseX)}px`);
      document.body.style.setProperty("--cursor-y", `${Math.round(mouseY)}px`);

      if (Math.abs(mouseX - ringX) < 0.2 && Math.abs(mouseY - ringY) < 0.2) {
        raf = 0;
        return;
      }

      raf = requestAnimationFrame(move);
    }

    function setCursorPosition(event) {
      mouseX = event.clientX;
      mouseY = event.clientY;
      if (!initialized) {
        ringX = mouseX;
        ringY = mouseY;
        initialized = true;
      }
      document.body.classList.add("cursor-ready");
      if (!raf) raf = requestAnimationFrame(move);
    }

    window.addEventListener("pointermove", setCursorPosition, { passive: true });
    window.addEventListener("pointerleave", () => {
      document.body.classList.remove("cursor-ready");
    });
    window.addEventListener("blur", () => {
      document.body.classList.remove("cursor-ready");
    });
    window.addEventListener("beforeunload", () => {
      if (raf) cancelAnimationFrame(raf);
    });
  }

  function setupReveal() {
    const elements = document.querySelectorAll(".reveal");
    if (!elements.length) return;
    if (!("IntersectionObserver" in window) || reduceMotion) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -60px 0px" });

    elements.forEach((element) => observer.observe(element));
  }

  function setupCounters() {
    const counters = document.querySelectorAll("[data-count]");
    if (!counters.length) return;

    const run = (counter) => {
      const target = Number(counter.dataset.count || 0);
      const suffix = counter.dataset.suffix || "";
      const compact = counter.dataset.format === "compact";
      const duration = reduceMotion ? 1 : lightMotion ? 550 : 1300;
      const start = performance.now();

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(target * eased);
        counter.textContent = compact ? `${Math.round(value / 100) / 10}k${suffix}` : `${value}${suffix}`;
        if (progress < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    };

    if (!("IntersectionObserver" in window)) {
      counters.forEach(run);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          run(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach((counter) => observer.observe(counter));
  }

  function setupTiltCards() {
    if (lightMotion || window.matchMedia("(pointer: coarse)").matches) return;
    const cards = document.querySelectorAll(".tilt-card");

    cards.forEach((card) => {
      let rect = null;
      let frame = 0;
      let nextTransform = "";

      function updateTilt() {
        card.style.transform = nextTransform;
        frame = 0;
      }

      card.addEventListener("pointerenter", () => {
        rect = card.getBoundingClientRect();
        card.classList.add("is-tilting");
      });

      card.addEventListener("pointermove", (event) => {
        if (!rect) rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        nextTransform = `perspective(900px) rotateX(${y * -4}deg) rotateY(${x * 5}deg) translateY(-2px)`;
        if (!frame) frame = requestAnimationFrame(updateTilt);
      });

      card.addEventListener("pointerleave", () => {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        rect = null;
        card.classList.remove("is-tilting");
        card.style.transform = "";
      });
    });
  }

  function setupFilters() {
    const buttons = document.querySelectorAll(".filter-button");
    const cards = document.querySelectorAll(".project-case");
    if (!buttons.length || !cards.length) return;

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.filter;
        buttons.forEach((item) => item.classList.toggle("active", item === button));
        cards.forEach((card) => {
          const shouldShow = filter === "all" || card.dataset.type === filter;
          card.classList.toggle("is-hidden", !shouldShow);
        });
      });
    });
  }

  function setupProjectVideos() {
    const slots = document.querySelectorAll("[data-video-src]");
    if (!slots.length) return;

    function loadVideo(slot) {
      if (slot.dataset.videoLoaded === "true") return;
      const video = slot.querySelector("video");
      const src = slot.dataset.videoSrc;
      if (!video || !src) return;

      slot.dataset.videoLoaded = "true";
      video.src = src;
      video.addEventListener("loadeddata", () => {
        slot.classList.add("has-video");
      });
      video.addEventListener("error", () => {
        slot.classList.remove("has-video");
      });
    }

    if (!("IntersectionObserver" in window)) {
      slots.forEach(loadVideo);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        loadVideo(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "420px 0px" });

    slots.forEach((slot) => observer.observe(slot));
  }

  function setupHeroCanvas() {
    const canvas = document.getElementById("heroCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const colors = ["#84ff8f", "#5dd9ff", "#ffbf55", "#ff7466", "#bfa8ff"];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let nodes = [];
    let raf = 0;
    let resizeRaf = 0;
    let lastFrame = 0;
    let canvasVisible = true;
    const isSmallCanvas = canvas.classList.contains("small-canvas");

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, isSmallCanvas || lightMotion ? 1 : 1.5);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const baseCount = Math.floor((width * height) / (isSmallCanvas ? 32000 : 26000));
      const minCount = isSmallCanvas || lightMotion ? 20 : 30;
      const maxCount = isSmallCanvas || lowPowerDevice ? 34 : 54;
      const count = Math.min(maxCount, Math.max(minCount, baseCount));
      nodes = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.34,
        vy: (Math.random() - 0.5) * 0.34,
        r: 1.4 + Math.random() * 2.8,
        color: colors[index % colors.length],
        phase: Math.random() * Math.PI * 2
      }));

      draw(performance.now());
    }

    function draw(time) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#090a08";
      ctx.fillRect(0, 0, width, height);

      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "rgba(247, 243, 232, 0.08)";
      ctx.lineWidth = 1;
      const step = 44;
      for (let x = (time * 0.006) % step; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = (time * 0.004) % step; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      nodes.forEach((node) => {
        if (!reduceMotion) {
          node.x += node.vx;
          node.y += node.vy;
          if (node.x < -20) node.x = width + 20;
          if (node.x > width + 20) node.x = -20;
          if (node.y < -20) node.y = height + 20;
          if (node.y > height + 20) node.y = -20;
        }
      });

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distanceSq = dx * dx + dy * dy;
          const maxDistance = isSmallCanvas || lightMotion ? 120 : 138;
          const maxDistanceSq = maxDistance * maxDistance;
          if (distanceSq < maxDistanceSq) {
            const distance = Math.sqrt(distanceSq);
            ctx.globalAlpha = (1 - distance / maxDistance) * 0.2;
            ctx.strokeStyle = i % 2 ? a.color : b.color;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      nodes.forEach((node) => {
        const pulse = reduceMotion ? 0.6 : 0.55 + Math.sin(time * 0.002 + node.phase) * 0.22;
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r + pulse, 0, Math.PI * 2);
        ctx.fill();
      });

      drawPanels(time);
    }

    function drawPanels(time) {
      const panels = [
        { x: width * 0.58, y: height * 0.18, w: 230, h: 92, c: "#84ff8f", t: "Product fit" },
        { x: width * 0.68, y: height * 0.48, w: 270, h: 106, c: "#5dd9ff", t: "SQL proof" },
        { x: width * 0.14, y: height * 0.62, w: 250, h: 98, c: "#ffbf55", t: "Ops impact" }
      ];

      panels.forEach((panel, index) => {
        const drift = reduceMotion ? 0 : Math.sin(time * 0.001 + index) * 8;
        const x = Math.min(width - panel.w - 18, Math.max(18, panel.x + drift));
        const y = Math.min(height - panel.h - 18, Math.max(18, panel.y - drift));
        ctx.globalAlpha = 0.84;
        ctx.fillStyle = "rgba(8, 9, 7, 0.72)";
        ctx.strokeStyle = "rgba(247, 243, 232, 0.18)";
        roundRect(ctx, x, y, panel.w, panel.h, 8);
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = panel.c;
        ctx.fillRect(x + 18, y + 18, panel.w * 0.42, 4);
        ctx.fillStyle = "rgba(247, 243, 232, 0.88)";
        ctx.font = "800 15px Inter, system-ui, sans-serif";
        ctx.fillText(panel.t, x + 18, y + 52);
        ctx.fillStyle = "rgba(247, 243, 232, 0.28)";
        ctx.fillRect(x + 18, y + 66, panel.w - 36, 4);
      });
    }

    function roundRect(context, x, y, w, h, r) {
      const radius = Math.min(r, w / 2, h / 2);
      context.beginPath();
      context.moveTo(x + radius, y);
      context.arcTo(x + w, y, x + w, y + h, radius);
      context.arcTo(x + w, y + h, x, y + h, radius);
      context.arcTo(x, y + h, x, y, radius);
      context.arcTo(x, y, x + w, y, radius);
      context.closePath();
    }

    function canAnimate() {
      return !reduceMotion && !lowPowerDevice && !smallViewport.matches && !isSmallCanvas;
    }

    function frameInterval() {
      return 34;
    }

    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    function animate(time) {
      if (!canAnimate() || !canvasVisible || document.hidden) {
        raf = 0;
        return;
      }

      if (time - lastFrame >= frameInterval()) {
        draw(time);
        lastFrame = time;
      }

      raf = requestAnimationFrame(animate);
    }

    function start() {
      if (raf || !canAnimate() || !canvasVisible || document.hidden) return;
      lastFrame = 0;
      raf = requestAnimationFrame(animate);
    }

    function requestResize() {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        resize();
        start();
      });
    }

    resize();
    window.addEventListener("resize", requestResize);
    function handleViewportChange() {
      syncPerformanceMode();
      stop();
      resize();
      start();
    }

    if (smallViewport.addEventListener) {
      smallViewport.addEventListener("change", handleViewportChange);
    } else if (smallViewport.addListener) {
      smallViewport.addListener(handleViewportChange);
    }

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        canvasVisible = entries.some((entry) => entry.isIntersecting);
        if (canvasVisible) {
          start();
        } else {
          stop();
        }
      }, { threshold: 0.02 });
      observer.observe(canvas);
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    });

    start();

    window.addEventListener("beforeunload", () => {
      stop();
    });
  }

  setActiveNav();
  setupMobileNav();
  setupPageTransitions();
  setupScrollProgress();
  setupScrollMotion();
  setupCustomCursor();
  setupReveal();
  setupCounters();
  setupTiltCards();
  setupFilters();
  setupProjectVideos();
  setupHeroCanvas();
})();
