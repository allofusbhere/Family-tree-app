window.onload = () => {
  let currentId = "100000";
  let historyStack = [];

  function loadImage(id, imgElement) {
    const exts = ['jpg', 'JPG'];
    let tried = 0;
    let loaded = false;
    for (let ext of exts) {
      const testImg = new Image();
      testImg.src = `${id}.${ext}`;
      testImg.onload = () => {
        if (!loaded) {
          imgElement.src = testImg.src;
          loaded = true;
        }
      };
      testImg.onerror = () => {
        tried++;
        if (tried === exts.length) imgElement.remove();
      };
    }
  }

  function loadPerson(id) {
    currentId = id;
    document.getElementById("personName").textContent = "Person";
    const mainImage = document.getElementById("mainImage");
    mainImage.src = "";
    loadImage(id, mainImage);
    document.getElementById("gridContainer").innerHTML = "";
  }

  function goToParent() {
    historyStack.push(currentId);
    if (currentId.includes(".")) {
      loadPerson(currentId.split(".")[0]);
      return;
    }
    let id = parseInt(currentId);
    let parentId = Math.floor(id / 1000) * 1000;
    if (parentId !== id) loadPerson(parentId.toString().padStart(currentId.length, "0"));
  }

  function showChildren() {
    document.getElementById("gridContainer").innerHTML = "";
    const base = parseInt(currentId);
    for (let i = 1; i <= 9; i++) {
      const childId = (base + i * 1000).toString().padStart(currentId.length, "0");
      const img = document.createElement("img");
      img.className = "gridImage";
      loadImage(childId, img);
      img.onclick = () => {
        historyStack.push(currentId);
        loadPerson(childId);
      };
      document.getElementById("gridContainer").appendChild(img);
    }
  }

  function showSiblings() {
    document.getElementById("gridContainer").innerHTML = "";
    const base = parseInt(currentId);
    const parentBase = Math.floor(base / 1000) * 1000;
    for (let i = 1; i <= 9; i++) {
      const sibId = (parentBase + i * 1000).toString().padStart(currentId.length, "0");
      if (sibId === currentId) continue;
      const img = document.createElement("img");
      img.className = "gridImage";
      loadImage(sibId, img);
      img.onclick = () => {
        historyStack.push(currentId);
        loadPerson(sibId);
      };
      document.getElementById("gridContainer").appendChild(img);
    }
  }

  function showSpouse() {
    historyStack.push(currentId);
    const altId = currentId.includes(".1") ? currentId.replace(".1", "") : currentId + ".1";
    loadPerson(altId);
  }

  function goBack() {
    if (historyStack.length > 0) {
      const prevId = historyStack.pop();
      loadPerson(prevId);
    }
  }

  window.goToParent = goToParent;
  window.showChildren = showChildren;
  window.showSiblings = showSiblings;
  window.showSpouse = showSpouse;
  window.goBack = goBack;

  loadPerson(currentId);
};
