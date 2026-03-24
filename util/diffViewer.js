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

import { extension_settings } from "../../../../extensions.js";

export function showDiffModal(originalText, transformedText, onAccept, onReject = null) {
    _acceptCallback = onAccept;
    _rejectCallback = onReject;

    const { oldHtml, newHtml } = computeWordDiff(originalText, transformedText);

    $("#recast_diff_modal").data("original", originalText);
    $("#recast_diff_original_view").html(oldHtml);
    $("#recast_diff_transformed_view").html(newHtml);
    $("#recast_diff_transformed").val(transformedText);

    if (extension_settings["Recast"] && extension_settings["Recast"].disable_editable_diff) {
        $("#recast_diff_transformed").hide();
        $("#recast_diff_transformed_view").css({ "height": "100%", "flex": "1 1 auto" });
        $(".rc-diff-edit-hint").hide();
    } else {
        $("#recast_diff_transformed").show();
        $("#recast_diff_transformed_view").css({ "height": "", "flex": "" });
        $(".rc-diff-edit-hint").show();
    }

    $("#recast_diff_backdrop").fadeIn(200);
    $("#recast_diff_modal").fadeIn(220);
}

export function hideDiffModal(isReject = false) {
    if (isReject && typeof _rejectCallback === "function") {
        _rejectCallback();
    }
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
        const rawOriginal = $("#recast_diff_modal").data("original") || "";
        const { oldHtml, newHtml } = computeWordDiff(rawOriginal, $(this).val());
        $("#recast_diff_original_view").html(oldHtml);
        $("#recast_diff_transformed_view").html(newHtml);
    });
}
