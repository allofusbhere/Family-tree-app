// hotfix_anchor.js
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnStart");
  const input = document.getElementById("inputBase");
  const anchor = document.getElementById("anchor");

  btn.addEventListener("click", () => {
    const id = input.value.trim() || "100000";
    document.getElementById("anchorType").textContent = "person";
    anchor.src = id + ".jpg";
  });
});
