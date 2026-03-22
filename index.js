import { extension_settings, getContext } from "../../../extensions.js";
import { showDiffModal, initDiffViewer } from "./diffViewer.js";
import { saveSettingsDebounced, generateRaw, updateMessageBlock, saveChat, messageFormatting, scrollChatToBottom } from "../../../../script.js";
import { power_user } from "../../../power-user.js"
import { applyStreamFadeIn } from "../../../util/stream-fadein.js";
import { getWorldInfoPrompt } from "../../../world-info.js";
import { MacrosParser } from "../../../macros.js";
import { getRegexedString, regex_placement } from "../../regex/engine.js";
import { defaultPresets } from "./defaultPresets.js";

// Utility to get ST variables
function getST() {
    return getContext();
}

const extensionName = "Recast";
const extensionFolderPath = `scripts/extensions/third-party/recast-post-processing`;
const extensionSettings = extension_settings[extensionName];

const defaultSettings = {
    enabled: true,
    autorun: true,
    inject: true,
    replace_inline: false,
    hide_until_last: true,
    stream_pipeline: true,
    debug_mode: true,
    disable_editable_diff: true,
    min_chars: 10,
    presets: defaultPresets,
    active_preset: "Default Preset"
};

function logDebug(...args) {
    if (extension_settings[extensionName].debug_mode) {
        console.log("[Recast DEBUG]", ...args);
    }
}

let isProcessing = false;
let currentMessageId = null;
// Set by GENERATION_STARTED so the MutationObserver can hide the incoming AI message block before streaming
let hideNextAiMessage = false;
// Intercept observer that blanks streaming tokens into .mes_text while the pipeline is pending
let streamInterceptObserver = null;
let isResettingStream = false;
let isPipelineCancelled = false;

// Per-pass results from the last pipeline run, keyed by pass id
const PassResults = {};
let LatestResult = "";

async function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    if (Object.keys(extension_settings[extensionName]).length === 0) {
        Object.assign(extension_settings[extensionName], defaultSettings);
    }

    $("#recast_enabled").prop("checked", extension_settings[extensionName].enabled);
    $("#recast_autorun").prop("checked", extension_settings[extensionName].autorun);
    $("#recast_inject").prop("checked", extension_settings[extensionName].inject);
    $("#recast_replace_inline").prop("checked", extension_settings[extensionName].replace_inline);
    $("#recast_hide_until_last").prop("checked", extension_settings[extensionName].hide_until_last);
    $("#recast_stream_pipeline").prop("checked", extension_settings[extensionName].stream_pipeline);
    $("#recast_debug_mode").prop("checked", extension_settings[extensionName].debug_mode);
    $("#recast_disable_editable_diff").prop("checked", extension_settings[extensionName].disable_editable_diff);
    $("#recast_min_chars").val(extension_settings[extensionName].min_chars ?? 0);

    populatePresetDropdown();
    loadActivePreset();
}

function saveSettings() {
    extension_settings[extensionName].enabled = $("#recast_enabled").prop("checked");
    extension_settings[extensionName].autorun = $("#recast_autorun").prop("checked");
    extension_settings[extensionName].inject = $("#recast_inject").prop("checked");
    extension_settings[extensionName].replace_inline = $("#recast_replace_inline").prop("checked");
    extension_settings[extensionName].hide_until_last = $("#recast_hide_until_last").prop("checked");
    extension_settings[extensionName].stream_pipeline = $("#recast_stream_pipeline").prop("checked");
    extension_settings[extensionName].debug_mode = $("#recast_debug_mode").prop("checked");
    extension_settings[extensionName].disable_editable_diff = $("#recast_disable_editable_diff").prop("checked");
    extension_settings[extensionName].min_chars = parseInt($("#recast_min_chars").val(), 10) || 0;
    
    saveActivePreset();
    saveSettingsDebounced();
}

