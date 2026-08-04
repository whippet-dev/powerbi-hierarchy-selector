"use strict";

import powerbi from "powerbi-visuals-api";
import {
    HierarchyNode
} from "../models/hierarchy";
import {
    HierarchySelection,
    HierarchySelectionState
} from "../selection/HierarchySelection";
import type {
    HierarchyViewLevel
} from "../view/HierarchyView";

import ITooltipService =
powerbi.extensibility.ITooltipService;

import VisualTooltipDataItem =
powerbi.extensibility.VisualTooltipDataItem;

export class HierarchyRenderer {
    private readonly searchTerms =
        new Map<number, string>();

    private descriptionId = 0;

    private tooltipShowTimer:
        number | undefined;

    private tooltipVisible = false;

    private tooltipHoverDelay = 700;

    private showTooltipSelectionState = true;

    private showTooltipOnKeyboardFocus = true;

    private onNodeContextMenu:
        ((
            node: HierarchyNode,
            event: MouseEvent,
            target: HTMLElement
        ) => void) | undefined;

    private readonly activeValueNodeKeys =
        new Map<number, string>();

    private pendingValueFocus:
        {
            levelIndex: number;
            nodeKey: string;
        } | undefined;

    public constructor(
        private readonly container: HTMLDivElement,
        private readonly tooltipService:
            ITooltipService,
        private readonly tooltipRoot:
            HTMLElement
    ) { }

    public clearSearchTerms(): void {
        this.searchTerms.clear();
    }

    public clearSearchTerm(
        levelIndex: number
    ): void {
        this.searchTerms.delete(levelIndex);
    }

    public focusFirstInteractiveControl():
        boolean {
        const selectors = [
            ".hierarchy-level__search-input:not(:disabled)",
            ".hierarchy-level__select-all:not(:disabled)",
            "button.hierarchy-level__value[tabindex=\"0\"]:not(:disabled)",
            ".hierarchy-level__clear:not(:disabled)",
            ".hierarchy-selector__clear-all:not(:disabled)"
        ];

        for (const selector of selectors) {
            const focusTarget =
                this.container
                    .querySelector<HTMLElement>(
                        selector
                    );

            if (
                !focusTarget ||
                focusTarget.getClientRects()
                    .length === 0
            ) {
                continue;
            }

            focusTarget.focus();

            focusTarget.scrollIntoView({
                block: "nearest",
                inline: "nearest"
            });

            return (
                document.activeElement ===
                focusTarget
            );
        }

        return false;
    }

