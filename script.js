// SwipeTree — Any Extension Loader Version
(function () {
  const historyStack = [];
  let currentId = "100000"; // default anchor
  const exts = ["jpg", "jpeg", "JPG", "JPEG"];
  const IMAGE_BASE = "https://allofusbhere.github.io/family-tree-images/";

  function resolveImageElement(id) {
    const img = new Image();
    let idx = 0;
    function tryNext() {
      if (idx >= exts.length) {
        img.src = "data:image/svg+xml;utf8,"+ encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
          <rect width="200" height="200" fill="#000"/>
          <circle cx="100" cy="78" r="42" fill="#222"/>
          <rect x="34" y="120" width="132" height="60" rx="18" fill="#222"/>
          <text x="100" y="190" fill="#666" font-size="14" text-anchor="middle">${id}</text>
          </svg>`);
        return;
      }
      img.src = IMAGE_BASE + id + "." + exts[idx] + "?v=" + Date.now();
      img.onerror = () => { idx++; tryNext(); };
    }
    tryNext();
    return img;
  }

  function showAnchor(id) {
    currentId = id;
    historyStack.push(id);
    const container = document.getElementById("anchor");
    container.innerHTML = "";
    const img = resolveImageElement(id);
    img.alt = id;
    img.className = "anchor-img";
    container.appendChild(img);
  }

  function goBack() {
    if (historyStack.length > 1) {
      historyStack.pop();
      const prev = historyStack.pop();
      showAnchor(prev);
    }
  }

  function bindGestures() {
    let touchStartX = 0;
    let touchStartY = 0;
    document.addEventListener("touchstart", e => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    });
    document.addEventListener("touchend", e => {
      let dx = e.changedTouches[0].screenX - touchStartX;
      let dy = e.changedTouches[0].screenY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 50) alert("Right swipe (spouse)");
        else if (dx < -50) alert("Left swipe (siblings)");
      } else {
        if (dy > 50) alert("Down swipe (children)");
        else if (dy < -50) alert("Up swipe (parents)");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const idInput = document.getElementById("idInput");
    const startBtn = document.getElementById("startBtn");
    startBtn.addEventListener("click", () => {
      const raw = (idInput.value || "").trim();
      showAnchor(raw || currentId);
    });
    document.getElementById("backBtn").addEventListener("click", goBack);
    showAnchor(currentId);
    bindGestures();
  });
})();