// SwipeTree — Buttons Only (jsDelivr Image Fix)
// Loads images from https://cdn.jsdelivr.net/gh/allofusbhere/family-tree-images@main/ID.EXT
// with case-insensitive extension fallbacks. Focus: fix 'image not found' on GitHub Pages.

const CDN_BASE = "https://cdn.jsdelivr.net/gh/allofusbhere/family-tree-images@main/";
const EXT_CANDIDATES = [".jpg", ".JPG", ".jpeg", ".JPEG", ".png", ".PNG"];

// --- DOM
const anchorImg = document.getElementById("anchorImg");
const anchorCaption = document.getElementById("anchorCaption");
const grid = document.getElementById("grid");
const debugOut = document.getElementById("debugOut");

const btnParents  = document.getElementById("btnParents");
const btnSiblings = document.getElementById("btnSiblings");
const btnSpouse   = document.getElementById("btnSpouse");
const btnChildren = document.getElementById("btnChildren");
const btnBack     = document.getElementById("btnBack");

// --- State
let historyStack = [];
let anchorId = null;

// --- Utils
function dlog(...args) {
  debugOut.textContent += args.join(" ") + "\n";
}

function buildCandidates(id) {
  return EXT_CANDIDATES.map(ext => CDN_BASE + id + ext);
}

function setImageFromCandidates(imgEl, id, onDone) {
  const urls = buildCandidates(id);
  let idx = 0;
  function tryNext() {
    if (idx >= urls.length) {
      imgEl.removeAttribute("src");
      onDone?.(false, null);
      return;
    }
    const url = urls[idx++];
    imgEl.onload = () => onDone?.(true, url);
    imgEl.onerror = () => tryNext();
    imgEl.src = url;
  }
  tryNext();
}

function updateAnchor(id) {
  anchorId = id;
  anchorCaption.textContent = `${id}`;
  setImageFromCandidates(anchorImg, id, (ok, url) => {
    if (!ok) {
      anchorCaption.textContent = `${id} (image not found)`;
    } else {
      anchorCaption.textContent = `${id}`;
    }
  });
}

// --- Placeholder nav handlers (logic intentionally minimal — focus on image loading fix)
btnParents.onclick = () => {
  // For now, simply echo to grid for visibility.
  showList([anchorId], "Parents (demo)");
};
btnSiblings.onclick = () => {
  showList([anchorId], "Siblings (demo)");
};
btnSpouse.onclick = () => {
  // Try showing partner file anchorId.1 if it exists, else just display notice.
  const partnerId = `${anchorId}.1`;
  showList([partnerId], "Spouse (demo)");
};
btnChildren.onclick = () => {
  showList([anchorId], "Children (demo)");
};
btnBack.onclick = () => {
  if (historyStack.length > 0) {
    const prev = historyStack.pop();
    updateAnchor(prev);
  }
};

function showList(ids, title) {
  grid.innerHTML = "";
  ids.forEach(id => {
    const card = document.createElement("div");
    card.className = "grid-card";
    const wrap = document.createElement("div");
    wrap.className = "img-wrap";
    const img = document.createElement("img");
    wrap.appendChild(img);
    const cap = document.createElement("div");
    cap.className = "caption";
    cap.textContent = id;
    card.appendChild(wrap);
    card.appendChild(cap);
    grid.appendChild(card);

    setImageFromCandidates(img, id, (ok) => {
      if (!ok) cap.textContent = `${id} (image not found)`;
    });

    // Clicking a grid item becomes new anchor
    card.onclick = () => {
      historyStack.push(anchorId);
      const pureId = String(id).replace(/(\.1.*)$/, m => m); // keep as-is for now
      updateAnchor(pureId);
    };
  });
}

// --- Launch: prompt for starting ID
(function launch() {
  let start = (typeof sessionStorage !== "undefined") ? sessionStorage.getItem("swipetree_start_id") : null;
  if (!start) {
    start = prompt("Enter starting ID (e.g., 140000):", "140000") || "140000";
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem("swipetree_start_id", start);
  }
  updateAnchor(start);
})();
