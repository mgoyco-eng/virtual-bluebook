(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const SESSION_ID = (params.get("assessment") || "default")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "default";
  const STORAGE_KEY = `virtual-bluebook-draft-v1:${SESSION_ID}`;
  const SUBMISSION_KEY = `virtual-bluebook-submitted-v1:${SESSION_ID}`;
  const SAVE_DELAY = 650;

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
    documentStatus: $("documentStatus"),
    blockedDialog: $("blockedDialog"),
    blockedMessage: $("blockedMessage"),
    submitDialog: $("submitDialog")
  };

  let blockedAttempts = 0;
  let isSubmitted = false;
  let saveTimer = null;
  let lastNormalInput = "";

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

  function populateDateTime() {
    const now = new Date();
    if (!els.date.value) els.date.value = formatLocalDate(now);
    if (!els.time.value) els.time.value = formatLocalTime(now);
  }

  function getDraft() {
    return {
      assignmentTitle: els.assignmentTitle.value.trimStart(),
      teacher: els.teacher.value.trimStart(),
      studentName: els.studentName.value.trimStart(),
      date: els.date.value,
      time: els.time.value,
      classCode: els.classCode.value.trimStart(),
      programme: els.programme.value,
      responseText: els.responseText.value,
      blockedAttempts,
      updatedAt: new Date().toISOString()
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
      els.gateNotice.textContent = "This Virtual Bluebook has been submitted and is locked in this browser.";
      els.gateNotice.className = "gate-notice submitted";
      els.workArea.disabled = true;
      editableFields.forEach((field) => { field.disabled = true; });
      els.downloadFinal.disabled = false;
      els.downloadFinal.querySelector("span:first-child").textContent = "Download Submitted Report";
      els.saveStatus.textContent = "Submitted — editing locked";
      return;
    }

    const unlocked = requiredInfoComplete();
    els.workArea.disabled = !unlocked;
    els.gateNotice.className = unlocked ? "gate-notice unlocked" : "gate-notice";
    els.gateNotice.textContent = unlocked
      ? "Bluebook unlocked. Write your response directly below."
      : "Complete the required Student Information fields to unlock your bluebook.";

    els.downloadFinal.disabled = !(unlocked && responseComplete());
  }

  function persistDraft(immediate = false) {
    if (isSubmitted) return;
    const save = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(getDraft()));
        els.saveStatus.textContent = `Saved ${formatLocalTime(new Date())}`;
      } catch {
        els.saveStatus.textContent = "Could not save in this browser";
      }
    };

    clearTimeout(saveTimer);
    if (immediate) save();
    else {
      els.saveStatus.textContent = "Saving…";
      saveTimer = setTimeout(save, SAVE_DELAY);
    }
  }

  function restoreState() {
    populateDateTime();

    try {
      const submitted = JSON.parse(localStorage.getItem(SUBMISSION_KEY) || "null");
      if (submitted && submitted.status === "submitted") {
        isSubmitted = true;
        applyStoredData(submitted);
        updateUIState();
        updateWordCount();
        return;
      }
    } catch { /* ignore corrupt local storage */ }

    try {
      const draft = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (draft) {
        applyStoredData(draft);
        els.saveStatus.textContent = "Draft restored from this browser";
      }
    } catch { /* ignore corrupt local storage */ }

    populateDateTime();
    updateUIState();
    updateWordCount();
  }

  function applyStoredData(data) {
    if (!data) return;
    els.assignmentTitle.value = data.assignmentTitle || "";
    els.teacher.value = data.teacher || "";
    els.studentName.value = data.studentName || "";
    els.date.value = data.date || els.date.value;
    els.time.value = data.time || els.time.value;
    els.classCode.value = data.classCode || "";
    els.programme.value = data.programme === "DP" ? "DP" : "MYP";
    els.responseText.value = data.responseText || "";
    blockedAttempts = Number.isFinite(Number(data.blockedAttempts)) ? Number(data.blockedAttempts) : 0;
    lastNormalInput = els.responseText.value;
  }

  function showBlocked(message) {
    blockedAttempts += 1;
    els.attemptCount.textContent = String(blockedAttempts);
    persistDraft(true);
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

    if (event.target === els.responseText) {
      lastNormalInput = els.responseText.value;
      updateWordCount();
    }

    updateUIState();
    persistDraft();
  }

  function safeFileName(value) {
    return (value || "Virtual Bluebook")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 _-]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 70) || "Virtual_Bluebook";
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

    const data = getDraft();
    const submittedAt = new Date();

    try {
      generatePdf(data, submittedAt);
    } catch (error) {
      alert("The PDF could not be generated. Please tell your teacher before closing this page.");
      console.error(error);
      return;
    }

    const submittedRecord = {
      ...data,
      status: "submitted",
      submittedAt: submittedAt.toISOString()
    };

    try {
      localStorage.setItem(SUBMISSION_KEY, JSON.stringify(submittedRecord));
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* PDF still downloaded even if local storage is unavailable */ }

    isSubmitted = true;
    updateUIState();
    if (els.submitDialog.open) els.submitDialog.close();
  }

  function downloadSubmittedCopy() {
    try {
      const stored = JSON.parse(localStorage.getItem(SUBMISSION_KEY) || "null");
      if (!stored) return;
      generatePdf(stored, stored.submittedAt ? new Date(stored.submittedAt) : new Date());
    } catch (error) {
      console.error(error);
      alert("The submitted report could not be regenerated in this browser.");
    }
  }

  function bindEvents() {
    editableFields.forEach((field) => field.addEventListener("input", handleInput));
    els.programme.addEventListener("change", handleInput);

    document.querySelector("[data-close-dialog]")?.addEventListener("click", () => els.blockedDialog.close());
    document.querySelector("[data-cancel-submit]")?.addEventListener("click", () => els.submitDialog.close());
    document.querySelector("[data-confirm-submit]")?.addEventListener("click", submitAndDownload);

    els.downloadFinal.addEventListener("click", () => {
      if (isSubmitted) {
        downloadSubmittedCopy();
        return;
      }
      if (typeof els.submitDialog.showModal === "function") els.submitDialog.showModal();
      else if (confirm("Submit, download, and lock this Virtual Bluebook?")) submitAndDownload();
    });

    window.addEventListener("pagehide", () => persistDraft(true));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") persistDraft(true);
    });
  }

  blockClipboardEvents();
  bindEvents();
  restoreState();
})();
