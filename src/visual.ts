"use strict";

import powerbi from "powerbi-visuals-api";
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

import VisualUpdateType =
powerbi.VisualUpdateType;

import IVisual =
powerbi.extensibility.visual.IVisual;

import IVisualHost =
powerbi.extensibility.visual.IVisualHost;

import ISelectionManager =
    powerbi.extensibility.ISelectionManager;

import ISelectionId =
    powerbi.visuals.ISelectionId;

import DataView =
powerbi.DataView;

import DataViewMatrix =
powerbi.DataViewMatrix;

import CustomVisualOpaqueIdentity =
powerbi.visuals.CustomVisualOpaqueIdentity;

interface PersistedSelectionState {
    version: number;
    endpointKeys: string[];
}

export class Visual implements IVisual {
    private static readonly selectionStateObjectName =
        "selectionState";

    private static readonly explicitEndpointStatePropertyName =
        "explicitEndpointState";

    private readonly host: IVisualHost;
    private readonly container: HTMLDivElement;
    private readonly hierarchyTree: HierarchyTree;
    private readonly selection: HierarchySelection;
    private readonly hierarchyView: HierarchyView;
    private readonly renderer: HierarchyRenderer;
    private readonly filterService: HierarchyFilterService;
    private readonly selectionManager:
        ISelectionManager;
    private readonly emptySelectionId:
        ISelectionId;
    private readonly formattingSettingsService:
        FormattingSettingsService;

    private readonly isHighContrast:
        boolean;

    private readonly highContrastForeground:
        string;

    private readonly highContrastBackground:
        string;

    private readonly highContrastForegroundSelected:
        string;

    private formattingSettings:
        VisualFormattingSettingsModel;

    private hierarchyLevels: HierarchyLevel[] = [];

    private pendingFilterIdentities:
        CustomVisualOpaqueIdentity[] |
        null |
        undefined;

    private pendingSelectionShouldBePreserved =
        false;

