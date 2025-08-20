// hotfix_anchor.js — enforce 6-digit minimum for image IDs
(function () {
  var desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  if (desc && desc.set && !window.__swipetree_src_patched__) {
    Object.defineProperty(HTMLImageElement.prototype, "src", {
      configurable: true,
      enumerable: true,
      get: desc.get,
      set: function (value) {
        try {
          if (
            typeof value === "string" &&
            !value.startsWith("data:") &&
            !/\.(jpg|jpeg|png|webp|gif)(\?|#|$)/i.test(value)
          ) {
            var v = value.trim();
            if (/^\d+$/.test(v) && v.length < 6) {
              while (v.length < 6) v += "0"; // pad trailing zeros
            }
            value = v + ".jpg";
          }
        } catch (e) {}
        return desc.set.call(this, value);
      },
    });
    window.__swipetree_src_patched__ = true;
  }
})();