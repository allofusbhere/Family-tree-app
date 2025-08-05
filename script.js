
const cdnPrefix = "https://cdn.jsdelivr.net/gh/allofusbhere/family-tree-images@main/";
let currentId = "100000";
let historyStack = [];

function getGenerationStep(id) {
  const num = parseInt(id);
  if (num % 1000000 === 0) return 100000;
  if (num % 100000 === 0) return 10000;
  if (num % 10000 === 0) return 1000;
  if (num % 1000 === 0) return 100;
  if (num % 100 === 0) return 10;
  return 1;
}

function getParentId(id) {
  const step = getGenerationStep(id);
  return (parseInt(id) - (parseInt(id) % step)).toString();
}

function getRelativeIds(type) {
  const base = parseInt(currentId);
  const step = getGenerationStep(currentId);
  let ids = [];

  for (let i = 1; i <= 9; i++) {
    const offset = i * step;
    if (type === "children" || type === "siblings") {
      ids.push((base + offset).toString());
    }
  }

  return ids;
}

function showRelatives(type) {
  const grid = document.getElementById("imageGrid");
  grid.innerHTML = "";

  let ids = [];

  if (type === "parent") {
    ids = [getParentId(currentId)];
  } else {
    ids = getRelativeIds(type);
  }

  ids.forEach(id => {
    const img = document.createElement("img");
    img.src = cdnPrefix + id + ".jpg";
    img.onerror = () => img.style.display = "none";
    img.onclick = () => loadImage(id);
    grid.appendChild(img);
  });
}

function loadImage(id, addToHistory = true) {
  if (addToHistory) historyStack.push(currentId);
  currentId = id;

  const img = document.getElementById("mainImage");
  const name = localStorage.getItem(id + "_name") || "Name";
  const dob = localStorage.getItem(id + "_dob") || "DOB";
  document.getElementById("personName").textContent = name;
  document.getElementById("dob").textContent = dob;
  img.src = cdnPrefix + id + ".jpg";

  document.getElementById("imageGrid").innerHTML = "";
}

function goBack() {
  const previousId = historyStack.pop();
  if (previousId) loadImage(previousId, false);
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

    if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY > 50) {
      showRelatives("children"); // swipe down = children
    }
  };
}

window.onload = () => {
  loadImage(currentId, false);
  addSwipeListener();
};
