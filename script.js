document.addEventListener("DOMContentLoaded", () => {
  const anchorImage = document.getElementById("anchor-image");
  const childGrid = document.getElementById("child-grid");
  const siblingGrid = document.getElementById("sibling-grid");
  const backButton = document.getElementById("back-button");
  let currentID = "100000";
  let historyStack = [];

  function padID(id) {
    return id.toString().padEnd(6, "0");
  }

  function loadImage(id, targetImg) {
    const baseUrl = "https://allofusbhere.github.io/Family-tree-app/";
    const tryExtensions = [".jpg", ".JPG"];

    function tryNextExtension(index) {
      if (index >= tryExtensions.length) {
        targetImg.src = baseUrl + "placeholder.jpg";
        return;
      }
      const url = baseUrl + id + tryExtensions[index];
      fetch(url, { method: "HEAD" }).then((res) => {
        if (res.ok) {
          targetImg.src = url;
        } else {
          tryNextExtension(index + 1);
        }
      });
    }

    tryNextExtension(0);
  }

  function loadAnchor(id) {
    currentID = id;
    historyStack.push(id);
    childGrid.innerHTML = "";
    siblingGrid.innerHTML = "";
    loadImage(id, anchorImage);
  }

  function getChildrenIDs(id) {
    let base = parseInt(id);
    let place = 1000;
    let children = [];
    for (let i = 1; i <= 9; i++) {
      children.push(padID(base + i * place));
    }
    return children;
  }

  function getSiblingIDs(id) {
    const num = parseInt(id);
    const siblingStart = Math.floor(num / 1000) * 1000;
    let siblings = [];
    for (let i = 1; i <= 9; i++) {
      const sibID = siblingStart + i * 1000;
      if (sibID !== num) {
        siblings.push(padID(sibID));
      }
    }
    return siblings;
  }

  function getParentID(id) {
    return padID(Math.floor(parseInt(id) / 1000) * 1000);
  }

  function displayGrid(grid, ids) {
    grid.innerHTML = "";
    ids.forEach((id) => {
      const img = document.createElement("img");
      loadImage(id, img);
      img.onclick = () => loadAnchor(id);
      grid.appendChild(img);
    });
  }

  document.getElementById("children-button").onclick = () => {
    const children = getChildrenIDs(currentID);
    displayGrid(childGrid, children);
  };

  document.getElementById("siblings-button").onclick = () => {
    const siblings = getSiblingIDs(currentID);
    displayGrid(siblingGrid, siblings);
  };

  document.getElementById("parent-button").onclick = () => {
    const parent = getParentID(currentID);
    if (parent !== currentID) {
      loadAnchor(parent);
    }
  };

  document.getElementById("back-button").onclick = () => {
    if (historyStack.length > 1) {
      historyStack.pop();
      const prev = historyStack.pop();
      loadAnchor(prev);
    }
  };

  loadAnchor(currentID);
});