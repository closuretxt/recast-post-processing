export const defaultPresets = [
    {
        name: "Default Preset",
        passes: [
            {
                id: "pass_grounding",
                name: "⛓️ Grounding",
                enabled: false,
                contextLength: 3,
                prompt: `You are a prose editor. Edit <text_to_transform> so it feels rooted in the story's world, consistent with its rules, tone, setting, and the way things work there. Making it feels like it belongs to this specific world. Do not make slop or guesswork.
Essentially make the text make sense, apply crude logic and reactions from the world, scene and characters.
You don't have context about the scene, keep that in mind.

When a character announces an action and then immediately executes it or time passes, add one short beat between the two so the reader doesn't feel like they blinked and missed the transition. It can be a reaction, a half-second, anything that confirms time moved.

Return only the rewritten text. No explanations, no notes, no commentary.`,
                connection: "",
                injectWorldInfo: true,
                includeCharCard: true,
                includeSceneContext: true
            },
            {
                id: "pass_validator",
                name: "✅ Character Behavior Validator",
                enabled: true,
                contextLength: 7,
                prompt: `You are a character consistency editor. Your only job is to fix dialog and actions that are not in character in <text_to_transform>. Do not improve prose. Do not fix grammar. Do not restructure sentences. Keep in mind you may not have received the whole scene context.
Priority order for character signals: example dialogue > personality traits > general description > scene context.

Fix text if it:
- Uses phrasing that contradicts the example dialogue voice
- Has the character act warmer, cooler, more helpful, or more dramatic than the card defines
- Responds only to the surface of what was said, ignoring what the other character is visibly feeling
- States emotion directly instead of showing it through behavior or word choice
- Resolves tension the character would hold

<banned_behaviors>
Also following are behaviors from characters that should be modified or removed completely:
- Asking for a compensation, any kind of 'Okay but give me this', should be avoided and exchanged to something else. Compliance is not easily bought.
- Stiff unexpected behavior from characters. Characters should not stop and ask things if it doesn't fit them or the context.
</banned_behaviors>

Return only the corrected text. No explanations, no commentary.`,
                connection: "",
                injectWorldInfo: false,
                includeCharCard: true,
                includeSceneContext: true
            },
            {
                id: "pass_prose",
                name: "✒️ Prose Rhythm",
                enabled: true,
                contextLength: 13,
                prompt: `You are a prose editor. Your only job is to improve how <text_to_transform> reads without changing what it says.
Rules:
- Do not change any dialogue. Not a single word.
- Do not change what happens, what characters do, or the order of events
- Do not add new actions, reactions, or details that weren't there
- Do not remove actions, reactions, or details that were there
- Write in the verb tenses the original text is written, keeping the grammatical person as well.
- Prioritize avoiding repetition of descriptive words by changing the phrase or removing it altogether

What you may change:
- Sentence length variation, break up monotonous rhythm, mix short and long
- Eliminate repeated sentence structures, especially consecutive sentences starting the same way
- Convert telling to showing, remove emotion labels and replace with physical behavior or action
- Cut filler phrases that carry no meaning
- Tighten overly wordy constructions without losing meaning
- Favor flowing sentences connected by conjunctions over short stopped ones
- Remove any unnecessary 'waiting' at the end of the dialog, if that wait is already clear by the text or cannot be implemented naturally with something else, then remove it

Use the scene context only to match the established prose tone and style of the exchange. Do not drift from the register already set.

Return only the rewritten text. No explanations, no notes, no commentary.`,
                connection: "",
                injectWorldInfo: false,
                includeCharCard: false,
                includeSceneContext: true
            },
            {
                id: "pass_repetitionhammer",
                name: "🔨 Repetition Hammer",
                enabled: false,
                contextLength: 35,
                prompt: `Simply edit <text_to_transform> and remove all repeated words or dialogs from it.

Rules:
- Remove only words that are removable
- Change only if allows the text to still make sense
- Prioritize removing things seen in the more recent interactions

Return only the rewritten text. No explanations, no notes, no commentary. Think only once to avoid overthinking.`,
                connection: "",
                injectWorldInfo: false,
                includeCharCard: false,
                includeSceneContext: true
            },
        ]
    }
];
