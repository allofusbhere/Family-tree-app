// hotfix_anchor.js (final)
// 1) Guarantee ui.anchorType exists
(function () {
  function ensureAnchorType() {
    var el = document.getElementById("anchorType");
    if (!el) {
      el = document.createElement("div");
      el.id = "anchorType";
      el.style.cssText =
        "position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;";
      document.body.appendChild(el);
    }
    if (!window.ui) window.ui = {};
    window.ui.anchorType = el;
    return el;
  }

  // 2) Patch HTMLImageElement.src so bare IDs resolve to .jpg
  (function patchImageSrc() {
    var desc = Object.getOwnPropertyDescriptor(
      HTMLImageElement.prototype,
      "src"
    );
    if (!desc || !desc.set || window.__swipetree_src_patched__) return;
    Object.defineProperty(HTMLImageElement.prototype, "src", {
      configurable: true,
      enumerable: true,
      get: desc.get,
      set: function (value) {
        try {
          if (
            typeof value === "string" &&
            !value.startsWith("data:") &&
            !/[.](jpg|jpeg|png|webp|gif)(\?|#|$)/i.test(value)
          ) {
            value = value + ".jpg";
          }
        } catch (e) {}
        return desc.set.call(this, value);
      },
    });
    window.__swipetree_src_patched__ = true;
  })();

  // 3) Wrap go() so anchorType is ensured right before run
  function patchGo() {
    if (typeof window.go !== "function") return false;
    var original = window.go;
    window.go = function () {
      ensureAnchorType();
      return original.apply(this, arguments);
    };
    return true;
  }

  // Run asap
  ensureAnchorType();
  if (!patchGo()) {
    document.addEventListener("DOMContentLoaded", patchGo, { once: true });
  }
})();
