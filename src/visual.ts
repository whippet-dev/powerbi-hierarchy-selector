"use strict";

import powerbi from "powerbi-visuals-api";
import "../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

export class Visual implements IVisual {
    private readonly container: HTMLDivElement;

    public constructor(options: VisualConstructorOptions) {
        this.container = document.createElement("div");
        this.container.className = "hierarchy-selector";
        options.element.appendChild(this.container);
    }

    public update(options: VisualUpdateOptions): void {
        this.container.innerHTML = "";

        const hierarchyLevels = [
            "Continent",
            "Country",
            "Region",
            "City",
            "Site"
        ];

        for (const levelName of hierarchyLevels) {
            const level = document.createElement("div");
            level.className = "hierarchy-level";

            const label = document.createElement("div");
            label.className = "hierarchy-level__label";
            label.textContent = levelName;

            const button = document.createElement("button");
            button.className = "hierarchy-level__button";
            button.type = "button";
            button.textContent = "Select";

            level.appendChild(label);
            level.appendChild(button);
            this.container.appendChild(level);
        }

        this.container.style.width = `${options.viewport.width}px`;
        this.container.style.height = `${options.viewport.height}px`;
    }
}