(function () {
  let historyStack = [];

  function loadPerson(id) {
    const container = document.getElementById("image-container");
    container.innerHTML = `
      <img src="${id}.jpg" alt="ID ${id}" 
           onerror="this.src='placeholder.jpg'">
    `;
    document.getElementById("status").textContent = "Loaded ID: " + id;

    // track navigation
    if (historyStack.length === 0 || historyStack[historyStack.length - 1] !== id) {
      historyStack.push(id);
    }
  }

  function start() {
    const id = document.getElementById("idInput").value.trim();
    if (id) loadPerson(id);
  }

  function goBack() {
    if (historyStack.length > 1) {
      historyStack.pop(); // remove current
      const prev = historyStack.pop(); // go back one more
      if (prev) loadPerson(prev);
    }
  }

  // hook up buttons
  document.getElementById("startBtn").addEventListener("click", start);
  document.getElementById("backBtn").addEventListener("click", goBack);

  // allow pressing Enter in input
  document.getElementById("idInput").addEventListener("keyup", function (e) {
    if (e.key === "Enter") start();
  });

})();