"use strict";

import powerbi from "powerbi-visuals-api";
import "../style/visual.less";

import { HierarchyTree } from "./hierarchy/HierarchyTree";
import {
    HierarchyLevel,
    HierarchyNode
} from "./models/hierarchy";
import { HierarchyRenderer } from "./rendering/HierarchyRenderer";
import { HierarchySelection } from "./selection/HierarchySelection";
import { HierarchyView } from "./view/HierarchyView";

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
    private readonly hierarchyTree: HierarchyTree;
    private readonly selection: HierarchySelection;
    private readonly hierarchyView: HierarchyView;
    private readonly renderer: HierarchyRenderer;

    private hierarchyLevels: HierarchyLevel[] = [];

    public constructor(options: VisualConstructorOptions) {
        this.container = document.createElement("div");
        this.container.className = "hierarchy-selector";

        options.element.appendChild(this.container);

        this.hierarchyTree = new HierarchyTree();
        this.selection = new HierarchySelection();
        this.hierarchyView = new HierarchyView();
        this.renderer = new HierarchyRenderer(
            this.container
        );
    }

    public update(options: VisualUpdateOptions): void {
        this.container.style.width =
            `${options.viewport.width}px`;

        this.container.style.height =
            `${options.viewport.height}px`;

        const categories: DataViewCategoryColumn[] =
            options.dataViews?.[0]?.categorical?.categories ?? [];

        if (categories.length === 0) {
            this.hierarchyLevels = [];
            this.selection.clear();

            this.renderer.renderLandingPage();
            return;
        }

        const rootNodes =
            this.hierarchyTree.build(categories);

        this.hierarchyLevels =
            this.hierarchyTree.getLevels(
                categories,
                rootNodes
            );

        this.selection.removeInvalidSelections(
            this.hierarchyLevels
        );

        this.render();
    }

    private handleNodeSelection(
        selectedNode: HierarchyNode
    ): void {
        this.selection.toggle(
            selectedNode,
            this.hierarchyLevels.length
        );

        this.render();
    }

    private render(): void {
        const visibleLevels =
            this.hierarchyView.getVisibleLevels(
                this.hierarchyLevels,
                this.selection
            );

        this.renderer.render(
            visibleLevels,
            this.selection,
            (node) => this.handleNodeSelection(node)
        );
    }
}
