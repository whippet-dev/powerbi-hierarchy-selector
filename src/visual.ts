"use strict";

import powerbi from "powerbi-visuals-api";
import "../style/visual.less";

import VisualConstructorOptions =
    powerbi.extensibility.visual.VisualConstructorOptions;

import VisualUpdateOptions =
    powerbi.extensibility.visual.VisualUpdateOptions;

import IVisual =
    powerbi.extensibility.visual.IVisual;

import DataViewCategoryColumn =
    powerbi.DataViewCategoryColumn;

import PrimitiveValue =
    powerbi.PrimitiveValue;

interface HierarchyNode {
    key: string;
    value: string;
    level: number;
    parent: HierarchyNode | null;
    children: HierarchyNode[];
}

interface HierarchyLevel {
    name: string;
    nodes: HierarchyNode[];
}

export class Visual implements IVisual {
    private readonly container: HTMLDivElement;

    private rootNodes: HierarchyNode[] = [];
    private hierarchyLevels: HierarchyLevel[] = [];

    /**
     * Stores the selected node key for each hierarchy level.
     *
     * Example:
     * 0 -> "Europe"
     * 1 -> "Europe||United Kingdom"
     * 2 -> "Europe||United Kingdom||Yorkshire"
     */
    private readonly selectedNodeKeys: Map<number, string> =
        new Map<number, string>();

    public constructor(options: VisualConstructorOptions) {
        this.container = document.createElement("div");
        this.container.className = "hierarchy-selector";

        options.element.appendChild(this.container);
    }

    public update(options: VisualUpdateOptions): void {
        this.container.style.width =
            `${options.viewport.width}px`;

        this.container.style.height =
            `${options.viewport.height}px`;

        const categories: DataViewCategoryColumn[] =
            options.dataViews?.[0]?.categorical?.categories ?? [];

        if (categories.length === 0) {
            this.rootNodes = [];
            this.hierarchyLevels = [];
            this.selectedNodeKeys.clear();

            this.renderLandingPage();
            return;
        }

        this.rootNodes = this.buildHierarchy(categories);

        this.hierarchyLevels = this.getHierarchyLevels(
            categories,
            this.rootNodes
        );

        this.removeInvalidSelections();
        this.render();
    }

    private buildHierarchy(
        categories: DataViewCategoryColumn[]
    ): HierarchyNode[] {
        const rootNodes: HierarchyNode[] = [];

        const rowCount = Math.max(
            ...categories.map(
                (category) => category.values.length
            ),
            0
        );

        for (
            let rowIndex = 0;
            rowIndex < rowCount;
            rowIndex++
        ) {
            let currentLevelNodes = rootNodes;
            let parentNode: HierarchyNode | null = null;

            const pathParts: string[] = [];

            for (
                let levelIndex = 0;
                levelIndex < categories.length;
                levelIndex++
            ) {
                const category = categories[levelIndex];
                const rawValue = category.values[rowIndex];

                const value =
                    this.formatHierarchyValue(rawValue);

                if (value === null) {
                    break;
                }

                pathParts.push(value);

                const key = pathParts.join("||");

                let node = currentLevelNodes.find(
                    (existingNode) =>
                        existingNode.key === key
                );

                if (!node) {
                    node = {
                        key,
                        value,
                        level: levelIndex,
                        parent: parentNode,
                        children: []
                    };

                    currentLevelNodes.push(node);
                }

                parentNode = node;
                currentLevelNodes = node.children;
            }
        }

        return rootNodes;
    }

    private getHierarchyLevels(
        categories: DataViewCategoryColumn[],
        rootNodes: HierarchyNode[]
    ): HierarchyLevel[] {
        const levels: HierarchyLevel[] = categories.map(
            (category, levelIndex) => ({
                name:
                    category.source.displayName ||
                    `Level ${levelIndex + 1}`,
                nodes: []
            })
        );

        const visitNode = (node: HierarchyNode): void => {
            levels[node.level]?.nodes.push(node);

            for (const child of node.children) {
                visitNode(child);
            }
        };

        for (const rootNode of rootNodes) {
            visitNode(rootNode);
        }

        for (const level of levels) {
            level.nodes.sort((first, second) =>
                first.value.localeCompare(second.value)
            );
        }

        return levels;
    }

    private handleNodeSelection(
        selectedNode: HierarchyNode
    ): void {
        const currentlySelectedKey =
            this.selectedNodeKeys.get(selectedNode.level);

        /*
         * Clicking the selected node again clears that
         * level and every level beneath it.
         */
        if (currentlySelectedKey === selectedNode.key) {
            this.clearSelectionsFromLevel(
                selectedNode.level
            );

            this.render();
            return;
        }

        /*
         * Changing a selection invalidates everything
         * below that level.
         */
        this.clearSelectionsFromLevel(
            selectedNode.level
        );

        /*
         * Selecting a lower-level node also selects its
         * complete ancestor path, keeping state valid.
         */
        let currentNode: HierarchyNode | null =
            selectedNode;

        while (currentNode !== null) {
            this.selectedNodeKeys.set(
                currentNode.level,
                currentNode.key
            );

            currentNode = currentNode.parent;
        }

        this.render();
    }

    private clearSelectionsFromLevel(
        startingLevel: number
    ): void {
        for (
            let levelIndex = startingLevel;
            levelIndex < this.hierarchyLevels.length;
            levelIndex++
        ) {
            this.selectedNodeKeys.delete(levelIndex);
        }
    }

    private removeInvalidSelections(): void {
        const availableNodeKeys = new Set<string>();

        for (const level of this.hierarchyLevels) {
            for (const node of level.nodes) {
                availableNodeKeys.add(node.key);
            }
        }

        const selectedLevels =
            Array.from(this.selectedNodeKeys.keys())
                .sort((first, second) => first - second);

        for (const levelIndex of selectedLevels) {
            const selectedKey =
                this.selectedNodeKeys.get(levelIndex);

            if (
                selectedKey === undefined ||
                !availableNodeKeys.has(selectedKey)
            ) {
                this.clearSelectionsFromLevel(
                    levelIndex
                );

                break;
            }
        }
    }

    private render(): void {
        this.container.replaceChildren();

        const fragment =
            document.createDocumentFragment();

        for (const hierarchyLevel of this.hierarchyLevels) {
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
                        this.createValueButton(node)
                    );
                }
            }

            levelElement.appendChild(heading);
            levelElement.appendChild(valuesContainer);

            fragment.appendChild(levelElement);
        }

        this.container.appendChild(fragment);
    }

    private createValueButton(
        node: HierarchyNode
    ): HTMLButtonElement {
        const button =
            document.createElement("button");

        const isSelected =
            this.selectedNodeKeys.get(node.level) ===
            node.key;

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
            () => this.handleNodeSelection(node)
        );

        return button;
    }

    private formatHierarchyValue(
        value: PrimitiveValue
    ): string | null {
        if (value === null || value === undefined) {
            return null;
        }

        const formattedValue = String(value).trim();

        return formattedValue.length > 0
            ? formattedValue
            : null;
    }

    private renderLandingPage(): void {
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
}