"use strict";

import {
    HierarchyLevel,
    HierarchyNode
} from "../models/hierarchy";
import { HierarchySelection } from "../selection/HierarchySelection";

export interface HierarchyViewLevel extends HierarchyLevel {
    compatibleNodeKeys: ReadonlySet<string>;
}

export class HierarchyView {
    public getVisibleLevels(
        hierarchyLevels: HierarchyLevel[],
        selection: HierarchySelection
    ): HierarchyViewLevel[] {
        return hierarchyLevels.map(
            (level, levelIndex) => {
                const compatibleNodes =
                    this.getCompatibleNodes(
                        hierarchyLevels,
                        selection,
                        levelIndex
                    );

                const compatibleNodeKeys =
                    new Set<string>(
                        compatibleNodes.map(
                            (node) => node.key
                        )
                    );

                const incompatibleNodes =
                    level.nodes.filter(
                        (node) =>
                            !compatibleNodeKeys.has(
                                node.key
                            )
                    );

                return {
                    name: level.name,
                    nodes: [
                        ...compatibleNodes,
                        ...incompatibleNodes
                    ],
                    compatibleNodeKeys
                };
            }
        );
    }

    private getCompatibleNodes(
        hierarchyLevels: HierarchyLevel[],
        selection: HierarchySelection,
        targetLevel: number
    ): HierarchyNode[] {
        const hierarchyLevel =
            hierarchyLevels[targetLevel];

        if (!hierarchyLevel) {
            return [];
        }

        const selectedKey =
            selection.getSelectedKey(targetLevel);

        /*
         * Once this level has a selection, that selected node is the
         * active value. Every other value remains available as an
         * alternative branch.
         */
        if (selectedKey !== undefined) {
            const selectedNode =
                hierarchyLevel.nodes.find(
                    (node) =>
                        node.key === selectedKey
                );

            return selectedNode
                ? [selectedNode]
                : [];
        }

        /*
         * With no selected ancestor, every value at this level is
         * compatible and retains its existing alphabetical order.
         */
        const selectedAncestor =
            this.getDeepestSelectedAncestor(
                hierarchyLevels,
                selection,
                targetLevel
            );

        if (!selectedAncestor) {
            return hierarchyLevel.nodes;
        }

        /*
         * For an unselected descendant level, values belonging to the
         * deepest selected branch are compatible. All remaining values
         * are still rendered afterwards as alternative branches.
         */
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
                    (node) =>
                        node.key === selectedKey
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

        return matchingNodes.sort(
            (first, second) =>
                first.value.localeCompare(
                    second.value
                )
        );
    }
}
