
// SoftEdit.js - Long-press editing for SwipeTree (Name + DOB)
// Safe standalone module: does not modify swipe.js logic.

(function() {
  let pressTimer;
  const longPressTime = 500; // 0.5s

  function showEditModal(targetId) {
    const modal = document.createElement("div");
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.backgroundColor = "rgba(0,0,0,0.7)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = "9999";

    const form = document.createElement("div");
    form.style.background = "#fff";
    form.style.padding = "20px";
    form.style.borderRadius = "10px";
    form.style.textAlign = "center";
    form.innerHTML = `
      <h3>Edit Label</h3>
      <label>Name <input id="softedit-name" type="text"></label><br><br>
      <label>DOB <input id="softedit-dob" type="text" placeholder="YYYY-MM-DD"></label><br><br>
      <button id="softedit-cancel">Cancel</button>
      <button id="softedit-save">Save</button>
    `;

    modal.appendChild(form);
    document.body.appendChild(modal);

    document.getElementById("softedit-cancel").onclick = () => modal.remove();
    document.getElementById("softedit-save").onclick = async () => {
      const name = document.getElementById("softedit-name").value;
      const dob = document.getElementById("softedit-dob").value;
      await fetch("/.netlify/functions/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify({ id: targetId, name, dob })
      });
      modal.remove();
      location.reload();
    };
  }

  function attachLongPress(img, targetId) {
    img.addEventListener("touchstart", () => {
      pressTimer = setTimeout(() => showEditModal(targetId), longPressTime);
    });
    img.addEventListener("touchend", () => clearTimeout(pressTimer));
    img.addEventListener("mousedown", () => {
      pressTimer = setTimeout(() => showEditModal(targetId), longPressTime);
    });
    img.addEventListener("mouseup", () => clearTimeout(pressTimer));
  }

  window.addEventListener("load", () => {
    const idMatch = location.hash.match(/id=(\d+)/);
    const currentId = idMatch ? idMatch[1] : null;
    const anchor = document.getElementById("anchorImage") || document.querySelector("img");
    if (anchor && currentId) {
      attachLongPress(anchor, currentId);
    }
  });
})();
