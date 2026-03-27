// If streaming is on, makes the pipeline bar compare word count between the last pass and the one right now, kinda trying to make it show progress. Doesn't work with hyperfast models.
export class PipelineBar {
    constructor() {
        this.progressBar = null;
        this.progressText = null;
        this.progressFill = null;
        this.formShield = null;
        
        this.totalPasses = 0;
        this.currentPassIndex = 0;
        this.basePercent = 0;
        this.passPercentInfluence = 0;
        this.previousPassLength = 0;
        this.isActive = false;
    }

    init(stopCallback) {
        this.progressBar = $("#recast_progress_bar");
        this.progressText = $("#recast_progress_text");
        this.progressFill = $("#recast_progress_fill");
        this.formShield = $("#form_sheld");

        this.progressBar.find("#recast_stop_pipeline").on("click", () => {
            this.hide();
            if (stopCallback) stopCallback();
        });
    }

    _wordCount(text) {
        return text ? text.trim().split(/\s+/).length : 0;
    }

    start(totalPasses, initialText) {
        this.totalPasses = totalPasses;
        const wc = this._wordCount(initialText);
        this.previousPassWords = wc > 0 ? wc : 1;
        this.isActive = true;
        
        this.progressBar.fadeIn(200);
        this.progressText.text(`Starting pipeline...`);
        this.progressFill.css("width", `0%`);
        this.formShield.addClass("recast-input-active");
    }

    updatePass(index, passName) {
        this.currentPassIndex = index;
        this.basePercent = (index / this.totalPasses) * 100;
        this.passPercentInfluence = (1 / this.totalPasses) * 100;
        
        this.progressText.text(`Pass ${index + 1}/${this.totalPasses}: ${passName}`);
        this.progressFill.css("width", `${this.basePercent}%`);
    }

    updateChunk(currentText) {
        if (!this.isActive || this.totalPasses === 0) return;
        
        // Progress up to influence minus 5%
        const maxChunkInfluence = Math.max(0, this.passPercentInfluence - 5);
        const currentWords = this._wordCount(currentText);
        
        if (currentWords >= this.previousPassWords) {
            this.previousPassWords = currentWords + 10;
        }

        const ratio = Math.min(currentWords / this.previousPassWords, 1.0);
        
        const currentPercent = this.basePercent + (ratio * maxChunkInfluence);
        this.progressFill.css("width", `${currentPercent}%`);
    }

    finishPass(finalText) {
        // Snap to the end of this pass's full slot before moving to the next
        const endPercent = this.basePercent + this.passPercentInfluence;
        this.progressFill.css("width", `${endPercent}%`);
        const wc = this._wordCount(finalText);
        this.previousPassWords = wc > 0 ? wc : 1;
    }

    complete() {
        this.isActive = false;
        this.progressFill.css("width", `100%`);
        this.progressText.text(`Pipeline complete!`);
        setTimeout(() => {
            this.hide();
        }, 1500);
    }

    hide() {
        this.isActive = false;
        this.progressBar.fadeOut(300);
        this.formShield.removeClass("recast-input-active");
    }
}

export const pipelineBar = new PipelineBar();
