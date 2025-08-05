const cdnPrefix = "https://cdn.jsdelivr.net/gh/allofusbhere/family-tree-images@main/";
let currentId = "100000";
let historyStack = [];

function loadImage(id) {
    currentId = id;
    const img = document.getElementById("mainImage");
    const infoBox = document.getElementById("infoBox");
    img.src = cdnPrefix + id + ".jpg";
    const name = localStorage.getItem(id + "_name") || "Name";
    const dob = localStorage.getItem(id + "_dob") || "DOB";
    infoBox.textContent = name + " (" + dob + ")";
    historyStack.push(id);
    loadGrid(id);
}

function loadGrid(baseId) {
    const grid = document.getElementById("grid");
    grid.innerHTML = "";
    let ids = [];

    const base = parseInt(baseId);
    const gen = Math.floor(base % 1000000 === 0 ? 100000 : base % 100000 === 0 ? 10000 : base % 10000 === 0 ? 1000 : 100);

    for (let i = 1; i <= 9; i++) {
        ids.push(base + i * gen);
    }

    ids.forEach(id => {
        const img = document.createElement("img");
        img.src = cdnPrefix + id + ".jpg";
        img.onerror = () => img.style.display = "none";
        img.ontouchstart = e => startX = e.touches[0].clientX;
        img.ontouchend = e => {
            let deltaX = e.changedTouches[0].clientX - startX;
            if (Math.abs(deltaX) > 50) {
                loadImage(id.toString());
            }
        };
        grid.appendChild(img);
    });
}

document.getElementById("mainImage").addEventListener("dblclick", () => {
    const name = prompt("Enter name:");
    const dob = prompt("Enter DOB:");
    if (name) localStorage.setItem(currentId + "_name", name);
    if (dob) localStorage.setItem(currentId + "_dob", dob);
    loadImage(currentId);
});

let startX = 0;
document.getElementById("mainImage").addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
});
document.getElementById("mainImage").addEventListener("touchend", e => {
    let deltaX = e.changedTouches[0].clientX - startX;
    if (Math.abs(deltaX) > 50) {
        const base = parseInt(currentId);
        const gen = Math.floor(base % 1000000 === 0 ? 100000 : base % 100000 === 0 ? 10000 : base % 10000 === 0 ? 1000 : 100);
        const newId = deltaX > 0 ? base + gen : base - gen;
        loadImage(newId.toString());
    }
});

window.onload = () => loadImage(currentId);
