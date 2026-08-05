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
                    target: level.target,
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

        const selectedEndpoints =
            selection.getSelectedEndpoints(
                hierarchyLevels
            );

        if (selectedEndpoints.length === 0) {
            return hierarchyLevel.nodes;
        }

        const compatibleNodeKeys =
            new Set<string>();

        for (const endpoint of selectedEndpoints) {
            if (endpoint.level >= targetLevel) {
                const pathNode =
                    this.getAncestorAtLevel(
                        endpoint,
                        targetLevel
                    );

                if (pathNode) {
                    compatibleNodeKeys.add(
                        pathNode.key
                    );
                }

                continue;
            }

            for (
                const descendant of
                this.getDescendantsAtLevel(
                    endpoint,
                    targetLevel
                )
            ) {
                compatibleNodeKeys.add(
                    descendant.key
                );
            }
        }

        return hierarchyLevel.nodes.filter(
            (node) =>
                compatibleNodeKeys.has(node.key)
        );
    }

    private getAncestorAtLevel(
        node: HierarchyNode,
        targetLevel: number
    ): HierarchyNode | null {
        let currentNode:
            HierarchyNode | null = node;

        while (
            currentNode &&
            currentNode.level > targetLevel
        ) {
            currentNode = currentNode.parent;
        }

        return (
            currentNode?.level === targetLevel
                ? currentNode
                : null
        );
    }

    private getDescendantsAtLevel(
        ancestor: HierarchyNode,
        targetLevel: number
    ): HierarchyNode[] {
        const matchingNodes:
            HierarchyNode[] = [];

        const visit = (
            node: HierarchyNode
        ): void => {
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

        return matchingNodes;
    }
}
