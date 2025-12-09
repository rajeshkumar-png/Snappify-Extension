document.getElementById("startRec").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "start-recording" });
  document.getElementById("recordStatus").innerText = "Recording...";
});

document.getElementById("stopRec").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "stop-recording" });
  document.getElementById("recordStatus").innerText = "Stopped";
});

document.getElementById("exportRec").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "export-steps" });
});

document.getElementById("closeSidebar").addEventListener("click", () => {
  document.getElementById("myRecorderSidebar").style.display = "none";
});
