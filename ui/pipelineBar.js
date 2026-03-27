export class PipelineBar {
    constructor() {
        this.progressBar = $("#recast_progress_bar");
        this.progressText = $("#recast_progress_text");
        this.progressFill = $("#recast_progress_fill");
        this.formShield = $("#form_sheld");
        
        this.totalPasses = 0;
        this.currentPassIndex = 0;
        this.basePercent = 0;
        this.passPercentInfluence = 0;
        this.previousPassLength = 0;
        this.isActive = false;
    }

    init(stopCallback) {
        this.progressBar.find("#recast_stop_pipeline").on("click", () => {
            this.hide();
            if (stopCallback) stopCallback();
        });
    }

    start(totalPasses, initialTextLength) {
        this.totalPasses = totalPasses;
        this.previousPassLength = initialTextLength > 0 ? initialTextLength : 1;
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

    updateChunk(currentTextLength) {
        if (!this.isActive || this.totalPasses === 0) return;
        
        // Progress up to influence minus 5%
        const maxChunkInfluence = this.passPercentInfluence * 0.95;
        const ratio = Math.min(currentTextLength / this.previousPassLength, 1.0);
        
        const currentPercent = this.basePercent + (ratio * maxChunkInfluence);
        this.progressFill.css("width", `${currentPercent}%`);
    }

    finishPass(finalTextLength) {
        this.previousPassLength = finalTextLength > 0 ? finalTextLength : 1;
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