function populateConnectionDropdown(selectElement, currentValue) {
    const st = getST();
    selectElement.empty();
    selectElement.append($("<option></option>").val("").text("Same as Current"));
    
    // Check if connection profiles extension is active
    if (!st.extensionSettings.disabledExtensions.includes('connection-manager') && st.extensionSettings.connectionManager && st.extensionSettings.connectionManager.profiles) {
        const profiles = st.extensionSettings.connectionManager.profiles;
        profiles.forEach(p => {
            selectElement.append($("<option></option>").val(p.id).text(p.name));
        });
    }

    // Attempt to select the value if it exists
    if (currentValue) {
        selectElement.val(currentValue);
    } else {
        selectElement.val("");
    }
}

function getActivePresetIndex() {
    return extension_settings[extensionName].presets.findIndex(p => p.name === extension_settings[extensionName].active_preset);
}

function saveActivePreset() {
    const idx = getActivePresetIndex();
    if (idx === -1) return;
    
    const passes = [];
    $("#recast_pass_list .recast-pass-item").each(function() {
        passes.push({
            id: $(this).data("id"),
            name: $(this).find(".pass-name").val(),
            enabled: $(this).find(".pass-enabled").prop("checked"),
            contextLength: parseInt($(this).find(".pass-context-length").val(), 10),
            prompt: $(this).find(".pass-prompt").val(),
            connection: $(this).find(".pass-connection").val(),
            injectWorldInfo: $(this).find(".pass-inject-world-info").prop("checked"),
            injectWIOutlets: $(this).find(".pass-inject-wi-outlets").prop("checked"),
            includeCharCard: $(this).find(".pass-include-char-card").prop("checked"),
            includeSceneContext: $(this).find(".pass-include-scene-context").prop("checked")
        });
    });
    
    extension_settings[extensionName].presets[idx].passes = passes;
}

function populatePresetDropdown() {
    const select = $("#recast_preset_select");
    select.empty();
    extension_settings[extensionName].presets.forEach(p => {
        select.append($("<option></option>").val(p.name).text(p.name));
    });
    select.val(extension_settings[extensionName].active_preset);
}

function loadActivePreset() {
    const idx = getActivePresetIndex();
    if (idx === -1) return;
    
    const preset = extension_settings[extensionName].presets[idx];
    const list = $("#recast_pass_list");
    list.empty();
    
    preset.passes.forEach(pass => {
        addPassToUI(pass);
    });
}

function addPassToUI(pass = null) {
    if (!pass) {
        pass = {
            id: "pass_" + Date.now(),
            name: "New Pass",
            enabled: true,
            contextLength: 3,
            prompt: "",
            connection: "",
            injectWorldInfo: false,
            includeCharCard: true,
            includeSceneContext: true
        };
    }
    
    const template = document.getElementById("recast_pass_template");
    const clone = template.content.cloneNode(true);
    const item = $(clone).find(".recast-pass-item");
    
    item.data("id", pass.id);
    item.find(".pass-name").val(pass.name);
    item.find(".pass-enabled").prop("checked", pass.enabled);
    item.find(".pass-context-length").val(pass.contextLength);
    item.find(".pass-prompt").val(pass.prompt);
    
    const connectionSelect = item.find(".pass-connection");
    populateConnectionDropdown(connectionSelect, pass.connection);

    item.find(".pass-inject-world-info").prop("checked", pass.injectWorldInfo || false);
    item.find(".pass-inject-wi-outlets").prop("checked", pass.injectWIOutlets || false);
    item.find(".pass-include-char-card").prop("checked", pass.includeCharCard !== undefined ? pass.includeCharCard : true);
    item.find(".pass-include-scene-context").prop("checked", pass.includeSceneContext !== undefined ? pass.includeSceneContext : true);

    item.find(".pass-menu-btn").on("click", function(e) {
        e.stopPropagation();
        const dropdown = $(this).siblings(".pass-menu-dropdown");
        $(".pass-menu-dropdown").not(dropdown).hide();
        dropdown.toggle();
    });

    item.find(".pass-menu-dropdown").on("click", function(e) {
        e.stopPropagation();
    });

    item.find(".pass-remove").on("click", function() {
        $(this).closest(".recast-pass-item").remove();
        saveSettings();
    });
    
    item.find(".pass-toggle-details").on("click", function() {
        $(this).closest(".recast-pass-item").find(".recast-pass-details").toggle();
        $(this).toggleClass("fa-chevron-down fa-chevron-up");
    });
    
    item.find("input, select, textarea").on("change input", saveSettings);
    
    $("#recast_pass_list").append(item);
}

