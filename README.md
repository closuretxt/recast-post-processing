# Recast | Prose Post-Processing for SillyTavern

**Recast** is a SillyTavern extension that adds a highly configurable, multi-pass post-processing pipeline to any AI message output. 

Large language models get better every day, but their performance in multi-tasking and chatting still degrades when keeping track of complex worlds, multiple characters, trackers, and repetition. It gets messy fast. Recast solves this by allowing specific prompts and corrections to be applied *after* the original response is generated, without touching your main prompt.

If you create and edit your prompts often, you notice that there's a ceiling you hit very fast and essentially lack the management abilities to keep up with so many things at the same time while also sounding natural and creative, but what if you could make them all work reliably? The concept of Post-Processing comes in, by breaking down into tasks after the original message was generated, you keep creativity and add restraints after, allowing models to freely create content that will be 'diffused' in the following steps.

## 🌟 Core Concept

After a message is generated, you can run it through a sequence of independent transformation passes. Each pass takes the previous output, applies a custom prompt via a separate model/API call, and returns the transformed text. 

**Passes are completely independent:**
- They don't share your main prompt.
- They don't share context.
- They don't know about each other.
- No reasoning required.
- They can use entirely different models and connection profiles.

Essentially, this picks up a roleplay response, processes it through each pass in your pipeline, and overwrites it with the final result. With a well made setup, models also start to automatically pickup high-quality prose from previous responses, making everything run even smoother.

## ✨ Features

- **Multi-Pass Pipeline:** Chain multiple prompts together. E.g., Pass 1: "Verify character behavior", Pass 2: "Enhance prose".
- **Customizeable Passes** Make any prompt for any kind of work, including spicing up the text or adding HTML or XML tags.
- **Reliable Bans** Ban words, phrases or character behaviors with context awareness and without lobotomizing your model.
- **Model Agnostic (Connection Profiles):** Use different models for different tasks! Use an emotionally aware model for character validation, and a reasoning model for prose refinement. *(Requires Connection Profiles)*
- **ST Features Integration:** Supports injection of Character Cards, World Info, WI Outlets, Macros, and Scene Context into your post-processing passes.
- **Diff Viewer:** Review, edit, accept, or reject the changes made by the pipeline with a clean side-by-side diff UI.
- **Highly Customizable:**
  - Auto-run on generation or trigger manually.
  - Skip diff view for seamless inline replacement.
  - Hide the original message until the entire pipeline is complete.
- **Preset System:** Save, load, and manage different pipeline configurations. Drag and drop passes to reorder them.
- **Macro Support:** Exposes `{{recast_latest}}` and `{{recast_<pass_id>}}` macros for advanced SillyTavern workflows.

## 🚀 Installation

1. Open SillyTavern.
2. Go to the Extensions menu (plug icon).
3. Click "Install Extension".
4. Paste the URL of this repository and click Install. (https://github.com/closuretxt/recast-post-processing)

## 💡 Usage Guide

1. Navigate to the **Recast Post-Processing** menu in your Extensions tab.
2. Ensure **Enable Pipeline** is checked.
3. Click **Add Pass** to create your custom transformation step or use any of the default ones.
4. Configure the pass:
   - **Prompt:** Give instructions to the model (e.g., "Rewrite the following text to be more descriptive...").
   - **Connection:** Select the model/API you want to use for this specific task.
   - **Context Options:** Expand the pass details to adjust Context Length, or use the 3-dot menu to inject World Info, Outlets, Character Cards, or Scene Context.
5. When the AI generates a response, Recast will process it (if "Auto-run" is on), or you can manually click **Run Pipeline**.

### Recommended Workflow
- **Pass 1: Character Validation** - Use a fast, non-reasoning, emotionally-aware model to ensure the character isn't acting out of themselves.
- **Pass 2: Prose Refinement** - Use a strong reasoning model to enhance the vocabulary, fix grammar, and elevate the writing style.
- **Editing Main Prompt** - Remove or edit any bloat that may restrain the model's creativity, including banning words, strict high-quality writing styles, etc. Please save your original prompts beforehand.

## 🛠️ Prerequisites

- Tested and built on the **Latest Staging** build of SillyTavern.
- For model switching per pass, the **Connection Profiles** extension must be enabled.

## 🤝 Support and Contributions

Contact me through the Discord extension post or Reddit comments on the original post regarding this extension.

You can help by submitting bug reports or opening pull requests!

*Special thanks to Qvink for the Connection Profile generation! (github.com/qvink/qvink_memory)*

## 📄 License

AGPL-3.0 LICENSE