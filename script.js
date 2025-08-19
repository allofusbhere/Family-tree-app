(function(){
  let currentId = null;
  let imgBase = "./";
  const app = document.getElementById("app");
  const overlay = document.getElementById("startOverlay");
  document.getElementById("startBtn").onclick = () => {
    currentId = document.getElementById("startId").value.trim();
    imgBase = document.getElementById("imgBase").value.trim();
    overlay.style.display = "none";
    showImage(currentId);
  };

  function showImage(id){
    app.innerHTML = "";
    const img = document.createElement("img");
    img.src = imgBase + id + ".jpg";
    img.onerror = () => { img.src = imgBase + id + ".JPG"; };
    app.appendChild(img);
  }

  // Basic swipe listeners
  let touchStartX = 0, touchStartY = 0;
  document.addEventListener("touchstart", e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  });
  document.addEventListener("touchend", e => {
    let dx = e.changedTouches[0].screenX - touchStartX;
    let dy = e.changedTouches[0].screenY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 50) swipeRight();
      else if (dx < -50) swipeLeft();
    } else {
      if (dy > 50) swipeDown();
      else if (dy < -50) swipeUp();
    }
  });

  function swipeRight(){
    // spouse toggle: if .1 exists
    if(currentId.includes(".")){
      currentId = currentId.split(".")[0];
    } else {
      currentId = currentId + ".1";
    }
    showImage(currentId);
  }
  function swipeLeft(){
    alert("Siblings grid would open");
  }
  function swipeDown(){
    alert("Children grid would open");
  }
  function swipeUp(){
    alert("Parent grid would open");
  }
})();