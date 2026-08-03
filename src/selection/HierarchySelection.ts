"use strict";

import {
    PrimitiveValueType
} from "powerbi-models";

import {
    HierarchyLevel,
    HierarchyNode
} from "../models/hierarchy";

export class HierarchySelection {
    private readonly selectedNodeKeys:
        Map<number, string> =
            new Map<number, string>();

    public clear(): void {
        this.selectedNodeKeys.clear();
    }

    public clearFromLevel(
        startingLevel: number,
        levelCount: number
    ): void {
        for (
            let levelIndex = startingLevel;
            levelIndex < levelCount;
            levelIndex++
        ) {
            this.selectedNodeKeys.delete(
                levelIndex
            );
        }
    }

    public getSelectedKey(
        level: number
    ): string | undefined {
        return this.selectedNodeKeys.get(level);
    }

    public getSelectedPath(
        levels: HierarchyLevel[]
    ): HierarchyNode[] {
        const selectedPath: HierarchyNode[] = [];

        for (
            let levelIndex = 0;
            levelIndex < levels.length;
            levelIndex++
        ) {
            const selectedKey =
                this.selectedNodeKeys.get(
                    levelIndex
                );

            if (!selectedKey) {
                break;
            }

            const selectedNode =
                levels[levelIndex]?.nodes.find(
                    (node) =>
                        node.key === selectedKey
                );

            if (!selectedNode) {
                break;
            }

            selectedPath.push(selectedNode);
        }

        return selectedPath;
    }

    public isSelected(
        node: HierarchyNode
    ): boolean {
        return (
            this.selectedNodeKeys.get(
                node.level
            ) === node.key
        );
    }

    public toggle(
        selectedNode: HierarchyNode,
        levelCount: number
    ): void {
        const currentlySelectedKey =
            this.selectedNodeKeys.get(
                selectedNode.level
            );

        if (
            currentlySelectedKey ===
            selectedNode.key
        ) {
            this.clearFromLevel(
                selectedNode.level,
                levelCount
            );

            return;
        }

        this.clearFromLevel(
            selectedNode.level,
            levelCount
        );

        this.selectNodeAndAncestors(
            selectedNode
        );
    }

    public synchronizeFromNode(
        selectedNode: HierarchyNode | null
    ): void {
        this.clear();

        if (!selectedNode) {
            return;
        }

        this.selectNodeAndAncestors(
            selectedNode
        );
    }

    public synchronizeFromValues(
        levels: HierarchyLevel[],
        selectedValues:
            PrimitiveValueType[] | null
    ): void {
        this.clear();

        if (
            selectedValues === null ||
            selectedValues.length === 0 ||
            selectedValues.length > levels.length
        ) {
            return;
        }

        let selectedParent:
            HierarchyNode | null = null;

        for (
            let levelIndex = 0;
            levelIndex < selectedValues.length;
            levelIndex++
        ) {
            const selectedValue =
                selectedValues[levelIndex];

            const selectedNode =
                levels[levelIndex]?.nodes.find(
                    (node) => {
                        const parentMatches =
                            levelIndex === 0
                                ? node.parent === null
                                : node.parent?.key ===
                                    selectedParent?.key;

                        return (
                            parentMatches &&
                            this.nodeMatchesValue(
                                node,
                                selectedValue
                            )
                        );
                    }
                );

            if (!selectedNode) {
                this.clear();
                return;
            }

            this.selectedNodeKeys.set(
                levelIndex,
                selectedNode.key
            );

            selectedParent = selectedNode;
        }
    }

    public removeInvalidSelections(
        levels: HierarchyLevel[]
    ): void {
        const availableNodeKeys =
            new Set<string>();

        for (const level of levels) {
            for (const node of level.nodes) {
                availableNodeKeys.add(
                    node.key
                );
            }
        }

        const selectedLevels =
            Array.from(
                this.selectedNodeKeys.keys()
            ).sort(
                (first, second) =>
                    first - second
            );

        for (const levelIndex of selectedLevels) {
            const selectedKey =
                this.selectedNodeKeys.get(
                    levelIndex
                );

            if (
                selectedKey === undefined ||
                !availableNodeKeys.has(
                    selectedKey
                )
            ) {
                this.clearFromLevel(
                    levelIndex,
                    levels.length
                );

                break;
            }
        }
    }

    private selectNodeAndAncestors(
        selectedNode: HierarchyNode
    ): void {
        let currentNode:
            HierarchyNode | null =
                selectedNode;

        while (currentNode !== null) {
            this.selectedNodeKeys.set(
                currentNode.level,
                currentNode.key
            );

            currentNode = currentNode.parent;
        }
    }

    private nodeMatchesValue(
        node: HierarchyNode,
        selectedValue: PrimitiveValueType
    ): boolean {
        if (node.rawValue instanceof Date) {
            return (
                node.rawValue.toISOString() ===
                selectedValue
            );
        }

        return node.rawValue === selectedValue;
    }
}
