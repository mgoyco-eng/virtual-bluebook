# Virtual Bluebook

A simplified, static assessment-writing webpage designed for GitHub Pages.

## What it does

- Collects Assignment Title, Teacher, Student Name, Date, Time, Class Code, and Programme (MYP/DP).
- Unlocks one large writing field after required student information is complete.
- Blocks normal copy, cut, paste, context-menu, and drag/drop actions in editable fields.
- Counts blocked attempts and includes the total in the final PDF.
- **Does not save student work in the browser.**
- Generates a letter-size PDF containing the student information and complete written response.
- Marks the bluebook Submitted and disables editing for the current open page session after final download.
- Allows the student to re-download the submitted PDF while that tab remains open.
- After submission, shows a **Start New Bluebook** button that clears the current page and starts a fresh blank bluebook.

## Important: no saving

Virtual Bluebook intentionally does not use browser storage for student work. If a student refreshes the page or closes the tab, everything entered on the page is deleted and cannot be recovered.

The page includes an on-screen warning and asks the browser to warn the student before leaving when unfinished work is present. Browsers control the exact wording and whether that leave-page warning is shown.

Students should download the final PDF before refreshing or closing the page.

## Files

- `index.html` — page structure and student warning
- `styles.css` — visual design
- `app.js` — bluebook behavior, anti-copy/paste, in-session submission lock, and reset
- `pdf.js` — self-contained PDF generator used to make the final work

## Publish on GitHub Pages

1. Create or open the `virtual-bluebook` GitHub repository.
2. Upload the updated files to the repository root, replacing files with the same names.
3. Commit the changes directly to the `main` branch.
4. GitHub Pages will rebuild the already-published site automatically.

## Testing before using with students

1. Fill in the required student fields.
2. Confirm the writing box unlocks.
3. Try Cmd/Ctrl + V, Cmd/Ctrl + C, right click, and drag/drop text.
4. Confirm the blocked-attempt number increases.
5. Type a short test response.
6. Refresh the page and confirm that the test response is gone.
7. Enter information again and click **Download Final Work**.
8. Confirm the PDF downloads and the page becomes read-only.
9. Confirm **Download Submitted Work** works while the tab remains open.
10. Click **Start New Bluebook** and confirm the page becomes blank again.

## About older Virtual Bluebook versions

Earlier versions used browser `localStorage` to autosave drafts and submitted reports. This version does not. On first load it also removes legacy Virtual Bluebook draft/submission entries created by those earlier versions on that browser.

## Assessment focus monitoring

Once the required student information (including the teacher-provided class code) is complete, the Bluebook begins monitoring whether the page remains the active tab/window. Focus interruptions are counted and students receive a notice when they return. Students may also use full-screen **Focus Mode**; exits from Focus Mode are counted separately. The final PDF includes an assessment activity summary with these counts and timestamps.

These indicators are a deterrent and a source of context for the teacher; they are not a secure lockdown browser and should not be treated as proof of misconduct by themselves. Browser and operating-system behavior can sometimes create focus events.
