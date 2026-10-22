Virtual Bluebook — iPad Focus Monitoring Fix

Upload app.js to your existing GitHub repository and replace the current app.js.
No other files need to change for this update.

What changed:
- iPad/iOS no longer treats the on-screen keyboard opening or tapping into an editable field as leaving the Bluebook.
- iPad/iOS uses a page-level Focus Mode rather than browser fullscreen, because Safari fullscreen can be disrupted by normal keyboard interactions.
- Genuine tab/app changes are still recorded through page visibility changes.
- Desktop/laptop Focus Mode behavior remains unchanged.

Suggested commit message:
Fix iPad focus monitoring
