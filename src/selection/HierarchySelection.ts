"use strict";

import {
    HierarchyLevel,
    HierarchyNode
} from "../models/hierarchy";

export class HierarchySelection {
    private readonly selectedNodeKeys: Map<number, string> =
        new Map<number, string>();

    public clear(): void {
        this.selectedNodeKeys.clear();
    }

    public isSelected(node: HierarchyNode): boolean {
        return (
            this.selectedNodeKeys.get(node.level) ===
            node.key
        );
    }

    public toggle(
        selectedNode: HierarchyNode,
        levelCount: number
    ): void {
        const currentlySelectedKey =
            this.selectedNodeKeys.get(selectedNode.level);

        if (currentlySelectedKey === selectedNode.key) {
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

        let currentNode: HierarchyNode | null =
            selectedNode;

        while (currentNode !== null) {
            this.selectedNodeKeys.set(
                currentNode.level,
                currentNode.key
            );

            currentNode = currentNode.parent;
        }
    }

    public removeInvalidSelections(
        levels: HierarchyLevel[]
    ): void {
        const availableNodeKeys = new Set<string>();

        for (const level of levels) {
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
                this.clearFromLevel(
                    levelIndex,
                    levels.length
                );

                break;
            }
        }
    }

    private clearFromLevel(
        startingLevel: number,
        levelCount: number
    ): void {
        for (
            let levelIndex = startingLevel;
            levelIndex < levelCount;
            levelIndex++
        ) {
            this.selectedNodeKeys.delete(levelIndex);
        }
    }
}
