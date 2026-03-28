# Recast | Slash Commands Documentation

This document outlines the available slash commands provided by `util/slashCommands.js` for the **Recast** SillyTavern extension. These commands allow you to trigger, configure, and automate the post-processing pipeline directly from the chat box or via ST-scripts.

---

## Available Macros

Recast registers the following macros with SillyTavern, allowing you to access pipeline output in other extensions or prompts:

- `{{recast_latest}}`: Contains the full text output from the last completed pipeline run.
- `{{recast_<pass_id>}}`: Contains the output of a specific pass from the last pipeline run (e.g., `{{recast_pass_12345}}`).

You can also use macros and outlets inside Pass Prompts.

---

## Available Commands

### `/rc-run`
**Aliases:** `/recast-run`  
**Description:** Runs the Recast pipeline on a specific message.
- **Arguments:**
  - `mesId` *(Number, Optional)*: The ID of the AI message you want to process.
- **Usage:**
  - `/rc-run` - Runs the pipeline on the very last message in the chat.
  - `/rc-run 5` - Runs the pipeline on the AI message with the ID of 5.

---

### `/rc-runbulk`
**Aliases:** `/recast-runbulk`  
**Description:** Runs the Recast pipeline sequentially on a range of messages in the background.
- **Arguments:**
  - `range` *(String, Required)*: The range of message IDs to process (e.g., `5-10`).
  - `waitTime` *(Number, Optional)*: Wait time between processing each message, in seconds. Defaults to `1`.
- **Usage:**
  - `/rc-runbulk 5-10` - Processes messages 5 through 10 with a 1-second delay between each.
  - `/rc-runbulk 5-10 2.5` - Processes the same range but waits 2.5 seconds between each request.

---

### `/rc-toggle`
**Aliases:** `/recast-toggle`  
**Description:** Enables or disables the Recast extension globally.
- **Arguments:**
  - `state` *(Boolean, Optional)*: The state to set (`true` or `false`).
- **Usage:**
  - `/rc-toggle` - Toggles the current state (if on, turns off; if off, turns on).
  - `/rc-toggle true` - Explicitly enables Recast.
  - `/rc-toggle false` - Explicitly disables Recast.

---

### `/rc-difftoggle`
**Aliases:** `/recast-difftoggle`  
**Description:** Toggles the Recast Diff Viewer setting (also known as inline replacement).
- **Arguments:**
  - `state` *(Boolean, Optional)*: The state to set (`true` or `false`).
- **Usage:**
  - `/rc-difftoggle` - Toggles the current setting.
  - `/rc-difftoggle true` - Enables inline replacement (bypasses the Diff Viewer).
  - `/rc-difftoggle false` - Disables inline replacement (shows the Diff Viewer).

---

### `/rc-customrun`
**Aliases:** `/recast-customrun`  
**Description:** Runs a custom set of passes on a specific message without permanently changing your active preset. Useful for complex scripting workflows.
- **Arguments:**
  - `mesId` *(Number, Optional)*: The message ID to process. Defaults to the last message if omitted.
  - `passes` *(String, Required)*: A 1-based index list of passes to run, formatted inside curly braces.
- **Usage:**
  - `/rc-customrun passes={1, 3}` - Runs only Pass 1 and Pass 3 on the last message.
  - `/rc-customrun mesId=5 passes={2}` - Runs only Pass 2 on message ID 5.

---

### `/rc-profile`
**Aliases:** `/recast-profile`  
**Description:** Switches the currently active Recast profile/preset, or returns the current profile name if no argument is provided.
- **Arguments:**
  - `profileName` *(String, Optional)*: The exact name of the profile to switch to.
- **Usage:**
  - `/rc-profile` - Shows the name of the currently active profile.
  - `/rc-profile "My Custom Preset"` - Switches the active preset to "My Custom Preset".
