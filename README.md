# SwipeTree rc1c-domguard — Primary build with DOM binding guard

This build prevents the `$(...).addEventListener is null` crash by **deferring event bindings**
until the target elements actually exist. It does this by temporarily intercepting
`document.querySelector` and `getElementById` to return a deferrable object rather than null,
then flushes those bindings on DOMContentLoaded.

Included (replace these 3):
- index.html — includes the DOM guard (before core), then loads `script.v132.js`, then `script.js`.
- style.css — iOS touch guards.
- script.js — swipes, autostart, image fallback (ignores favicon/index), NBSP cleanup.

Open after commit:
https://allofusbhere.github.io/Family-tree-app/index.html?v=rc1cdom#id=100000