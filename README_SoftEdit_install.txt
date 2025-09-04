# SoftEdit Install Guide

This patch adds long-press editing of labels (Name + DOB) in SwipeTree.

## Files included
- index.html (adds script include for softedit.js)
- softedit.js (the editing logic)
- README_SoftEdit_install.txt (this file)

## Install steps
1. Upload all 3 files to the repo root (same folder as script.js, style.css, etc.).
2. Ensure Netlify function `/.netlify/functions/labels` is deployed (already working in Lab).
3. Deploy site as usual.
4. On iPad/iPhone: Long-press the anchor photo to bring up the edit modal.