    public render(
        hierarchyLevels: HierarchyViewLevel[],
        selection: HierarchySelection,
        onNodeSelection: (node: HierarchyNode) => void,
        onNodeContextMenu: (
            node: HierarchyNode,
            event: MouseEvent,
            target: HTMLElement
        ) => void,
        onSelectNodes: (nodes: HierarchyNode[]) => void,
        onClearAll: () => void,
        onLevelClear: (levelIndex: number) => void,
        showSearchBoxes: boolean,
        minimumValuesForSearch: number,
        showClearAll: boolean,
        multipleSelectionEnabled: boolean,
        showIncludedCounts: boolean,
        showSelectAll: boolean,
        valueSortOrder: string,
        tooltipHoverDelay: number,
        showTooltipSelectionState: boolean,
        showTooltipOnKeyboardFocus: boolean
    ): void {
        this.onNodeContextMenu =
            onNodeContextMenu;

        this.captureFocusedValue();

        this.hideTooltip();
        this.descriptionId = 0;

        this.tooltipHoverDelay =
            tooltipHoverDelay;

        this.showTooltipSelectionState =
            showTooltipSelectionState;

        this.showTooltipOnKeyboardFocus =
            showTooltipOnKeyboardFocus;

        this.pruneSearchTerms(
            hierarchyLevels.length
        );


        this.pruneActiveValueNodeKeys(
            hierarchyLevels.length
        );
        if (!showSearchBoxes) {
            this.searchTerms.clear();
        }

        this.container.replaceChildren();

        const hasSelection =
            selection.hasSelection();

        const levelsContainer =
            document.createElement("div");

        levelsContainer.className =
            "hierarchy-selector__levels";

        for (
            let levelIndex = 0;
            levelIndex < hierarchyLevels.length;
            levelIndex++
        ) {
            const hierarchyLevel =
                hierarchyLevels[levelIndex];

            const shouldShowSearch =
                showSearchBoxes &&
                hierarchyLevel.nodes.length >=
                minimumValuesForSearch;

            if (!shouldShowSearch) {
                this.searchTerms.delete(
                    levelIndex
                );
            }

            const levelElement =
                document.createElement("section");

            levelElement.className =
                "hierarchy-level";

            levelElement.dataset.levelIndex =
                levelIndex.toString();

            const header =
                document.createElement("div");

            header.className =
                "hierarchy-level__header";

            const heading =
                document.createElement("div");

            heading.className =
                "hierarchy-level__label";

            heading.textContent =
                hierarchyLevel.name;

            heading.title =
                hierarchyLevel.name;

            header.appendChild(heading);

            const selectedPathNodes =
                selection.getSelectedNodesAtLevel(
                    levelIndex,
                    hierarchyLevels
                );

            const pinnedNodes =
                multipleSelectionEnabled
                    ? selectedPathNodes.filter(
                        (node) =>
                            selection
                                .getSelectionState(
                                    node
                                ) ===
                            HierarchySelectionState
                                .Explicit
                    )
                    : selectedPathNodes;

            const sortedPinnedNodes =
                this.sortNodes(
                    pinnedNodes,
                    valueSortOrder
                );

            const inheritedNodes =
                multipleSelectionEnabled
                    ? selection
                        .getInheritedNodesAtLevel(
                            levelIndex,
                            hierarchyLevels
                        )
                    : [];

            if (
                showIncludedCounts &&
                inheritedNodes.length > 0
            ) {
                const includedBadge =
                    document.createElement("span");

                includedBadge.className =
                    "hierarchy-level__included-count";

                includedBadge.textContent =
                    `${inheritedNodes.length} included`;

                const includedDescription =
                    inheritedNodes.length === 1
                        ? "1 value is included through a higher-level selection"
                        : `${inheritedNodes.length} values are included through higher-level selections`;

                includedBadge.title =
                    includedDescription;

                includedBadge.setAttribute(
                    "aria-label",
                    includedDescription
                );

                header.appendChild(
                    includedBadge
                );
            }

            if (
                selectedPathNodes.length > 0
            ) {
                const clearLevelButton =
                    document.createElement("button");

                const accessibleLabel =
                    selectedPathNodes.length === 1
                        ? `Clear ${hierarchyLevel.name} selection and search`
                        : `Clear ${hierarchyLevel.name} selections and search`;

                clearLevelButton.className =
                    "hierarchy-level__clear";

                clearLevelButton.type = "button";
                clearLevelButton.textContent = "×";
                clearLevelButton.title =
                    accessibleLabel;

                clearLevelButton.setAttribute(
                    "aria-label",
                    accessibleLabel
                );

                clearLevelButton.addEventListener(
                    "click",
                    () =>
                        onLevelClear(levelIndex)
                );

                header.appendChild(
                    clearLevelButton
                );
            }

            const isLastField =
                levelIndex ===
                hierarchyLevels.length - 1;

            if (
                isLastField &&
                showClearAll &&
                hasSelection
            ) {
                const clearAllButton =
                    document.createElement("button");

                clearAllButton.className =
                    "hierarchy-selector__clear-all";

                clearAllButton.type = "button";
                clearAllButton.textContent =
                    "Clear all";

                clearAllButton.title =
                    "Clear all selections and searches";

                clearAllButton.setAttribute(
                    "aria-label",
                    "Clear all selections and searches"
                );

                clearAllButton.addEventListener(
                    "click",
                    onClearAll
                );

                header.appendChild(
                    clearAllButton
                );
            }

            const valuesContainer =
                document.createElement("div");

            valuesContainer.className =
                "hierarchy-level__values";

            valuesContainer.setAttribute(
                "role",
                "group"
            );

            valuesContainer.setAttribute(
                "aria-label",
                `${hierarchyLevel.name} values`
            );

            if (
                hierarchyLevel.nodes.length === 0
            ) {
                const emptyMessage =
                    document.createElement("div");

                emptyMessage.className =
                    "hierarchy-level__empty";

                emptyMessage.textContent =
                    "No values";

                valuesContainer.appendChild(
                    emptyMessage
                );
            } else {
                const selectedNodeKeys =
                    new Set<string>(
                        sortedPinnedNodes.map(
                            (node) => node.key
                        )
                    );

                let selectedContainer:
                    HTMLDivElement | undefined;

                if (
                    sortedPinnedNodes.length > 0
                ) {
                    selectedContainer =
                        document.createElement("div");

                    selectedContainer.className =
                        "hierarchy-level__selected";

                    for (
                        const pinnedNode of
                        sortedPinnedNodes
                    ) {
                        selectedContainer.appendChild(
                            this.createValueButton(
                                pinnedNode,
                                selection,
                                onNodeSelection,
                                false,
                                multipleSelectionEnabled
                            )
                        );
                    }
                }

                const scrollContainer =
                    document.createElement("div");

                scrollContainer.className =
                    "hierarchy-level__scroll";

                valuesContainer.appendChild(
                    scrollContainer
                );

                const controlsContainer =
                    document.createElement("div");

                controlsContainer.className =
                    "hierarchy-level__controls";

                let selectAllButton:
                    HTMLButtonElement | undefined;

                const getSearchTerm =
                    (): string =>
                        shouldShowSearch
                            ? this.searchTerms.get(
                                levelIndex
                            ) ?? ""
                            : "";

                const refreshSearchResults =
                    (): void => {
                        const searchTerm =
                            getSearchTerm();

                        this.renderSearchResults(
                            scrollContainer,
                            hierarchyLevel,
                            selectedNodeKeys,
                            selection,
                            onNodeSelection,
                            multipleSelectionEnabled,
                            searchTerm,
                            valueSortOrder
                        );

                        if (selectedContainer) {
                            scrollContainer.insertBefore(
                                selectedContainer,
                                scrollContainer.firstChild
                            );
                        }

                        if (selectAllButton) {
                            this.updateSelectAllButton(
                                selectAllButton,
                                hierarchyLevel,
                                selection,
                                searchTerm
                            );
                        }

                        this.initializeLevelKeyboardNavigation(
                            valuesContainer,
                            levelIndex
                        );
                    };

                if (shouldShowSearch) {
                    const searchContainer =
                        this.createSearchControl(
                            hierarchyLevel.name,
                            levelIndex
                        );

                    controlsContainer.appendChild(
                        searchContainer
                    );

                    const searchInput =
                        searchContainer.querySelector(
                            "input"
                        );

                    searchInput?.addEventListener(
                        "input",
                        refreshSearchResults
                    );
                }

                if (
                    multipleSelectionEnabled &&
                    showSelectAll
                ) {
                    selectAllButton =
                        this.createSelectAllButton(
                            hierarchyLevel,
                            selection,
                            getSearchTerm,
                            onSelectNodes
                        );

                    controlsContainer.appendChild(
                        selectAllButton
                    );
                }

                if (
                    controlsContainer
                        .childElementCount > 0
                ) {
                    valuesContainer.insertBefore(
                        controlsContainer,
                        scrollContainer
                    );
                }

                refreshSearchResults();
            }

            levelElement.appendChild(header);
            levelElement.appendChild(
                valuesContainer
            );

            levelsContainer.appendChild(
                levelElement
            );
        }

        this.container.appendChild(
            levelsContainer
        );

        this.restoreFocusedValue();

    }

