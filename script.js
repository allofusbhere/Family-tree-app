function start() {
  const id = document.getElementById("startId").value.trim();
  if (!id) return;
  document.getElementById("loadedId").innerText = "Loaded ID: " + id;
  showAnchor(id);
}

function goBack() {
  if (historyStack.length > 0) {
    const prev = historyStack.pop();
    showAnchor(prev);
  }
}

let historyStack = [];

function showAnchor(id) {
  const container = document.getElementById("anchorContainer");
  container.innerHTML = "";
  const img = document.createElement("img");
  img.src = `https://allofusbhere.github.io/family-tree-images/${id}.jpg`;
  img.onerror = () => {
    img.src = "https://allofusbhere.github.io/family-tree-images/placeholder.jpg";
  };
  container.appendChild(img);
}