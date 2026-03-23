# Recast | Prose Post-Processing for SillyTavern

⚠️ CURRENTLY UNDER TESTING. I have no idea if it works on different workflows. ⚠️

**Recast** is a SillyTavern extension that adds a highly configurable, multi-pass post-processing pipeline to any AI message output. Aiming towards improving the quality and coherence of the final message.

In the near future, LLMs will be accompanied by output post-processing, allowing models to be corrected, realigned or to fulfill specific purposes without being overly instrusive.
The main problem with LLMs cannot go back once their final response was generated or predict what they will say next, reasoning can help but it's still prone to context poisoning, semantic bleed, lack of creativity or lack of coherence.
Post-processing solves that by allowing completely separate system prompts, reasoning chains or smaller models to take over the original response to verify accuracy or improve the quality of the text without being *completely* contextually aware of what the original request was.

**The Problem With Prompt Engineering:** If you create and edit prompts often, you probably noticed that there is a ceiling you hit very fast, with LLMs lacking the abilities to keep up with so many things at once, while *also* sounding natural and creative. *But what if you could make them all work reliably?* The concept of Post-Processing comes in; By breaking down into tasks *after* the original message was generated, you keep creativity and add restraints after, allowing models to freely create content that will be modified during post-processing steps with strict prompt control.
*Make use of what LLMs are the best at: Smaller, clear and direct tasks.*

⚠️ *This system makes use of multiple API calls, proceed at your own responsability and beware of usage costs.* ⚠️

## 🌟 Core Concept

After a message is generated, you can run it through a sequence of independent transformation passes. Each pass takes the previous output, applies a custom prompt via a separate model/API call, and returns the transformed text.

**Passes are completely independent:**
- They don't use your main prompt.
- They don't share context.
- They don't know about each other.
- They work even with reasoning or not and making use of entirely different models and connection profiles.

Essentially, this picks up a response, processes it through each pass in your pipeline, and overwrites it with the final result. With a solid setup, models also start to automatically pickup high-quality prose from previous responses.