    public renderLandingPage(): void {
        this.hideTooltip();
        this.activeValueNodeKeys.clear();
        this.pendingValueFocus = undefined;
        this.searchTerms.clear();
        this.container.replaceChildren();

        const landingPage =
            document.createElement("div");

        landingPage.className =
            "hierarchy-selector__landing-page";

        const heading =
            document.createElement("div");

        heading.className =
            "hierarchy-selector__landing-heading";

        heading.textContent =
            "Build a multi-field selector";

        const instructions =
            document.createElement("div");

        instructions.className =
            "hierarchy-selector__landing-text";

        instructions.textContent =
            "Add one or more related fields to get started.";

        landingPage.appendChild(heading);
        landingPage.appendChild(instructions);

        this.container.appendChild(landingPage);
    }

    private createSearchControl(
        fieldName: string,
        levelIndex: number
    ): HTMLDivElement {
        const searchContainer =
            document.createElement("div");

        searchContainer.className =
            "hierarchy-level__search";

        const searchInput =
            document.createElement("input");

        searchInput.className =
            "hierarchy-level__search-input";

        searchInput.type = "search";
        searchInput.placeholder =
            `Search ${fieldName}`;

        searchInput.value =
            this.searchTerms.get(levelIndex) ??
            "";

        searchInput.autocomplete = "off";
        searchInput.spellcheck = false;

        searchInput.setAttribute(
            "aria-label",
            `Search ${fieldName} values`
        );

        searchInput.addEventListener(
            "input",
            () => {
                const searchTerm =
                    searchInput.value;

                if (searchTerm.length === 0) {
                    this.searchTerms.delete(
                        levelIndex
                    );
                } else {
                    this.searchTerms.set(
                        levelIndex,
                        searchTerm
                    );
                }
            }
        );

        searchInput.addEventListener(
            "keydown",
            (event) => {
                if (
                    event.key !== "Escape" ||
                    searchInput.value.length === 0
                ) {
                    return;
                }

                event.preventDefault();

                searchInput.value = "";
                this.searchTerms.delete(
                    levelIndex
                );

                searchInput.dispatchEvent(
                    new Event("input")
                );
            }
        );

        searchContainer.appendChild(
            searchInput
        );

        return searchContainer;
    }

