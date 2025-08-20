document.addEventListener('DOMContentLoaded', () => {
  const idInput = document.getElementById('idInput');
  const startBtn = document.getElementById('startBtn');
  const backBtn = document.getElementById('backBtn');
  const anchor = document.getElementById('anchor');

  function loadImage(id) {
    anchor.textContent = "Loaded ID: " + id;
  }

  startBtn.addEventListener('click', () => {
    loadImage(idInput.value);
  });

  backBtn.addEventListener('click', () => {
    loadImage("Back pressed");
  });
});
