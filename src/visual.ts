"use strict";

import powerbi from "powerbi-visuals-api";
import "../style/visual.less";

import VisualConstructorOptions =
    powerbi.extensibility.visual.VisualConstructorOptions;

import VisualUpdateOptions =
    powerbi.extensibility.visual.VisualUpdateOptions;

import IVisual =
    powerbi.extensibility.visual.IVisual;

import DataViewCategoryColumn =
    powerbi.DataViewCategoryColumn;

export class Visual implements IVisual {
    private readonly container: HTMLDivElement;

    public constructor(options: VisualConstructorOptions) {
        this.container = document.createElement("div");
        this.container.className = "hierarchy-selector";

        options.element.appendChild(this.container);
    }

    public update(options: VisualUpdateOptions): void {
        this.container.innerHTML = "";

        this.container.style.width = `${options.viewport.width}px`;
        this.container.style.height = `${options.viewport.height}px`;

        const categories: DataViewCategoryColumn[] =
            options.dataViews?.[0]?.categorical?.categories ?? [];

        if (categories.length === 0) {
            this.renderLandingPage();
            return;
        }

        const fragment = document.createDocumentFragment();

        for (const category of categories) {
            const levelName =
                category.source.displayName || "Hierarchy level";

            const level = this.createHierarchyLevel(levelName);
            fragment.appendChild(level);
        }

        this.container.appendChild(fragment);
    }

    private createHierarchyLevel(levelName: string): HTMLDivElement {
        const level = document.createElement("div");
        level.className = "hierarchy-level";

        const label = document.createElement("div");
        label.className = "hierarchy-level__label";
        label.textContent = levelName;
        label.title = levelName;

        const button = document.createElement("button");
        button.className = "hierarchy-level__button";
        button.type = "button";
        button.textContent = "Select";
        button.setAttribute(
            "aria-label",
            `Select values for ${levelName}`
        );

        level.appendChild(label);
        level.appendChild(button);

        return level;
    }

    private renderLandingPage(): void {
    const landingPage = document.createElement("div");
    landingPage.className = "hierarchy-selector__landing-page";

    const heading = document.createElement("div");
    heading.className = "hierarchy-selector__landing-heading";
    heading.textContent = "Build a hierarchy";

    const instructions = document.createElement("div");
    instructions.className = "hierarchy-selector__landing-text";
    instructions.textContent =
        "Add fields to Hierarchy levels.";

    landingPage.appendChild(heading);
    landingPage.appendChild(instructions);

    this.container.appendChild(landingPage);
}
}