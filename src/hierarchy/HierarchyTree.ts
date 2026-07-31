"use strict";

import powerbi from "powerbi-visuals-api";
import {
    HierarchyLevel,
    HierarchyNode
} from "../models/hierarchy";

import DataViewCategoryColumn =
    powerbi.DataViewCategoryColumn;

import PrimitiveValue =
    powerbi.PrimitiveValue;

export class HierarchyTree {
    public build(
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
                        rawValue,
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

    public getLevels(
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
}
