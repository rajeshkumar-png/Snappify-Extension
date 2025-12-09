(function () {
  'use strict';

  let snRecording = false;
  let lastClickData = null;
  let hoverOverlay = null;

  // Initialize overlay
  function createOverlay() {
    try {
      if (document.getElementById("snappify-overlay")) return;
      hoverOverlay = document.createElement("div");
      hoverOverlay.id = "snappify-overlay";
      hoverOverlay.style.position = "fixed";
      hoverOverlay.style.border = "3px solid #ff7a59"; // Thicker border
      hoverOverlay.style.backgroundColor = "rgba(255, 122, 89, 0.15)"; // More visible
      hoverOverlay.style.pointerEvents = "none";
      hoverOverlay.style.zIndex = "2147483647"; // Max z-index
      hoverOverlay.style.display = "none";
      hoverOverlay.style.transition = "all 0.1s ease";
      hoverOverlay.style.borderRadius = "44px";
      hoverOverlay.style.boxShadow = "0 0 0 2px rgba(255, 122, 89, 0.3)"; // Glow effect
      document.body.appendChild(hoverOverlay);
      console.log("Snappify: Overlay element created and appended to body");
    } catch (e) {
      console.error("Snappify: Failed to create overlay", e);
    }
  }

  // Start/stop from background
  chrome.runtime.onMessage.addListener((msg) => {
    try {
      console.log("Snappify: Message received:", msg.type);

      if (msg.type === "enable-recording") {
        console.log("Snappify: Starting recording...");
        snRecording = true;
        createOverlay();
        document.addEventListener("mouseover", handleMouseOver);
        document.addEventListener("click", handleClick, true); // Capture phase
        document.addEventListener("keydown", handleKeydown, true);
        // document.addEventListener("input", handleInput, true); // Removed as per new code
        console.log("Snappify: Recording enabled! Overlay created:", !!hoverOverlay);
      }
      if (msg.type === "disable-recording") {
        console.log("Snappify: Stopping recording...");
        snRecording = false;
        if (hoverOverlay) hoverOverlay.style.display = "none";
        document.removeEventListener("mouseover", handleMouseOver);
        document.removeEventListener("click", handleClick, true);
        document.removeEventListener("keydown", handleKeydown, true);
        // document.removeEventListener("input", handleInput, true); // Removed as per new code
        console.log("Snappify: Recording disabled");
      }

      // Background returned screenshot → annotate + send step
      if (msg.type === "screenshot-ready" && lastClickData) {
        console.log("Snappify: Screenshot received");
        annotateAndSendStep(msg.screenshot);
      }
    } catch (e) {
      console.error("Snappify: Message handler error", e);
    }
  });

  function handleMouseOver(event) {
    try {
      if (!snRecording) return;
      const target = event.target;
      if (!target || target === hoverOverlay) return;

      const rect = target.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;

      if (hoverOverlay && hoverOverlay.style) {
        hoverOverlay.style.display = "block";
        hoverOverlay.style.top = rect.top + window.scrollY + "px";
        hoverOverlay.style.left = rect.left + window.scrollX + "px";
        hoverOverlay.style.width = rect.width + "px";
        hoverOverlay.style.height = rect.height + "px";
        hoverOverlay.style.zIndex = "2147483647"; // Force max z-index
      }
    } catch (e) {
      // Silently ignore - mouseover errors shouldn't break the extension
    }
  }

  function handleClick(event) {
    try {
      if (!snRecording) return;
      captureInteraction(event.target, "click", event.clientX, event.clientY);
    } catch (e) {
      console.error("Snappify: Click handler error", e);
    }
  }

  function handleKeydown(event) {
    try {
      if (!snRecording) return;
      // Capture 'Enter' or 'Tab' as significant navigation steps
      if (event.key === "Enter" || event.key === "Tab") {
        captureInteraction(event.target, "keypress", null, null, `Press ${event.key}`);
      }
    } catch (e) {
      // Silently ignore keydown errors
    }
  }

  // Debounce input capture? For now, we might skip input events to avoid spam, 
  // or only capture on 'change' or 'blur'. Scribe often records "Type 'xyz'" on blur.
  // Let's stick to click and navigation keys for now to keep it clean.
  // function handleInput(event) {
  //   // Optional: could track what was typed for the description later
  // }

  function captureInteraction(target, type, clientX, clientY, customDesc) {
    try {
      if (!target) return;

      const rect = target.getBoundingClientRect();

      lastClickData = {
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        },
        clientX: clientX || (rect.left + rect.width / 2),
        clientY: clientY || (rect.top + rect.height / 2),
        url: location.href,
        timestamp: Date.now(),
        description: customDesc || generateAutoDescription(target)
      };

      console.log("Snappify: Captured interaction:", lastClickData.description);

      // Ask background for screenshot of current tab
      // Timeout to allow UI updates (clicks) to settle slightly?
      setTimeout(() => {
        try {
          chrome.runtime.sendMessage({ type: "request-tab-screenshot" }).catch(() => {
            // Context might be invalidated - ignore
          });
        } catch (e) {
          console.error("Snappify: Failed to request screenshot", e);
        }
      }, 100); // Increased delay for complex apps
    } catch (e) {
      console.error("Snappify: Capture interaction error", e);
    }
  }

  // Build final screenshot with highlight + dot, then send step
  function annotateAndSendStep(screenshotDataUrl) {
    try {
      if (!lastClickData) return;

      const img = new Image();
      img.src = screenshotDataUrl;

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);

          const scaleX = img.width / window.innerWidth;
          const scaleY = img.height / window.innerHeight;

          const r = lastClickData.rect;

          // Scribe-like Highlight element (Orange box with no fill)
          ctx.strokeStyle = "#ff7a59"; // Scribe Orange
          ctx.lineWidth = 5 * scaleX;
          ctx.strokeRect(
            r.left * scaleX,
            r.top * scaleY,
            r.width * scaleX,
            r.height * scaleY
          );

          // Optional: Add click indicator? Scribe is cleaner, just the box.
          // Let's add a subtle click effect if it was a click, or just leave the box.
          // We'll leave just the box for that professional look.

          const finalScreenshot = canvas.toDataURL("image/png");

          console.log("Snappify: Sending step to background, description:", lastClickData.description);

          chrome.runtime.sendMessage({
            type: "snappify-step",
            step: {
              screenshot: finalScreenshot,
              description: lastClickData.description,
              url: lastClickData.url,
              timestamp: lastClickData.timestamp
            }
          }).catch(() => {
            console.error("Snappify: Failed to send step to background");
          });

          lastClickData = null;
        } catch (e) {
          console.error("Snappify: Annotation error", e);
        }
      };

      img.onerror = () => {
        console.error("Snappify: Failed to load screenshot");
        lastClickData = null;
      };

    } catch (e) {
      console.error("Snappify: Screenshot processing error", e);
    }
  }

  function generateAutoDescription(el) {
    try {
      if (!el) return "Click element";

      const tag = el.tagName ? el.tagName.toLowerCase() : "";

      // Get text: innerText, value, aria-label, alt title
      let text = el.innerText || el.textContent || el.value ||
        el.getAttribute("aria-label") || el.getAttribute("placeholder") ||
        el.getAttribute("title") || el.getAttribute("alt") || "";
      text = text.trim().substring(0, 50); // Truncate

      // Refined Logic
      if (tag === "a") return text ? `Click link "${text}"` : "Click link";
      if (tag === "button" || el.getAttribute("role") === "button")
        return text ? `Click "${text}"` : "Click button";
      if (tag === "input") {
        const type = el.type || "text";
        if (type === "submit" || type === "button")
          return text ? `Click "${text}"` : "Click button";
        if (type === "checkbox") return text ? `Check "${text}"` : "Check box";
        if (type === "radio") return text ? `Select "${text}"` : "Select option";
        return text ? `Type in "${text}"` : "Type in field"; // For text inputs
      }
      if (tag === "select") return text ? `Select from "${text}"` : "Select from dropdown";
      if (tag === "img") return el.alt ? `Click image "${el.alt}"` : "Click image";
      if (tag === "textarea") return text ? `Type in "${text}"` : "Type in text area";

      return text ? `Click "${text}"` : `Click ${tag || "element"}`;
    } catch (e) {
      return "Click element";
    }
  }

  // Initialize on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      console.log("Snappify content script loaded");
    });
  } else {
    console.log("Snappify content script loaded");
  }

})();