    private createSelectAllButton(
        hierarchyLevel: HierarchyViewLevel,
        selection: HierarchySelection,
        getSearchTerm: () => string,
        onSelectNodes:
            (nodes: HierarchyNode[]) => void
    ): HTMLButtonElement {
        const button =
            document.createElement("button");

        button.className =
            "hierarchy-level__select-all";

        button.type = "button";

        button.addEventListener(
            "click",
            () => {
                const actionableNodes =
                    this.getBulkSelectionNodes(
                        hierarchyLevel,
                        selection,
                        getSearchTerm()
                    );

                if (actionableNodes.length > 0) {
                    onSelectNodes(
                        actionableNodes
                    );
                }
            }
        );

        return button;
    }

    private updateSelectAllButton(
        button: HTMLButtonElement,
        hierarchyLevel: HierarchyViewLevel,
        selection: HierarchySelection,
        searchTerm: string
    ): void {
        const normalizedSearchTerm =
            searchTerm.trim();

        const candidates =
            this.getBulkSelectionCandidates(
                hierarchyLevel,
                searchTerm
            );

        const actionableNodes =
            this.getBulkSelectionNodes(
                hierarchyLevel,
                selection,
                searchTerm
            );

        const isSearchActive =
            normalizedSearchTerm.length > 0;

        button.textContent =
            isSearchActive
                ? "Select matches"
                : "Select all";

        const candidateDescription =
            isSearchActive
                ? `matching ${hierarchyLevel.name} values`
                : `compatible ${hierarchyLevel.name} values`;

        if (candidates.length === 0) {
            button.disabled = true;
            button.title =
                `No ${candidateDescription} to select`;

            button.setAttribute(
                "aria-label",
                button.title
            );

            return;
        }

        if (actionableNodes.length === 0) {
            button.disabled = true;
            button.title =
                `All ${candidateDescription} are already included`;

            button.setAttribute(
                "aria-label",
                button.title
            );

            return;
        }

        button.disabled = false;

        button.title =
            `Select ${actionableNodes.length} ${candidateDescription}`;

        button.setAttribute(
            "aria-label",
            button.title
        );
    }

    private getBulkSelectionNodes(
        hierarchyLevel: HierarchyViewLevel,
        selection: HierarchySelection,
        searchTerm: string
    ): HierarchyNode[] {
        const isSearchActive =
            searchTerm.trim().length > 0;

        return this.getBulkSelectionCandidates(
            hierarchyLevel,
            searchTerm
        ).filter(
            (node) => {
                const selectionState =
                    selection.getSelectionState(
                        node
                    );

                return (
                    selectionState ===
                    HierarchySelectionState
                        .Unselected ||
                    selectionState ===
                    HierarchySelectionState
                        .Partial ||
                    (
                        isSearchActive &&
                        selectionState ===
                        HierarchySelectionState
                            .Inherited
                    )
                );
            }
        );
    }

    private getBulkSelectionCandidates(
        hierarchyLevel: HierarchyViewLevel,
        searchTerm: string
    ): HierarchyNode[] {
        const normalizedSearchTerm =
            searchTerm
                .trim()
                .toLocaleLowerCase();

        if (normalizedSearchTerm.length > 0) {
            return hierarchyLevel.nodes.filter(
                (node) =>
                    node.value
                        .toLocaleLowerCase()
                        .includes(
                            normalizedSearchTerm
                        )
            );
        }

        return hierarchyLevel.nodes.filter(
            (node) =>
                hierarchyLevel
                    .compatibleNodeKeys
                    .has(node.key)
        );
    }

