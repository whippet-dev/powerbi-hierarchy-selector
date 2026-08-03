"use strict";

import {
    HierarchyNode
} from "../models/hierarchy";
import { HierarchySelection } from "../selection/HierarchySelection";
import type {
    HierarchyViewLevel
} from "../view/HierarchyView";

export class HierarchyRenderer {
    private readonly searchTerms =
        new Map<number, string>();

    public constructor(
        private readonly container: HTMLDivElement
    ) {}

    public render(
        hierarchyLevels: HierarchyViewLevel[],
        selection: HierarchySelection,
        onNodeSelection: (node: HierarchyNode) => void,
        onClearAll: () => void,
        onLevelClear: (levelIndex: number) => void,
        showSearchBoxes: boolean,
        minimumValuesForSearch: number
    ): void {
        this.pruneSearchTerms(
            hierarchyLevels.length
        );

        if (!showSearchBoxes) {
            this.searchTerms.clear();
        }

        this.container.replaceChildren();

        const selectedPath =
            selection.getSelectedPath(
                hierarchyLevels
            );

        const hasSelection =
            selectedPath.length > 0;

        const toolbar =
            document.createElement("div");

        toolbar.className =
            "hierarchy-selector__toolbar";

        const clearAllButton =
            document.createElement("button");

        clearAllButton.className =
            "hierarchy-selector__clear-all";

        clearAllButton.type = "button";
        clearAllButton.textContent = "Clear all";
        clearAllButton.title =
            "Clear all field selections";
        clearAllButton.disabled = !hasSelection;

        clearAllButton.setAttribute(
            "aria-label",
            "Clear all field selections"
        );

        clearAllButton.addEventListener(
            "click",
            onClearAll
        );

        toolbar.appendChild(clearAllButton);

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

            const selectedKey =
                selection.getSelectedKey(
                    levelIndex
                );

            if (selectedKey !== undefined) {
                const clearLevelButton =
                    document.createElement("button");

                const accessibleLabel =
                    `Clear ${hierarchyLevel.name} selection`;

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
                const selectedNode =
                    selectedKey === undefined
                        ? undefined
                        : hierarchyLevel.nodes.find(
                            (node) =>
                                node.key ===
                                selectedKey
                        );

                if (selectedNode) {
                    const selectedContainer =
                        document.createElement("div");

                    selectedContainer.className =
                        "hierarchy-level__selected";

                    selectedContainer.appendChild(
                        this.createValueButton(
                            selectedNode,
                            selection,
                            onNodeSelection,
                            false
                        )
                    );

                    valuesContainer.appendChild(
                        selectedContainer
                    );
                }

                const scrollContainer =
                    document.createElement("div");

                scrollContainer.className =
                    "hierarchy-level__scroll";

                valuesContainer.appendChild(
                    scrollContainer
                );

                const refreshSearchResults =
                    (): void => {
                        this.renderSearchResults(
                            scrollContainer,
                            hierarchyLevel,
                            selectedNode,
                            selection,
                            onNodeSelection,
                            shouldShowSearch
                                ? this.searchTerms.get(
                                    levelIndex
                                ) ?? ""
                                : ""
                        );
                    };

                if (shouldShowSearch) {
                    const searchContainer =
                        this.createSearchControl(
                            hierarchyLevel.name,
                            levelIndex
                        );

                    valuesContainer.insertBefore(
                        searchContainer,
                        scrollContainer
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

        this.container.appendChild(toolbar);
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

    private renderSearchResults(
        scrollContainer: HTMLDivElement,
        hierarchyLevel: HierarchyViewLevel,
        selectedNode: HierarchyNode | undefined,
        selection: HierarchySelection,
        onNodeSelection: (node: HierarchyNode) => void,
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
                    node.key !== selectedNode?.key
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
                    isAlternative
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
        isAlternative: boolean
    ): HTMLButtonElement {
        const button =
            document.createElement("button");

        const isSelected =
            selection.isSelected(node);

        button.className =
            "hierarchy-level__value";

        button.type = "button";
        button.textContent = node.value;
        button.dataset.nodeKey = node.key;
        button.dataset.level =
            node.level.toString();

        if (isAlternative) {
            button.classList.add(
                "hierarchy-level__value--alternative"
            );

            button.title =
                `Switch selection path to ${node.value}`;

            button.setAttribute(
                "aria-label",
                `Switch selection path to ${node.value}`
            );
        } else {
            button.title = node.value;

            button.setAttribute(
                "aria-label",
                isSelected
                    ? `Deselect ${node.value}`
                    : `Select ${node.value}`
            );
        }

        button.setAttribute(
            "aria-pressed",
            String(isSelected)
        );

        if (isSelected) {
            button.classList.add(
                "hierarchy-level__value--selected"
            );
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
