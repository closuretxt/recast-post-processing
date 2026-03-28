// diffViewer.js — Recast Diff Viewer
// Word-level diff rendering and review modal management.
// sponsored by claude the goat

/// Helpers

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// Split text into tokens: words and whitespace, preserving round-trip fidelity
function tokenize(text) {
    return text.split(/(\s+)/);
}

//

const MAX_DIFF_TOKENS = 3000;

function computeWordDiff(oldText, newText) {
    const a = tokenize(oldText);
    const b = tokenize(newText);

    // Graceful fallback for very large texts — skip highlighting
    if (a.length > MAX_DIFF_TOKENS || b.length > MAX_DIFF_TOKENS) {
        return { oldHtml: escapeHtml(oldText), newHtml: escapeHtml(newText) };
    }

    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1] + 1
                : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }

    // Backtrack to reconstruct operations
    const ops = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
            ops.unshift({ type: "equal", v: a[i - 1] });
            i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            ops.unshift({ type: "insert", v: b[j - 1] });
            j--;
        } else {
            ops.unshift({ type: "delete", v: a[i - 1] });
            i--;
        }
    }

    let oldHtml = "", newHtml = "";
    for (const op of ops) {
        const v = escapeHtml(op.v);
        if (op.type === "equal")        { oldHtml += v; newHtml += v; }
        else if (op.type === "delete")  { oldHtml += `<del class="rc-del">${v}</del>`; }
        else                            { newHtml += `<ins class="rc-ins">${v}</ins>`; }
    }

    return { oldHtml, newHtml };
}

//

let _acceptCallback = null;
let _rejectCallback = null;

// Step navigation state
let _steps = null;
let _currentStep = 0;

import { extension_settings } from "../../../../extensions.js";

//

// Build comparison steps from pass snapshots.
// snapshots: [originalText, afterPass1, afterPass2, ..., finalText]
// passNames: ["Pass1Name", "Pass2Name", ...] — names of enabled passes in order
function buildSteps(snapshots, passNames) {
    if (!snapshots || snapshots.length < 2) return null;

    const getPassName = (i) => (passNames && passNames[i - 1]) ? passNames[i - 1] : null;

    const steps = [];

    // Step 0: full diff — original vs final (current default view)
    steps.push({
        oldText: snapshots[0],
        newText: snapshots[snapshots.length - 1],
        oldLabel: "Original",
        newLabel: "Final"
    });

    // Steps 1..N: incremental diffs between consecutive passes
    for (let i = 0; i < snapshots.length - 1; i++) {
        steps.push({
            oldText: snapshots[i],
            newText: snapshots[i + 1],
            oldLabel: i === 0 ? "Original" : `Pass ${i}`,
            newLabel: `Pass ${i + 1}`,
            caption: i === 0 ? "Original → Pass 1" : `Pass ${i} → Pass ${i + 1}`,
            passName: getPassName(i + 1)
        });
    }

    return steps;
}

function getStepCaption(stepIndex) {
    if (stepIndex === 0) return "Full Diff";
    if (!_steps || !_steps[stepIndex]) return `Step ${stepIndex}`;
    return _steps[stepIndex].caption || `Step ${stepIndex}`;
}

//

function renderStep(stepIndex) {
    if (!_steps || stepIndex < 0 || stepIndex >= _steps.length) return;
    _currentStep = stepIndex;

    const step = _steps[stepIndex];
    const disableEditable = extension_settings["Recast"] && extension_settings["Recast"].disable_editable_diff;

    // Step 0 uses live textarea value to respect any user edits made since opening
    const newText = stepIndex === 0 ? ($("#recast_diff_transformed").val() || step.newText) : step.newText;
    const { oldHtml, newHtml } = computeWordDiff(step.oldText, newText);

    // Update panel content
    $("#recast_diff_original_view").html(oldHtml);
    $("#recast_diff_transformed_view").html(newHtml);

    // Update panel header labels
    $(".rc-diff-original-header .rc-diff-panel-label").text(step.oldLabel);
    $(".rc-diff-transformed-header .rc-diff-panel-label").text(step.newLabel);

    // Textarea is editable only on step 0 (the full-diff / accept view)
    if (stepIndex === 0 && !disableEditable) {
        $("#recast_diff_transformed").show();
        $("#recast_diff_transformed_view").css({ "height": "", "flex": "" });
        $(".rc-diff-edit-hint").show();
    } else {
        $("#recast_diff_transformed").hide();
        $("#recast_diff_transformed_view").css({ "height": "100%", "flex": "1 1 auto" });
        $(".rc-diff-edit-hint").hide();
    }

    // Update active dot
    $(".rc-diff-dot").removeClass("rc-diff-dot-active");
    $(`.rc-diff-dot[data-step="${stepIndex}"]`).addClass("rc-diff-dot-active");

    // Update step caption text — append pass name annotation when available
    const caption = getStepCaption(stepIndex);
    const passName = stepIndex > 0 && step.passName ? step.passName : null;
    if (passName) {
        $("#recast_diff_step_label").html(`${caption} <span class="rc-diff-step-name">(${escapeHtml(passName)})</span>`);
    } else {
        $("#recast_diff_step_label").text(caption);
    }

    // Update arrow disabled state
    $("#recast_diff_prev").prop("disabled", stepIndex === 0);
    $("#recast_diff_next").prop("disabled", stepIndex === _steps.length - 1);
}