    private renderSearchResults(
        scrollContainer: HTMLDivElement,
        hierarchyLevel: HierarchyViewLevel,
        selectedNodeKeys: ReadonlySet<string>,
        selection: HierarchySelection,
        onNodeSelection: (node: HierarchyNode) => void,
        multipleSelectionEnabled: boolean,
        searchTerm: string,
        valueSortOrder: string
    ): void {
        scrollContainer.replaceChildren();

        const normalizedSearchTerm =
            searchTerm
                .trim()
                .toLocaleLowerCase();

        const allMatchingNodes =
            normalizedSearchTerm.length === 0
                ? hierarchyLevel.nodes
                : hierarchyLevel.nodes.filter(
                    (node) =>
                        node.value
                            .toLocaleLowerCase()
                            .includes(
                                normalizedSearchTerm
                            )
                );

        const matchingNodes =
            allMatchingNodes.filter(
                (node) =>
                    !selectedNodeKeys.has(node.key)
            );

        if (matchingNodes.length === 0) {
            if (
                normalizedSearchTerm.length > 0 &&
                allMatchingNodes.length === 0
            ) {
                const noMatches =
                    document.createElement("div");

                noMatches.className =
                    "hierarchy-level__no-matches";

                noMatches.textContent =
                    "No matching values";

                scrollContainer.appendChild(
                    noMatches
                );
            }

            return;
        }

        const compatibleNodes =
            this.sortNodes(
                matchingNodes.filter(
                    (node) =>
                        hierarchyLevel
                            .compatibleNodeKeys
                            .has(node.key)
                ),
                valueSortOrder
            );

        const alternativeNodes =
            this.sortNodes(
                matchingNodes.filter(
                    (node) =>
                        !hierarchyLevel
                            .compatibleNodeKeys
                            .has(node.key)
                ),
                valueSortOrder
            );

        for (const node of compatibleNodes) {
            scrollContainer.appendChild(
                this.createValueButton(
                    node,
                    selection,
                    onNodeSelection,
                    false,
                    multipleSelectionEnabled
                )
            );
        }

        if (
            compatibleNodes.length > 0 &&
            alternativeNodes.length > 0
        ) {
            scrollContainer.appendChild(
                this.createAlternativeDivider()
            );
        }

        for (const node of alternativeNodes) {
            scrollContainer.appendChild(
                this.createValueButton(
                    node,
                    selection,
                    onNodeSelection,
                    true,
                    multipleSelectionEnabled
                )
            );
        }
    }

    private sortNodes(
        nodes: HierarchyNode[],
        sortOrder: string
    ): HierarchyNode[] {
        const sortedNodes = [...nodes];

        if (sortOrder === "Data") {
            return sortedNodes;
        }

        sortedNodes.sort(
            (
                firstNode,
                secondNode
            ) => {
                const comparison =
                    firstNode.value.localeCompare(
                        secondNode.value,
                        undefined,
                        {
                            numeric: true,
                            sensitivity: "base"
                        }
                    );

                return sortOrder === "Descending"
                    ? -comparison
                    : comparison;
            }
        );

        return sortedNodes;
    }

    private createAlternativeDivider():
        HTMLDivElement {
        const divider =
            document.createElement("div");

        divider.className =
            "hierarchy-level__alternative-divider";

        divider.setAttribute(
            "role",
            "separator"
        );

        return divider;
    }

