(function () {
  'use strict';

  let snRecording = false;
  let lastClickData = null;
  let hoverOverlay = null;
  let modalObserver = null;
  let activeModal = null;
  let blurOverlay = null;

  // // Fun toast messages
  // const toastMessages = [
  //   { icon: "🎬", text: "Lights, Camera, Action!" },
  //   { icon: "✨", text: "Magic is happening!" },
  //   { icon: "🚀", text: "Ready to capture awesomeness!" },
  //   { icon: "🎯", text: "Let's document this journey!" },
  //   { icon: "📸", text: "Say cheese! Recording started!" },
  //   { icon: "🎪", text: "Show time! Recording in progress!" },
  //   { icon: "🌟", text: "Capturing your workflow magic!" },
  //   { icon: "🎨", text: "Creating your masterpiece!" }
  // ];

  // Show toast message at top of webpage
  function showToast() {
    // Disabled - toastMessages array is commented out
    return;
  }

  // Show error toast message centered on webpage
  function showErrorToast(message) {
    try {
      console.log("Snappify: showErrorToast() called with message:", message);

      if (!document.body) {
        console.error("Snappify: document.body not ready yet");
        return;
      }

      // Remove existing error toast if any
      const existingToast = document.getElementById("snappify-error-toast");
      if (existingToast && existingToast.parentNode) {
        existingToast.parentNode.removeChild(existingToast);
      }

      // Create toast element
      const toast = document.createElement("div");
      toast.id = "snappify-error-toast";
      toast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 18px 24px;
        border-radius: 16px;
        font-size: 15px;
        font-weight: 600;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        box-shadow: 0 12px 40px rgba(102, 126, 234, 0.5);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 16px;
        pointer-events: auto;
        animation: snappify-error-slide-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        letter-spacing: 0.3px;
      `;

      // Message text
      const text = document.createElement("span");
      text.textContent = message;

      // Close button
      const closeBtn = document.createElement("button");
      closeBtn.textContent = "✕";
      closeBtn.style.cssText = `
        width: 24px;
        height: 24px;
        border-radius: 6px;
        border: none;
        background: rgba(255, 255, 255, 0.2);
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: 600;
        flex-shrink: 0;
        transition: all 0.2s;
      `;

      closeBtn.onmouseover = () => {
        closeBtn.style.background = "rgba(255, 255, 255, 0.3)";
        closeBtn.style.transform = "scale(1.1)";
      };

      closeBtn.onmouseout = () => {
        closeBtn.style.background = "rgba(255, 255, 255, 0.2)";
        closeBtn.style.transform = "scale(1)";
      };

      closeBtn.onclick = () => {
        if (toast && toast.parentNode) {
          toast.style.animation = "snappify-error-fade-out 0.3s ease forwards";
          setTimeout(() => {
            if (toast.parentNode) {
              toast.parentNode.removeChild(toast);
            }
          }, 300);
        }
      };

      toast.appendChild(text);
      toast.appendChild(closeBtn);

      // Add keyframe animations if not already added
      if (!document.getElementById("snappify-error-toast-styles")) {
        const style = document.createElement("style");
        style.id = "snappify-error-toast-styles";
        style.textContent = `
          @keyframes snappify-error-slide-in {
            0% {
              transform: translate(-50%, -50%) scale(0.8);
              opacity: 0;
            }
            100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
            }
          }
          
          @keyframes snappify-error-fade-out {
            to {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.9);
            }
          }
        `;
        if (document.head) {
          document.head.appendChild(style);
          console.log("Snappify: Added error toast styles");
        }
      }

      document.body.appendChild(toast);
      console.log("Snappify: Error toast appended to body");

      // Auto-remove after 4 seconds
      setTimeout(() => {
        if (toast && toast.parentNode) {
          toast.style.animation = "snappify-error-fade-out 0.3s ease forwards";
          setTimeout(() => {
            if (toast.parentNode) {
              toast.parentNode.removeChild(toast);
              console.log("Snappify: Error toast removed");
            }
          }, 300);
        }
      }, 4000);

    } catch (e) {
      console.error("Snappify: Failed to show error toast", e);
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
              // Check if truly visible to prevent false positives
              const style = window.getComputedStyle(node);
              if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                console.log("Snappify: Hidden modal detected - ignoring blur");
                continue;
              }

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
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
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

        // Show fun toast message with delay to ensure DOM is ready
        setTimeout(() => {
          showToast();
        }, 100);

        // document.addEventListener("mouseover", handleMouseOver); // Disabled hover highlight as requested
        document.addEventListener("click", handleClick, true); // Capture phase
        document.addEventListener("keydown", handleKeydown, true);
        document.addEventListener("blur", handleBlur, true); // Capture text entry on blur
        console.log("Snappify: Recording enabled!");
        sendResponse({ success: true });
      }
      if (msg.type === "disable-recording") {
        console.log("Snappify: Stopping recording...");
        snRecording = false;
        if (hoverOverlay) hoverOverlay.style.display = "none";

        // Stop modal observer and remove blur
        stopModalObserver();

        document.removeEventListener("mouseover", handleMouseOver); // Ensure removed
        document.removeEventListener("click", handleClick, true);
        document.removeEventListener("keydown", handleKeydown, true);
        document.removeEventListener("blur", handleBlur, true);
        console.log("Snappify: Recording disabled!");
        sendResponse({ success: true });
      }

      // Show error toast on web page
      if (msg.type === "show-error-toast") {
        console.log("Snappify: Showing error toast:", msg.message);
        showErrorToast(msg.message);
        sendResponse({ success: true });
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
    // Disabled feature
    return;
  }

  function handleClick(event) {
    try {
      if (!snRecording) return;
      // Don't capture click on inputs if we are going to capture blur later
      // But we usually want "Click input" then "Type text". Scribe does that.
      // So we keep Click.
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

  // Handle blur to capture typed text
  function handleBlur(event) {
    try {
      if (!snRecording) return;

      const target = event.target;
      if (!target) return;

      // Only care about inputs and textareas
      const tag = target.tagName ? target.tagName.toLowerCase() : "";
      if (tag !== "input" && tag !== "textarea") return;

      // Ignore non-text inputs (like checkbox, radio, button) - these are handled by click
      if (tag === "input") {
        const type = target.type;
        if (["checkbox", "radio", "button", "submit", "image", "reset", "hidden"].includes(type)) return;
      }

      // Get value
      const value = target.value;
      if (!value || value.trim() === "") return; // Don't capture empty inputs

      // Don't capture if password (security)
      if (target.type === "password") {
        // Maybe capture "Type password" but hide value
        // Let's rely on standard description for now or just generic
        // User requested "mention the entered data", so we do it for non-passwords
        return;
      }

      // Generate description
      const fieldName = getLabelForElement(target) || "field";
      const description = `Type "${value}" in "${fieldName}"`;

      console.log("Snappify: Capturing text entry:", description);
      captureInteraction(target, "input", null, null, description);

    } catch (e) {
      console.error("Snappify: Blur handler error", e);
    }
  }

  // Helper to find label for an element
  function getLabelForElement(el) {
    if (!el) {
      console.log("Snappify [Label Detection]: Element is null");
      return "";
    }

    console.log("Snappify [Label Detection]: Starting label detection for:", el.tagName, el.id || "(no id)", el.name || "(no name)");

    // Helper function to validate if text looks like a proper label
    function isValidLabel(text, source) {
      if (!text || !text.trim()) {
        console.log(`Snappify [Label Detection]: ${source} - Empty text, rejecting`);
        return false;
      }

      text = text.trim();

      // Length check - labels are typically short (1-50 chars)
      // Allow up to 100 chars for descriptive labels
      if (text.length < 1 || text.length > 100) {
        console.log(`Snappify [Label Detection]: ${source} - Invalid length (${text.length}), rejecting: "${text.substring(0, 50)}..."`);
        return false;
      }

      // Filter out common patterns that are NOT labels:

      // 1. URL-like text
      if (text.includes('http://') || text.includes('https://') || text.includes('www.')) {
        console.log(`Snappify [Label Detection]: ${source} - Contains URL, rejecting: "${text}"`);
        return false;
      }

      // 2. Email addresses
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
        console.log(`Snappify [Label Detection]: ${source} - Email address, rejecting: "${text}"`);
        return false;
      }

      // 3. Company/Organization names (usually contain "Ltd", "Inc", "Corp", etc.)
      const companyPatterns = /\b(limited|ltd|llc|inc|incorporated|corp|corporation|pvt|private|public|holdings|group|international|pvt\.?\s*ltd\.?|limited|electronics)\b/i;
      if (companyPatterns.test(text)) {
        console.log(`Snappify [Label Detection]: ${source} - Company name pattern detected, rejecting: "${text}"`);
        return false;
      }

      // 4. Full sentences or paragraphs (contains multiple sentence-ending punctuation)
      const sentenceCount = (text.match(/[.!?]+\s/g) || []).length;
      if (sentenceCount > 1) {
        console.log(`Snappify [Label Detection]: ${source} - Multiple sentences detected, rejecting: "${text.substring(0, 50)}..."`);
        return false;
      }

      // 5. Too many capital letters (like "BHARAT ELECTRONICS LIMITED")
      const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
      if (capsRatio > 0.7 && text.length > 10) {
        console.log(`Snappify [Label Detection]: ${source} - Too many capitals (${Math.round(capsRatio * 100)}%), likely org name, rejecting: "${text}"`);
        return false;
      }

      // 6. Contains too many numbers (like account numbers, IDs)
      const digitRatio = (text.match(/\d/g) || []).length / text.length;
      if (digitRatio > 0.5 && text.length > 5) {
        console.log(`Snappify [Label Detection]: ${source} - Too many digits (${Math.round(digitRatio * 100)}%), rejecting: "${text}"`);
        return false;
      }

      console.log(`Snappify [Label Detection]: ${source} - Valid label found: "${text}"`);
      return true;
    }

    // 1. Explicit label (for attribute) - HIGHEST PRIORITY
    if (el.id) {
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label && label.innerText && label.innerText.trim()) {
        const labelText = label.innerText.trim();
        if (isValidLabel(labelText, "Explicit label (for attribute)")) {
          return labelText;
        }
      }
    }

    // 2. Wrapped in label - SECOND PRIORITY
    const parentLabel = el.closest('label');
    if (parentLabel) {
      // Create a clone to remove the input itself from the text extraction
      const clone = parentLabel.cloneNode(true);
      const inputs = clone.querySelectorAll('input, select, textarea, button');
      inputs.forEach(i => i.remove());
      const labelText = clone.innerText.trim();
      if (isValidLabel(labelText, "Wrapped label")) {
        return labelText;
      }
    }

    // 3. Check for aria-label attribute - THIRD PRIORITY
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) {
      const labelText = ariaLabel.trim();
      if (isValidLabel(labelText, "Aria-label attribute")) {
        return labelText;
      }
    }

    // 4. Check for aria-labelledby attribute - FOURTH PRIORITY
    const ariaLabelledBy = el.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelElement = document.getElementById(ariaLabelledBy);
      if (labelElement && labelElement.innerText) {
        const labelText = labelElement.innerText.trim();
        if (isValidLabel(labelText, "Aria-labelledby reference")) {
          return labelText;
        }
      }
    }

    // 5. Visual Label Strategy: Look for label-like elements immediately preceding
    // Common pattern: <label>Name</label> <input> OR <div class="label">Name</div> <input>
    let sibling = el.previousElementSibling;
    if (sibling) {
      const tag = sibling.tagName.toLowerCase();

      // Only consider elements that are typically used as labels
      const labelLikeTags = ['label', 'span', 'div', 'p', 'legend', 'dt', 'th'];
      const className = sibling.className ? sibling.className.toString().toLowerCase() : '';
      const hasLabelClass = className.includes('label') || className.includes('field');

      if (labelLikeTags.includes(tag) || hasLabelClass) {
        const text = sibling.innerText ? sibling.innerText.trim() : "";
        if (isValidLabel(text, `Previous sibling (${tag}${hasLabelClass ? ' with label class' : ''})`)) {
          return text;
        }
      } else {
        console.log(`Snappify [Label Detection]: Previous sibling - Not a label-like element (${tag}), skipping`);
      }
    }

    // 6. Parent Strategy: Look within parent container for label elements
    const parent = el.parentElement;
    if (parent) {
      // 6a. Look for explicit label elements WITHIN the same parent
      const labelsInParent = parent.querySelectorAll('label:not([for]), .label, .field-label, .form-label');
      for (const labelEl of labelsInParent) {
        // Make sure this isn't the input itself and comes before it
        if (labelEl !== el && parent.contains(labelEl)) {
          // Check if label comes before the input in DOM order
          const labelPosition = Array.from(parent.children).indexOf(labelEl);
          const inputPosition = Array.from(parent.children).indexOf(el.closest(parent.children[0].tagName.toLowerCase()) || el);

          if (labelPosition < inputPosition) {
            const labelText = labelEl.innerText ? labelEl.innerText.trim() : "";
            if (isValidLabel(labelText, "Label in parent container")) {
              return labelText;
            }
          }
        }
      }

      // 6b. Check parent's data attributes
      const parentDataLabel = parent.getAttribute('data-label') || parent.getAttribute('data-field-name');
      if (parentDataLabel) {
        if (isValidLabel(parentDataLabel, "Parent data attribute")) {
          return parentDataLabel;
        }
      }
    }

    // 7. Placeholder attribute - LOWER PRIORITY (placeholders are hints, not labels)
    const placeholder = el.getAttribute('placeholder');
    if (placeholder && placeholder.trim()) {
      const labelText = placeholder.trim();
      if (isValidLabel(labelText, "Placeholder attribute")) {
        console.log("Snappify [Label Detection]: Using placeholder as fallback");
        return labelText;
      }
    }

    // 8. Name attribute - Convert to human-readable - LOWER PRIORITY
    if (el.name && el.name.trim()) {
      const nameAttr = el.name.trim();
      // Convert name like "user_email" or "userEmail" to "User Email"
      const labelText = nameAttr
        .replace(/[_-]/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      if (isValidLabel(labelText, "Name attribute (converted)")) {
        console.log("Snappify [Label Detection]: Using name attribute as fallback");
        return labelText;
      }
    }

    // 9. ID attribute - Convert to human-readable - LOWEST PRIORITY
    if (el.id && el.id.trim()) {
      const idAttr = el.id.trim();
      // Convert id like "userEmail" or "user-email" to "User Email"
      const labelText = idAttr
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      if (isValidLabel(labelText, "ID attribute (converted)")) {
        console.log("Snappify [Label Detection]: Using ID attribute as fallback");
        return labelText;
      }
    }

    console.log("Snappify [Label Detection]: No valid label found for element");
    return "";
  }

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

      // Smart text extraction - collect ALL possible text sources, then pick the best one
      let text = "";
      const isFormField = (tag === "input" || tag === "select" || tag === "textarea");

      // For form fields, ALWAYS prioritize the label first
      if (isFormField) {
        const label = getLabelForElement(el);
        if (label && label.trim()) {
          text = label.trim();
          console.log(`Snappify: Form field label found: "${text}"`);
        } else {
          console.log("Snappify: No label found for form field, checking other sources...");
        }
      }

      // If we still don't have text, check other sources
      if (!text) {
        // Check aria-label
        const ariaLabel = el.getAttribute("aria-label");
        if (ariaLabel && ariaLabel.trim()) {
          text = ariaLabel.trim();
          console.log(`Snappify: Using aria-label: "${text}"`);
        }
        // Check placeholder
        else if (el.getAttribute("placeholder")) {
          text = el.getAttribute("placeholder").trim();
          console.log(`Snappify: Using placeholder: "${text}"`);
        }
        // Check title
        else if (el.getAttribute("title")) {
          text = el.getAttribute("title").trim();
          console.log(`Snappify: Using title: "${text}"`);
        }
        // Check alt for images
        else if (el.getAttribute("alt")) {
          text = el.getAttribute("alt").trim();
        }
        // Check innerText (visible text)
        else if (el.innerText && el.innerText.trim()) {
          text = el.innerText.trim();
        }
        // Check textContent as fallback
        else if (el.textContent && el.textContent.trim()) {
          text = el.textContent.trim();
        }
      }

      // Clean up text - remove extra spaces and line breaks
      text = text.replace(/\s+/g, ' ').trim();

      // Fix for "Save" button showing as "a":
      // If we got a single letter like "a" (common if capturing 'a' tag name or short attribute)
      // but we have a longer innerText available, use that instead.
      if (text.length <= 1 && el.innerText && el.innerText.trim().length > 1) {
        text = el.innerText.trim();
      }

      // Get class names and check for icon patterns
      // className can be a DOMTokenList or string, convert to string safely
      const className = typeof el.className === 'string' ? el.className.toLowerCase() :
        el.className ? el.className.toString().toLowerCase() : '';
      const role = el.getAttribute("role");

      // 🎯 ICON DETECTION - Recognize common icons by class, text, or pattern
      function detectIconType(element, txt, classes) {
        // Check for specific tag types to avoid false positives on inputs
        const tagName = element.tagName ? element.tagName.toLowerCase() : "";
        if (tagName === "input" || tagName === "textarea" || tagName === "select") {
          // Inputs are rarely icons, unless type='image' or button
          if (tagName === "input" && (element.type === "image" || element.type === "button" || element.type === "submit")) {
            // allow check
          } else {
            return null;
          }
        }

        // Check parent element too
        const parent = element.parentElement;
        const parentClass = parent ? (parent.className || "").toLowerCase() : "";
        const parentLabel = parent ? (parent.getAttribute("aria-label") || "") : "";

        // Helper for exact class match or specific icon patterns
        // Avoids matching "background" when looking for "back"
        const hasClass = (str, token) => {
          const regex = new RegExp(`\\b${token}\\b`);
          return regex.test(str);
        };

        // Close/Exit/Dismiss icons
        if (txt === "×" || txt === "✕" || txt === "X" || txt === "x" ||
          hasClass(classes, "close") || hasClass(classes, "dismiss") || hasClass(classes, "exit") ||
          hasClass(parentClass, "close") || parentLabel.toLowerCase().includes("close")) {
          return "Close";
        }

        // Menu/Hamburger icons
        if (txt === "☰" || txt === "≡" ||
          hasClass(classes, "menu") || hasClass(classes, "hamburger") || hasClass(classes, "nav-toggle") ||
          hasClass(parentClass, "menu") || parentLabel.toLowerCase().includes("menu")) {
          return "Menu";
        }

        // Search icons
        if (txt === "🔍" || txt === "⌕" ||
          hasClass(classes, "search") || hasClass(classes, "magnify") ||
          hasClass(parentClass, "search") || parentLabel.toLowerCase().includes("search")) {
          return "Search";
        }

        // Settings/Gear icons
        if (txt === "⚙" || txt === "⚙️" ||
          hasClass(classes, "settings") || hasClass(classes, "gear") || hasClass(classes, "config") ||
          hasClass(parentClass, "settings") || parentLabel.toLowerCase().includes("settings")) {
          return "Settings";
        }

        // Home icons
        if (txt === "🏠" || txt === "⌂" ||
          hasClass(classes, "home") || hasClass(parentClass, "home") || parentLabel.toLowerCase().includes("home")) {
          return "Home";
        }

        // User/Profile icons
        if (txt === "👤" || txt === "👥" ||
          hasClass(classes, "user") || hasClass(classes, "profile") || hasClass(classes, "avatar") ||
          hasClass(parentClass, "user") || hasClass(parentClass, "profile") || parentLabel.toLowerCase().includes("profile")) {
          return "Profile";
        }

        // Edit/Pencil icons
        if (txt === "✏" || txt === "✎" || txt === "📝" ||
          hasClass(classes, "edit") || hasClass(classes, "pencil") ||
          hasClass(parentClass, "edit") || parentLabel.toLowerCase().includes("edit")) {
          return "Edit";
        }

        // Delete/Trash icons
        if (txt === "🗑" || txt === "🗑️" ||
          hasClass(classes, "delete") || hasClass(classes, "trash") || hasClass(classes, "remove") ||
          hasClass(parentClass, "delete") || parentLabel.toLowerCase().includes("delete")) {
          return "Delete";
        }

        // Download icons
        if (txt === "⬇" || txt === "↓" || txt === "📥" ||
          hasClass(classes, "download") || hasClass(parentClass, "download") || parentLabel.toLowerCase().includes("download")) {
          return "Download";
        }

        // Upload icons
        if (txt === "⬆" || txt === "↑" || txt === "📤" ||
          hasClass(classes, "upload") || hasClass(parentClass, "upload") || parentLabel.toLowerCase().includes("upload")) {
          return "Upload";
        }

        // Add/Plus icons
        if (txt === "+" || txt === "➕" ||
          hasClass(classes, "add") || hasClass(classes, "plus") || hasClass(classes, "create") ||
          hasClass(parentClass, "add") || parentLabel.toLowerCase().includes("add")) {
          return "Add";
        }

        // Filter icons
        if (txt === "⊟" || txt === "☰" ||
          hasClass(classes, "filter") || hasClass(parentClass, "filter") || parentLabel.toLowerCase().includes("filter")) {
          return "Filter";
        }

        // Notifications/Bell icons
        if (txt === "🔔" || txt === "🔕" ||
          hasClass(classes, "notification") || hasClass(classes, "bell") || hasClass(classes, "alert") ||
          hasClass(parentClass, "notification") || parentLabel.toLowerCase().includes("notification")) {
          return "Notifications";
        }

        // Share icons
        if (txt === "⤴" || txt === "📤" ||
          hasClass(classes, "share") || hasClass(parentClass, "share") || parentLabel.toLowerCase().includes("share")) {
          return "Share";
        }

        // More/Options icons
        if (txt === "⋮" || txt === "⋯" || txt === "..." || txt === "•••" ||
          hasClass(classes, "more") || hasClass(classes, "options") || hasClass(classes, "dots") ||
          hasClass(parentClass, "more") || parentLabel.toLowerCase().includes("more")) {
          return "More options";
        }

        // Back/Previous icons
        if (txt === "←" || txt === "◀" || txt === "‹" ||
          hasClass(classes, "back") || hasClass(classes, "prev") || hasClass(classes, "previous") ||
          hasClass(parentClass, "back") || parentLabel.toLowerCase().includes("back")) {
          return "Back";
        }

        // Forward/Next icons
        if (txt === "→" || txt === "▶" || txt === "›" ||
          hasClass(classes, "next") || hasClass(classes, "forward") ||
          hasClass(parentClass, "next") || parentLabel.toLowerCase().includes("next")) {
          return "Next";
        }

        // Info icons
        if (txt === "ℹ" || txt === "ℹ️" || txt === "i" ||
          hasClass(classes, "info") || hasClass(parentClass, "info") || parentLabel.toLowerCase().includes("info")) {
          return "Info";
        }

        // Help/Question icons
        if (txt === "?" || txt === "❓" ||
          hasClass(classes, "help") || hasClass(classes, "question") ||
          hasClass(parentClass, "help") || parentLabel.toLowerCase().includes("help")) {
          return "Help";
        }

        // Check for generic icon classes
        if (classes.includes("icon") || classes.includes("fa-") || classes.includes("material-icons") ||
          tagName === "svg" || tagName === "i") {
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

        // For text inputs - try harder to get a meaningful identifier
        if (!text || text.trim() === "") {
          // Try to get label one more time with explicit call
          const label = getLabelForElement(el);
          if (label && label.trim()) {
            text = label.trim();
          }
          // Fall back to name attribute
          else if (el.name && el.name.trim()) {
            // Convert name like "user_email" to "User Email"
            text = el.name.replace(/[_-]/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
          }
          // Fall back to id attribute
          else if (el.id && el.id.trim()) {
            // Convert id like "userEmail" or "user-email" to "User Email"
            text = el.id.replace(/([A-Z])/g, ' $1') // Add space before capital letters
              .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
              .trim()
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
          }
          // Check for nearby text (like a span or div before the input)
          else {
            const parent = el.parentElement;
            if (parent) {
              // Look for any text node or small text element near the input
              const textNodes = [];
              for (const child of parent.childNodes) {
                if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
                  textNodes.push(child.textContent.trim());
                } else if (child.nodeType === Node.ELEMENT_NODE && child !== el) {
                  const childText = child.innerText || child.textContent || '';
                  if (childText.trim() && childText.trim().length < 50) {
                    textNodes.push(childText.trim());
                  }
                }
              }
              if (textNodes.length > 0) {
                text = textNodes[0]; // Use the first text found
              }
            }
          }
        }

        // Return with the field identifier
        return text && text.trim() ? `Click "${text}" field` : `Click ${type} field`;
      }

      // Select dropdown
      if (tag === "select") {
        // Try harder to get a meaningful identifier if text is empty
        if (!text || text.trim() === "") {
          const label = getLabelForElement(el);
          if (label && label.trim()) {
            text = label.trim();
          }
          else if (el.name && el.name.trim()) {
            text = el.name.replace(/[_-]/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
          }
          else if (el.id && el.id.trim()) {
            text = el.id.replace(/([A-Z])/g, ' $1')
              .replace(/[_-]/g, ' ')
              .trim()
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
          }
        }
        return text && text.trim() ? `Select from "${text}"` : "Select dropdown";
      }

      // Images
      if (tag === "img") {
        return text ? `Click "${text}"` : "Click image";
      }

      // Textarea
      if (tag === "textarea") {
        // Try harder to get a meaningful identifier if text is empty
        if (!text || text.trim() === "") {
          const label = getLabelForElement(el);
          if (label && label.trim()) {
            text = label.trim();
          }
          else if (el.name && el.name.trim()) {
            text = el.name.replace(/[_-]/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
          }
          else if (el.id && el.id.trim()) {
            text = el.id.replace(/([A-Z])/g, ' $1')
              .replace(/[_-]/g, ' ')
              .trim()
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
          }
        }
        return text && text.trim() ? `Click "${text}" field` : "Click text area";
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
