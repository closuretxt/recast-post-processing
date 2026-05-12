import { extension_settings } from "../../../../extensions.js";
import { saveSettingsDebounced } from "../../../../../script.js";
import { defaultPresets } from "./defaultPresets.js";
import { presetManager } from "../ui/presetManager.js";
import { extensionName } from "../index.js";

export const defaultSettings = {
    enabled: true,
    autorun: true, // Runs on gen
    inject: true, // Should edit messages with new content
    replace_inline: false, // AKA Disable Diff Viewer
    hide_until_last: true, // Skips all message edit and hides the message until pipeline is about to end
    stream_pipeline: true, // Streaming, has to have default sillystreaming enabled too
    debug_mode: false,
    disable_editable_diff: true, // Disables the edit field in the diff viewer
    legacy_api: false, // Swaps profiles and waits for them before doing the request, useful for fixing some issues with root ST code
    use_profile_preset_prompting: false, // Pulls and applies pass profile's linked chat completion preset for prompt/request building
    compatibility_mode: false, // Enables compatibility fixes for other extensions
    scene_context_as_roles: false,
    min_chars: 60, // Skips if there's not enough characters. Useful for preventing rejections or shortcomings from triggering pipeline
    
    presets: defaultPresets,
    active_preset: "Default Preset"
};

export function initSettingsListeners() {
    $("#recast_enabled, #recast_autorun, #recast_inject, #recast_replace_inline, #recast_hide_until_last, #recast_stream_pipeline, #recast_debug_mode, #recast_disable_editable_diff, #recast_apply_regex_prompts, #recast_legacy_api, #recast_use_profile_preset_prompting, #recast_compatibility, #recast_scene_context_as_roles").on("change", saveSettings);
    $("#recast_min_chars").on("input change", saveSettings);

    // Compatibility warn
    $("#recast_compatibility").on("change", function() {
        if (typeof toastr !== "undefined") {
            toastr.info("Please reload the page for compatibility mode changes to take full effect.", "Recast Note", { timeOut: 10000 });
        }
    });
}

export async function loadSettings() {
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
    $("#recast_apply_regex_prompts").prop("checked", extension_settings[extensionName].apply_regex_prompts);
    $("#recast_legacy_api").prop("checked", extension_settings[extensionName].legacy_api);
    $("#recast_use_profile_preset_prompting").prop("checked", extension_settings[extensionName].use_profile_preset_prompting);
    $("#recast_compatibility").prop("checked", extension_settings[extensionName].compatibility_mode);
    $("#recast_scene_context_as_roles").prop("checked", extension_settings[extensionName].scene_context_as_roles);
    $("#recast_min_chars").val(extension_settings[extensionName].min_chars ?? 0);

    presetManager.populatePresetDropdown();
    presetManager.loadActivePreset();
}

export function saveSettings() {
    extension_settings[extensionName].enabled = $("#recast_enabled").prop("checked");
    extension_settings[extensionName].autorun = $("#recast_autorun").prop("checked");
    extension_settings[extensionName].inject = $("#recast_inject").prop("checked");
    extension_settings[extensionName].replace_inline = $("#recast_replace_inline").prop("checked");
    extension_settings[extensionName].hide_until_last = $("#recast_hide_until_last").prop("checked");
    extension_settings[extensionName].stream_pipeline = $("#recast_stream_pipeline").prop("checked");
    extension_settings[extensionName].debug_mode = $("#recast_debug_mode").prop("checked");
    extension_settings[extensionName].disable_editable_diff = $("#recast_disable_editable_diff").prop("checked");
    extension_settings[extensionName].apply_regex_prompts = $("#recast_apply_regex_prompts").prop("checked");
    extension_settings[extensionName].legacy_api = $("#recast_legacy_api").prop("checked");
    extension_settings[extensionName].use_profile_preset_prompting = $("#recast_use_profile_preset_prompting").prop("checked");
    extension_settings[extensionName].compatibility_mode = $("#recast_compatibility").prop("checked");
    extension_settings[extensionName].scene_context_as_roles = $("#recast_scene_context_as_roles").prop("checked");
    extension_settings[extensionName].min_chars = parseInt($("#recast_min_chars").val(), 10) || 0;
    
    presetManager.saveActivePreset();
    saveSettingsDebounced();
}
