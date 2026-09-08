(() => {
  "use strict";

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 54;
  const RESPONSE_LINE_HEIGHT = 16;

  const CP1252 = new Map([
    [0x20AC, 0x80], [0x201A, 0x82], [0x0192, 0x83], [0x201E, 0x84], [0x2026, 0x85],
    [0x2020, 0x86], [0x2021, 0x87], [0x02C6, 0x88], [0x2030, 0x89], [0x0160, 0x8A],
    [0x2039, 0x8B], [0x0152, 0x8C], [0x017D, 0x8E], [0x2018, 0x91], [0x2019, 0x92],
    [0x201C, 0x93], [0x201D, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
    [0x02DC, 0x98], [0x2122, 0x99], [0x0161, 0x9A], [0x203A, 0x9B], [0x0153, 0x9C],
    [0x017E, 0x9E], [0x0178, 0x9F]
  ]);

  function encodeWinAnsi(text) {
    const bytes = [];
    for (const char of String(text).normalize("NFC")) {
      const cp = char.codePointAt(0);
      if (CP1252.has(cp)) bytes.push(CP1252.get(cp));
      else if (cp <= 0xFF && !(cp >= 0x80 && cp <= 0x9F)) bytes.push(cp);
      else bytes.push(0x3F); // ? for characters outside WinAnsi
    }
    return new Uint8Array(bytes);
  }

  function concatBytes(parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
      out.set(part, offset);
      offset += part.length;
    }
    return out;
  }

  function esc(text) {
    return String(text ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/[\r\n]+/g, " ");
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
      year: "numeric", month: "long", day: "numeric"
    }).format(new Date(y, m - 1, d));
  }

  function formatSubmitted(date) {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
    }).format(date);
  }

  function wrapText(text, maxChars = 88) {
    const output = [];
    const paragraphs = String(text ?? "").replace(/\r\n?/g, "\n").split("\n");

    for (let p = 0; p < paragraphs.length; p += 1) {
      const paragraph = paragraphs[p];
      if (!paragraph.trim()) {
        output.push("");
        continue;
      }

      const words = paragraph.split(/\s+/);
      let line = "";
      for (let word of words) {
        while (word.length > maxChars) {
          if (line) {
            output.push(line);
            line = "";
          }
          output.push(word.slice(0, maxChars));
          word = word.slice(maxChars);
        }
        const candidate = line ? `${line} ${word}` : word;
        if (candidate.length <= maxChars) line = candidate;
        else {
          if (line) output.push(line);
          line = word;
        }
      }
      if (line) output.push(line);
    }
    return output;
  }

  function truncate(text, max = 42) {
    const value = String(text ?? "");
    return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
  }

  function textCmd(font, size, x, topY, text, color = "0.094 0.122 0.165") {
    const y = PAGE_H - topY;
    return `BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm (${esc(text)}) Tj ET\n`;
  }

  function lineCmd(x1, topY1, x2, topY2, gray = 0.88) {
    return `${gray} G ${x1} ${PAGE_H - topY1} m ${x2} ${PAGE_H - topY2} l S\n`;
  }

  function rectCmd(x, topY, w, h, rgb, fill = true) {
    const [r, g, b] = rgb.map((v) => (v / 255).toFixed(3));
    return `${r} ${g} ${b} rg ${x} ${PAGE_H - topY - h} ${w} ${h} re ${fill ? "f" : "S"}\n`;
  }

  function firstPagePrefix(data) {
    let c = "";
    c += rectCmd(0, 0, PAGE_W, 88, [24, 58, 99]);
    c += textCmd("F2", 20, MARGIN, 40, "VIRTUAL BLUEBOOK", "1 1 1");
    c += textCmd("F1", 9, MARGIN, 60, "Final submitted report", "0.84 0.90 0.96");

    c += textCmd("F2", 15, MARGIN, 118, truncate(data.assignmentTitle || "Untitled Assignment", 58), "0.094 0.227 0.388");

    const leftX = MARGIN;
    const rightX = 326;
    const labelColor = "0.38 0.45 0.53";
    const valueColor = "0.10 0.14 0.19";
    const rows = [
      ["STUDENT", truncate(data.studentName || "—", 34), "TEACHER", truncate(data.teacher || "—", 30)],
      ["DATE", displayDate(data.date) || "—", "TIME", data.time || "—"],
      ["CLASS CODE", truncate(data.classCode || "—", 22), "PROGRAMME", data.programme || "—"]
    ];

    let y = 145;
    for (const row of rows) {
      c += rectCmd(leftX, y, 232, 34, [247, 249, 252]);
      c += rectCmd(rightX, y, 232, 34, [247, 249, 252]);
      c += textCmd("F2", 7.5, leftX + 10, y + 12, row[0], labelColor);
      c += textCmd("F1", 10, leftX + 10, y + 27, row[1], valueColor);
      c += textCmd("F2", 7.5, rightX + 10, y + 12, row[2], labelColor);
      c += textCmd("F1", 10, rightX + 10, y + 27, row[3], valueColor);
      y += 42;
    }

    c += lineCmd(MARGIN, 285, PAGE_W - MARGIN, 285, 0.90);
    c += textCmd("F2", 11, MARGIN, 315, "STUDENT RESPONSE", "0.094 0.227 0.388");
    return c;
  }

  function continuationPrefix() {
    let c = "";
    c += rectCmd(0, 0, PAGE_W, 46, [24, 58, 99]);
    c += textCmd("F2", 10, MARGIN, 29, "VIRTUAL BLUEBOOK", "1 1 1");
    return c;
  }

  function pageFooter(data, pageNum) {
    let c = lineCmd(MARGIN, 754, PAGE_W - MARGIN, 754, 0.91);
    c += textCmd("F1", 8, MARGIN, 772, truncate(`${data.studentName || "Student"} · ${data.assignmentTitle || "Virtual Bluebook"}`, 76), "0.45 0.51 0.58");
    c += textCmd("F1", 8, PAGE_W - 84, 772, `Page ${pageNum}`, "0.45 0.51 0.58");
    return c;
  }

  function buildPages(data, submittedAt) {
    const lines = wrapText(data.responseText || "", 88);
    const pages = [];
    let lineIndex = 0;
    let pageNum = 1;

    while (lineIndex < lines.length || pages.length === 0) {
      const first = pageNum === 1;
      let content = first ? firstPagePrefix(data) : continuationPrefix();
      let topY = first ? 342 : 72;
      const bottomLimit = 716;

      while (lineIndex < lines.length && topY <= bottomLimit) {
        content += textCmd("F3", 11, MARGIN, topY, lines[lineIndex], "0.094 0.122 0.165");
        topY += RESPONSE_LINE_HEIGHT;
        lineIndex += 1;
      }

      const isLast = lineIndex >= lines.length;
      if (isLast) {
        if (topY + 44 > bottomLimit) {
          content += pageFooter(data, pageNum);
          pages.push(content);
          pageNum += 1;
          content = continuationPrefix();
          topY = 80;
        }
        content += lineCmd(MARGIN, topY + 8, PAGE_W - MARGIN, topY + 8, 0.91);
        content += textCmd("F1", 8.5, MARGIN, topY + 28, `Submitted: ${formatSubmitted(submittedAt)}`, "0.38 0.45 0.53");
        content += textCmd("F1", 8.5, 363, topY + 28, `Blocked copy/paste attempts: ${data.blockedAttempts || 0}`, "0.38 0.45 0.53");
      }

      content += pageFooter(data, pageNum);
      pages.push(content);
      pageNum += 1;
    }

    return pages;
  }

  function makePdfBytes(pageContents) {
    const pageCount = pageContents.length;
    const font1Ref = 3 + pageCount * 2;
    const font2Ref = font1Ref + 1;
    const font3Ref = font1Ref + 2;
    const totalObjects = font3Ref;

    const objects = new Array(totalObjects + 1);
    objects[1] = encodeWinAnsi("<< /Type /Catalog /Pages 2 0 R >>");

    const kids = [];
    for (let i = 0; i < pageCount; i += 1) kids.push(`${3 + i * 2} 0 R`);
    objects[2] = encodeWinAnsi(`<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pageCount} >>`);

    for (let i = 0; i < pageCount; i += 1) {
      const pageRef = 3 + i * 2;
      const contentRef = pageRef + 1;
      objects[pageRef] = encodeWinAnsi(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${font1Ref} 0 R /F2 ${font2Ref} 0 R /F3 ${font3Ref} 0 R >> >> /Contents ${contentRef} 0 R >>`);
      const streamBytes = encodeWinAnsi(pageContents[i]);
      objects[contentRef] = concatBytes([
        encodeWinAnsi(`<< /Length ${streamBytes.length} >>\nstream\n`),
        streamBytes,
        encodeWinAnsi("\nendstream")
      ]);
    }

    objects[font1Ref] = encodeWinAnsi("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    objects[font2Ref] = encodeWinAnsi("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    objects[font3Ref] = encodeWinAnsi("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>");

    const parts = [encodeWinAnsi("%PDF-1.4\n%âãÏÓ\n")];
    const offsets = new Array(totalObjects + 1).fill(0);
    let byteOffset = parts[0].length;

    for (let i = 1; i <= totalObjects; i += 1) {
      offsets[i] = byteOffset;
      const prefix = encodeWinAnsi(`${i} 0 obj\n`);
      const suffix = encodeWinAnsi("\nendobj\n");
      parts.push(prefix, objects[i], suffix);
      byteOffset += prefix.length + objects[i].length + suffix.length;
    }

    const xrefOffset = byteOffset;
    let xref = `xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= totalObjects; i += 1) {
      xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    xref += `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    parts.push(encodeWinAnsi(xref));

    return concatBytes(parts);
  }

  function generate(data, submittedAt = new Date()) {
    const pageContents = buildPages(data, submittedAt);
    const pdfBytes = makePdfBytes(pageContents);
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(data.studentName || "Student")}_${safeFileName(data.assignmentTitle || "Virtual_Bluebook")}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  window.VirtualBluebookPDF = { generate };
})();
