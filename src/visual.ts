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
            dataView?.categorical?.categories ?? [];

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
        const values =
            this.formattingSettings.valuesCard;

        const colours =
            this.formattingSettings.coloursCard;

        const headings =
            this.formattingSettings.headingsCard;

        const levelContainers =
            this.formattingSettings
                .levelContainersCard;

        const clearControls =
            this.formattingSettings
                .clearControlsCard;

        const layout =
            this.formattingSettings.layoutCard;

        const valueFontSize =
            this.clampNumber(
                values.fontSize.value,
                8,
                28
            );

        const headingFontSize =
            this.clampNumber(
                headings.fontSize.value,
                8,
                28
            );

        const alternativeOpacity =
            this.clampNumber(
                colours.alternativeOpacity.value,
                10,
                100
            ) / 100;

        this.setCssVariable(
            "--hierarchy-value-font-family",
            values.fontFamily.value ||
                "Arial, sans-serif"
        );

        this.setCssVariable(
            "--hierarchy-value-font-size",
            `${valueFontSize}px`
        );

        this.setCssVariable(
            "--hierarchy-value-height",
            `${this.clampNumber(
                values.buttonHeight.value,
                20,
                80
            )}px`
        );

        this.setCssVariable(
            "--hierarchy-value-radius",
            `${this.clampNumber(
                values.buttonRadius.value,
                0,
                24
            )}px`
        );

        this.setCssVariable(
            "--hierarchy-value-gap",
            `${this.clampNumber(
                values.buttonGap.value,
                0,
                24
            )}px`
        );

        this.setCssVariable(
            "--hierarchy-value-text",
            this.getColour(
                colours.valueText.value.value,
                "#242424"
            )
        );

        this.setCssVariable(
            "--hierarchy-hover-background",
            this.getColour(
                colours.hoverBackground.value.value,
                "#F0F0F0"
            )
        );

        this.setCssVariable(
            "--hierarchy-selected-text",
            this.getColour(
                colours.selectedText.value.value,
                "#242424"
            )
        );

        this.setCssVariable(
            "--hierarchy-selected-background",
            this.getColour(
                colours
                    .selectedBackground
                    .value
                    .value,
                "#E1DFDD"
            )
        );

        this.setCssVariable(
            "--hierarchy-alternative-text",
            this.getColour(
                colours.alternativeText.value.value,
                "#6B6B6B"
            )
        );

        this.setCssVariable(
            "--hierarchy-alternative-opacity",
            alternativeOpacity.toString()
        );

        this.setCssVariable(
            "--hierarchy-border-colour",
            this.getColour(
                colours.borderColour.value.value,
                "#D1D1D1"
            )
        );

        this.setCssVariable(
            "--hierarchy-heading-font-family",
            headings.fontFamily.value ||
                "Arial, sans-serif"
        );

        this.setCssVariable(
            "--hierarchy-heading-font-size",
            `${headingFontSize}px`
        );

        this.setCssVariable(
            "--hierarchy-heading-weight",
            headings.bold.value
                ? "600"
                : "400"
        );

        this.setCssVariable(
            "--hierarchy-heading-text",
            this.getColour(
                headings.textColour.value.value,
                "#242424"
            )
        );

        const containerBackground =
            levelContainers.showBackground.value
                ? this.getColour(
                    levelContainers
                        .backgroundColour
                        .value
                        .value,
                    "#FFFFFF"
                )
                : "transparent";

        this.setCssVariable(
            "--hierarchy-container-background",
            containerBackground
        );

        this.setCssVariable(
            "--hierarchy-container-border-width",
            `${this.clampNumber(
                levelContainers.borderWidth.value,
                0,
                8
            )}px`
        );

        this.setCssVariable(
            "--hierarchy-container-radius",
            `${this.clampNumber(
                levelContainers.cornerRadius.value,
                0,
                24
            )}px`
        );

        this.setCssVariable(
            "--hierarchy-container-padding",
            `${this.clampNumber(
                levelContainers.innerPadding.value,
                0,
                20
            )}px`
        );

        this.setCssVariable(
            "--hierarchy-clear-text",
            this.getColour(
                clearControls.textColour.value.value,
                "#242424"
            )
        );

        this.setCssVariable(
            "--hierarchy-clear-hover-background",
            this.getColour(
                clearControls
                    .hoverBackground
                    .value
                    .value,
                "#F0F0F0"
            )
        );

        this.setCssVariable(
            "--hierarchy-clear-all-font-size",
            `${this.clampNumber(
                clearControls.clearAllFontSize.value,
                8,
                20
            )}px`
        );

        this.setCssVariable(
            "--hierarchy-clear-icon-size",
            `${this.clampNumber(
                clearControls.levelIconSize.value,
                10,
                28
            )}px`
        );

        this.setCssVariable(
            "--hierarchy-visual-padding",
            `${this.clampNumber(
                layout.visualPadding.value,
                0,
                40
            )}px`
        );

        this.setCssVariable(
            "--hierarchy-level-gap",
            `${this.clampNumber(
                layout.levelGap.value,
                0,
                40
            )}px`
        );

        this.setCssVariable(
            "--hierarchy-level-min-width",
            `${this.clampNumber(
                layout.minimumLevelWidth.value,
                80,
                400
            )}px`
        );

        this.container.classList.toggle(
            "hierarchy-selector--hide-clear-all",
            !layout.showClearAll.value
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

    private setCssVariable(
        name: string,
        value: string
    ): void {
        this.container.style.setProperty(
            name,
            value
        );
    }

    private getColour(
        value: string | undefined,
        fallback: string
    ): string {
        return value || fallback;
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
