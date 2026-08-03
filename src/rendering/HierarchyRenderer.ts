"use strict";

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

export class HierarchyRenderer {
    private readonly searchTerms =
        new Map<number, string>();

    public constructor(
        private readonly container: HTMLDivElement
    ) {}

    public clearSearchTerms(): void {
        this.searchTerms.clear();
    }

    public render(
        hierarchyLevels: HierarchyViewLevel[],
        selection: HierarchySelection,
        onNodeSelection: (node: HierarchyNode) => void,
        onSelectNodes: (nodes: HierarchyNode[]) => void,
        onClearAll: () => void,
        onLevelClear: (levelIndex: number) => void,
        showSearchBoxes: boolean,
        minimumValuesForSearch: number,
        showClearAll: boolean,
        multipleSelectionEnabled: boolean,
        showIncludedCounts: boolean,
        showSelectAll: boolean
    ): void {
        this.pruneSearchTerms(
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
                        ? `Clear ${hierarchyLevel.name} selection`
                        : `Clear ${hierarchyLevel.name} selections`;

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
                    "Clear all field selections";

                clearAllButton.setAttribute(
                    "aria-label",
                    "Clear all field selections"
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
                        pinnedNodes.map(
                            (node) => node.key
                        )
                    );

                let selectedContainer:
                    HTMLDivElement | undefined;

                if (pinnedNodes.length > 0) {
                    selectedContainer =
                        document.createElement("div");

                    selectedContainer.className =
                        "hierarchy-level__selected";

                    for (
                        const pinnedNode of
                        pinnedNodes
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
                            searchTerm
                        );

                        if (selectAllButton) {
                            this.updateSelectAllButton(
                                selectAllButton,
                                hierarchyLevel,
                                selection,
                                searchTerm
                            );
                        }
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

                if (selectedContainer) {
                    valuesContainer.insertBefore(
                        selectedContainer,
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
    }

    public renderLandingPage(): void {
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
                            .Partial
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
        searchTerm: string
    ): void {
        scrollContainer.replaceChildren();

        const normalizedSearchTerm =
            searchTerm
                .trim()
                .toLocaleLowerCase();

        const scrollableNodes =
            hierarchyLevel.nodes.filter(
                (node) =>
                    !selectedNodeKeys.has(node.key)
            );

        const matchingNodes =
            normalizedSearchTerm.length === 0
                ? scrollableNodes
                : scrollableNodes.filter(
                    (node) =>
                        node.value
                            .toLocaleLowerCase()
                            .includes(
                                normalizedSearchTerm
                            )
                );

        if (matchingNodes.length === 0) {
            const noMatches =
                document.createElement("div");

            noMatches.className =
                "hierarchy-level__no-matches";

            noMatches.textContent =
                "No matching values";

            scrollContainer.appendChild(
                noMatches
            );

            return;
        }

        const hasCompatibleMatch =
            matchingNodes.some(
                (node) =>
                    hierarchyLevel
                        .compatibleNodeKeys
                        .has(node.key)
            );

        let alternativeDividerAdded =
            false;

        for (const node of matchingNodes) {
            const isAlternative =
                !hierarchyLevel
                    .compatibleNodeKeys
                    .has(node.key);

            if (
                isAlternative &&
                hasCompatibleMatch &&
                !alternativeDividerAdded
            ) {
                scrollContainer.appendChild(
                    this.createAlternativeDivider()
                );

                alternativeDividerAdded = true;
            }

            scrollContainer.appendChild(
                this.createValueButton(
                    node,
                    selection,
                    onNodeSelection,
                    isAlternative,
                    multipleSelectionEnabled
                )
            );
        }
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

        switch (selectionState) {
            case HierarchySelectionState.Explicit:
                button.classList.add(
                    "hierarchy-level__value--selected"
                );

                button.title =
                    `${node.value} — explicitly selected`;

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

                button.title =
                    `${node.value} contains selected values`;

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

                button.title =
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
                button.title = node.value;

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

        button.addEventListener(
            "click",
            () => onNodeSelection(node)
        );

        return button;
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
