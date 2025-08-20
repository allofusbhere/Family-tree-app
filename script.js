// SwipeTree – Corrected Relationship Math (Safari-safe image loader)

(function(){
  const BUILD_TAG = (window.SWIPE_TREE_BUILD || 'rc1d-20250820');

  function imgUrl(id) {
    const base = `https://allofusbhere.github.io/family-tree-images/${id}`;
    return [`${base}.jpg?v=${BUILD_TAG}`, `${base}.JPG?v=${BUILD_TAG}`];
  }

  function loadImage(el, id) {
    const urls = imgUrl(id);
    function tryNext(i) {
      if (i >= urls.length) { el.src = ''; return; }
      el.onerror = () => tryNext(i+1);
      el.src = urls[i];
    }
    tryNext(0);
  }

  function getChildren(id) {
    const base = Math.floor(id/1000)*1000;
    return Array.from({length:9},(_,i)=> base + (i+1)*1000);
  }

  function getGrandChildren(id) {
    const base = Math.floor(id/100)*100;
    return Array.from({length:9},(_,i)=> base + (i+1)*100);
  }

  function getSiblings(id) {
    const base = Math.floor(id/10000)*10000;
    return Array.from({length:9},(_,i)=> base + (i+1)*10000).filter(x=>x!==id);
  }

  function showGrid(ids, title) {
    const overlay = document.getElementById('overlay');
    const grid = document.getElementById('grid');
    overlay.querySelector('h2').textContent = title;
    grid.innerHTML = '';
    ids.forEach(cid=>{
      const cell = document.createElement('div');
      cell.className = 'cell';
      const img = document.createElement('img');
      loadImage(img, cid);
      const cap = document.createElement('div');
      cap.textContent = cid;
      cell.appendChild(img);
      cell.appendChild(cap);
      grid.appendChild(cell);
    });
    overlay.style.display = 'block';
  }

  function closeOverlay(){document.getElementById('overlay').style.display='none';}

  function start(){
    const v = document.getElementById('startId').value;
    const id = parseInt(v,10);
    if(!id||id<100000) return;
    showGrid(getChildren(id), 'Children');
  }

  document.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('startBtn')?.addEventListener('click',start);
    document.getElementById('closeBtn')?.addEventListener('click',closeOverlay);
  });
})();