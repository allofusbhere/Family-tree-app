
# SwipeTree Spouse Tracing Patch (array-of-two JSON)

This `script.js` reads `./spouse_link.json` as an array of pairs:

```
[
  ["140000", "240000"],
  ["100000", "200000"],
  ["150000", "150000.1"]
]
```

- First ID in each pair is the **root**; both spouses share the root's children.
- `.1` partners have **no lineage** unless they appear in the JSON.
- Right swipe target logic:
  1. If anchored on `.1` → base (return).
  2. Else if JSON spouse exists → JSON spouse.
  3. Else if `id.1.jpg` exists → display-only partner.
  4. Else → none.
