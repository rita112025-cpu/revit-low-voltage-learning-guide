(function () {
  "use strict";

  /* ==========================================================
     常數與資料
     ========================================================== */
  var STORAGE_KEY = "revit-guide-progress-v1";

  var UNIT_TITLES = {
    "01": "視圖與基本操作",
    "02": "連結建築底圖",
    "03": "檢查與使用設備族",
    "04": "設備配置與高度",
    "05": "編號與標註",
    "06": "明細表與數量",
    "07": "圖紙與改動驗收"
  };
  var UNIT_ORDER = ["01", "02", "03", "04", "05", "06", "07"];

  var HEIGHT_LIMITS = {
    center: { min: 0, max: 6000, label: "中心離完成地坪高度" },
    body: { min: 1, max: 3000, label: "螢幕本體高度" }
  };

  var storageAvailable = true;
  var checkboxes = qsa('.checklist input[data-check-id]');
  var allowedIds = new Set(checkboxes.map(function (cb) { return cb.dataset.checkId; }));
  var storageNotice = "";

  /* ==========================================================
     工具函式
     ========================================================== */
  function qs(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }
  function qsa(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  function loadProgress() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === null) return {};
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        storageNotice = "已忽略格式錯誤的本機進度，請重新勾選。";
        saveProgress({});
        return {};
      }
      var cleaned = {};
      var invalid = false;
      Object.keys(parsed).forEach(function (id) {
        if (allowedIds.has(id) && typeof parsed[id] === "boolean") cleaned[id] = parsed[id];
        else invalid = true;
      });
      if (invalid) {
        storageNotice = "已保留有效進度，並清理不合法的本機資料。";
        saveProgress(cleaned);
      }
      return cleaned;
    } catch (e) {
      if (e instanceof SyntaxError) {
        storageNotice = "本機進度資料損壞，已從空進度開始。";
        saveProgress({});
      }
      else {
        storageAvailable = false;
        storageNotice = "本機儲存無法讀取；本次勾選可能無法保留。";
      }
      return {};
    }
  }

  function saveProgress(data) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      storageAvailable = false;
      storageNotice = "本機儲存無法寫入；本次勾選可能無法保留。";
      showStorageNotice();
      return false;
    }
  }

  var progressData = loadProgress();

  function showStorageNotice() {
    var notice = qs("#storage-notice");
    if (notice && storageNotice) {
      notice.textContent = storageNotice;
      notice.hidden = false;
    }
  }

  function showToast(message, duration) {
    var toast = qs("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(function () {
      toast.hidden = true;
    }, duration || 3000);
  }

  /* ==========================================================
     導航切換
     ========================================================== */
  function scrollPanelToTop(targetPanel) {
    var header = document.querySelector(".site-header");
    var headerHeight = header ? header.getBoundingClientRect().height : 0;
    var gap = 16;

    var top =
      targetPanel.getBoundingClientRect().top +
      window.scrollY -
      headerHeight -
      gap;

    window.scrollTo({
      top: Math.max(0, top),
      behavior: "instant"
    });
  }

  function initNav() {
    var navBtns = qsa(".nav-btn");
    var panels = qsa(".panel");

    navBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var targetId = btn.getAttribute("data-target");

        navBtns.forEach(function (b) {
          b.classList.toggle("is-active", b === btn);
        });
        panels.forEach(function (p) {
          p.classList.toggle("is-active", p.id === targetId);
        });

        var targetPanel = document.getElementById(targetId);
        if (targetPanel) {
          var heading = targetPanel.querySelector("h2");
          if (heading) {
            heading.setAttribute("tabindex", "-1");
            heading.focus({ preventScroll: true });
          }
          scrollPanelToTop(targetPanel);
        }

        // 手機版：切換單元後自動收合選單
        var nav = qs("#unit-nav");
        var toggle = qs("#nav-toggle");
        if (nav && nav.classList.contains("is-open")) {
          nav.classList.remove("is-open");
          if (toggle) toggle.setAttribute("aria-expanded", "false");
        }
      });
    });

    var toggle = qs("#nav-toggle");
    var nav = qs("#unit-nav");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var isOpen = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });
    }
  }

  /* ==========================================================
     勾選進度追蹤
     ========================================================== */
  function getChecklistItemsForUnit(unitId) {
    return qsa('.checklist[data-checklist="' + unitId + '"] input[type="checkbox"]');
  }

  function applyStoredCheckboxStates() {
    qsa(".checklist input[type=checkbox]").forEach(function (cb) {
      var id = cb.getAttribute("data-check-id");
      cb.checked = !!progressData[id];
    });
  }

  function updateUnitProgressDisplay(unitId) {
    var items = getChecklistItemsForUnit(unitId);
    var total = items.length;
    var done = items.filter(function (cb) {
      return cb.checked;
    }).length;

    var navSpan = qs('[data-nav-progress="' + unitId + '"]');
    if (navSpan) navSpan.textContent = done + "/" + total;

    var unitText = qs('[data-unit-progress-text="' + unitId + '"]');
    if (unitText) unitText.textContent = "本單元完成度：" + done + "/" + total;

    return { done: done, total: total };
  }

  function updateOverallProgress() {
    var totalDone = 0;
    var totalAll = 0;
    UNIT_ORDER.forEach(function (unitId) {
      var r = updateUnitProgressDisplay(unitId);
      totalDone += r.done;
      totalAll += r.total;
    });
    var pct = totalAll === 0 ? 0 : Math.round((totalDone / totalAll) * 100);
    var badge = qs("#overall-progress-value");
    if (badge) badge.textContent = pct + "%";
    renderFinalReview(totalDone, totalAll, pct);
  }

  function renderFinalReview(totalDone, totalAll, pct) {
    var container = qs("#final-summary");
    if (!container) return;
    container.innerHTML = "";

    var overallBlock = document.createElement("div");
    overallBlock.className = "final-overall";
    overallBlock.innerHTML =
      '<span class="big-number">' + pct + "%</span>" +
      "<span>整體完成 " + totalDone + " / " + totalAll + " 項</span>";
    container.appendChild(overallBlock);

    UNIT_ORDER.forEach(function (unitId) {
      var items = getChecklistItemsForUnit(unitId);
      var total = items.length;
      var done = items.filter(function (cb) {
        return cb.checked;
      }).length;
      var isComplete = total > 0 && done === total;

      var row = document.createElement("div");
      row.className = "final-unit-row" + (isComplete ? " is-complete" : "");

      var head = document.createElement("div");
      head.className = "final-unit-row-head";
      head.innerHTML =
        "<span>" + unitId + "　" + UNIT_TITLES[unitId] + "</span>" +
        "<span>" + done + "/" + total + "</span>";
      row.appendChild(head);

      if (!isComplete) {
        var pendingList = document.createElement("ul");
        pendingList.className = "final-unit-pending";
        items.forEach(function (cb) {
          if (!cb.checked) {
            var span = cb.closest("label").querySelector("span");
            var li = document.createElement("li");
            li.textContent = span ? span.textContent : "（項目）";
            pendingList.appendChild(li);
          }
        });
        row.appendChild(pendingList);
      } else {
        var doneText = document.createElement("p");
        doneText.className = "final-unit-pending";
        doneText.textContent = "本單元已全部勾選完成。";
        row.appendChild(doneText);
      }

      container.appendChild(row);
    });
  }

  function initChecklists() {
    applyStoredCheckboxStates();

    qsa(".checklist input[type=checkbox]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var id = cb.getAttribute("data-check-id");
        progressData[id] = cb.checked;
        var ok = saveProgress(progressData);
        if (!ok) {
          showToast("本次進度可能無法保留（瀏覽器儲存空間無法使用）");
        }
        updateOverallProgress();
      });
    });

    updateOverallProgress();
  }

  function initResetButton() {
    var btn = qs("#reset-progress-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var confirmed = window.confirm("確定要重設所有單元的勾選進度嗎？此操作無法復原。");
      if (!confirmed) return;

      progressData = {};
      var ok = saveProgress(progressData);
      qsa(".checklist input[type=checkbox]").forEach(function (cb) {
        cb.checked = false;
      });
      updateOverallProgress();
      if (ok) {
        showToast("已重設進度");
      } else {
        showToast("已重設畫面上的勾選，但本機儲存無法使用，重新整理後可能會還原");
      }
    });
  }

  /* ==========================================================
     列印
     ========================================================== */
  function initPrint() {
    var printBtns = [qs("#print-btn"), qs("#print-btn-secondary")].filter(Boolean);
    printBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        window.print();
      });
    });

    var reopenList = [];
    window.addEventListener("beforeprint", function () {
      recalcHeight();
      updateOverallProgress();
      reopenList = [];
      qsa(".qa-item").forEach(function (details) {
        if (!details.open) {
          reopenList.push(details);
          details.open = true;
        }
      });
    });
    window.addEventListener("afterprint", function () {
      reopenList.forEach(function (details) {
        details.open = false;
      });
      reopenList = [];
    });
  }

  /* ==========================================================
     高度計算練習
     ========================================================== */
  function parseHeightValue(rawValue, limits) {
    var value = (rawValue || "").trim();

    if (value === "") {
      return { valid: false, error: "請輸入數值，不可留白。" };
    }
    if (!/^-?\d+(\.\d+)?$/.test(value)) {
      return { valid: false, error: "請輸入有效的數字（僅限數字與小數點）。" };
    }
    var num = Number(value);
    if (!Number.isFinite(num)) return { valid: false, error: "請輸入有限數值。" };
    if (num < limits.min || num > limits.max) {
      return {
        valid: false,
        error:
          "數值超出本工具的練習範圍（" +
          limits.min +
          "–" +
          limits.max +
          " mm），請確認輸入是否正確。"
      };
    }
    return { valid: true, value: num };
  }

  function formatMM(num) {
    var rounded = Math.round(num * 10) / 10;
    return (Number.isInteger(rounded) ? rounded : rounded.toFixed(1)) + " mm";
  }

  function getHeightState() {
    var center = parseHeightValue(qs("#input-center-height").value, HEIGHT_LIMITS.center);
    var body = parseHeightValue(qs("#input-body-height").value, HEIGHT_LIMITS.body);
    if (!center.valid || !body.valid) return { valid: false, center: center, body: body };
    return {
      valid: true, center: center, body: body,
      bottom: center.value - body.value / 2,
      top: center.value + body.value / 2
    };
  }

  function updateDiagram(center, body) {
    var svg = qs("#height-diagram");
    if (!svg) return;
    qs(".height-tool-diagram").classList.remove("is-invalid");
    qs("#diagram-dynamic").removeAttribute("hidden");

    var topEdge = center + body / 2;
    var bottomEdge = center - body / 2;

    var domainTop = Math.max(topEdge, 0);
    var domainBottom = Math.min(bottomEdge, 0);
    var range = domainTop - domainBottom;
    if (range <= 0) range = 1;

    var topMargin = 24;
    var bottomMargin = 24;
    var usableHeight = 400 - topMargin - bottomMargin;
    var scale = usableHeight / range;

    function yFor(v) {
      return topMargin + (domainTop - v) * scale;
    }

    var yFloor = yFor(0);
    var yCenter = yFor(center);
    var yTop = yFor(topEdge);
    var yBottom = yFor(bottomEdge);

    // 地坪線
    setAttrs("#d-floor-line", { y1: yFloor, y2: yFloor });
    qs("#d-floor-label").setAttribute("y", yFloor + 16);

    // 螢幕矩形
    setAttrs("#d-screen-rect", { y: yTop, height: Math.max(yBottom - yTop, 1) });
    var bodyLabel = qs("#d-body-label");
    bodyLabel.setAttribute("y", (yTop + yBottom) / 2 + 4);
    bodyLabel.textContent = "";

    // 中心虛線
    setAttrs("#d-center-line", { y1: yCenter, y2: yCenter });
    var centerLabel = qs("#d-center-label");
    centerLabel.setAttribute("y", yCenter + 4);
    centerLabel.textContent = "";

    // 中心高度尺寸線（floor -> center）
    setAttrs("#d-dim-center-top", { y1: yFloor, y2: yCenter });
    setAttrs("#d-tick-center-a", { y1: yFloor, y2: yFloor });
    setAttrs("#d-tick-center-b", { y1: yCenter, y2: yCenter });
    var dimCenterText = qs("#d-dim-center-text");
    var midCenter = (yFloor + yCenter) / 2;
    dimCenterText.setAttribute("y", midCenter);
    dimCenterText.setAttribute(
      "transform",
      "rotate(-90 60 " + midCenter + ")"
    );
    dimCenterText.setAttribute("text-anchor", "middle");
    dimCenterText.textContent = "";

    // 底緣高度尺寸線（floor -> bottom edge）
    setAttrs("#d-dim-bottom-top", { y1: yFloor, y2: yBottom });
    setAttrs("#d-tick-bottom-a", { y1: yFloor, y2: yFloor });
    setAttrs("#d-tick-bottom-b", { y1: yBottom, y2: yBottom });
    var dimBottomText = qs("#d-dim-bottom-text");
    var midBottom = (yFloor + yBottom) / 2;
    dimBottomText.setAttribute("y", midBottom);
    dimBottomText.setAttribute(
      "transform",
      "rotate(-90 245 " + midBottom + ")"
    );
    dimBottomText.setAttribute("text-anchor", "middle");
    dimBottomText.textContent = "";
  }

  function setAttrs(sel, attrs) {
    var el = qs(sel);
    if (!el) return;
    Object.keys(attrs).forEach(function (key) {
      el.setAttribute(key, attrs[key]);
    });
  }

  function clearDiagram() {
    var svg = qs("#height-diagram");
    if (!svg) return;
    qs(".height-tool-diagram").classList.add("is-invalid");
    qs("#diagram-dynamic").setAttribute("hidden", "");
    setAttrs("#d-floor-line", { y1: 380, y2: 380 });
    qs("#d-floor-label").setAttribute("y", 396);
    setAttrs("#d-screen-rect", { height: 0 });
    qs("#d-body-label").textContent = "";
    qs("#d-center-label").textContent = "";
    qs("#d-dim-center-text").textContent = "";
    qs("#d-dim-bottom-text").textContent = "";
  }

  function recalcHeight() {
    var centerInput = qs("#input-center-height");
    var bodyInput = qs("#input-body-height");
    var centerErrorEl = qs("#error-center-height");
    var bodyErrorEl = qs("#error-body-height");
    var resultEl = qs("#result-bottom-height");
    var warningEl = qs("#warning-below-floor");
    var warningBox = qs("#below-floor-box");

    var state = getHeightState();
    var centerResult = state.center;
    var bodyResult = state.body;

    centerInput.classList.toggle("has-error", !centerResult.valid);
    bodyInput.classList.toggle("has-error", !bodyResult.valid);
    centerInput.setAttribute("aria-invalid", String(!centerResult.valid));
    bodyInput.setAttribute("aria-invalid", String(!bodyResult.valid));
    centerErrorEl.textContent = centerResult.valid ? "" : centerResult.error;
    bodyErrorEl.textContent = bodyResult.valid ? "" : bodyResult.error;

    if (!state.valid) {
      resultEl.textContent = "結果：—（請先修正上方輸入）";
      qs("#result-top-height").textContent = "";
      qs("#diagram-values").textContent = "請修正輸入後顯示示意圖";
      warningEl.textContent = "";
      warningBox.hidden = true;
      clearDiagram();
      return;
    }

    var center = centerResult.value;
    var body = bodyResult.value;
    var bottom = state.bottom;

    resultEl.textContent = "結果：底緣離地高度 = " + formatMM(bottom);
    qs("#result-top-height").textContent = "頂緣離地高度 = " + formatMM(state.top);
    qs("#diagram-values").textContent = "圖示數值：中心 " + formatMM(center) + "；本體 " + formatMM(body) + "；底緣 " + formatMM(bottom) + "；頂緣 " + formatMM(state.top) + "。";

    if (bottom < 0) {
      warningEl.textContent = "此設定使螢幕底緣低於地坪（計算結果為負值）。";
      warningBox.hidden = false;
    } else {
      warningEl.textContent = "";
      warningBox.hidden = true;
    }

    updateDiagram(center, body);
  }

  function initHeightTool() {
    var centerInput = qs("#input-center-height");
    var bodyInput = qs("#input-body-height");
    if (!centerInput || !bodyInput) return;

    centerInput.addEventListener("input", recalcHeight);
    bodyInput.addEventListener("input", recalcHeight);

    recalcHeight();
  }

  function exportLearningRecord() {
    var state = getHeightState();
    var total = checkboxes.length;
    var done = checkboxes.filter(function (cb) { return cb.checked; }).length;
    var lines = [
      "Revit 弱電實作學習指南｜教材練習版 v1.1",
      "匯出時間：" + new Date().toLocaleString("zh-TW"),
      "完成進度：" + done + "/" + total + "（" + Math.round(done / total * 100) + "%）",
      ""
    ];
    UNIT_ORDER.forEach(function (id) {
      lines.push(id + " " + UNIT_TITLES[id]);
      getChecklistItemsForUnit(id).forEach(function (cb) {
        var label = cb.closest("label").querySelector("span");
        lines.push((cb.checked ? "[完成] " : "[未完成] ") + (label ? label.textContent.trim() : cb.dataset.checkId));
      });
      lines.push("");
    });
    lines.push("高度工具：" + (state.valid
      ? "中心 " + formatMM(state.center.value) + "；本體 " + formatMM(state.body.value) + "；底緣 " + formatMM(state.bottom) + "；頂緣 " + formatMM(state.top)
      : "輸入無效，未計算"));
    lines.push("高度工具僅供直立且上下對稱的設備幾何練習，不判定設計合格。練習範圍：中心 0–6000 mm、本體 1–3000 mm。");
    lines.push("勾選進度由使用者自行確認，不代表 Revit 技能認證或正式驗收。 ");
    var url = URL.createObjectURL(new Blob(["\uFEFF" + lines.join("\n")], { type: "text/plain;charset=utf-8" }));
    var link = document.createElement("a");
    link.href = url;
    link.download = "revit-learning-record.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ==========================================================
     初始化
     ========================================================== */
  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initChecklists();
    initResetButton();
    initPrint();
    initHeightTool();
    qs("#export-record-btn").addEventListener("click", exportLearningRecord);
    showStorageNotice();

    if (!storageAvailable) {
      showToast("本機儲存目前無法使用，進度可能無法保留。");
    }
  });
})();
