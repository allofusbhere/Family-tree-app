
let currentID = null;
let historyStack = [];

window.onload = function () {
  const startingID = prompt("Enter starting ID (e.g. 100000):");
  if (startingID && /^\d+(\.\d+)?$/.test(startingID)) {
    loadPerson(startingID);
  } else {
    alert("Invalid ID. Please reload and enter a numeric ID.");
  }
};

function loadPerson(id) {
  currentID = id;
  historyStack.push(id);
  document.getElementById("personName").textContent = localStorage.getItem(id + "_name") || "Person";
  const imgGrid = document.getElementById("imageGrid");
  imgGrid.innerHTML = "";
}

function goBack() {
  historyStack.pop();
  if (historyStack.length > 0) {
    loadPerson(historyStack.pop());
  }
}

function loadRelative(type) {
  const relatives = [];
  let base = parseFloat(currentID);

  switch (type) {
    case "parent":
      if (base % 1000 === 0) relatives.push((base - 1000).toString());
      break;
    case "siblings":
      if (base % 1000 !== 0) {
        const parent = base - (base % 1000);
        for (let i = 1; i <= 9; i++) {
          const sib = parent + i * 100;
          if (sib !== base) relatives.push(sib.toString());
        }
      }
      break;
    case "children":
      for (let i = 1; i <= 9; i++) {
        relatives.push((base + i * 1000).toString());
      }
      break;
    case "spouse":
      if (!currentID.includes(".1")) relatives.push(currentID + ".1");
      break;
  }

  const imgGrid = document.getElementById("imageGrid");
  imgGrid.innerHTML = "";
  relatives.forEach(id => {
    const img = document.createElement("img");
    img.src = `https://cdn.jsdelivr.net/gh/allofusbhere/family-tree-images@main/${id}.jpg`;
    img.onerror = () => img.style.display = "none";
    img.onclick = () => loadPerson(id);
    imgGrid.appendChild(img);
  });
}