function renderNavigation() {
    const stepsBar = $("#recast_diff_steps");
    const dotsContainer = $("#recast_diff_dots");
    dotsContainer.empty();

    // Navigation only makes sense with 3+ steps (i.e., 2+ passes producing distinct diffs)
    if (!_steps || _steps.length < 3) {
        stepsBar.hide();
        return;
    }

    for (let i = 0; i < _steps.length; i++) {
        dotsContainer.append(
            $(`<button class="rc-diff-dot" data-step="${i}" title="${getStepCaption(i)}"></button>`)
        );
    }

    stepsBar.show();
}

export function showDiffModal(originalText, transformedText, onAccept, onReject = null, passSnapshots = null, passNames = null) {
    _acceptCallback = onAccept;
    _rejectCallback = onReject;
    _currentStep = 0;

    // Build navigation steps when 2+ passes are present
    _steps = (passSnapshots && passSnapshots.length >= 3) ? buildSteps(passSnapshots, passNames) : null;

    // Store original text and pre-fill textarea
    $("#recast_diff_modal").data("original", originalText);
    $("#recast_diff_transformed").val(transformedText);

    if (_steps) {
        renderNavigation();
        renderStep(0);
    } else {
        // Classic single-view mode
        const { oldHtml, newHtml } = computeWordDiff(originalText, transformedText);
        $("#recast_diff_original_view").html(oldHtml);
        $("#recast_diff_transformed_view").html(newHtml);

        // Reset panel labels to defaults
        $(".rc-diff-original-header .rc-diff-panel-label").text("Original");
        $(".rc-diff-transformed-header .rc-diff-panel-label").text("Transformed");

        if (extension_settings["Recast"] && extension_settings["Recast"].disable_editable_diff) {
            $("#recast_diff_transformed").hide();
            $("#recast_diff_transformed_view").css({ "height": "100%", "flex": "1 1 auto" });
            $(".rc-diff-edit-hint").hide();
        } else {
            $("#recast_diff_transformed").show();
            $("#recast_diff_transformed_view").css({ "height": "", "flex": "" });
            $(".rc-diff-edit-hint").show();
        }

        $("#recast_diff_steps").hide();
    }

    $("#recast_diff_backdrop").fadeIn(200);
    $("#recast_diff_modal").fadeIn(220);
}

export function hideDiffModal(isReject = false) {
    if (isReject && typeof _rejectCallback === "function") {
        _rejectCallback();
    }
    _steps = null;
    _currentStep = 0;
    $("#recast_diff_backdrop").fadeOut(180);
    $("#recast_diff_modal").fadeOut(200);
}

export function initDiffViewer() {
    $("#recast_diff_accept").on("click", () => {
        const text = $("#recast_diff_transformed").val();
        if (typeof _acceptCallback === "function") _acceptCallback(text);
        hideDiffModal(false);
    });

    $("#recast_diff_reject, #recast_diff_close").on("click", () => hideDiffModal(true));

    $("#recast_diff_backdrop").on("click", () => hideDiffModal(true));

    // Live diff — recompute highlights as the user edits the transformed textarea
    $("#recast_diff_transformed").on("input", function () {
        if (_steps) {
            // Only update when on step 0 (textarea is hidden on other steps anyway)
            if (_currentStep === 0) {
                const { oldHtml, newHtml } = computeWordDiff(_steps[0].oldText, $(this).val());
                $("#recast_diff_original_view").html(oldHtml);
                $("#recast_diff_transformed_view").html(newHtml);
            }
        } else {
            const rawOriginal = $("#recast_diff_modal").data("original") || "";
            const { oldHtml, newHtml } = computeWordDiff(rawOriginal, $(this).val());
            $("#recast_diff_original_view").html(oldHtml);
            $("#recast_diff_transformed_view").html(newHtml);
        }
    });

    // Step navigation — prev/next arrows
    $("#recast_diff_prev").on("click", () => {
        if (_steps && _currentStep > 0) renderStep(_currentStep - 1);
    });

    $("#recast_diff_next").on("click", () => {
        if (_steps && _currentStep < _steps.length - 1) renderStep(_currentStep + 1);
    });

    // Step navigation — dot clicks (delegated since dots are dynamic)
    $(document).on("click", "#recast_diff_dots .rc-diff-dot", function () {
        if (_steps) renderStep(parseInt($(this).data("step"), 10));
    });
}