    private createValueButton(
        node: HierarchyNode,
        selection: HierarchySelection,
        onNodeSelection: (node: HierarchyNode) => void,
        isAlternative: boolean,
        multipleSelectionEnabled: boolean
    ): HTMLButtonElement {
        const button =
            document.createElement("button");

        const selectionState =
            multipleSelectionEnabled
                ? selection.getSelectionState(node)
                : selection.isSelected(node)
                    ? HierarchySelectionState.Explicit
                    : HierarchySelectionState.Unselected;

        const isIncluded =
            selectionState !==
            HierarchySelectionState.Unselected;

        button.className =
            "hierarchy-level__value";

        button.type = "button";
        button.dataset.nodeKey = node.key;
        button.dataset.level =
            node.level.toString();
        button.tabIndex = -1;

        if (
            selectionState !==
            HierarchySelectionState.Unselected
        ) {
            const indicator =
                document.createElement("span");

            indicator.className =
                "hierarchy-level__value-indicator";

            indicator.setAttribute(
                "aria-hidden",
                "true"
            );

            switch (selectionState) {
                case HierarchySelectionState.Explicit:
                    indicator.textContent = "✓";
                    break;

                case HierarchySelectionState.Partial:
                    indicator.textContent = "−";
                    break;

                case HierarchySelectionState.Inherited:
                    indicator.textContent = "↳";
                    break;
            }

            button.appendChild(indicator);
        }

        const label =
            document.createElement("span");

        label.className =
            "hierarchy-level__value-label";

        label.textContent = node.value;

        button.appendChild(label);

        if (isAlternative) {
            button.classList.add(
                "hierarchy-level__value--alternative"
            );
        }

        const fullPath =
            this.getNodePath(node);

        let selectionDescription =
            isAlternative
                ? "Available on an alternative path"
                : "Not selected";

        switch (selectionState) {
            case HierarchySelectionState.Explicit:
                button.classList.add(
                    "hierarchy-level__value--selected"
                );

                selectionDescription =
                    "Explicitly selected";

                button.setAttribute(
                    "aria-label",
                    `Deselect ${node.value}`
                );

                button.setAttribute(
                    "aria-pressed",
                    "true"
                );
                break;

            case HierarchySelectionState.Partial:
                button.classList.add(
                    "hierarchy-level__value--partial"
                );

                selectionDescription =
                    "Contains selected values";

                button.setAttribute(
                    "aria-label",
                    `Clear selected values under ${node.value}`
                );

                button.setAttribute(
                    "aria-pressed",
                    "mixed"
                );
                break;

            case HierarchySelectionState.Inherited: {
                button.classList.add(
                    "hierarchy-level__value--inherited"
                );

                const inheritedFrom =
                    selection.getInheritedFromNode(
                        node
                    );

                const inheritedDescription =
                    inheritedFrom
                        ? `${node.value} is included through ${inheritedFrom.value}`
                        : `${node.value} is included through a higher-level selection`;

                selectionDescription =
                    inheritedDescription;

                button.setAttribute(
                    "aria-label",
                    `${inheritedDescription}. Select ${node.value} explicitly`
                );

                button.setAttribute(
                    "aria-pressed",
                    "true"
                );
                break;
            }

            default: {
                const accessibleLabel =
                    isAlternative &&
                        !multipleSelectionEnabled
                        ? `Switch selection path to ${node.value}`
                        : `Select ${node.value}`;

                button.setAttribute(
                    "aria-label",
                    accessibleLabel
                );

                button.setAttribute(
                    "aria-pressed",
                    "false"
                );
                break;
            }
        }

        const description =
            document.createElement("span");

        const descriptionId =
            `hierarchy-value-description-${++this.descriptionId}`;

        description.id = descriptionId;
        description.className =
            "hierarchy-level__value-description";

        description.textContent =
            `Full path: ${fullPath}.`;

        button.appendChild(description);

        button.setAttribute(
            "aria-describedby",
            descriptionId
        );

        const tooltipData:
            VisualTooltipDataItem[] = [
                {
                    displayName: "Full path",
                    value: fullPath,
                    header: node.value
                }
            ];

        if (
            this.showTooltipSelectionState
        ) {
            tooltipData.push({
                displayName: "Selection",
                value: selectionDescription
            });
        }

        this.attachTooltip(
            button,
            tooltipData
        );

        button.addEventListener(
            "focus",
            () =>
                this.activateValueButton(
                    button
                )
        );

        button.addEventListener(
            "keydown",
            (event) =>
                this.handleValueButtonKeydown(
                    event,
                    button
                )
        );

        button.addEventListener(
            "contextmenu",
            (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.hideTooltip();

                this.onNodeContextMenu?.(
                    node,
                    event,
                    button
                );
            }
        );

        button.addEventListener(
            "click",
            () => {
                this.hideTooltip();
                onNodeSelection(node);
            }
        );

        return button;
    }

    private captureFocusedValue(): void {
        this.pendingValueFocus = undefined;

        const activeElement =
            document.activeElement;

        if (
            !(
                activeElement instanceof
                HTMLButtonElement
            ) ||
            !this.container.contains(
                activeElement
            ) ||
            !activeElement.classList.contains(
                "hierarchy-level__value"
            )
        ) {
            return;
        }

        const nodeKey =
            activeElement.dataset.nodeKey;

        const levelIndex =
            Number(
                activeElement.dataset.level
            );

        if (
            nodeKey === undefined ||
            !Number.isInteger(levelIndex)
        ) {
            return;
        }

        this.activeValueNodeKeys.set(
            levelIndex,
            nodeKey
        );

        this.pendingValueFocus = {
            levelIndex,
            nodeKey
        };
    }

    private initializeLevelKeyboardNavigation(
        valuesContainer: HTMLElement,
        levelIndex: number
    ): void {
        const valueButtons =
            this.getValueButtons(
                valuesContainer
            );

        if (valueButtons.length === 0) {
            this.activeValueNodeKeys.delete(
                levelIndex
            );
            return;
        }

        const activeNodeKey =
            this.activeValueNodeKeys.get(
                levelIndex
            );

        let activeButton =
            activeNodeKey === undefined
                ? undefined
                : valueButtons.find(
                    (button) =>
                        button.dataset.nodeKey ===
                        activeNodeKey
                );

        activeButton ??=
            valueButtons.find(
                (button) =>
                    button.classList.contains(
                        "hierarchy-level__value--selected"
                    )
            );

        activeButton ??=
            valueButtons.find(
                (button) =>
                    button.getAttribute(
                        "aria-pressed"
                    ) === "mixed"
            );

        activeButton ??= valueButtons[0];

        for (
            const valueButton of
            valueButtons
        ) {
            valueButton.tabIndex =
                valueButton === activeButton
                    ? 0
                    : -1;
        }

        const nodeKey =
            activeButton.dataset.nodeKey;

        if (nodeKey !== undefined) {
            this.activeValueNodeKeys.set(
                levelIndex,
                nodeKey
            );
        }
    }

