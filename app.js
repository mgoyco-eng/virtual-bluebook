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
    focusLossCount: $("focusLossCount"),
    fullscreenExitCount: $("fullscreenExitCount"),
    monitoringStatus: $("monitoringStatus"),
    focusModeButton: $("focusModeButton"),
    saveStatus: $("saveStatus"),
    wordCount: $("wordCount"),
    downloadFinal: $("downloadFinal"),
    startNewBluebook: $("startNewBluebook"),
    documentStatus: $("documentStatus"),
    blockedDialog: $("blockedDialog"),
    blockedMessage: $("blockedMessage"),
    focusDialog: $("focusDialog"),
    focusMessage: $("focusMessage"),
    submitDialog: $("submitDialog"),
    newBluebookDialog: $("newBluebookDialog")
  };

  let blockedAttempts = 0;
  let focusLosses = 0;
  let fullscreenExits = 0;
  let focusLossEvents = [];
  let fullscreenExitEvents = [];
  let assessmentStartedAt = null;
  let assessmentStarted = false;
  let focusModeEverEntered = false;
  let wasFullscreen = false;
  let suppressFullscreenExitCount = false;
  let pendingFocusWarning = false;
  let lastFocusLossAt = 0;
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
      blockedAttempts,
      focusLosses,
      fullscreenExits,
      focusLossEvents: [...focusLossEvents],
      fullscreenExitEvents: [...fullscreenExitEvents],
      assessmentStartedAt: assessmentStartedAt ? assessmentStartedAt.toISOString() : null,
      focusModeEverEntered
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

  function startAssessmentMonitoring() {
    if (assessmentStarted || isSubmitted) return;
    assessmentStarted = true;
    assessmentStartedAt = new Date();
  }

  function updateMonitoringUI() {
    els.focusLossCount.textContent = String(focusLosses);
    els.fullscreenExitCount.textContent = String(fullscreenExits);

    if (isSubmitted) {
      els.monitoringStatus.textContent = "Monitoring ended when this bluebook was submitted.";
      els.focusModeButton.disabled = true;
      els.focusModeButton.textContent = "Focus Mode Ended";
      return;
    }

    if (!assessmentStarted) {
      els.monitoringStatus.textContent = "Monitoring begins when the bluebook unlocks.";
      els.focusModeButton.textContent = "Enter Focus Mode";
      return;
    }

    els.monitoringStatus.textContent = "Active — leaving this tab or window is recorded.";

    if (document.fullscreenElement) {
      els.focusModeButton.textContent = "Focus Mode Active";
      els.focusModeButton.classList.add("active");
    } else {
      els.focusModeButton.textContent = focusModeEverEntered ? "Re-enter Focus Mode" : "Enter Focus Mode";
      els.focusModeButton.classList.remove("active");
    }
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
      els.downloadFinal.querySelector("span:first-child").textContent = "Download Submitted Work";
      els.startNewBluebook.hidden = false;
      els.saveStatus.textContent = "Submitted — PDF downloaded";
      updateMonitoringUI();
      return;
    }

    document.body.classList.remove("is-submitted");
    els.documentStatus.dataset.state = "draft";
    els.documentStatus.querySelector("span:last-child").textContent = "Draft";
    editableFields.forEach((field) => { field.disabled = false; });
    els.startNewBluebook.hidden = true;
    els.downloadFinal.querySelector("span:first-child").textContent = "Download Final Work";
    els.saveStatus.textContent = "Not saved — keep this tab open";

    const unlocked = requiredInfoComplete();
    if (unlocked) startAssessmentMonitoring();
    els.workArea.disabled = !unlocked;
    els.gateNotice.className = unlocked ? "gate-notice unlocked" : "gate-notice";
    els.gateNotice.textContent = unlocked
      ? "Bluebook unlocked. Assessment focus monitoring is now active."
      : "Complete the required Student Information fields to unlock your bluebook.";

    els.downloadFinal.disabled = !(unlocked && responseComplete());
    updateMonitoringUI();
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

  function showFocusWarning(message) {
    if (!message) {
      message = `The Virtual Bluebook was no longer the active tab or window. This event has been recorded. Total focus interruptions: ${focusLosses}.`;
    }
    els.focusMessage.textContent = message;
    if (typeof els.focusDialog.showModal === "function") {
      if (!els.focusDialog.open) els.focusDialog.showModal();
    } else {
      alert(message);
    }
  }

  function recordFocusLoss(reason) {
    if (!assessmentStarted || isSubmitted) return;
    const now = Date.now();
    if (now - lastFocusLossAt < 700) return;
    lastFocusLossAt = now;
    focusLosses += 1;
    focusLossEvents.push({ at: new Date(now).toISOString(), reason });
    pendingFocusWarning = true;
    updateMonitoringUI();
  }

  function showPendingFocusWarning() {
    if (!pendingFocusWarning || document.hidden || isSubmitted) return;
    pendingFocusWarning = false;
    showFocusWarning();
  }

  function bindFocusMonitoring() {
    document.addEventListener("visibilitychange", () => {
      if (!assessmentStarted || isSubmitted) return;
      if (document.hidden) {
        recordFocusLoss("tab-hidden");
      } else {
        window.setTimeout(showPendingFocusWarning, 120);
      }
    });

    window.addEventListener("blur", () => {
      if (!assessmentStarted || isSubmitted) return;
      window.setTimeout(() => {
        if (!document.hidden && !document.hasFocus()) {
          recordFocusLoss("window-blur");
        }
      }, 180);
    });

    window.addEventListener("focus", () => {
      window.setTimeout(showPendingFocusWarning, 120);
    });

    document.addEventListener("fullscreenchange", () => {
      const nowFullscreen = Boolean(document.fullscreenElement);
      if (nowFullscreen) {
        wasFullscreen = true;
        focusModeEverEntered = true;
        updateMonitoringUI();
        return;
      }

      if (wasFullscreen) {
        wasFullscreen = false;
        if (assessmentStarted && !isSubmitted && !suppressFullscreenExitCount) {
          fullscreenExits += 1;
          fullscreenExitEvents.push({ at: new Date().toISOString(), reason: "fullscreen-exit" });
          updateMonitoringUI();
          showFocusWarning(`Focus Mode was exited. This event has been recorded. Total Focus Mode exits: ${fullscreenExits}.`);
        } else {
          updateMonitoringUI();
        }
      }
    });
  }

  async function enterFocusMode() {
    if (!assessmentStarted || isSubmitted || document.fullscreenElement) return;
    if (!document.documentElement.requestFullscreen) {
      showFocusWarning("Full-screen Focus Mode is not available in this browser. Tab and window focus monitoring is still active.");
      return;
    }

    try {
      await document.documentElement.requestFullscreen();
    } catch (error) {
      console.warn("Focus Mode could not be entered:", error);
      showFocusWarning("Focus Mode could not be started in this browser. Tab and window focus monitoring is still active.");
    }
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

    if (document.fullscreenElement && document.exitFullscreen) {
      suppressFullscreenExitCount = true;
      document.exitFullscreen().catch(() => {}).finally(() => {
        suppressFullscreenExitCount = false;
      });
    }
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
      alert("The submitted work could not be regenerated. Please tell your teacher before closing this page.");
    }
  }

  function resetBluebook() {
    if (document.fullscreenElement && document.exitFullscreen) {
      suppressFullscreenExitCount = true;
      document.exitFullscreen().catch(() => {}).finally(() => {
        suppressFullscreenExitCount = false;
      });
    }

    isSubmitted = false;
    submittedRecord = null;
    blockedAttempts = 0;
    focusLosses = 0;
    fullscreenExits = 0;
    focusLossEvents = [];
    fullscreenExitEvents = [];
    assessmentStartedAt = null;
    assessmentStarted = false;
    focusModeEverEntered = false;
    wasFullscreen = false;
    pendingFocusWarning = false;
    lastFocusLossAt = 0;

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
    document.querySelector("[data-close-focus-dialog]")?.addEventListener("click", () => els.focusDialog.close());
    document.querySelector("[data-cancel-submit]")?.addEventListener("click", () => els.submitDialog.close());
    document.querySelector("[data-confirm-submit]")?.addEventListener("click", submitAndDownload);
    document.querySelector("[data-cancel-new]")?.addEventListener("click", () => els.newBluebookDialog.close());
    document.querySelector("[data-confirm-new]")?.addEventListener("click", resetBluebook);

    els.focusModeButton.addEventListener("click", enterFocusMode);

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
  bindFocusMonitoring();
  bindEvents();
  updateWordCount();
  updateUIState();
})();
