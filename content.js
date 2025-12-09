(function () {
  'use strict';

  let snRecording = false;
  let lastClickData = null;
  let hoverOverlay = null;
  let modalObserver = null;
  let activeModal = null;
  let blurOverlay = null;

  // Fun toast messages
  const toastMessages = [
    { icon: "🎬", text: "Lights, Camera, Action!" },
    { icon: "✨", text: "Magic is happening!" },
    { icon: "🚀", text: "Ready to capture awesomeness!" },
    { icon: "🎯", text: "Let's document this journey!" },
    { icon: "📸", text: "Say cheese! Recording started!" },
    { icon: "🎪", text: "Show time! Recording in progress!" },
    { icon: "🌟", text: "Capturing your workflow magic!" },
    { icon: "🎨", text: "Creating your masterpiece!" }
  ];

  // Show toast message at top of webpage
  function showToast() {
    try {
      console.log("Snappify: showToast() called");

      if (!document.body) {
        console.error("Snappify: document.body not ready yet");
        return;
      }

      // Remove existing toast if any
      const existingToast = document.getElementById("snappify-toast");
      if (existingToast && existingToast.parentNode) {
        existingToast.parentNode.removeChild(existingToast);
      }

      // Random message
      const randomToast = toastMessages[Math.floor(Math.random() * toastMessages.length)];
      console.log("Snappify: Selected toast message:", randomToast.text);

      // Create toast element
      const toast = document.createElement("div");
      toast.id = "snappify-toast";
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 20px 36px;
        border-radius: 16px;
        font-size: 18px;
        font-weight: 700;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        box-shadow: 0 10px 40px rgba(16, 185, 129, 0.4);
        z-index: 2147483646;
        display: flex;
        align-items: center;
        gap: 14px;
        pointer-events: none;
        animation: snappify-slide-down 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      `;

      // Icon
      const icon = document.createElement("span");
      icon.style.cssText = `
        font-size: 28px;
        animation: snappify-rotate 0.6s ease;
      `;
      icon.textContent = randomToast.icon;

      // Text
      const text = document.createElement("span");
      text.textContent = randomToast.text;

      toast.appendChild(icon);
      toast.appendChild(text);

      // Add keyframe animations
      if (!document.getElementById("snappify-toast-styles")) {
        const style = document.createElement("style");
        style.id = "snappify-toast-styles";
        style.textContent = `
          @keyframes snappify-slide-down {
            0% {
              transform: translateX(-50%) translateY(-100px);
              opacity: 0;
            }
            100% {
              transform: translateX(-50%) translateY(0);
              opacity: 1;
            }
          }
          
          @keyframes snappify-rotate {
            0% {
              transform: rotate(0deg) scale(1);
            }
            50% {
              transform: rotate(180deg) scale(1.2);
            }
            100% {
              transform: rotate(360deg) scale(1);
            }
          }
          
          @keyframes snappify-fade-up {
            to {
              opacity: 0;
              transform: translateX(-50%) translateY(-30px);
            }
          }
        `;
        if (document.head) {
          document.head.appendChild(style);
          console.log("Snappify: Added toast styles");
        }
      }

      document.body.appendChild(toast);
      console.log("Snappify: Toast appended to body - ", randomToast.text);

      // Remove after 2.5 seconds with fade out
      setTimeout(() => {
        toast.style.animation = "snappify-fade-up 0.4s ease forwards";
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
            console.log("Snappify: Toast removed");
          }
        }, 400);
      }, 2500);

    } catch (e) {
      console.error("Snappify: Failed to show toast", e);
    }
  }

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
      hoverOverlay.style.borderRadius = "4px";
      hoverOverlay.style.boxShadow = "0 0 0 2px rgba(255, 122, 89, 0.3)"; // Glow effect
      document.body.appendChild(hoverOverlay);
      console.log("Snappify: Overlay element created and appended to body");
    } catch (e) {
      console.error("Snappify: Failed to create overlay", e);
    }
  }

  // 🎯 Modal/Popup Detection and Background Blur
  function isModalElement(element) {
    if (!element || !element.classList) return false;

    const classList = element.className ? element.className.toString().toLowerCase() : '';
    const role = element.getAttribute('role');
    const ariaModal = element.getAttribute('aria-modal');

    // Check for common modal/popup patterns
    return (
      ariaModal === 'true' ||
      role === 'dialog' ||
      role === 'alertdialog' ||
      classList.includes('modal') ||
      classList.includes('popup') ||
      classList.includes('dialog') ||
      classList.includes('overlay') ||
      classList.includes('lightbox') ||
      element.tagName === 'DIALOG'
    );
  }

  function createBlurOverlay() {
    if (blurOverlay) return; // Already exists

    try {
      blurOverlay = document.createElement('div');
      blurOverlay.id = 'snappify-blur-overlay';
      blurOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        background: rgba(0, 0, 0, 0.5);
        z-index: 999999;
        pointer-events: none;
        opacity: 1;
      `;

      if (document.body) {
        document.body.appendChild(blurOverlay);
        console.log("✅ Snappify: Blur overlay added and visible!");
      } else {
        console.error("❌ Snappify: document.body not available for blur");
      }
    } catch (e) {
      console.error("❌ Snappify: Failed to create blur overlay:", e);
    }
  }

  function removeBlurOverlay() {
    try {
      if (blurOverlay && blurOverlay.parentNode) {
        blurOverlay.parentNode.removeChild(blurOverlay);
        blurOverlay = null;
        console.log("✅ Snappify: Blur overlay removed");
      }
    } catch (e) {
      console.error("❌ Snappify: Failed to remove blur:", e);
    }
  }

  function startModalObserver() {
    if (modalObserver) return; // Already running

    console.log("🔍 Snappify: Starting modal observer...");

    modalObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Check added nodes for modals
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) { // Element node
            console.log("🔍 Checking added element:", node.tagName, node.className);

            if (isModalElement(node)) {
              activeModal = node;
              createBlurOverlay();
              console.log("🎭 Snappify: Modal detected and blur applied!", node);
              break;
            }
          }
        }

        // Check removed nodes - if active modal was removed
        for (const node of mutation.removedNodes) {
          if (node === activeModal) {
            activeModal = null;
            removeBlurOverlay();
            console.log("🎭 Snappify: Modal removed and blur cleared");
            break;
          }
        }
      }
    });

    // Observe the entire document for modal additions/removals
    if (document.body) {
      modalObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false
      });
      console.log("✅ Snappify: Modal observer started successfully");
    } else {
      console.error("❌ Snappify: Cannot start modal observer - no document.body");
    }
  }

  function stopModalObserver() {
    if (modalObserver) {
      modalObserver.disconnect();
      modalObserver = null;
      removeBlurOverlay();
      activeModal = null;
      console.log("🛑 Snappify: Modal observer stopped");
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

        // Start modal detection and blur system
        startModalObserver();

        // Show fun toast message with delay to ensure DOM is ready
        setTimeout(() => {
          showToast();
        }, 100);

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

        // Stop modal observer and remove blur
        stopModalObserver();

        document.removeEventListener("mouseover", handleMouseOver);
        document.removeEventListener("click", handleClick, true);
        document.removeEventListener("keydown", handleKeydown, true);
        // document.removeEventListener("input", handleInput, true); // Removed as per new code
        console.log("Snappify: Recording disabled!");
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

      // Determine delay based on element type
      // Longer delay for dropdowns, popups, modals to fully open
      let screenshotDelay = 500; // Default delay increased from 100ms

      const tag = target.tagName ? target.tagName.toLowerCase() : "";
      const role = target.getAttribute("role");
      // Safely convert className to string
      const className = typeof target.className === 'string' ? target.className.toLowerCase() :
        target.className ? target.className.toString().toLowerCase() : '';

      // Detect elements that might trigger dropdowns/popups
      if (tag === "select" ||
        role === "combobox" ||
        role === "listbox" ||
        className.includes("dropdown") ||
        className.includes("select") ||
        className.includes("menu")) {
        screenshotDelay = 800; // Extra time for dropdowns
        console.log("Snappify: Detected dropdown - using 800ms delay");
      }

      // Detect buttons that might open modals/popups
      if ((tag === "button" || role === "button") &&
        (className.includes("modal") ||
          className.includes("popup") ||
          className.includes("dialog"))) {
        screenshotDelay = 800; // Extra time for modals
        console.log("Snappify: Detected modal trigger - using 800ms delay");
      }

      // Request screenshot after delay to allow UI updates
      setTimeout(() => {
        try {
          chrome.runtime.sendMessage({ type: "request-tab-screenshot" }).catch(() => {
            // Context might be invalidated - ignore
          });
        } catch (e) {
          console.error("Snappify: Failed to request screenshot", e);
        }
      }, screenshotDelay);
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

      // Better text extraction - check multiple sources
      let text = "";

      // Priority 1: aria-label (most reliable for icons/buttons)
      if (el.getAttribute("aria-label")) {
        text = el.getAttribute("aria-label");
      }
      // Priority 2: title attribute
      else if (el.getAttribute("title")) {
        text = el.getAttribute("title");
      }
      // Priority 3: alt for images
      else if (el.getAttribute("alt")) {
        text = el.getAttribute("alt");
      }
      // Priority 4: placeholder for inputs
      else if (el.getAttribute("placeholder")) {
        text = el.getAttribute("placeholder");
      }
      // Priority 5: value for inputs
      else if (el.value && el.value.trim()) {
        text = el.value;
      }
      // Priority 6: innerText (visible text)
      else if (el.innerText && el.innerText.trim()) {
        text = el.innerText.trim();
      }
      // Priority 7: textContent as fallback
      else if (el.textContent && el.textContent.trim()) {
        text = el.textContent.trim();
      }

      // Clean up text - remove extra spaces and line breaks
      text = text.replace(/\s+/g, ' ').trim();

      // Get class names and check for icon patterns
      // className can be a DOMTokenList or string, convert to string safely
      const className = typeof el.className === 'string' ? el.className.toLowerCase() :
        el.className ? el.className.toString().toLowerCase() : '';
      const role = el.getAttribute("role");

      // 🎯 ICON DETECTION - Recognize common icons by class, text, or pattern
      function detectIconType(element, txt, classes) {
        // Check parent element too
        const parent = element.parentElement;
        const parentClass = parent ? (parent.className || "").toLowerCase() : "";
        const parentLabel = parent ? (parent.getAttribute("aria-label") || "") : "";

        // Close/Exit/Dismiss icons
        if (txt === "×" || txt === "✕" || txt === "X" || txt === "x" ||
          classes.includes("close") || classes.includes("dismiss") || classes.includes("exit") ||
          parentClass.includes("close") || parentLabel.toLowerCase().includes("close")) {
          return "Close";
        }

        // Menu/Hamburger icons
        if (txt === "☰" || txt === "≡" ||
          classes.includes("menu") || classes.includes("hamburger") || classes.includes("nav-toggle") ||
          parentClass.includes("menu") || parentLabel.toLowerCase().includes("menu")) {
          return "Menu";
        }

        // Search icons
        if (txt === "🔍" || txt === "⌕" ||
          classes.includes("search") || classes.includes("magnify") ||
          parentClass.includes("search") || parentLabel.toLowerCase().includes("search")) {
          return "Search";
        }

        // Settings/Gear icons
        if (txt === "⚙" || txt === "⚙️" ||
          classes.includes("settings") || classes.includes("gear") || classes.includes("config") ||
          parentClass.includes("settings") || parentLabel.toLowerCase().includes("settings")) {
          return "Settings";
        }

        // Home icons
        if (txt === "🏠" || txt === "⌂" ||
          classes.includes("home") || parentClass.includes("home") || parentLabel.toLowerCase().includes("home")) {
          return "Home";
        }

        // User/Profile icons
        if (txt === "👤" || txt === "👥" ||
          classes.includes("user") || classes.includes("profile") || classes.includes("avatar") ||
          parentClass.includes("user") || parentClass.includes("profile") || parentLabel.toLowerCase().includes("profile")) {
          return "Profile";
        }

        // Edit/Pencil icons
        if (txt === "✏" || txt === "✎" || txt === "📝" ||
          classes.includes("edit") || classes.includes("pencil") ||
          parentClass.includes("edit") || parentLabel.toLowerCase().includes("edit")) {
          return "Edit";
        }

        // Delete/Trash icons
        if (txt === "🗑" || txt === "🗑️" ||
          classes.includes("delete") || classes.includes("trash") || classes.includes("remove") ||
          parentClass.includes("delete") || parentLabel.toLowerCase().includes("delete")) {
          return "Delete";
        }

        // Download icons
        if (txt === "⬇" || txt === "↓" || txt === "📥" ||
          classes.includes("download") || parentClass.includes("download") || parentLabel.toLowerCase().includes("download")) {
          return "Download";
        }

        // Upload icons
        if (txt === "⬆" || txt === "↑" || txt === "📤" ||
          classes.includes("upload") || parentClass.includes("upload") || parentLabel.toLowerCase().includes("upload")) {
          return "Upload";
        }

        // Add/Plus icons
        if (txt === "+" || txt === "➕" ||
          classes.includes("add") || classes.includes("plus") || classes.includes("create") ||
          parentClass.includes("add") || parentLabel.toLowerCase().includes("add")) {
          return "Add";
        }

        // Filter icons
        if (txt === "⊟" || txt === "☰" ||
          classes.includes("filter") || parentClass.includes("filter") || parentLabel.toLowerCase().includes("filter")) {
          return "Filter";
        }

        // Notifications/Bell icons
        if (txt === "🔔" || txt === "🔕" ||
          classes.includes("notification") || classes.includes("bell") || classes.includes("alert") ||
          parentClass.includes("notification") || parentLabel.toLowerCase().includes("notification")) {
          return "Notifications";
        }

        // Share icons
        if (txt === "⤴" || txt === "📤" ||
          classes.includes("share") || parentClass.includes("share") || parentLabel.toLowerCase().includes("share")) {
          return "Share";
        }

        // More/Options icons
        if (txt === "⋮" || txt === "⋯" || txt === "..." || txt === "•••" ||
          classes.includes("more") || classes.includes("options") || classes.includes("dots") ||
          parentClass.includes("more") || parentLabel.toLowerCase().includes("more")) {
          return "More options";
        }

        // Back/Previous icons
        if (txt === "←" || txt === "◀" || txt === "‹" ||
          classes.includes("back") || classes.includes("prev") || classes.includes("previous") ||
          parentClass.includes("back") || parentLabel.toLowerCase().includes("back")) {
          return "Back";
        }

        // Forward/Next icons
        if (txt === "→" || txt === "▶" || txt === "›" ||
          classes.includes("next") || classes.includes("forward") ||
          parentClass.includes("next") || parentLabel.toLowerCase().includes("next")) {
          return "Next";
        }

        // Info icons
        if (txt === "ℹ" || txt === "ℹ️" || txt === "i" ||
          classes.includes("info") || parentClass.includes("info") || parentLabel.toLowerCase().includes("info")) {
          return "Info";
        }

        // Help/Question icons
        if (txt === "?" || txt === "❓" ||
          classes.includes("help") || classes.includes("question") ||
          parentClass.includes("help") || parentLabel.toLowerCase().includes("help")) {
          return "Help";
        }

        // Check for generic icon classes
        if (classes.includes("icon") || classes.includes("fa-") || classes.includes("material-icons") ||
          tag === "svg" || tag === "i") {
          return "icon"; // Generic icon marker
        }

        return null;
      }

      // Check if this is an icon
      const iconType = detectIconType(el, text, className);

      if (iconType && iconType !== "icon") {
        // Found a specific icon type
        return `Click "${iconType}"`;
      }

      // Truncate if too long but keep meaningful length
      if (text.length > 50) {
        text = text.substring(0, 50);
      }

      // Simple, clear descriptions

      // Icons - SVG or i tags
      if (tag === "svg" || tag === "i") {
        // Check parent for better context
        const parent = el.parentElement;
        if (parent) {
          const parentLabel = parent.getAttribute("aria-label") || parent.getAttribute("title");
          if (parentLabel) {
            return `Click "${parentLabel}"`;
          }
        }
        if (text) {
          return `Click "${text}"`;
        }
        return "Click icon";
      }

      // Links
      if (tag === "a") {
        if (iconType === "icon" && text) {
          return `Click "${text}"`;
        }
        return text ? `Click "${text}"` : "Click link";
      }

      // Buttons
      if (tag === "button" || role === "button") {
        if (iconType === "icon" && text) {
          return `Click "${text}"`;
        }
        return text ? `Click "${text}"` : "Click button";
      }

      // Input fields
      if (tag === "input") {
        const type = el.type || "text";

        if (type === "submit" || type === "button") {
          return text ? `Click "${text}"` : "Click button";
        }
        if (type === "checkbox") {
          return text ? `Check "${text}"` : "Check box";
        }
        if (type === "radio") {
          return text ? `Select "${text}"` : "Select option";
        }
        // For text inputs
        return text ? `Type in "${text}"` : "Type in field";
      }

      // Select dropdown
      if (tag === "select") {
        return text ? `Select from "${text}"` : "Select dropdown";
      }

      // Images
      if (tag === "img") {
        return text ? `Click "${text}"` : "Click image";
      }

      // Textarea
      if (tag === "textarea") {
        return text ? `Type in "${text}"` : "Type in text area";
      }

      // Divs/spans with role (often used as buttons)
      if ((tag === "div" || tag === "span") && role) {
        if (iconType === "icon" && text) {
          return `Click "${text}"`;
        }
        return text ? `Click "${text}"` : "Click element";
      }

      // Default with text
      if (text) {
        return `Click "${text}"`;
      }

      // Final fallback
      return `Click ${tag || "element"}`;

    } catch (e) {
      console.error("Description error:", e);
      return "Click element";
    }
  }

  // 🎯 Smart Action Prediction - predicts next likely user action
  // This is a UNIQUE feature not available in other extensions!
  function predictNextAction(element, currentDescription) {
    try {
      const text = (element.innerText || element.textContent || element.value || "").toLowerCase().trim();
      const tag = element.tagName ? element.tagName.toLowerCase() : "";
      const type = element.type ? element.type.toLowerCase() : "";

      // Button predictions
      if (tag === "button" || type === "button" || type === "submit") {
        if (text.includes("add") || text.includes("new") || text.includes("create")) return "Enter required details in the form";
        if (text.includes("save") || text.includes("submit")) return "Review confirmation message";
        if (text.includes("edit") || text.includes("update")) return "Modify the information";
        if (text.includes("delete") || text.includes("remove")) return "Confirm the deletion";
        if (text.includes("login") || text.includes("sign in")) return "Navigate to the dashboard";
        if (text.includes("register") || text.includes("sign up")) return "Verify email or complete profile";
        if (text.includes("search") || text.includes("find")) return "Review search results";
        if (text.includes("download")) return "Check downloaded file";
        if (text.includes("upload")) return "Select file to upload";
        if (text.includes("next") || text.includes("continue")) return "Proceed to the next step";
        if (text.includes("cancel") || text.includes("back")) return "Return to previous page";
        if (text.includes("confirm") || text.includes("ok")) return "View updated content";
        return "Continue to the next step";
      }

      // Input field predictions
      if (tag === "input") {
        if (type === "email") return "Enter password to continue";
        if (type === "password") return "Click login or submit button";
        if (type === "search") return "Review search suggestions";
        if (type === "text") return "Fill in remaining fields";
        if (type === "checkbox" || type === "radio") return "Continue with selection";
        if (type === "file") return "Choose file from device";
        return "Complete the form";
      }

      // Link predictions
      if (tag === "a") {
        if (text.includes("home") || text.includes("dashboard")) return "View main dashboard";
        if (text.includes("profile") || text.includes("account")) return "Update account settings";
        if (text.includes("settings") || text.includes("preferences")) return "Modify configuration";
        if (text.includes("help") || text.includes("support")) return "Find answers to questions";
        if (text.includes("logout") || text.includes("sign out")) return "Exit the application";
        return "View linked page";
      }

      // Other element predictions
      if (tag === "select") return "Choose an option from the list";
      if (tag === "textarea") return "Type detailed information";

      // Default prediction
      return "Continue to the next step";
    } catch (e) {
      return "Continue to the next step";
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
