document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("start");
  const stopBtn = document.getElementById("stop");
  const closeBtn = document.getElementById("closeBtn");
  const settingsBtn = document.getElementById("settingsBtn");
  const livePreviewSection = document.getElementById("live-preview-section");
  const screenshotsContainer = document.getElementById("screenshots-container");
  const stepCounter = document.getElementById("step-counter");

  if (!startBtn || !stopBtn || !closeBtn || !settingsBtn) {
    console.error("One or more buttons not found in panel.html");
    return;
  }

  let capturedSteps = 0;

  startBtn.addEventListener("click", () => {
    console.log("Panel: Start button clicked");

    chrome.runtime.sendMessage({ type: "start-capture" }, (response) => {
      console.log("Panel: Message sent to background");
    });

    // Reset and show live preview section
    capturedSteps = 0;
    screenshotsContainer.innerHTML = "";
    stepCounter.textContent = "0";
    livePreviewSection.style.display = "block";

    startBtn.style.display = "none";
    stopBtn.style.display = "block";
  });

  stopBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "stop-capture" });

    // Hide live preview
    livePreviewSection.style.display = "none";

    stopBtn.style.display = "none";
    startBtn.style.display = "block";
  });

  closeBtn.addEventListener("click", () => {
    window.close();
  });

  settingsBtn.addEventListener("click", () => {
    alert("Settings feature coming soon!");
  });

  // Listen for new steps from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "new-step-captured") {
      capturedSteps++;
      addScreenshotToPreview(msg.step);
      stepCounter.textContent = capturedSteps.toString();
    }
  });

  function addScreenshotToPreview(step) {
    const screenshotItem = document.createElement("div");
    screenshotItem.className = "screenshot-item";

    const img = document.createElement("img");
    img.src = step.screenshot;
    img.alt = step.description;

    const description = document.createElement("div");
    description.className = "screenshot-description";
    description.textContent = step.description;

    const meta = document.createElement("div");
    meta.className = "screenshot-meta";
    meta.textContent = `Step ${capturedSteps}`;

    screenshotItem.appendChild(img);
    screenshotItem.appendChild(description);
    screenshotItem.appendChild(meta);

    screenshotsContainer.appendChild(screenshotItem);

    // Auto scroll to bottom
    screenshotsContainer.scrollTop = screenshotsContainer.scrollHeight;
  }

  const resizeBtns = document.querySelectorAll(".resize-btn");
  resizeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const width = parseInt(btn.getAttribute("data-width"));
      const height = parseInt(btn.getAttribute("data-height"));

      chrome.windows.getCurrent((window) => {
        chrome.windows.update(window.id, { width, height });
      });
    });
  });
});
