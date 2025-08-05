
let currentId = "100000";
let historyStack = [];
const imgElement = document.getElementById("mainImage");
const nameElement = document.getElementById("personName");
const dobElement = document.getElementById("personDOB");

const extensions = [".jpg", ".JPG", ".jpeg"];
const baseURL = "https://cdn.jsdelivr.net/gh/allofusbhere/family-tree-images@main/";

function tryLoadImage(id, callback) {
  let index = 0;

  function tryNext() {
    if (index >= extensions.length) {
      console.warn("Image not found:", id);
      imgElement.src = "https://via.placeholder.com/400x500.png?text=Image+Not+Found";
      return;
    }
    const url = baseURL + id + extensions[index];
    imgElement.onerror = () => {
      index++;
      tryNext();
    };
    imgElement.onload = () => {
      callback && callback();
    };
    imgElement.src = url;
  }

  tryNext();
}

function loadPerson(id) {
  currentId = id;
  historyStack.push(id);
  tryLoadImage(id);
  nameElement.innerText = localStorage.getItem(id + "_name") || "SwipeTree";
  dobElement.innerText = localStorage.getItem(id + "_dob") || "";
}

function goToParent() {
  let num = parseInt(currentId);
  let parentId = (Math.floor(num / 10000) * 10000).toString();
  if (parentId !== currentId) loadPerson(parentId);
}

function goToSiblings() {
  let base = Math.floor(parseInt(currentId) / 10000) * 10000;
  let siblings = [];
  for (let i = 1; i <= 9; i++) {
    let sibId = base + i * 1000;
    if (sibId !== parseInt(currentId)) siblings.push(sibId.toString());
  }
  if (siblings.length) loadPerson(siblings[0]);
}

function goToChildren() {
  let base = parseInt(currentId);
  for (let i = 1; i <= 9; i++) {
    let childId = (base + i * 1000).toString();
    loadPerson(childId);
    break;
  }
}

function goToSpouse() {
  loadPerson(currentId + ".1");
}

function goBack() {
  historyStack.pop();
  if (historyStack.length > 0) {
    loadPerson(historyStack.pop());
  }
}

imgElement.addEventListener("dblclick", () => {
  let name = prompt("Enter name:");
  let dob = prompt("Enter DOB:");
  if (name) localStorage.setItem(currentId + "_name", name);
  if (dob) localStorage.setItem(currentId + "_dob", dob);
  loadPerson(currentId);
});

window.onload = () => loadPerson(currentId);
