import { extension_settings, getContext } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";
import { defaultPresets } from "../defaultPresets.js";

export const extensionName = "Recast";

// Provide dependencies from index.js
let addPassToUIFn = null;
let saveSettingsFn = null;

export const presetManager = {
    init: function(addPassFn, saveFn) {
        addPassToUIFn = addPassFn;
        saveSettingsFn = saveFn;

        // Save Button (Overrides current preset silently)
        $("#recast_save_preset").off("click").on("click", () => {
            this.saveActivePreset();
            toastr.success(`Preset "${extension_settings[extensionName].active_preset}" saved.`);
        });

        // Load Button (Opens Manager Modal)
        $("#recast_load_preset").off("click").on("click", () => {
            this.openManagerModal();
        });

        // Dropdown selection
        $("#recast_preset_select").off("change").on("change", (e) => {
            extension_settings[extensionName].active_preset = $(e.target).val();
            this.loadActivePreset();
            saveSettingsDebounced();
        });

        // Setup modal events
        this.initModalEvents();
    },

    getActivePresetIndex: function() {
        if (!extension_settings[extensionName]?.presets) return -1;
        return extension_settings[extensionName].presets.findIndex(p => p.name === extension_settings[extensionName].active_preset);
    },

    saveActivePreset: function() {
        const idx = this.getActivePresetIndex();
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
        saveSettingsDebounced();
    },

    populatePresetDropdown: function() {
        const select = $("#recast_preset_select");
        select.empty();
        if (extension_settings[extensionName]?.presets) {
            extension_settings[extensionName].presets.forEach(p => {
                select.append($("<option></option>").val(p.name).text(p.name));
            });
        }
        select.val(extension_settings[extensionName].active_preset);
    },

    loadActivePreset: function() {
        const idx = this.getActivePresetIndex();
        if (idx === -1) return;
        
        const preset = extension_settings[extensionName].presets[idx];
        const list = $("#recast_pass_list");
        list.empty();
        
        if (preset && preset.passes && addPassToUIFn) {
            preset.passes.forEach(pass => {
                addPassToUIFn(pass);
            });
        }
    },

    // --- Modal Management ---

    initModalEvents: function() {
        // Modal buttons
        $("#recast_preset_manager_close").on("click", () => {
            $("#recast_preset_manager_modal, #recast_diff_backdrop").hide();
            this.populatePresetDropdown();
            this.loadActivePreset();
        });

        $("#recast_pm_add").on("click", async () => {
            const st = getContext();
            const name = await st.Popup.show.input("Enter name for the new preset:", "");
            if (!name) return;

            if (extension_settings[extensionName].presets.find(p => p.name === name)) {
                toastr.warning("Preset already exists!");
                return;
            }

            extension_settings[extensionName].presets.push({ name: name, passes: [] });
            extension_settings[extensionName].active_preset = name;
            saveSettingsDebounced();
            this.renderManagerList();
        });

        $("#recast_pm_restore").on("click", async () => {
            const st = getContext();
            const confirm = await st.Popup.show.confirm("Restore Default Presets", "This will add the default presets back. Existing presets with the same name will be overwritten. Proceed?");
            if (!confirm) return;

            defaultPresets.forEach(dp => {
                const existingIdx = extension_settings[extensionName].presets.findIndex(p => p.name === dp.name);
                if (existingIdx !== -1) {
                    extension_settings[extensionName].presets[existingIdx] = JSON.parse(JSON.stringify(dp));
                } else {
                    extension_settings[extensionName].presets.push(JSON.parse(JSON.stringify(dp)));
                }
            });
            
            saveSettingsDebounced();
            this.renderManagerList();
            toastr.success("Default presets restored.");
        });

        // Setup sortable list for rearrange
        $("#recast_pm_list").sortable({
            handle: ".rc-pm-drag",
            update: () => {
                this.saveManagerOrder();
            }
        });

        // Delegate events for list items (rename/delete)
        $("#recast_pm_list").on("click", ".rc-pm-delete", async (e) => {
            const name = $(e.currentTarget).closest(".rc-pm-item").data("name");
            const st = getContext();
            const confirm = await st.Popup.show.confirm("Delete Preset", `Are you sure you want to delete "${name}"?`);
            if (!confirm) return;

            extension_settings[extensionName].presets = extension_settings[extensionName].presets.filter(p => p.name !== name);
            if (extension_settings[extensionName].active_preset === name) {
                extension_settings[extensionName].active_preset = extension_settings[extensionName].presets[0]?.name || "";
            }
            saveSettingsDebounced();
            this.renderManagerList();
        });

        $("#recast_pm_list").on("click", ".rc-pm-rename", async (e) => {
            const item = $(e.currentTarget).closest(".rc-pm-item");
            const oldName = item.data("name");
            const st = getContext();
            const newName = await st.Popup.show.input(`Rename "${oldName}":`, "", oldName);
            
            if (!newName || newName === oldName) return;
            if (extension_settings[extensionName].presets.find(p => p.name === newName)) {
                toastr.warning("A preset with this name already exists.");
                return;
            }

            const preset = extension_settings[extensionName].presets.find(p => p.name === oldName);
            if (preset) {
                preset.name = newName;
                if (extension_settings[extensionName].active_preset === oldName) {
                    extension_settings[extensionName].active_preset = newName;
                }
                saveSettingsDebounced();
                this.renderManagerList();
            }
        });
    },

    openManagerModal: function() {
        this.renderManagerList();
        $("#recast_diff_backdrop").show(); // Reusing the backdrop
        $("#recast_preset_manager_modal").show();
    },

    renderManagerList: function() {
        const list = $("#recast_pm_list");
        list.empty();
        
        extension_settings[extensionName].presets.forEach(p => {
            const isActive = p.name === extension_settings[extensionName].active_preset;
            const activeTag = isActive ? `<span class="rc-pm-active-tag">Active</span>` : "";
            const itemHtml = `
                <div class="rc-pm-item" data-name="${p.name}">
                    <div class="rc-pm-drag fa-solid fa-grip-vertical"></div>
                    <div class="rc-pm-name">${p.name} ${activeTag}</div>
                    <div class="rc-pm-actions">
                        <button class="menu_button rc-pm-rename fa-solid fa-pen" title="Rename"></button>
                        <button class="menu_button red_button rc-pm-delete fa-solid fa-trash" title="Delete"></button>
                    </div>
                </div>
            `;
            list.append(itemHtml);
        });
    },

    saveManagerOrder: function() {
        const newOrder = [];
        $("#recast_pm_list .rc-pm-item").each(function() {
            const name = $(this).data("name");
            const preset = extension_settings[extensionName].presets.find(p => p.name === name);
            if (preset) newOrder.push(preset);
        });
        extension_settings[extensionName].presets = newOrder;
        saveSettingsDebounced();
    }
};
