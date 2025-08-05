let currentId = "100000";
let historyStack = [];

function padId(id) {
    return id.toString().padEnd(6, '0');
}

function loadPerson(id) {
    currentId = padId(id);
    document.getElementById("mainImage").src = getImageUrl(currentId);
    document.getElementById("name").innerText = localStorage.getItem(currentId + "_name") || "Name";
    document.getElementById("dob").innerText = localStorage.getItem(currentId + "_dob") || "DOB";
    clearGrid();
}

function clearGrid() {
    document.getElementById("grid").innerHTML = "";
}

function getImageUrl(id) {
    return `https://cdn.jsdelivr.net/gh/allofusbhere/family-tree-images@main/${id}.jpg`;
}

function showImages(ids) {
    clearGrid();
    const grid = document.getElementById("grid");
    ids.forEach(id => {
        const fullId = padId(id);
        const img = document.createElement("img");
        img.src = getImageUrl(fullId);
        img.onerror = () => img.style.display = "none";
        img.ondblclick = () => editInfo(fullId);
        img.onclick = () => {
            historyStack.push(currentId);
            loadPerson(fullId);
        };
        grid.appendChild(img);
    });
}

function calculateChildrenIds(id) {
    let base = parseInt(id);
    let children = [];
    for (let i = 1; i <= 9; i++) {
        let childId = base + i * 1000;
        children.push(childId.toString());
    }
    return children;
}

function calculateSiblingIds(id) {
    let base = Math.floor(parseInt(id) / 10000) * 10000;
    let siblings = [];
    for (let i = 1; i <= 9; i++) {
        let siblingId = base + i * 1000;
        if (siblingId.toString() !== id) {
            siblings.push(siblingId.toString());
        }
    }
    return siblings;
}

function calculateParentId(id) {
    return (Math.floor(parseInt(id) / 10000) * 10000).toString();
}

function showChildren() {
    const childrenIds = calculateChildrenIds(currentId);
    showImages(childrenIds);
}

function showSiblings() {
    const siblingIds = calculateSiblingIds(currentId);
    showImages(siblingIds);
}

function showParent() {
    const parentId = calculateParentId(currentId);
    if (parentId !== currentId) {
        historyStack.push(currentId);
        loadPerson(parentId);
    }
}

function goBack() {
    if (historyStack.length > 0) {
        const prevId = historyStack.pop();
        loadPerson(prevId);
    }
}

function editInfo(id) {
    const name = prompt("Enter name:", localStorage.getItem(id + "_name") || "");
    if (name !== null) localStorage.setItem(id + "_name", name);

    const dob = prompt("Enter date of birth:", localStorage.getItem(id + "_dob") || "");
    if (dob !== null) localStorage.setItem(id + "_dob", dob);

    if (id === currentId) loadPerson(id);
}

window.onload = () => loadPerson(currentId);