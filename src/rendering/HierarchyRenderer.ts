"use strict";

import {
    HierarchyLevel,
    HierarchyNode
} from "../models/hierarchy";
import { HierarchySelection } from "../selection/HierarchySelection";

export class HierarchyRenderer {
    public constructor(
        private readonly container: HTMLDivElement
    ) {}

    public render(
        hierarchyLevels: HierarchyLevel[],
        selection: HierarchySelection,
        onNodeSelection: (node: HierarchyNode) => void,
        onClearAll: () => void,
        onLevelClear: (levelIndex: number) => void
    ): void {
        this.container.replaceChildren();

        const hasSelection =
            selection.getSelectedPath(
                hierarchyLevels
            ).length > 0;

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
            "Clear all hierarchy selections";

        clearAllButton.disabled = !hasSelection;

        clearAllButton.setAttribute(
            "aria-label",
            "Clear all hierarchy selections"
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

            heading.textContent = hierarchyLevel.name;
            heading.title = hierarchyLevel.name;

            header.appendChild(heading);

            const selectedKey =
                selection.getSelectedKey(levelIndex);

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
                    () => onLevelClear(levelIndex)
                );

                header.appendChild(
                    clearLevelButton
                );
            }

            const valuesContainer =
                document.createElement("div");

            valuesContainer.className =
                "hierarchy-level__values";

            if (hierarchyLevel.nodes.length === 0) {
                const emptyMessage =
                    document.createElement("div");

                emptyMessage.className =
                    "hierarchy-level__empty";

                emptyMessage.textContent = "No values";

                valuesContainer.appendChild(
                    emptyMessage
                );
            } else {
                for (const node of hierarchyLevel.nodes) {
                    valuesContainer.appendChild(
                        this.createValueButton(
                            node,
                            selection,
                            onNodeSelection
                        )
                    );
                }
            }

            levelElement.appendChild(header);
            levelElement.appendChild(valuesContainer);

            levelsContainer.appendChild(levelElement);
        }

        this.container.appendChild(toolbar);
        this.container.appendChild(levelsContainer);
    }

    public renderLandingPage(): void {
        this.container.replaceChildren();

        const landingPage =
            document.createElement("div");

        landingPage.className =
            "hierarchy-selector__landing-page";

        const heading =
            document.createElement("div");

        heading.className =
            "hierarchy-selector__landing-heading";

        heading.textContent = "Build a hierarchy";

        const instructions =
            document.createElement("div");

        instructions.className =
            "hierarchy-selector__landing-text";

        instructions.textContent =
            "Add fields to Hierarchy levels.";

        landingPage.appendChild(heading);
        landingPage.appendChild(instructions);

        this.container.appendChild(landingPage);
    }

    private createValueButton(
        node: HierarchyNode,
        selection: HierarchySelection,
        onNodeSelection: (node: HierarchyNode) => void
    ): HTMLButtonElement {
        const button =
            document.createElement("button");

        const isSelected =
            selection.isSelected(node);

        button.className = "hierarchy-level__value";
        button.type = "button";
        button.textContent = node.value;
        button.title = node.value;

        button.dataset.nodeKey = node.key;
        button.dataset.level = node.level.toString();

        button.setAttribute(
            "aria-label",
            isSelected
                ? `Deselect ${node.value}`
                : `Select ${node.value}`
        );

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
}