    public constructor(options: VisualConstructorOptions) {
        this.host = options.host;

        this.container = document.createElement("div");
        this.container.className = "hierarchy-selector";

        options.element.appendChild(this.container);

        const colourPalette =
            options.host.colorPalette;

        this.isHighContrast =
            colourPalette.isHighContrast;

        this.highContrastForeground =
            colourPalette.foreground.value;

        this.highContrastBackground =
            colourPalette.background.value;

        this.highContrastForegroundSelected =
            colourPalette
                .foregroundSelected
                .value;

        this.container.classList.toggle(
            "hierarchy-selector--high-contrast",
            this.isHighContrast
        );

        this.selectionManager =
            options.host.createSelectionManager();

        this.emptySelectionId =
            options.host
                .createSelectionIdBuilder()
                .createSelectionId();

        this.container.addEventListener(
            "contextmenu",
            (event) =>
                this.handleEmptyContextMenu(event)
        );

        this.hierarchyTree =
            new HierarchyTree(options.host);
        this.selection = new HierarchySelection();
        this.hierarchyView = new HierarchyView();

        this.renderer = new HierarchyRenderer(
            this.container,
            options.host.tooltipService,
            options.element
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

        const isDataUpdate =
            (
                options.type &
                VisualUpdateType.Data
            ) !== 0;

        const isSelfInitiatedFilterUpdate =
            this.pendingFilterIdentities !==
            undefined;

        if (
            isDataUpdate &&
            !isSelfInitiatedFilterUpdate
        ) {
            this.renderer.clearSearchTerms();
        }

        const matrix: DataViewMatrix | undefined =
            dataView?.matrix;

        if (
            !matrix ||
            matrix.rows.levels.length === 0 ||
            !matrix.rows.root.children?.length
        ) {
            this.hierarchyLevels = [];
            this.pendingFilterIdentities = undefined;
            this.pendingSelectionShouldBePreserved =
                false;
            this.selection.clear();

            this.renderer.renderLandingPage();
            return;
        }

        const configuredBlankValueLabel =
            this.formattingSettings
                .valuesCard
                .blankValueLabel
                .value;

        const blankValueLabel =
            typeof configuredBlankValueLabel ===
                "string" &&
                configuredBlankValueLabel
                    .trim()
                    .length > 0
                ? configuredBlankValueLabel.trim()
                : "(No value)";

        const rootNodes =
            this.hierarchyTree.build(
                matrix,
                blankValueLabel
            );

        this.hierarchyLevels =
            this.hierarchyTree.getLevels(
                matrix,
                rootNodes
            );

        if (
            rootNodes.length === 0 ||
            this.hierarchyLevels.length === 0
        ) {
            this.pendingFilterIdentities = undefined;
            this.pendingSelectionShouldBePreserved =
                false;
            this.selection.clear();

            this.renderer.renderLandingPage();
            return;
        }

        const identityRestoredNodes =
            this.filterService.readSelectedNodes(
                options.jsonFilters,
                rootNodes
            );

        const restoredValuePaths =
            identityRestoredNodes.length === 0
                ? this.filterService
                    .readSelectedValuePaths(
                        options.jsonFilters
                    )
                : null;

        const valueRestoredNodes =
            identityRestoredNodes.length === 0
                ? this.selection.resolveValuePaths(
                    this.hierarchyLevels,
                    restoredValuePaths
                )
                : [];

        const restoredNodes =
            identityRestoredNodes.length > 0
                ? identityRestoredNodes
                : valueRestoredNodes;

        const persistedExplicitNodes =
            this.pendingFilterIdentities === undefined
                ? this.resolvePersistedExplicitSelection(
                    dataView,
                    restoredNodes
                )
                : null;

        if (
            this.pendingFilterIdentities !== undefined
        ) {
            const restoredIdentities =
                restoredNodes.map(
                    (node) => node.identity
                );

            if (
                this.filterService
                    .identityCollectionsEqual(
                        restoredIdentities,
                        this.pendingFilterIdentities
                    )
            ) {
                const preserveExplicitSelection =
                    this.pendingSelectionShouldBePreserved;

                this.pendingFilterIdentities = undefined;
                this.pendingSelectionShouldBePreserved =
                    false;

                if (preserveExplicitSelection) {
                    this.selection.removeInvalidSelections(
                        this.hierarchyLevels
                    );
                } else {
                    this.selection.synchronizeFromNodes(
                        restoredNodes,
                        this.hierarchyLevels
                    );
                }
            } else {
                this.selection.removeInvalidSelections(
                    this.hierarchyLevels
                );
            }
        } else {
            this.pendingSelectionShouldBePreserved =
                false;

            this.selection.synchronizeFromNodes(
                persistedExplicitNodes ??
                    restoredNodes,
                this.hierarchyLevels
            );
        }

        const selectionWasCollapsed =
            this.selection
                .setMultipleSelectionEnabled(
                    this.isMultipleSelectionEnabled(),
                    this.hierarchyLevels
                );

        if (selectionWasCollapsed) {
            this.applyCurrentSelection();
            return;
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
            this.hierarchyLevels,
            this.isMultipleSelectionEnabled()
        );

        this.applyCurrentSelection();
    }

    private handleSelectNodes(
        selectedNodes: HierarchyNode[]
    ): void {
        this.selection.selectNodes(
            selectedNodes,
            this.hierarchyLevels
        );

        this.applyCurrentSelection();
    }
    private handleNodeContextMenu(
        node: HierarchyNode,
        event: MouseEvent,
        target: HTMLElement
    ): void {
        event.preventDefault();
        event.stopPropagation();

        void this.selectionManager
            .showContextMenu(
                node.selectionId,
                this.getContextMenuPosition(
                    event,
                    target
                )
            );
    }

    private handleEmptyContextMenu(
        event: MouseEvent
    ): void {
        event.preventDefault();

        const target =
            event.target instanceof HTMLElement
                ? event.target
                : this.container;

        void this.selectionManager
            .showContextMenu(
                this.emptySelectionId,
                this.getContextMenuPosition(
                    event,
                    target
                )
            );
    }

    private getContextMenuPosition(
        event: MouseEvent,
        target: HTMLElement
    ): { x: number; y: number } {
        if (
            event.clientX !== 0 ||
            event.clientY !== 0
        ) {
            return {
                x: event.clientX,
                y: event.clientY
            };
        }

        const targetBounds =
            target.getBoundingClientRect();

        return {
            x:
                targetBounds.left +
                targetBounds.width / 2,
            y:
                targetBounds.top +
                targetBounds.height / 2
        };
    }


    private handleClearAll(): void {
        this.renderer.clearSearchTerms();
        this.selection.clear();
        this.applyCurrentSelection();
    }

    private handleLevelClear(
        levelIndex: number
    ): void {
        this.renderer.clearSearchTerm(levelIndex);

        this.selection.clearFromLevel(
            levelIndex,
            this.hierarchyLevels
        );

        this.applyCurrentSelection();
    }

    private applyCurrentSelection(): void {
        const selectedEndpoints =
            this.selection.getSelectedEndpoints(
                this.hierarchyLevels
            );

        const filterPlan =
            this.filterService.createFilterPlan(
                selectedEndpoints,
                this.hierarchyLevels
            );

        this.pendingFilterIdentities =
            filterPlan.appliedEndpoints.length > 0
                ? filterPlan.appliedEndpoints.map(
                    (node) => node.identity
                )
                : null;

        this.pendingSelectionShouldBePreserved =
            filterPlan.preserveExplicitSelection;

        this.persistExplicitSelectionState(
            selectedEndpoints,
            filterPlan.preserveExplicitSelection
        );

        this.render();

        this.filterService.apply(filterPlan);
    }

    private persistExplicitSelectionState(
        selectedEndpoints: HierarchyNode[],
        preserveExplicitSelection: boolean
    ): void {
        let serializedState = "";

        if (
            preserveExplicitSelection &&
            selectedEndpoints.length > 0
        ) {
            const persistedState:
                PersistedSelectionState = {
                    version: 1,
                    endpointKeys:
                        selectedEndpoints.map(
                            (node) => node.key
                        )
                };

            serializedState =
                JSON.stringify(persistedState);
        }

        this.host.persistProperties({
            merge: [
                {
                    objectName:
                        Visual.selectionStateObjectName,
                    selector: null,
                    properties: {
                        [Visual
                            .explicitEndpointStatePropertyName]:
                            serializedState
                    }
                }
            ]
        });
    }

    private resolvePersistedExplicitSelection(
        dataView: DataView | undefined,
        restoredNodes: HierarchyNode[]
    ): HierarchyNode[] | null {
        const persistedState =
            this.readPersistedSelectionState(
                dataView
            );

        if (
            persistedState === null ||
            restoredNodes.length === 0
        ) {
            return null;
        }

        const nodesByKey =
            new Map<string, HierarchyNode>();

        for (const level of this.hierarchyLevels) {
            for (const node of level.nodes) {
                nodesByKey.set(node.key, node);
            }
        }

        const explicitNodes:
            HierarchyNode[] = [];

        for (
            const endpointKey of
            persistedState.endpointKeys
        ) {
            const node = nodesByKey.get(
                endpointKey
            );

            if (!node) {
                return null;
            }

            explicitNodes.push(node);
        }

        const validationPlan =
            this.filterService.createFilterPlan(
                explicitNodes,
                this.hierarchyLevels
            );

        if (
            !validationPlan
                .preserveExplicitSelection ||
            !this.nodeCollectionsEqual(
                validationPlan.appliedEndpoints,
                restoredNodes
            )
        ) {
            return null;
        }

        return explicitNodes;
    }

    private readPersistedSelectionState(
        dataView: DataView | undefined
    ): PersistedSelectionState | null {
        const selectionStateObject =
            dataView?.metadata.objects?.[
                Visual.selectionStateObjectName
            ];

        const serializedState =
            selectionStateObject?.[
                Visual
                    .explicitEndpointStatePropertyName
            ];

        if (
            typeof serializedState !== "string" ||
            serializedState.trim().length === 0
        ) {
            return null;
        }

        try {
            const parsedState: unknown =
                JSON.parse(serializedState);

            if (
                !this.isRecord(parsedState) ||
                parsedState.version !== 1 ||
                !Array.isArray(
                    parsedState.endpointKeys
                ) ||
                parsedState.endpointKeys.length === 0 ||
                parsedState.endpointKeys.some(
                    (value) =>
                        typeof value !== "string"
                )
            ) {
                return null;
            }

            return {
                version: 1,
                endpointKeys:
                    parsedState.endpointKeys as
                        string[]
            };
        } catch {
            return null;
        }
    }

    private nodeCollectionsEqual(
        first: HierarchyNode[],
        second: HierarchyNode[]
    ): boolean {
        if (first.length !== second.length) {
            return false;
        }

        const secondKeys = new Set(
            second.map((node) => node.key)
        );

        return first.every(
            (node) => secondKeys.has(node.key)
        );
    }

    private isRecord(
        value: unknown
    ): value is Record<string, unknown> {
        return (
            typeof value === "object" &&
            value !== null
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

        const includedCountFontSize =
            Math.max(
                8,
                Math.round(
                    headingFontSize * 0.8
                )
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

        this.container.classList.toggle(
            "hierarchy-selector--wrap-value-labels",
            values.wrapValueLabels.value
        );

        this.setCssVariable(
            "--hierarchy-value-max-lines",
            this.clampNumber(
                values.maximumLabelLines.value,
                2,
                5
            ).toString()
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
            "--hierarchy-included-count-font-size",
            `${includedCountFontSize}px`
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

        if (this.isHighContrast) {
            this.applyHighContrastFormatting();
        }
    }

    private applyHighContrastFormatting(): void {
        this.setCssVariable(
            "--hierarchy-value-text",
            this.highContrastForeground
        );

        this.setCssVariable(
            "--hierarchy-heading-text",
            this.highContrastForeground
        );

        this.setCssVariable(
            "--hierarchy-clear-text",
            this.highContrastForeground
        );

        this.setCssVariable(
            "--hierarchy-border-colour",
            this.highContrastForeground
        );

        this.setCssVariable(
            "--hierarchy-container-background",
            this.highContrastBackground
        );

        this.setCssVariable(
            "--hierarchy-hover-background",
            this.highContrastBackground
        );

        this.setCssVariable(
            "--hierarchy-clear-hover-background",
            this.highContrastBackground
        );

        this.setCssVariable(
            "--hierarchy-selected-background",
            this.highContrastForegroundSelected
        );

        this.setCssVariable(
            "--hierarchy-selected-text",
            this.highContrastBackground
        );

        this.setCssVariable(
            "--hierarchy-alternative-text",
            this.highContrastForeground
        );

        this.setCssVariable(
            "--hierarchy-alternative-opacity",
            "0.65"
        );

        this.setCssVariable(
            "--hierarchy-container-border-width",
            "1px"
        );
    }

    private render(): void {
        const visibleLevels =
            this.hierarchyView.getVisibleLevels(
                this.hierarchyLevels,
                this.selection
            );

        const sortOrderValue =
            this.formattingSettings
                .valuesCard
                .sortOrder
                .value;

        const valueSortOrder =
            sortOrderValue === "Ascending" ||
                sortOrderValue === "Descending"
                ? sortOrderValue
                : "Data";

        this.renderer.render(
            visibleLevels,
            this.selection,
            (node) =>
                this.handleNodeSelection(node),
            (
                node,
                event,
                target
            ) =>
                this.handleNodeContextMenu(
                    node,
                    event,
                    target
                ),
            (nodes) =>
                this.handleSelectNodes(nodes),
            () =>
                this.handleClearAll(),
            (levelIndex) =>
                this.handleLevelClear(levelIndex),
            this.formattingSettings
                .layoutCard
                .showSearchBoxes
                .value,
            this.clampNumber(
                this.formattingSettings
                    .layoutCard
                    .minimumValuesForSearch
                    .value,
                1,
                10000
            ),
            this.formattingSettings
                .layoutCard
                .showClearAll
                .value,
            this.isMultipleSelectionEnabled(),
            this.formattingSettings
                .selectionCard
                .showIncludedCounts
                .value,
            this.formattingSettings
                .selectionCard
                .showSelectAll
                .value,
            valueSortOrder,
            this.clampNumber(
                this.formattingSettings
                    .tooltipCard
                    .hoverDelay
                    .value,
                0,
                2000
            ),
            this.formattingSettings
                .tooltipCard
                .showSelectionState
                .value,
            this.formattingSettings
                .tooltipCard
                .showOnKeyboardFocus
                .value,
            this.formattingSettings
                .helpCard
                .showHelpButton
                .value
        );
    }

    private isMultipleSelectionEnabled():
        boolean {
        return (
            this.formattingSettings
                .selectionCard
                .mode
                .value === "Multiple"
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
