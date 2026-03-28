import { getContext, extension_settings } from "../../../../extensions.js";
import { extensionName, runPipeline, saveSettings } from "../index.js";
import { presetManager } from "../ui/presetManager.js";

/* Necessary commands:
/rc-run mesId (If no mes Id runs on last message)
/rc-runbulk From_mesId-To_mesId WaitTime (Bulk runs from X to Y message, optional wait time between requests default 1 second)
/rc-toggle toggleTo (Toggles to true or false accordingly the extension enabled, if none just toggles it)
/rc-diffToggle toggleTo (Toggles to true or false accordingly the diff viewer setting, if none just toggles it)

/rc-customrun mesId=mesId passes={1, 2, 3} (allows you to run a custom pass with specific pass settings. Make this as undisruptive as possible to index.js)
*/

export function initSlashCommands() {
    const ctx = getContext();
    const SlashCommandParser = ctx.SlashCommandParser;
    const SlashCommand = ctx.SlashCommand;
    const SlashCommandArgument = ctx.SlashCommandArgument;
    const SlashCommandNamedArgument = ctx.SlashCommandNamedArgument;
    const ARGUMENT_TYPE = ctx.ARGUMENT_TYPE;

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'rc-run',
        aliases: ['recast-run'],
        helpString: 'Run the Recast pipeline on a specific message. If no message ID is provided, runs on the last message.',
        callback: async (args, mesId) => {
            const st = getContext();
            let targetId = mesId;
            
            if (targetId === "" || targetId === undefined || targetId === null) {
                targetId = st.chat.length - 1;
            } else {
                targetId = parseInt(targetId, 10);
            }
            
            if (isNaN(targetId) || targetId < 0 || targetId >= st.chat.length) {
                toastr.warning("Invalid message ID.");
                return "";
            }
            
            const msg = st.chat[targetId];
            if (!msg || msg.is_user) {
                toastr.warning("Recast can only process AI messages.");
                return "";
            }
            
            runPipeline(msg.mes, targetId);
            return "";
        },
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Message ID to process',
                isRequired: false,
                typeList: [ARGUMENT_TYPE.NUMBER],
            }),
        ],
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'rc-runbulk',
        aliases: ['recast-runbulk'],
        helpString: 'Run the Recast pipeline on a range of messages (e.g. 5-10).',
        callback: async (args, range, waitTime) => {
            const st = getContext();
            
            if (!range || typeof range !== "string" || !range.includes("-")) {
                toastr.warning("Please provide a valid range (e.g., 5-10).");
                return "";
            }
            
            const parts = range.split("-");
            let fromId = parseInt(parts[0], 10);
            let toId = parseInt(parts[1], 10);
            
            if (isNaN(fromId) || isNaN(toId)) {
                toastr.warning("Invalid range format.");
                return "";
            }
            
            if (fromId > toId) {
                const temp = fromId;
                fromId = toId;
                toId = temp;
            }
            
            fromId = Math.max(0, fromId);
            toId = Math.min(st.chat.length - 1, toId);
            
            let waitMs = 1000;
            if (waitTime !== "" && waitTime !== undefined && waitTime !== null) {
                const parsedWait = parseFloat(waitTime);
                if (!isNaN(parsedWait)) {
                    waitMs = parsedWait * 1000;
                }
            }
            
            // Background async processing
            (async () => {
                for (let i = fromId; i <= toId; i++) {
                    const msg = st.chat[i];
                    if (msg && !msg.is_user) {
                        await runPipeline(msg.mes, i);
                        if (i < toId) {
                            await new Promise(r => setTimeout(r, waitMs));
                        }
                    }
                }
            })();
            
            return "";
        },
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Range of messages (e.g., 5-10)',
                isRequired: true,
                typeList: [ARGUMENT_TYPE.STRING],
            }),
            SlashCommandArgument.fromProps({
                description: 'Wait time between requests in seconds (default: 1)',
                isRequired: false,
                typeList: [ARGUMENT_TYPE.NUMBER],
            }),
        ],
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'rc-toggle',
        aliases: ['recast-toggle'],
        helpString: 'Toggle the Recast extension on or off.',
        callback: (args, state) => {
            const settings = extension_settings[extensionName];
            if (state === "" || state === undefined || state === null) {
                settings.enabled = !settings.enabled;
            } else {
                settings.enabled = String(state).toLowerCase() === "true";
            }
            
            $("#recast_enabled").prop("checked", settings.enabled);
            saveSettings();
            
            toastr.info(`Recast extension is now ${settings.enabled ? 'enabled' : 'disabled'}.`);
            return "";
        },
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Boolean value to set the state (true/false)',
                isRequired: false,
                typeList: [ARGUMENT_TYPE.BOOLEAN],
            }),
        ],
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'rc-difftoggle',
        aliases: ['recast-difftoggle'],
        helpString: 'Toggle the Recast diff viewer setting on or off (replace_inline).',
        callback: (args, state) => {
            const settings = extension_settings[extensionName];
            let targetState;
            
            if (state === "" || state === undefined || state === null) {
                targetState = !settings.replace_inline;
            } else {
                targetState = String(state).toLowerCase() === "true";
            }
            
            settings.replace_inline = targetState;
            $("#recast_replace_inline").prop("checked", settings.replace_inline);
            saveSettings();
            
            toastr.info(`Recast inline replacement is now ${settings.replace_inline ? 'enabled (no diff)' : 'disabled (diff viewer)'}.`);
            return "";
        },
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Boolean value to set replace_inline (true/false)',
                isRequired: false,
                typeList: [ARGUMENT_TYPE.BOOLEAN],
            }),
        ],
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'rc-customrun',
        aliases: ['recast-customrun'],
        helpString: 'Run a custom set of passes on a message. (e.g., /rc-customrun mesId=5 passes={1, 3})',
        callback: async (args) => {
            const st = getContext();
            
            let targetId = args.mesId;
            if (targetId === undefined || targetId === null) {
                targetId = st.chat.length - 1;
            } else {
                targetId = parseInt(targetId, 10);
            }
            
            if (isNaN(targetId) || targetId < 0 || targetId >= st.chat.length) {
                toastr.warning("Invalid message ID.");
                return "";
            }
            
            const msg = st.chat[targetId];
            if (!msg || msg.is_user) {
                toastr.warning("Recast can only process AI messages.");
                return "";
            }
            
            let passesStr = args.passes;
            if (!passesStr) {
                toastr.warning("No passes specified. Provide passes={1, 2, 3}");
                return "";
            }
            
            // Parse passes string "{1, 2, 3}"
            passesStr = passesStr.replace(/[{}]/g, '');
            const passIndexesToRun = passesStr.split(',').map(s => parseInt(s.trim(), 10) - 1).filter(n => !isNaN(n));
            
            if (passIndexesToRun.length === 0) {
                toastr.warning("Invalid passes format.");
                return "";
            }
            
            // Temporarily swap out active preset passes?
            // "Make this as undisruptive as possible to index.js"
            // Let's create a temporary modified preset and set it
            const settings = extension_settings[extensionName];
            const originalIdx = presetManager.getActivePresetIndex();
            
            if (originalIdx === -1) {
                toastr.warning("No active preset to modify.");
                return "";
            }
            
            const originalPreset = settings.presets[originalIdx];
            const tempPasses = originalPreset.passes.map((p, idx) => {
                return { ...p, enabled: passIndexesToRun.includes(idx) };
            });
            
            // Temporarily store original passes
            const originalPassesBackup = JSON.parse(JSON.stringify(originalPreset.passes));
            
            // Set modified passes
            originalPreset.passes = tempPasses;
            
            // Await the pipeline run so we can restore it safely afterwards
            // runPipeline manages its own state, but we need to wait for it.
            try {
                await runPipeline(msg.mes, targetId);
            } finally {
                // Restore original passes
                originalPreset.passes = originalPassesBackup;
                // Don't saveSettings so it doesn't write to file the temp state.
            }

            return "";
        },
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({
                name: 'mesId',
                description: 'Message ID to process',
                isRequired: false,
                typeList: [ARGUMENT_TYPE.NUMBER],
            }),
            SlashCommandNamedArgument.fromProps({
                name: 'passes',
                description: 'List of pass indices to run, 1-based (e.g., {1, 3})',
                isRequired: true,
                typeList: [ARGUMENT_TYPE.STRING],
            }),
        ],
    }));
}
