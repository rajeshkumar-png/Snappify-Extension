document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("start");
  const stopBtn = document.getElementById("stop");
  const closeBtn = document.getElementById("closeBtn");
  const settingsBtn = document.getElementById("settingsBtn");

  if (!startBtn || !stopBtn || !closeBtn || !settingsBtn) {
    console.error("One or more buttons not found in panel.html");
    return;
  }

  startBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "start-capture" });

    startBtn.style.display = "none";
    stopBtn.style.display = "block";
  });

  stopBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "stop-capture" });

    stopBtn.style.display = "none";
    startBtn.style.display = "block";
  });

  closeBtn.addEventListener("click", () => {
    window.close();
  });

  settingsBtn.addEventListener("click", () => {
    alert("Settings feature coming soon!");
  });

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