    private activateValueButton(
        button: HTMLButtonElement
    ): void {
        const valuesContainer =
            button.closest<HTMLElement>(
                ".hierarchy-level__values"
            );

        if (!valuesContainer) {
            return;
        }

        const valueButtons =
            this.getValueButtons(
                valuesContainer
            );

        for (
            const valueButton of
            valueButtons
        ) {
            valueButton.tabIndex =
                valueButton === button
                    ? 0
                    : -1;
        }

        const nodeKey =
            button.dataset.nodeKey;

        const levelIndex =
            Number(button.dataset.level);

        if (
            nodeKey !== undefined &&
            Number.isInteger(levelIndex)
        ) {
            this.activeValueNodeKeys.set(
                levelIndex,
                nodeKey
            );
        }
    }

    private handleValueButtonKeydown(
        event: KeyboardEvent,
        button: HTMLButtonElement
    ): void {
        if (
            event.key !== "ArrowDown" &&
            event.key !== "ArrowUp" &&
            event.key !== "Home" &&
            event.key !== "End"
        ) {
            return;
        }

        const valuesContainer =
            button.closest<HTMLElement>(
                ".hierarchy-level__values"
            );

        if (!valuesContainer) {
            return;
        }

        const valueButtons =
            this.getValueButtons(
                valuesContainer
            );

        const currentIndex =
            valueButtons.indexOf(button);

        if (currentIndex < 0) {
            return;
        }

        let targetIndex =
            currentIndex;

        switch (event.key) {
            case "ArrowDown":
                targetIndex = Math.min(
                    currentIndex + 1,
                    valueButtons.length - 1
                );
                break;

            case "ArrowUp":
                targetIndex = Math.max(
                    currentIndex - 1,
                    0
                );
                break;

            case "Home":
                targetIndex = 0;
                break;

            case "End":
                targetIndex =
                    valueButtons.length - 1;
                break;
        }

        event.preventDefault();
        event.stopPropagation();

        const targetButton =
            valueButtons[targetIndex];

        this.activateValueButton(
            targetButton
        );

        targetButton.focus();

        targetButton.scrollIntoView({
            block: "nearest",
            inline: "nearest"
        });
    }

    private restoreFocusedValue(): void {
        const pendingValueFocus =
            this.pendingValueFocus;

        this.pendingValueFocus = undefined;

        if (!pendingValueFocus) {
            return;
        }

        const levelElement =
            Array.from(
                this.container
                    .querySelectorAll<HTMLElement>(
                        ".hierarchy-level"
                    )
            ).find(
                (element) =>
                    element.dataset.levelIndex ===
                    pendingValueFocus
                        .levelIndex
                        .toString()
            );

        if (!levelElement) {
            return;
        }

        const valueButtons =
            this.getValueButtons(
                levelElement
            );

        const exactButton =
            valueButtons.find(
                (button) =>
                    button.dataset.nodeKey ===
                    pendingValueFocus.nodeKey
            );

        const fallbackButton =
            valueButtons.find(
                (button) =>
                    button.tabIndex === 0
            );

        const focusTarget =
            exactButton ??
            fallbackButton ??
            levelElement.querySelector<
                HTMLInputElement
            >(
                ".hierarchy-level__search-input"
            ) ??
            levelElement.querySelector<
                HTMLButtonElement
            >(
                ".hierarchy-level__select-all"
            ) ??
            levelElement.querySelector<
                HTMLButtonElement
            >(
                ".hierarchy-level__clear"
            );

        if (!focusTarget) {
            return;
        }

        if (
            focusTarget instanceof
            HTMLButtonElement &&
            focusTarget.classList.contains(
                "hierarchy-level__value"
            )
        ) {
            this.activateValueButton(
                focusTarget
            );
        }

        focusTarget.focus();

        focusTarget.scrollIntoView({
            block: "nearest",
            inline: "nearest"
        });
    }

    private getValueButtons(
        container: HTMLElement
    ): HTMLButtonElement[] {
        return Array.from(
            container.querySelectorAll<
                HTMLButtonElement
            >(
                "button.hierarchy-level__value"
            )
        );
    }

