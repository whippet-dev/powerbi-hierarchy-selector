"use strict";

import powerbi from "powerbi-visuals-api";
import {
    PrimitiveValueType
} from "powerbi-models";
import {
    FormattingSettingsService
} from "powerbi-visuals-utils-formattingmodel";
import "../style/visual.less";

import { HierarchyFilterService } from "./filtering/HierarchyFilterService";
import { HierarchyTree } from "./hierarchy/HierarchyTree";
import {
    HierarchyLevel,
    HierarchyNode
} from "./models/hierarchy";
import { HierarchyRenderer } from "./rendering/HierarchyRenderer";
import { HierarchySelection } from "./selection/HierarchySelection";
import {
    VisualFormattingSettingsModel
} from "./settings";
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
    private readonly formattingSettingsService:
        FormattingSettingsService;

    private formattingSettings:
        VisualFormattingSettingsModel;

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

        this.formattingSettingsService =
            new FormattingSettingsService();

        this.formattingSettings =
            new VisualFormattingSettingsModel();
    }

    public update(options: VisualUpdateOptions): void {
        this.container.style.width =
            `${options.viewport.width}px`;

        this.container.style.height =
            `${options.viewport.height}px`;

        const dataView =
            options.dataViews?.[0];

        this.formattingSettings =
            dataView
                ? this.formattingSettingsService
                    .populateFormattingSettingsModel(
                        VisualFormattingSettingsModel,
                        dataView
                    )
                : new VisualFormattingSettingsModel();

        this.applyFormattingSettings();

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

    public getFormattingModel():
        powerbi.visuals.FormattingModel {
        return this.formattingSettingsService
            .buildFormattingModel(
                this.formattingSettings
            );
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

    private applyFormattingSettings(): void {
        const fontSize =
            this.clampNumber(
                this.formattingSettings
                    .valuesCard
                    .fontSize
                    .value,
                8,
                40
            );

        const buttonRadius =
            this.clampNumber(
                this.formattingSettings
                    .valuesCard
                    .buttonRadius
                    .value,
                0,
                24
            );

        const selectedBackground =
            this.formattingSettings
                .coloursCard
                .selectedBackground
                .value
                .value ||
            "#E1DFDD";

        this.container.style.setProperty(
            "--hierarchy-value-font-size",
            `${fontSize}px`
        );

        this.container.style.setProperty(
            "--hierarchy-value-radius",
            `${buttonRadius}px`
        );

        this.container.style.setProperty(
            "--hierarchy-selected-background",
            selectedBackground
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

    private clampNumber(
        value: number,
        minimum: number,
        maximum: number
    ): number {
        return Math.min(
            maximum,
            Math.max(minimum, value)
        );
    }
}
