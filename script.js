
let currentId = "100000";
let historyStack = [];

function loadPerson(id) {
  currentId = id;
  historyStack.push(id);

  const anchor = document.getElementById("anchor-container");
  anchor.innerHTML = `<img src="${id}.jpg" onerror="this.src='placeholder.jpg'" ondblclick="editInfo('${id}')">`;

  document.getElementById("person-name").innerText = localStorage.getItem(id + "_name") || "Name";
  document.getElementById("person-dob").innerText = localStorage.getItem(id + "_dob") || "DOB";

  document.getElementById("grid-container").innerHTML = "";
}

function getGenerationFactor(id) {
  if (id.length < 6) return 10000;
  const zeros = id.match(/0+$/);
  if (!zeros) return 1;
  return Math.pow(10, zeros[0].length);
}

function goToParent() {
  const factor = getGenerationFactor(currentId);
  const parentId = String(Math.floor(Number(currentId) / factor) * factor);
  if (parentId !== currentId) {
    loadPerson(parentId);
  }
}

function goToSiblings() {
  const factor = getGenerationFactor(currentId);
  const base = Math.floor(Number(currentId) / factor) * factor;
  const siblings = [];

  for (let i = 1; i <= 9; i++) {
    const siblingId = String(base + i * (factor / 10));
    if (siblingId !== currentId) {
      siblings.push(siblingId);
    }
  }
  displayGrid(siblings);
}

function goToChildren() {
  const factor = getGenerationFactor(currentId);
  const childFactor = factor / 10;
  const base = Number(currentId);
  const children = [];

  for (let i = 1; i <= 9; i++) {
    const childId = String(base + i * childFactor);
    children.push(childId);
  }
  displayGrid(children);
}

function goBack() {
  if (historyStack.length > 1) {
    historyStack.pop();
    const previous = historyStack.pop();
    loadPerson(previous);
  }
}

function displayGrid(ids) {
  const container = document.getElementById("grid-container");
  container.innerHTML = "";
  ids.forEach(id => {
    const img = document.createElement("img");
    img.src = id + ".jpg";
    img.onerror = () => img.src = "placeholder.jpg";
    img.onclick = () => loadPerson(id);
    container.appendChild(img);
  });
}

function editInfo(id) {
  const name = prompt("Enter name:", localStorage.getItem(id + "_name") || "");
  const dob = prompt("Enter DOB:", localStorage.getItem(id + "_dob") || "");
  if (name) localStorage.setItem(id + "_name", name);
  if (dob) localStorage.setItem(id + "_dob", dob);
  loadPerson(id);
}

window.onload = () => loadPerson(currentId);
