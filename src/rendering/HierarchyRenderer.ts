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
        onNodeSelection: (node: HierarchyNode) => void
    ): void {
        this.container.replaceChildren();

        const fragment =
            document.createDocumentFragment();

        for (const hierarchyLevel of hierarchyLevels) {
            const levelElement =
                document.createElement("section");

            levelElement.className = "hierarchy-level";

            const heading =
                document.createElement("div");

            heading.className =
                "hierarchy-level__label";

            heading.textContent = hierarchyLevel.name;
            heading.title = hierarchyLevel.name;

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

            levelElement.appendChild(heading);
            levelElement.appendChild(valuesContainer);

            fragment.appendChild(levelElement);
        }

        this.container.appendChild(fragment);
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
