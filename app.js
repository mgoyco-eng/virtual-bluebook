(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const els = {
    assignmentTitle: $("assignmentTitle"),
    teacher: $("teacher"),
    studentName: $("studentName"),
    date: $("date"),
    time: $("time"),
    classCode: $("classCode"),
    programme: $("programme"),
    workArea: $("workArea"),
    gateNotice: $("gateNotice"),
    responseText: $("responseText"),
    attemptCount: $("attemptCount"),
    saveStatus: $("saveStatus"),
    wordCount: $("wordCount"),
    downloadFinal: $("downloadFinal"),
    startNewBluebook: $("startNewBluebook"),
    documentStatus: $("documentStatus"),
    blockedDialog: $("blockedDialog"),
    blockedMessage: $("blockedMessage"),
    submitDialog: $("submitDialog"),
    newBluebookDialog: $("newBluebookDialog")
  };

  let blockedAttempts = 0;
  let isSubmitted = false;
  let submittedRecord = null;

  const editableFields = [
    els.assignmentTitle,
    els.teacher,
    els.studentName,
    els.classCode,
    els.programme,
    els.responseText
  ];

  function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatLocalTime(date) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit"
    }).format(date);
  }

  function populateDateTime(force = false) {
    const now = new Date();
    if (force || !els.date.value) els.date.value = formatLocalDate(now);
    if (force || !els.time.value) els.time.value = formatLocalTime(now);
  }

  function getCurrentData() {
    return {
      assignmentTitle: els.assignmentTitle.value.trimStart(),
      teacher: els.teacher.value.trimStart(),
      studentName: els.studentName.value.trimStart(),
      date: els.date.value,
      time: els.time.value,
      classCode: els.classCode.value.trimStart(),
      programme: els.programme.value,
      responseText: els.responseText.value,
      blockedAttempts
    };
  }

  function requiredInfoComplete() {
    return Boolean(
      els.assignmentTitle.value.trim() &&
      els.studentName.value.trim() &&
      els.date.value &&
      els.time.value &&
      els.classCode.value.trim()
    );
  }

  function responseComplete() {
    return els.responseText.value.trim().length > 0;
  }

  function hasUnsavedWork() {
    return Boolean(
      els.assignmentTitle.value.trim() ||
      els.teacher.value.trim() ||
      els.studentName.value.trim() ||
      els.classCode.value.trim() ||
      els.responseText.value.trim()
    );
  }

  function updateWordCount() {
    const trimmed = els.responseText.value.trim();
    const count = trimmed ? trimmed.split(/\s+/).length : 0;
    els.wordCount.textContent = `${count} ${count === 1 ? "word" : "words"}`;
  }

  function updateUIState() {
    els.attemptCount.textContent = String(blockedAttempts);

    if (isSubmitted) {
      document.body.classList.add("is-submitted");
      els.documentStatus.dataset.state = "submitted";
      els.documentStatus.querySelector("span:last-child").textContent = "Submitted";
      els.gateNotice.textContent = "This Virtual Bluebook has been submitted and is locked for this open session.";
      els.gateNotice.className = "gate-notice submitted";
      els.workArea.disabled = true;
      editableFields.forEach((field) => { field.disabled = true; });
      els.downloadFinal.disabled = false;
      els.downloadFinal.querySelector("span:first-child").textContent = "Download Submitted Report";
      els.startNewBluebook.hidden = false;
      els.saveStatus.textContent = "Submitted — PDF downloaded";
      return;
    }

    document.body.classList.remove("is-submitted");
    els.documentStatus.dataset.state = "draft";
    els.documentStatus.querySelector("span:last-child").textContent = "Draft";
    editableFields.forEach((field) => { field.disabled = false; });
    els.startNewBluebook.hidden = true;
    els.downloadFinal.querySelector("span:first-child").textContent = "Download Final Report";
    els.saveStatus.textContent = "Not saved — keep this tab open";

    const unlocked = requiredInfoComplete();
    els.workArea.disabled = !unlocked;
    els.gateNotice.className = unlocked ? "gate-notice unlocked" : "gate-notice";
    els.gateNotice.textContent = unlocked
      ? "Bluebook unlocked. Write your response directly below."
      : "Complete the required Student Information fields to unlock your bluebook.";

    els.downloadFinal.disabled = !(unlocked && responseComplete());
  }

  function clearLegacySavedData() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith("virtual-bluebook-draft-v1:") ||
          key.startsWith("virtual-bluebook-submitted-v1:")
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
      // If browser storage is unavailable, there is nothing to clear.
    }
  }

  function showBlocked(message) {
    blockedAttempts += 1;
    els.attemptCount.textContent = String(blockedAttempts);
    if (message) els.blockedMessage.textContent = message;
    if (typeof els.blockedDialog.showModal === "function") {
      if (!els.blockedDialog.open) els.blockedDialog.showModal();
    } else {
      alert(message || "That action is disabled in the Virtual Bluebook.");
    }
  }

  function protectedTarget(target) {
    return target && (
      target === els.responseText ||
      target.matches?.("input:not([readonly]), textarea, [contenteditable='true']")
    );
  }

  function blockClipboardEvents() {
    document.addEventListener("paste", (event) => {
      if (!protectedTarget(event.target) || isSubmitted) return;
      event.preventDefault();
      showBlocked("Pasting is disabled. Please type your own work directly in the Virtual Bluebook.");
    }, true);

    document.addEventListener("copy", (event) => {
      if (!protectedTarget(event.target) || isSubmitted) return;
      event.preventDefault();
      showBlocked("Copying from editable fields is disabled during this assessment.");
    }, true);

    document.addEventListener("cut", (event) => {
      if (!protectedTarget(event.target) || isSubmitted) return;
      event.preventDefault();
      showBlocked("Cutting text is disabled during this assessment.");
    }, true);

    document.addEventListener("drop", (event) => {
      if (!protectedTarget(event.target) || isSubmitted) return;
      event.preventDefault();
      showBlocked("Drag-and-drop text is disabled. Please type directly in the Virtual Bluebook.");
    }, true);

    document.addEventListener("dragover", (event) => {
      if (protectedTarget(event.target) && !isSubmitted) event.preventDefault();
    }, true);

    document.addEventListener("contextmenu", (event) => {
      if (!protectedTarget(event.target) || isSubmitted) return;
      event.preventDefault();
      showBlocked("The right-click menu is disabled in editable fields during this assessment.");
    }, true);

    document.addEventListener("keydown", (event) => {
      if (!protectedTarget(event.target) || isSubmitted) return;
      const shortcut = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (shortcut && ["v", "c", "x"].includes(key)) {
        event.preventDefault();
        const action = key === "v" ? "Pasting" : key === "c" ? "Copying" : "Cutting";
        showBlocked(`${action} is disabled during this assessment.`);
      }
    }, true);

    els.responseText.addEventListener("beforeinput", (event) => {
      if (isSubmitted) return;
      const blockedInputTypes = new Set([
        "insertFromPaste",
        "insertFromPasteAsQuotation",
        "insertFromDrop"
      ]);
      if (blockedInputTypes.has(event.inputType)) {
        event.preventDefault();
        showBlocked("Inserted text from the clipboard or drag-and-drop is disabled.");
      }
    });
  }

  function handleInput(event) {
    if (event.target === els.classCode) {
      const start = event.target.selectionStart;
      event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
      try { event.target.setSelectionRange(start, start); } catch { /* noop */ }
    }

    if (event.target === els.responseText) updateWordCount();
    updateUIState();
  }

  function displayDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return iso;
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(new Date(y, m - 1, d));
  }

  function generatePdf(data, submittedAt = new Date()) {
    if (!window.VirtualBluebookPDF?.generate) {
      throw new Error("PDF generator did not load.");
    }
    window.VirtualBluebookPDF.generate(data, submittedAt);
  }

  function submitAndDownload() {
    if (!requiredInfoComplete() || !responseComplete()) return;

    const data = getCurrentData();
    const submittedAt = new Date();

    try {
      generatePdf(data, submittedAt);
    } catch (error) {
      alert("The PDF could not be generated. Please tell your teacher before closing this page.");
      console.error(error);
      return;
    }

    submittedRecord = {
      ...data,
      status: "submitted",
      submittedAt: submittedAt.toISOString()
    };

    isSubmitted = true;
    updateUIState();
    if (els.submitDialog.open) els.submitDialog.close();
  }

  function downloadSubmittedCopy() {
    if (!submittedRecord) return;
    try {
      generatePdf(
        submittedRecord,
        submittedRecord.submittedAt ? new Date(submittedRecord.submittedAt) : new Date()
      );
    } catch (error) {
      console.error(error);
      alert("The submitted report could not be regenerated. Please tell your teacher before closing this page.");
    }
  }

  function resetBluebook() {
    isSubmitted = false;
    submittedRecord = null;
    blockedAttempts = 0;

    els.assignmentTitle.value = "";
    els.teacher.value = "";
    els.studentName.value = "";
    els.classCode.value = "";
    els.programme.value = "MYP";
    els.responseText.value = "";
    populateDateTime(true);
    updateWordCount();
    updateUIState();

    if (els.newBluebookDialog.open) els.newBluebookDialog.close();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function bindEvents() {
    editableFields.forEach((field) => field.addEventListener("input", handleInput));
    els.programme.addEventListener("change", handleInput);

    document.querySelector("[data-close-dialog]")?.addEventListener("click", () => els.blockedDialog.close());
    document.querySelector("[data-cancel-submit]")?.addEventListener("click", () => els.submitDialog.close());
    document.querySelector("[data-confirm-submit]")?.addEventListener("click", submitAndDownload);
    document.querySelector("[data-cancel-new]")?.addEventListener("click", () => els.newBluebookDialog.close());
    document.querySelector("[data-confirm-new]")?.addEventListener("click", resetBluebook);

    els.downloadFinal.addEventListener("click", () => {
      if (isSubmitted) {
        downloadSubmittedCopy();
        return;
      }
      if (typeof els.submitDialog.showModal === "function") els.submitDialog.showModal();
      else if (confirm("Submit, download, and lock this Virtual Bluebook for this open session?")) submitAndDownload();
    });

    els.startNewBluebook.addEventListener("click", () => {
      if (!isSubmitted) return;
      if (typeof els.newBluebookDialog.showModal === "function") els.newBluebookDialog.showModal();
      else if (confirm("Start a fresh Virtual Bluebook? The current page contents will be cleared.")) resetBluebook();
    });

    window.addEventListener("beforeunload", (event) => {
      if (!isSubmitted && hasUnsavedWork()) {
        event.preventDefault();
        event.returnValue = "";
      }
    });
  }

  clearLegacySavedData();
  populateDateTime();
  blockClipboardEvents();
  bindEvents();
  updateWordCount();
  updateUIState();
})();
