"use strict";

import {
    HierarchyLevel,
    HierarchyNode
} from "../models/hierarchy";
import { HierarchySelection } from "../selection/HierarchySelection";

export class HierarchyView {
    public getVisibleLevels(
        hierarchyLevels: HierarchyLevel[],
        selection: HierarchySelection
    ): HierarchyLevel[] {
        return hierarchyLevels.map(
            (level, levelIndex) => ({
                name: level.name,
                nodes: this.getVisibleNodes(
                    hierarchyLevels,
                    selection,
                    levelIndex
                )
            })
        );
    }

    private getVisibleNodes(
        hierarchyLevels: HierarchyLevel[],
        selection: HierarchySelection,
        targetLevel: number
    ): HierarchyNode[] {
        if (targetLevel === 0) {
            return hierarchyLevels[0]?.nodes ?? [];
        }

        const selectedAncestor =
            this.getDeepestSelectedAncestor(
                hierarchyLevels,
                selection,
                targetLevel
            );

        if (!selectedAncestor) {
            return hierarchyLevels[targetLevel]?.nodes ?? [];
        }

        return this.getDescendantsAtLevel(
            selectedAncestor,
            targetLevel
        );
    }

    private getDeepestSelectedAncestor(
        hierarchyLevels: HierarchyLevel[],
        selection: HierarchySelection,
        targetLevel: number
    ): HierarchyNode | null {
        for (
            let levelIndex = targetLevel - 1;
            levelIndex >= 0;
            levelIndex--
        ) {
            const selectedKey =
                selection.getSelectedKey(levelIndex);

            if (!selectedKey) {
                continue;
            }

            const selectedNode =
                hierarchyLevels[levelIndex]?.nodes.find(
                    (node) => node.key === selectedKey
                );

            if (selectedNode) {
                return selectedNode;
            }
        }

        return null;
    }

    private getDescendantsAtLevel(
        ancestor: HierarchyNode,
        targetLevel: number
    ): HierarchyNode[] {
        const matchingNodes: HierarchyNode[] = [];

        const visit = (node: HierarchyNode): void => {
            if (node.level === targetLevel) {
                matchingNodes.push(node);
                return;
            }

            if (node.level > targetLevel) {
                return;
            }

            for (const child of node.children) {
                visit(child);
            }
        };

        for (const child of ancestor.children) {
            visit(child);
        }

        return matchingNodes.sort((first, second) =>
            first.value.localeCompare(second.value)
        );
    }
}
