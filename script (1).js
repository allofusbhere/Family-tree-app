
let currentId = "100000";
let historyStack = [];

function setImage(id) {
    currentId = id;
    historyStack.push(id);
    document.getElementById("mainImage").src = 
        `https://cdn.jsdelivr.net/gh/allofusbhere/family-tree-images@main/${id}.jpg`;
}

function getParentId(id) {
    let num = parseInt(id);
    if (num % 1000 === 0) return (num - 10000).toString();
    if (num % 100 === 0) return (num - 1000).toString();
    if (num % 10 === 0) return (num - 100).toString();
    return (num - 10).toString();
}

function getSiblingIds(id) {
    let num = parseInt(id);
    let generationFactor = [10000, 1000, 100, 10, 1].find(f => num % f === 0);
    let base = num - (num % (generationFactor * 10));
    return Array.from({length: 9}, (_, i) => {
        let sib = base + generationFactor * (i + 1);
        return sib !== num ? sib.toString() : null;
    }).filter(Boolean);
}

function getChildIds(id) {
    let num = parseInt(id);
    let childFactor = [10000, 1000, 100, 10, 1].find(f => num % f === 0) / 10;
    return Array.from({length: 9}, (_, i) => (num + childFactor * (i + 1)).toString());
}

function goToParent() {
    let parentId = getParentId(currentId);
    setImage(parentId);
}

function goToSiblings() {
    let siblings = getSiblingIds(currentId);
    let index = siblings.indexOf(currentId);
    let next = siblings[(index + 1) % siblings.length];
    setImage(next);
}

let childIndex = 0;
function goToChildren() {
    let children = getChildIds(currentId);
    if (children.length === 0) return;
    setImage(children[childIndex % children.length]);
    childIndex++;
}

function goBack() {
    historyStack.pop(); // current
    if (historyStack.length > 0) {
        setImage(historyStack.pop());
    }
}

// Initial load
window.onload = () => setImage(currentId);