async function runPass(pass, text, onChunk = null) {
    if (!pass.enabled) return text;

    const st = getST();
    const charId = st.characterId;
    const char = st.characters[charId];

    const IncludeCharCard = pass.includeCharCard !== undefined ? pass.includeCharCard : true;
    const IncludeSceneContext = pass.includeSceneContext !== undefined ? pass.includeSceneContext : true;

    let systemPrompt = pass.prompt.trim();

    // Fetch WI if: injectWorldInfo is on, injectWIOutlets is on, OR the prompt explicitly contains {{outlet:...}} placeholders.
    // Allow any number of colons after "outlet:" so both {{outlet:name}} and {{outlet::name}} work.
    const OutletMatches = [...systemPrompt.matchAll(/\{\{outlet::*([^}]+)\}\}/g)].map(m => m[1]);
    const HasOutletPlaceholders = OutletMatches.length > 0;
    const NeedsWI = (pass.injectWorldInfo || pass.injectWIOutlets || HasOutletPlaceholders) && typeof getWorldInfoPrompt === 'function';
    logDebug(`Pass ${pass.name}: NeedsWI=${NeedsWI}, HasOutletPlaceholders=${HasOutletPlaceholders}, outlets found in prompt:`, OutletMatches);
    if (NeedsWI) {
        try {
            const chatStrings = st.chat.slice().reverse().map(msg => msg.mes);
            const wiResult = await getWorldInfoPrompt(chatStrings, 100000, true);
            logDebug(`Pass ${pass.name}: WI result:`, wiResult);
            if (typeof wiResult === 'object' && wiResult !== null) {
                // Append worldInfoBefore/After only when injectWorldInfo is enabled
                if (pass.injectWorldInfo) {
                    const wiBefore = wiResult.worldInfoBefore || "";
                    const wiAfter = wiResult.worldInfoAfter || "";
                    const wiText = (wiBefore + "\n" + wiAfter).trim();
                    if (wiText.length > 0) {
                        systemPrompt += `\n\n<world_info>\n${wiText}\n</world_info>`;
                        logDebug(`Pass ${pass.name}: World Info injected.`);
                    }
                }

                // Replace {{outlet:name}} or {{outlet::name}} placeholders — always when present, or injectWIOutlets is on
                const outletEntries = wiResult.outletEntries || {};
                logDebug(`Pass ${pass.name}: Available outlet entries:`, Object.keys(outletEntries));
                const InjectedOutlets = new Set();
                if (pass.injectWIOutlets || HasOutletPlaceholders) {
                    for (const [outletName, contents] of Object.entries(outletEntries)) {
                        const outletText = Array.isArray(contents) ? contents.join("\n") : String(contents);
                        // Match both {{outlet:name}} and {{outlet::name}} (any number of colons)
                        const PlaceholderRegex = new RegExp(`\\{\\{outlet::*${outletName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g');
                        if (PlaceholderRegex.test(systemPrompt)) {
                            systemPrompt = systemPrompt.replace(PlaceholderRegex, outletText);
                            InjectedOutlets.add(outletName);
                            logDebug(`Pass ${pass.name}: Outlet '${outletName}' replaced via placeholder.`);
                        }
                    }
                    // Warn about any remaining unresolved outlet placeholders
                    const Unresolved = [...systemPrompt.matchAll(/\{\{outlet::*([^}]+)\}\}/g)].map(m => m[1]);
                    if (Unresolved.length > 0) {
                        logDebug(`Pass ${pass.name}: Unresolved outlet placeholders (no matching WI outlet entry):`, Unresolved);
                    }
                }

                // When injectWIOutlets is on, auto-append any outlets that were NOT injected via a placeholder
                if (pass.injectWIOutlets) {
                    for (const [outletName, contents] of Object.entries(outletEntries)) {
                        if (InjectedOutlets.has(outletName)) continue;
                        const outletText = Array.isArray(contents) ? contents.join("\n") : String(contents);
                        systemPrompt += `\n\n<outlet name="${outletName}">\n${outletText}\n</outlet>`;
                        logDebug(`Pass ${pass.name}: Outlet '${outletName}' auto-appended to prompt.`);
                    }
                }
            }
        } catch (e) {
            console.error("Recast: Error fetching World Info for pass " + pass.name, e);
        }
    }

    // Always substitute ST macros in the system prompt
    if (typeof MacrosParser !== 'undefined' && typeof MacrosParser.parseMacros === 'function') {
        systemPrompt = MacrosParser.parseMacros(systemPrompt);
        logDebug(`Pass ${pass.name}: Macros substituted in system prompt.`);
    }

    // Build user message using XML-tagged sections for clear isolation between data types
    const UserParts = [];

    if (IncludeCharCard && char) {
        const CharCardLines = [
            char.name        ? `<name>${char.name}</name>`                                           : "",
            char.description ? `<description>${char.description}</description>`                     : "",
            char.personality ? `<personality>${char.personality}</personality>`                     : "",
            char.scenario    ? `<scenario>${char.scenario}</scenario>`                               : "",
            char.mes_example ? `<example_dialogue>\n${char.mes_example}\n</example_dialogue>`       : ""
        ].filter(Boolean).join("\n");
        if (CharCardLines.trim()) {
            UserParts.push(`<characters>\n${CharCardLines}\n</characters>`);
        }
    }

    if (IncludeSceneContext && pass.contextLength > 0) {
        const CharName = char ? char.name : "Assistant";
        const History = st.chat.slice(-(pass.contextLength + 1), -1);
        if (History.length > 0) {
            const SceneContext = History.map(m => `<message role="${m.is_user ? "user" : "character"}">${m.mes}</message>`).join("\n");
            UserParts.push(`<scene_context>\n${SceneContext}\n</scene_context>`);
        }
    }

    UserParts.push(`<text_to_transform>\n${text}\n</text_to_transform>`);
    const userPrompt = UserParts.join("\n\n");

    try {
        logDebug(`Running pass ${pass.name}...`);
        logDebug("System prompt:", systemPrompt);
        logDebug("User prompt:", userPrompt);

        const ConnectionProfile = pass.connection ? pass.connection : st.extensionSettings.connectionManager?.selectedProfile;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ];

        let result = "";
        
        if (st.ConnectionManagerRequestService && st.ConnectionManagerRequestService.sendRequest) {
            // Get the stream generator by passing stream: true
            // Passing undefined for maxTokens to allow the model default
            const isStreamingEnabled = extension_settings[extensionName].stream_pipeline;
            const createGenerator = await st.ConnectionManagerRequestService.sendRequest(
                ConnectionProfile, 
                messages, 
                undefined, 
                { stream: isStreamingEnabled }
            );
            
            if (typeof createGenerator === 'function') {
                const generator = createGenerator();
                for await (const chunk of generator) {
                    if (chunk && chunk.text !== undefined) {
                        result = chunk.text; // The generator typically yields the accumulated string so far
                        if (onChunk) {
                            onChunk(result);
                        }
                    }
                }
            } else if (createGenerator && typeof createGenerator === 'object') {
                // If it wasn't a stream or generator failed to stream
                result = createGenerator.content || createGenerator.text || String(createGenerator);
                if (onChunk) onChunk(result);
            }
        }

        logDebug("Pass result:", result);
        return result || text;
    } catch (e) {
        console.error("Recast: Error in pass " + pass.name, e);
        return text;
    }
}

async function runPipeline(originalText, messageId, skipHide = false) {
    if (isProcessing) return;
    if (!extension_settings[extensionName].enabled) return;

    const MinChars = extension_settings[extensionName].min_chars ?? 0;
    if (MinChars > 0 && originalText.trim().length < MinChars) {
        logDebug(`Skipping pipeline: text length ${originalText.trim().length} is below min_chars (${MinChars}).`);
        return;
    }

    isProcessing = true;
    currentMessageId = messageId;
    isPipelineCancelled = false;
    
    const idx = getActivePresetIndex();
    if (idx === -1) {
        isProcessing = false;
        return;
    }
    
    const preset = extension_settings[extensionName].presets[idx];
    let currentText = originalText;
    
    const enabledPasses = preset.passes.filter(p => p.enabled);
    
    if (enabledPasses.length > 0) {
        $("#recast_progress_bar").fadeIn(200);
        $("#recast_progress_text").text(`Starting pipeline...`);
        $("#recast_progress_fill").css("width", `0%`);

        $("#form_sheld").addClass("recast-input-active");

        if (!skipHide && extension_settings[extensionName].hide_until_last && currentMessageId !== null) {
            $(`div[mesid="${currentMessageId}"]`).hide();
        }
    }
    
    for (let i = 0; i < enabledPasses.length; i++) {
        if (isPipelineCancelled) {
            logDebug("Pipeline cancelled by user.");
            currentText = originalText;
            break;
        }
        
        const pass = enabledPasses[i];
        const progressPercent = Math.round(((i) / enabledPasses.length) * 100);
        
        $("#recast_progress_text").text(`Pass ${i + 1}/${enabledPasses.length}: ${pass.name}`);
        $("#recast_progress_fill").css("width", `${progressPercent}%`);
        
        const isLastPass = i === enabledPasses.length - 1;
        const hideUntilLast = extension_settings[extensionName].hide_until_last;
        const isStreamingEnabled = extension_settings[extensionName].stream_pipeline;

        const shouldStreamInline = isStreamingEnabled && (isLastPass || !hideUntilLast) && currentMessageId !== null;

        let lastRegexTime = 0;
        let lastRegexResult = "";
        const REGEX_THROTTLE_MS = 1000

        const onChunk = shouldStreamInline ? (chunkText) => {
            const now = performance.now();
            let textToRender = chunkText;

            // Only run heavy ST Regex passes periodically
            if (now - lastRegexTime > REGEX_THROTTLE_MS) {
                lastRegexResult = applySTRegex(chunkText) || chunkText;
                lastRegexTime = now;
            }
            textToRender = lastRegexResult ? lastRegexResult : chunkText;

            const msg = getST().chat[currentMessageId];
            if (msg) {
                msg.mes = textToRender;

                const mesEl = document.querySelector(`#chat .mes[mesid="${currentMessageId}"]`);
                const mesTextEl = mesEl?.querySelector('.mes_text');
                
                if (mesTextEl) {
                    const formattedText = messageFormatting(
                        textToRender,
                        msg.name,
                        msg.is_system,
                        msg.is_user,
                        currentMessageId,
                        {},
                        false
                    );

                    if (power_user && power_user.stream_fade_in) {
                        applyStreamFadeIn(mesTextEl, formattedText);
                    } else {
                        mesTextEl.innerHTML = formattedText;
                    }
                    scrollChatToBottom({ waitForFrame: true });
                } else {
                    updateMessageBlock(currentMessageId, msg);
                }
            }
        } : null;

        const RawPassResult = await runPass(pass, currentText, onChunk);
        const RegexedResult = applySTRegex(RawPassResult);

        if (RegexedResult.trim().length === 0) {
            logDebug(`Pass ${pass.name}: result was empty after ST regex — keeping previous text.`);
        } else {
            currentText = RegexedResult;
        }

        PassResults[pass.id] = currentText;

        // Ensure final state of the pass is updated
        if (shouldStreamInline) {
            const msg = getST().chat[currentMessageId];
            if (msg) {
                msg.mes = currentText;
                if (onChunk && power_user && power_user.stream_fade_in) {
                    // Update DOM directly one last time to avoid abruptly overwriting the fade-in animation via updateMessageBlock
                    const mesEl = document.querySelector(`#chat .mes[mesid="${currentMessageId}"]`);
                    const mesTextEl = mesEl?.querySelector('.mes_text');
                    if (mesTextEl) {
                        const formattedText = messageFormatting(currentText, msg.name, msg.is_system, msg.is_user, currentMessageId, {}, false);
                        applyStreamFadeIn(mesTextEl, formattedText);
                    } else {
                        updateMessageBlock(currentMessageId, msg);
                    }
                } else {
                    updateMessageBlock(currentMessageId, msg);
                }
            }
        }
    }

    LatestResult = currentText;
    isProcessing = false;
    
    if (enabledPasses.length > 0) {
        $("#recast_progress_fill").css("width", `100%`);
        $("#recast_progress_text").text(`Pipeline complete!`);
        setTimeout(() => {
            $("#recast_progress_bar").fadeOut(300);
            $("#form_sheld").removeClass("recast-input-active");
        }, 1500);
    }
    
    // When skipHide is active, the caller (MESSAGE_RECEIVED) handles typewriter display and saving.
    if (skipHide) {
        return currentText;
    }

    if (extension_settings[extensionName].hide_until_last && currentMessageId !== null) {
        if (extension_settings[extensionName].replace_inline) {
            const msg = getST().chat[currentMessageId];
            if (msg) {
                msg.mes = currentText;
                updateMessageBlock(currentMessageId, msg);
            }
        }
        $(`div[mesid="${currentMessageId}"]`).show();
    }
    
    if (extension_settings[extensionName].replace_inline) {
        acceptChanges(currentText);
    } else {
        showDiffModal(originalText, currentText, acceptChanges);
    }
    
    return currentText;
}


//

function applySTRegex(text) {
    try {
        if (typeof getRegexedString === "function") {
            const Result = getRegexedString(text, regex_placement.AI_OUTPUT);
            logDebug("ST regex applied:", Result);
            return Result ?? text;
        }
    } catch (e) {
        console.error("Recast: Error applying ST regex:", e);
    }
    return text;
}

//

function acceptChanges(newText) {
    if (currentMessageId !== null) {
        const msg = getST().chat[currentMessageId];
        if (msg) {
            msg.mes = newText;
            updateMessageBlock(currentMessageId, msg);
            saveChat();
        }
    }
}

// Register Recast macros with ST's MacrosParser.
// {{recast_latest}}        — full text output from the last completed pipeline run
// {{recast_<pass_id>}}     — output of a specific pass from the last pipeline run
function registerMacros() {
    if (typeof MacrosParser === 'undefined' || typeof MacrosParser.addMacro !== 'function') {
        logDebug("MacrosParser not available, skipping macro registration.");
        return;
    }

    MacrosParser.addMacro("recast_latest", () => LatestResult);

    const idx = getActivePresetIndex();
    if (idx === -1) return;

    const Passes = extension_settings[extensionName].presets[idx].passes;
    Passes.forEach(pass => {
        MacrosParser.addMacro(`recast_${pass.id}`, () => PassResults[pass.id] || "");
    });

    logDebug("Macros registered:", ["recast_latest", ...Passes.map(p => `recast_${p.id}`)]);
}

//

jQuery(async () => {
    const settingsHtml = await $.get(`${extensionFolderPath}/index.html`);
    const tempDiv = $('<div>').html(settingsHtml);
    
    // Move progress bar, diff backdrop and diff modal to body so they are visible everywhere
    const progressBar = tempDiv.find("#recast_progress_bar");
    const diffBackdrop = tempDiv.find("#recast_diff_backdrop");
    const diffModal = tempDiv.find("#recast_diff_modal");

    $("body").append(progressBar);
    $("body").append(diffBackdrop);
    $("body").append(diffModal);
    
    // Append the rest to extensions settings
    $("#extensions_settings").append(tempDiv.children());

    loadSettings();
    registerMacros();
    initDiffViewer();

    $("#recast_enabled, #recast_autorun, #recast_inject, #recast_replace_inline, #recast_hide_until_last, #recast_stream_pipeline, #recast_debug_mode, #recast_disable_editable_diff").on("change", saveSettings);
    $("#recast_min_chars").on("input change", saveSettings);
    
    $("#recast_preset_select").on("change", function() {
        extension_settings[extensionName].active_preset = $(this).val();
        loadActivePreset();
        saveSettingsDebounced();
    });

    $("#recast_save_preset").on("click", async () => {
        const st = getST();
        const name = await st.Popup.show.input("Enter a name for the preset:", "", extension_settings[extensionName].active_preset);
        if (!name) return;

        let presetIdx = extension_settings[extensionName].presets.findIndex(p => p.name === name);
        if (presetIdx === -1) {
            extension_settings[extensionName].presets.push({ name: name, passes: [] });
            presetIdx = extension_settings[extensionName].presets.length - 1;
        }

        extension_settings[extensionName].active_preset = name;
        saveActivePreset();
        populatePresetDropdown();
        toastr.success(`Preset "${name}" saved.`);
    });

    $("#recast_load_preset").on("click", () => {
        // Redundant since select handles it, but good for manual refresh
        loadActivePreset();
    });

    $("#recast_add_pass").on("click", () => {
        addPassToUI();
        saveSettings();
    });
    
    $("#recast_run_pipeline").on("click", () => {
        if (!extension_settings[extensionName].enabled) {
            toastr.warning("Recast extension is currently disabled.");
            return;
        }
        const st = getST();
        const mesId = st.chat.length - 1;
        const lastMsg = st.chat[mesId];
        if (lastMsg && !lastMsg.is_user) {
            runPipeline(lastMsg.mes, mesId);
        } else {
            toastr.warning("No AI message found to process.");
        }
    });
    
    // Make pass list sortable (Assuming ST includes jQuery UI sortable or similar, otherwise plain drag and drop is needed)
    if ($.fn.sortable) {
        $("#recast_pass_list").sortable({
            handle: ".fa-grip-vertical",
            update: saveSettings
        });
    }

    $(document).on("click", function() {
        $(".pass-menu-dropdown").hide();
    });

    const st = getST();
    if (st.eventSource && st.event_types) {
        // Helper: attach a MutationObserver on a .mes_text element that blanks any content
        // update while the pipeline is pending, creating a "char is typing..." visual.
        function attachStreamIntercept(mesTextEl) {
            if (streamInterceptObserver) streamInterceptObserver.disconnect();
            mesTextEl.innerHTML = '';
            streamInterceptObserver = new MutationObserver(() => {
                if (isResettingStream) return;
                isResettingStream = true;
                mesTextEl.innerHTML = '';
                isResettingStream = false;
            });
            streamInterceptObserver.observe(mesTextEl, { childList: true, subtree: true, characterData: true });
        }

        // MutationObserver on #chat: intercept the new AI message node the instant it is
        // added to the DOM (before any streaming token renders) and blank its text.
        const chatDomEl = document.getElementById('chat');
        if (chatDomEl) {
            const chatObserver = new MutationObserver((mutations) => {
                if (!hideNextAiMessage) return;
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (
                            node.nodeType === Node.ELEMENT_NODE &&
                            node.classList.contains('mes') &&
                            node.getAttribute('is_user') !== 'true'
                        ) {
                            hideNextAiMessage = false;
                            const mesTextEl = node.querySelector('.mes_text');
                            if (mesTextEl) {
                                attachStreamIntercept(mesTextEl);
                                logDebug('Recast: stream intercepted on new message — blanking until pipeline done.');
                            }
                            return;
                        }
                    }
                }
            });
            chatObserver.observe(chatDomEl, { childList: true });
        }

        // When generation starts, set up interception before any token arrives.
        st.eventSource.on(st.event_types.GENERATION_STARTED, (type, _opts, dryRun) => {
            if (dryRun) return;
            if (!extension_settings[extensionName].enabled) return;
            if (!extension_settings[extensionName].autorun) return;
            if (!extension_settings[extensionName].hide_until_last) return;
            if (type === 'impersonate' || type === 'quiet') return;

            // Only bother if there are passes that will actually run
            const idx = getActivePresetIndex();
            if (idx === -1) return;
            const EnabledPasses = extension_settings[extensionName].presets[idx].passes.filter(p => p.enabled);
            if (EnabledPasses.length === 0) return;

            if (type === 'swipe' || type === 'regenerate') {
                // Swipe/regenerate update an existing element — blank its text directly now
                const st2 = getST();
                const mesId = st2.chat.length - 1;
                if (mesId >= 0 && st2.chat[mesId] && !st2.chat[mesId].is_user) {
                    const mesEl = document.querySelector(`#chat .mes[mesid="${mesId}"]`);
                    const mesTextEl = mesEl?.querySelector('.mes_text');
                    if (mesTextEl) {
                        attachStreamIntercept(mesTextEl);
                        logDebug(`Recast: stream intercepted on swipe/regenerate mesid=${mesId}.`);
                    }
                }
            } else {
                // New message: MutationObserver will catch it the instant the DOM node appears
                hideNextAiMessage = true;
                logDebug('Recast: set hideNextAiMessage=true for upcoming new AI message.');
            }
        });

        // If generation is stopped/aborted, clean up the intercept and restore the raw content.
        st.eventSource.on(st.event_types.GENERATION_STOPPED, () => {
            hideNextAiMessage = false;
            isPipelineCancelled = true;
            if (streamInterceptObserver) {
                streamInterceptObserver.disconnect();
                streamInterceptObserver = null;
            }
            if (extension_settings[extensionName].hide_until_last && extension_settings[extensionName].autorun) {
                const st2 = getST();
                const mesId = st2.chat.length - 1;
                if (mesId >= 0 && st2.chat[mesId]) {
                    updateMessageBlock(mesId, st2.chat[mesId]);
                    logDebug(`Recast: generation stopped — restored content of mesid=${mesId}.`);
                }
            }
        });

        // Run pipeline once the message is fully received.
        st.eventSource.on(st.event_types.MESSAGE_RECEIVED, async (mesId) => {
            if (!extension_settings[extensionName].autorun) return;

            const chat = getST().chat;
            const msg = chat[mesId];
            if (!msg || msg.is_user) return;

            // Capture whether streaming was being intercepted (determines the display path)
            const isIntercepted = streamInterceptObserver !== null;
            // Save the original (unprocessed) text before the pipeline modifies it
            const originalText = msg.mes;

            // ST is done streaming — release the intercept lock NOW, before the pipeline runs.
            // This prevents any timing issue where a pending mutation callback could blank
            // content that streamResult writes after the pipeline.
            if (streamInterceptObserver) {
                streamInterceptObserver.disconnect();
                streamInterceptObserver = null;
                logDebug('Recast: stream intercept released at MESSAGE_RECEIVED.');
            }

            const result = await runPipeline(msg.mes, mesId, isIntercepted);

            if (isIntercepted) {
                if (result !== undefined) {
                    // Allow the final stream fade-in animation some time to complete
                    setTimeout(() => {
                        // True streaming is now done directly during the pipeline execution (runPass).
                        // Just honour the diff/replace-inline setting for the final save.
                        if (extension_settings[extensionName].replace_inline) {
                            acceptChanges(result);
                        } else {
                            // The UI already shows the streamed result, so we need a rejection callback to revert it
                            showDiffModal(originalText, result, acceptChanges, () => {
                                const restoreMsg = getST().chat[mesId];
                                if (restoreMsg) {
                                    restoreMsg.mes = originalText;
                                    updateMessageBlock(mesId, restoreMsg);
                                    saveChat();
                                }
                            });
                        }
                    }, 500); // 500ms delay protects the final visual update
                } else {
                    // Pipeline was skipped — restore the raw streamed content
                    updateMessageBlock(mesId, msg);
                }
            } else if (result === undefined && extension_settings[extensionName].hide_until_last) {
                // Fallback for the non-intercept path: unhide if pipeline was skipped
                $(`div[mesid="${mesId}"]`).show();
            }
        });
    }
});
