
const cdnPrefix = "https://cdn.jsdelivr.net/gh/allofusbhere/family-tree-images@main/";
let currentId = "100000";
let historyStack = [];

function loadImage(id, addToHistory = true) {
  if (addToHistory) historyStack.push(currentId);
  currentId = id;

  const img = document.getElementById("mainImage");
  const infoBox = document.getElementById("infoBox");
  img.src = cdnPrefix + id + ".jpg";

  const name = localStorage.getItem(id + "_name") || "Name";
  const dob = localStorage.getItem(id + "_dob") || "DOB";
  infoBox.textContent = name + " (" + dob + ")";
  loadGrid(id);
}

function loadGrid(baseId) {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";
  let ids = [];

  const base = parseInt(baseId);
  const gen = Math.floor(base % 1000000 === 0 ? 100000 :
                         base % 100000 === 0 ? 10000 :
                         base % 10000 === 0 ? 1000 : 100);

  for (let i = 1; i < 9; i++) {
    ids.push(base + i * gen);
  }

  ids.forEach(id => {
    const img = document.createElement("img");
    img.src = cdnPrefix + id + ".jpg";
    img.onerror = () => img.style.display = "none";
    img.onclick = () => loadImage(id);
    grid.appendChild(img);
  });
}

function getParentId(id) {
  const base = parseInt(id);
  if (base % 1000 !== 0) return base - (base % 100);
  if (base % 10000 !== 0) return base - (base % 1000);
  if (base % 100000 !== 0) return base - (base % 10000);
  return base - (base % 100000);
}

function goBack() {
  const previousId = historyStack.pop();
  if (previousId) {
    loadImage(previousId, false);
  }
}

function addSwipeListener() {
  let startX = 0;
  let startY = 0;

  const area = document.getElementById("mainImage");
  area.ontouchstart = e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  };
  area.ontouchend = e => {
    const deltaX = e.changedTouches[0].clientX - startX;
    const deltaY = e.changedTouches[0].clientY - startY;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > 50) loadGrid(currentId); // swipe left or right = siblings
    } else {
      if (deltaY > 50) loadGrid(currentId);           // swipe down = children
      else if (deltaY < -50) loadImage(getParentId(currentId)); // swipe up = parent
    }
  };
}

window.onload = () => {
  loadImage(currentId, false);
  addSwipeListener();

  document.getElementById("parent-btn").onclick = () => loadImage(getParentId(currentId));
  document.getElementById("children-btn").onclick = () => loadGrid(currentId);
  document.getElementById("siblings-btn").onclick = () => loadGrid(currentId);
  document.getElementById("spouse-btn").onclick = () => loadImage(currentId + ".1");
  document.getElementById("back-btn").onclick = goBack;
};