    private pruneActiveValueNodeKeys(
        levelCount: number
    ): void {
        for (
            const levelIndex of
            this.activeValueNodeKeys.keys()
        ) {
            if (levelIndex >= levelCount) {
                this.activeValueNodeKeys.delete(
                    levelIndex
                );
            }
        }
    }

    private getNodePath(
        node: HierarchyNode
    ): string {
        const pathParts: string[] = [];

        let currentNode:
            HierarchyNode | null = node;

        while (currentNode) {
            pathParts.unshift(
                currentNode.value
            );

            currentNode =
                currentNode.parent;
        }

        return pathParts.join(" › ");
    }

    private attachTooltip(
        button: HTMLButtonElement,
        dataItems: VisualTooltipDataItem[]
    ): void {
        if (!this.tooltipService.enabled()) {
            return;
        }

        let pointerCoordinates:
            number[] = [0, 0];

        button.addEventListener(
            "mouseenter",
            (event) => {
                pointerCoordinates =
                    this.getMouseCoordinates(
                        event
                    );

                this.scheduleTooltip(
                    pointerCoordinates,
                    dataItems
                );
            }
        );

        button.addEventListener(
            "mousemove",
            (event) => {
                pointerCoordinates =
                    this.getMouseCoordinates(
                        event
                    );

                if (this.tooltipVisible) {
                    this.moveTooltip(
                        pointerCoordinates,
                        dataItems
                    );
                }
            }
        );

        button.addEventListener(
            "mouseleave",
            () => this.hideTooltip()
        );

        button.addEventListener(
            "focus",
            () => {
                if (
                    !this.showTooltipOnKeyboardFocus
                ) {
                    return;
                }

                this.showTooltip(
                    this.getElementCoordinates(
                        button
                    ),
                    dataItems
                );
            }
        );

        button.addEventListener(
            "blur",
            () => this.hideTooltip()
        );

        button.addEventListener(
            "keydown",
            (event) => {
                if (event.key === "Escape") {
                    this.hideTooltip();
                }
            }
        );
    }

    private scheduleTooltip(
        coordinates: number[],
        dataItems: VisualTooltipDataItem[]
    ): void {
        this.cancelTooltipTimer();

        if (this.tooltipHoverDelay <= 0) {
            this.showTooltip(
                coordinates,
                dataItems
            );

            return;
        }

        this.tooltipShowTimer =
            window.setTimeout(
                () => {
                    this.tooltipShowTimer =
                        undefined;

                    this.showTooltip(
                        coordinates,
                        dataItems
                    );
                },
                this.tooltipHoverDelay
            );
    }

    private showTooltip(
        coordinates: number[],
        dataItems: VisualTooltipDataItem[]
    ): void {
        this.cancelTooltipTimer();

        this.tooltipService.show({
            coordinates,
            isTouchEvent: false,
            identities: [],
            dataItems
        });

        this.tooltipVisible = true;
    }

    private moveTooltip(
        coordinates: number[],
        dataItems: VisualTooltipDataItem[]
    ): void {
        this.tooltipService.move({
            coordinates,
            isTouchEvent: false,
            identities: [],
            dataItems
        });
    }

    private cancelTooltipTimer(): void {
        if (
            this.tooltipShowTimer ===
            undefined
        ) {
            return;
        }

        window.clearTimeout(
            this.tooltipShowTimer
        );

        this.tooltipShowTimer =
            undefined;
    }

    private getMouseCoordinates(
        event: MouseEvent
    ): number[] {
        const rootBounds =
            this.tooltipRoot
                .getBoundingClientRect();

        return [
            event.clientX - rootBounds.left,
            event.clientY - rootBounds.top
        ];
    }

    private getElementCoordinates(
        element: HTMLElement
    ): number[] {
        const rootBounds =
            this.tooltipRoot
                .getBoundingClientRect();

        const elementBounds =
            element.getBoundingClientRect();

        return [
            elementBounds.left -
            rootBounds.left +
            elementBounds.width / 2,
            elementBounds.top -
            rootBounds.top +
            elementBounds.height / 2
        ];
    }

    private hideTooltip(): void {
        this.cancelTooltipTimer();
        this.tooltipVisible = false;

        if (!this.tooltipService.enabled()) {
            return;
        }

        this.tooltipService.hide({
            isTouchEvent: false,
            immediately: true
        });
    }

    private pruneSearchTerms(
        levelCount: number
    ): void {
        for (
            const levelIndex of
            this.searchTerms.keys()
        ) {
            if (levelIndex >= levelCount) {
                this.searchTerms.delete(
                    levelIndex
                );
            }
        }
    }
}