![Example Image](https://raw.githubusercontent.com/closuretxt/closure-imgdump/refs/heads/main/openrouter%20free%20model.png)

## ✨ Features

- **Force LLMs to comply with strict rules:** Make models respect character personalities, speech, complex prose styles, world rules & systems, banned words/behavior or anything else you may want them to!
- **Multi-Pass Pipeline:** Chain multiple prompts together. E.g., Pass 1: "Verify character behavior", Pass 2: "Enhance prose".
- **Customizeable Passes:** Make any prompt for any kind of work, including spicing up the text or adding HTML or XML tags.
- **Reliable Bans:** Ban words, phrases or character behaviors with context awareness and without lobotomizing your model's creativity.
- **Model Agnostic (Connection Profiles):** Use different models for different tasks! Use an emotionally aware model for character validation, and a reasoning model for prose refinement. *(Requires Connection Profiles)*
- **ST Features Integration:** Supports injection of Character Cards, World Info, WI Outlets, Macros, and Scene Context into your post-processing passes.
- **Diff Viewer:** Review, edit, accept, or reject the changes made by the pipeline with a clean side-by-side diff UI.
- **Highly Customizable:**
  - Auto-run on generation or trigger manually.
  - Skip diff view for seamless inline replacement.
  - Hide the original message until the entire pipeline is complete.
- **Preset System:** Save, load, and manage different pipeline configurations. Drag and drop passes to reorder them.
- **Macro Support:** Allows the injection of macros inside the post-processing prompts, allowing other extensions & information to be used in specific passes. Recast also exposes `{{recast_latest}}` and `{{recast_<pass_id>}}` macros for advanced workflows.
- **Simple Direct Design:** We kept everything compact and direct, with advanced options being optional.
![Extension UI](https://raw.githubusercontent.com/closuretxt/closure-imgdump/refs/heads/main/extension%20ui%202.png)

## 🚀 Installation

1. Open SillyTavern.
2. Go to the Extensions menu (plug icon).
3. Click "Install Extension".
4. Paste the URL of this repository and click Install. (https://github.com/closuretxt/recast-post-processing)

## 💡 Usage Guide

1. Navigate to the **Recast Post-Processing** menu in your Extensions tab.
2. Ensure **Enable Pipeline** is checked.
3. (Optional) Click **Add Pass** to create your custom transformation step or use any of the default ones.
4. Configure the pass:
   - **Prompt:** Give or edit instructions to the model (e.g., "Rewrite the following text to be more descriptive...").
   - **Connection:** Select the model/API you want to use for this specific task.
   - **Context Options:** Expand the pass details to adjust Context Length, or use the 3-dot menu to inject World Info, Outlets, Character Cards, or Scene Context.
5. When the AI generates a response, Recast will process it (if "Auto-run" is on), or you can manually click **Run Pipeline**.

*The settings are per-pass and are available by clicking on the arrow:*
![Extension UI](https://raw.githubusercontent.com/closuretxt/closure-imgdump/refs/heads/main/pass%20settings2.png)

### Recommended Workflow
- **Chat Completion** - This extension requires at least one Chat Completion endpoint, but we recommend at least two.
- **Pass 1: Character Validation** - Use a fast, non-reasoning, emotionally-aware model to ensure the character isn't acting out of themselves.
- **Pass 2: Prose Refinement** - Use a strong reasoning model to enhance the vocabulary, fix grammar, and elevate the writing style.
- **Editing Main Prompt** - Remove or edit any bloat that may restrain the model's creativity, including banning words, strict high-quality writing styles, etc. Please save your original prompts beforehand.
- **Change as you go** - Modifying your main and pass prompts to fulfill your personal preferences is ideal.
- **Trying out** - Trying out with different main or pass models, both non-reasoning and reasoning ones is recommended. Speed and pricing is also something to be considered, since each pass is a different request!

## 🛠️ Prerequisites

- Tested and built on the **Latest Staging** build of SillyTavern.
- For model switching per pass, the **Connection Profiles** extension must be enabled.

## 🤝 Support and Contributions

Contact me through the Discord extension post or Reddit comments on the original post regarding this extension.

You can help by submitting bug reports or opening pull requests!

*Special thanks to Qvink for the Connection Profile generation! (github.com/qvink/qvink_memory)*

*Beautiful custom theme - Moonlit Echoes by Rivelle! (https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme)*

## Examples

 - Claude 4.6 Opus as the Main Model, GLM 5 No reasoning (Validator) and DS 3.2 Reasoning (Prose)
![Example Image](https://raw.githubusercontent.com/closuretxt/closure-imgdump/refs/heads/main/claude%20opus%204.6.png)
![Example Image](https://raw.githubusercontent.com/closuretxt/closure-imgdump/refs/heads/main/claude%20opus%204.6%202.png)

 - Gemini 2 Lite as the Main Model, GLM 5 No reasoning (Validator) and DS 3.2 Reasoning (Prose)
![Example Image](https://github.com/closuretxt/closure-imgdump/blob/main/gemini%202%20lite.png)

 - Deepseek 3.2 Reasoning, GLM 5 No reasoning (Validator) and DS 3.2 Reasoning (Prose)
![Example](https://raw.githubusercontent.com/closuretxt/closure-imgdump/refs/heads/main/deepseek%20reasoning.png)

## 📄 License

AGPL-3.0 LICENSE || Please read LICENSE for more information.

## TO-DO
- Somehow make it stop disappearing with visual swipes (But you can still swipe with keybinds)
- Advanced Prompt Control, prefills and role management Options
- Text Completion Support
- Conditional Pass Triggers based on ST-script
- Adaptative Pass to decide the order and which Passes will be used for the upcoming generation
- Step Diff Viewer (View how the text changed per step)
- Tool Calling
- Addition Type Pass (For Trackers)