"use strict";

import powerbi from "powerbi-visuals-api";
import {
    PrimitiveValueType
} from "powerbi-models";
import "../style/visual.less";

import { HierarchyFilterService } from "./filtering/HierarchyFilterService";
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
    private readonly filterService: HierarchyFilterService;

    private hierarchyLevels: HierarchyLevel[] = [];
    private categories: DataViewCategoryColumn[] = [];

    /*
     * undefined means there is no local filter update awaiting confirmation.
     * null means a local filter clear is awaiting confirmation.
     * An array means a hierarchy filter is awaiting confirmation.
     */
    private pendingFilterValues:
        PrimitiveValueType[] | null | undefined;

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

        this.filterService =
            new HierarchyFilterService(options.host);
    }

    public update(options: VisualUpdateOptions): void {
        this.container.style.width =
            `${options.viewport.width}px`;

        this.container.style.height =
            `${options.viewport.height}px`;

        this.categories =
            options.dataViews?.[0]?.categorical?.categories ?? [];

        if (this.categories.length === 0) {
            this.hierarchyLevels = [];
            this.pendingFilterValues = undefined;
            this.selection.clear();

            this.renderer.renderLandingPage();
            return;
        }

        const rootNodes =
            this.hierarchyTree.build(this.categories);

        this.hierarchyLevels =
            this.hierarchyTree.getLevels(
                this.categories,
                rootNodes
            );

        const filterValues =
            this.filterService.readSelectedValues(
                options.jsonFilters,
                this.categories
            );

        if (this.pendingFilterValues !== undefined) {
            if (
                this.areFilterValuesEqual(
                    filterValues,
                    this.pendingFilterValues
                )
            ) {
                this.pendingFilterValues = undefined;

                this.selection.synchronizeFromValues(
                    this.hierarchyLevels,
                    filterValues
                );
            } else {
                this.selection.removeInvalidSelections(
                    this.hierarchyLevels
                );
            }
        } else {
            this.selection.synchronizeFromValues(
                this.hierarchyLevels,
                filterValues
            );
        }

        this.render();
    }

    private handleNodeSelection(
        selectedNode: HierarchyNode
    ): void {
        this.selection.toggle(
            selectedNode,
            this.hierarchyLevels.length
        );

        this.applyCurrentSelection();
    }

    private handleClearAll(): void {
        this.selection.clear();
        this.applyCurrentSelection();
    }

    private handleLevelClear(
        levelIndex: number
    ): void {
        this.selection.clearFromLevel(
            levelIndex,
            this.hierarchyLevels.length
        );

        this.applyCurrentSelection();
    }

    private applyCurrentSelection(): void {
        const selectedPath =
            this.selection.getSelectedPath(
                this.hierarchyLevels
            );

        const selectedValues =
            this.filterService.getSelectedValues(
                selectedPath
            );

        this.pendingFilterValues =
            selectedValues.length > 0
                ? selectedValues
                : null;

        this.render();

        this.filterService.apply(
            this.categories,
            selectedPath
        );
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
            (node) =>
                this.handleNodeSelection(node),
            () =>
                this.handleClearAll(),
            (levelIndex) =>
                this.handleLevelClear(levelIndex)
        );
    }

    private areFilterValuesEqual(
        firstValues: PrimitiveValueType[] | null,
        secondValues: PrimitiveValueType[] | null
    ): boolean {
        if (
            firstValues === null ||
            secondValues === null
        ) {
            return firstValues === secondValues;
        }

        if (
            firstValues.length !==
            secondValues.length
        ) {
            return false;
        }

        return firstValues.every(
            (value, index) =>
                value === secondValues[index]
        );
    }
}