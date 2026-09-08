# Virtual Bluebook

A simplified, static assessment-writing webpage designed for GitHub Pages.

## What it does

- Collects Assignment Title, Teacher, Student Name, Date, Time, Class Code, and Programme (MYP/DP).
- Unlocks one large writing field after required student information is complete.
- Blocks normal copy, cut, paste, context-menu, and drag/drop actions in editable fields.
- Counts blocked attempts and includes the total in the final PDF.
- Autosaves the draft to `localStorage` in the student's current browser.
- Generates a letter-size PDF containing the student information and complete written response.
- Marks the bluebook Submitted and disables editing in that same browser after final download.
- Allows the student to re-download the already-submitted PDF without reopening editing.

## Important limitation

This is a **static GitHub Pages version**. Its autosave and submission lock live in the student's browser (`localStorage`). The lock therefore persists on the same browser/device, but it is not a server-enforced security lock. A student could bypass it by clearing browser storage or opening the page in a different browser/device.

For a true teacher-controlled permanent lock, the next version should connect to a database/backend (for example Supabase) and store the submitted state there.

## Files

- `index.html` — page structure
- `styles.css` — visual design
- `app.js` — bluebook behavior, autosave, anti-copy/paste, PDF generation
- `pdf.js` — self-contained PDF generator used to make the final report

## Publish on GitHub Pages

1. Create a new GitHub repository (for example, `Virtual-Bluebook`).
2. Upload **all files** from this package to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)` folder, then save.
6. GitHub will provide the public website address.


## Reusing the same site for different assessments

The page supports an optional `assessment` value in the URL. Using a different value creates a separate local draft/lock, so the same GitHub Pages site can be reused without students seeing an old submitted bluebook.

Example:

`https://YOUR-USERNAME.github.io/Virtual-Bluebook/?assessment=forces-criterion-d-sept11`

For the next assessment, change only the final value, for example:

`https://YOUR-USERNAME.github.io/Virtual-Bluebook/?assessment=film-analysis-sept14`

Use the **same assessment link for every student completing that particular assessment**.

## Testing before using with students

Test these items in the same browser students will use:

1. Fill in the required student fields.
2. Confirm the writing box unlocks.
3. Try Cmd/Ctrl + V, Cmd/Ctrl + C, right click, and drag/drop text.
4. Confirm the blocked-attempt number increases.
5. Type a response and refresh; confirm the draft returns.
6. Click **Download Final Report** and confirm the PDF opens correctly.
7. Confirm the page becomes read-only after submission and remains locked after refresh.

## Resetting during your own testing

Because the static version stores state in the browser, use the browser's developer tools / site-data controls to clear storage for the page between tests. Do not build a visible reset button into the student-facing page unless you want students to have that ability.
