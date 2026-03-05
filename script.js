(() => {
  const state = {
    currentPanel: 0,
    file: null,
    textContent: "",
  };

  const textExtensions = new Set(["txt", "json", "csv", "md", "js", "html", "css"]);

  const panelTrack = document.getElementById("panelTrack");
  const navButtons = [...document.querySelectorAll(".nav-btn")];
  const statusLine = document.getElementById("statusLine");
  const toastStack = document.getElementById("toastStack");
  const fileInput = document.getElementById("fileInput");
  const browseBtn = document.getElementById("browseBtn");
  const dropZone = document.getElementById("dropZone");
  const clearBtn = document.getElementById("clearBtn");
  const previewContainer = document.getElementById("previewContainer");
  const fileMeta = document.getElementById("fileMeta");

  const setStatus = (value) => {
    statusLine.textContent = `STATUS: ${value}`;
  };

  const showToast = (message) => {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastStack.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 2200);
  };

  const setPanel = (index) => {
    state.currentPanel = index;
    panelTrack.style.transform = `translateX(-${index * (100 / 3)}%)`;

    navButtons.forEach((btn, btnIndex) => {
      btn.classList.toggle("is-active", btnIndex === index);
    });
  };

  const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes)) return "-";
    if (bytes < 1024) return `${bytes} B`;
    const units = ["KB", "MB", "GB", "TB"];
    let value = bytes / 1024;
    let idx = 0;
    while (value >= 1024 && idx < units.length - 1) {
      value /= 1024;
      idx += 1;
    }
    return `${value.toFixed(value < 10 ? 2 : 1)} ${units[idx]}`;
  };

  const updateMetadata = (file) => {
    const fields = file
      ? [
          file.name,
          formatBytes(file.size),
          file.type || "Unknown",
          new Date(file.lastModified).toLocaleString(),
        ]
      : ["-", "-", "-", "-"];

    [...fileMeta.querySelectorAll("dd")].forEach((node, i) => {
      node.textContent = fields[i];
    });
  };

  const resetPreview = () => {
    previewContainer.innerHTML = '<p class="muted">No file loaded.</p>';
  };

  const extensionFor = (fileName) => fileName.split(".").pop()?.toLowerCase() || "";

  const canPreviewAsText = (file) => file.type.startsWith("text/") || textExtensions.has(extensionFor(file.name));

  const renderTextPreview = (text) => {
    const lines = text.split("\n");
    const lineNumbers = lines.map((_, i) => `${i + 1}`).join("\n");

    previewContainer.innerHTML = `
      <div class="preview-header">
        <strong>Text Preview</strong>
        <button id="copyBtn" class="btn" type="button">Copy</button>
      </div>
      <div class="terminal-viewer">
        <pre class="line-numbers">${escapeHtml(lineNumbers)}</pre>
        <pre class="code-content">${escapeHtml(text)}</pre>
      </div>
    `;

    const copyBtn = document.getElementById("copyBtn");
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(text);
        showToast("Copied!");
      } catch {
        showToast("Clipboard unavailable");
      }
    });
  };

  const renderImagePreview = (src, fileName) => {
    previewContainer.innerHTML = `
      <div class="preview-header"><strong>Image Preview</strong></div>
      <img class="media-preview" src="${src}" alt="Preview of ${escapeHtml(fileName)}" />
    `;
  };

  const renderAudioPreview = (src) => {
    previewContainer.innerHTML = `
      <div class="preview-header"><strong>Audio Preview</strong></div>
      <audio class="media-preview" controls src="${src}">Your browser does not support audio playback.</audio>
    `;
  };

  const renderNoPreview = () => {
    previewContainer.innerHTML = '<p class="muted">No preview available for this file type.</p>';
  };

  const escapeHtml = (str) =>
    str
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const loadFile = (file) => {
    if (!file) return;

    state.file = file;
    state.textContent = "";
    updateMetadata(file);
    setStatus("LOADING");

    if (canPreviewAsText(file)) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === "string" ? reader.result : "";
        state.textContent = text;
        renderTextPreview(text);
        setStatus("PREVIEWING");
        showToast("File loaded");
        setPanel(1);
      };
      reader.onerror = () => {
        renderNoPreview();
        setStatus("READY");
        showToast("Failed to read file");
      };
      reader.readAsText(file);
      return;
    }

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        renderImagePreview(String(reader.result), file.name);
        setStatus("PREVIEWING");
        showToast("File loaded");
        setPanel(1);
      };
      reader.readAsDataURL(file);
      return;
    }

    if (file.type.startsWith("audio/")) {
      const reader = new FileReader();
      reader.onload = () => {
        renderAudioPreview(String(reader.result));
        setStatus("PREVIEWING");
        showToast("File loaded");
        setPanel(1);
      };
      reader.readAsDataURL(file);
      return;
    }

    renderNoPreview();
    setStatus("PREVIEWING");
    showToast("File loaded");
    setPanel(1);
  };

  browseBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (event) => {
    const [file] = event.target.files || [];
    loadFile(file);
  });

  ["dragenter", "dragover"].forEach((evt) => {
    dropZone.addEventListener(evt, (event) => {
      event.preventDefault();
      dropZone.classList.add("drag-over");
    });
  });

  ["dragleave", "dragend", "drop"].forEach((evt) => {
    dropZone.addEventListener(evt, () => {
      dropZone.classList.remove("drag-over");
    });
  });

  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    const [file] = event.dataTransfer?.files || [];
    loadFile(file);
  });

  dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  });

  clearBtn.addEventListener("click", () => {
    state.file = null;
    state.textContent = "";
    fileInput.value = "";
    updateMetadata(null);
    resetPreview();
    setStatus("READY");
    showToast("Cleared");
    setPanel(0);
  });

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const panelIndex = Number(btn.dataset.panel);
      setPanel(panelIndex);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (["INPUT", "TEXTAREA"].includes(event.target.tagName)) return;

    if (event.key === "1") setPanel(0);
    if (event.key === "2") setPanel(1);
    if (event.key === "3") setPanel(2);
  });

  updateMetadata(null);
  resetPreview();
  setPanel(0);
  setStatus("READY");
})();
