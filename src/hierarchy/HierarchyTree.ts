"use strict";

import powerbi from "powerbi-visuals-api";
import {
    HierarchyLevel,
    HierarchyNode
} from "../models/hierarchy";

import DataViewMatrix =
    powerbi.DataViewMatrix;

import DataViewMatrixNode =
    powerbi.DataViewMatrixNode;

import PrimitiveValue =
    powerbi.PrimitiveValue;

export class HierarchyTree {
    public build(
        matrix: DataViewMatrix
    ): HierarchyNode[] {
        return this.buildNodes(
            matrix.rows.root.children ?? [],
            null,
            []
        );
    }

    public getLevels(
        matrix: DataViewMatrix,
        rootNodes: HierarchyNode[]
    ): HierarchyLevel[] {
        const levels: HierarchyLevel[] =
            matrix.rows.levels.map(
                (level, levelIndex) => ({
                    name:
                        level.sources?.[0]
                            ?.displayName ||
                        `Field ${levelIndex + 1}`,
                    nodes: []
                })
            );

        const visitNode = (
            node: HierarchyNode
        ): void => {
            levels[node.level]?.nodes.push(node);

            for (const child of node.children) {
                visitNode(child);
            }
        };

        for (const rootNode of rootNodes) {
            visitNode(rootNode);
        }

        for (const level of levels) {
            level.nodes.sort(
                (first, second) =>
                    first.value.localeCompare(
                        second.value
                    )
            );
        }

        return levels;
    }

    private buildNodes(
        matrixNodes: DataViewMatrixNode[],
        parentNode: HierarchyNode | null,
        parentPathParts: string[]
    ): HierarchyNode[] {
        const hierarchyNodes: HierarchyNode[] = [];
        const siblingKeyCounts =
            new Map<string, number>();

        for (const matrixNode of matrixNodes) {
            if (matrixNode.isSubtotal) {
                continue;
            }

            const rawValue =
                matrixNode.levelValues?.[0]
                    ?.value ??
                matrixNode.value;

            const value =
                this.formatHierarchyValue(rawValue);
            const identity = matrixNode.identity;

            if (
                value === null ||
                identity === undefined
            ) {
                continue;
            }

            const level =
                matrixNode.level ??
                (parentNode?.level ?? -1) + 1;

            const pathParts = [
                ...parentPathParts,
                value
            ];

            const baseKey =
                pathParts.join("||");

            const occurrence =
                (siblingKeyCounts.get(baseKey) ?? 0) +
                1;

            siblingKeyCounts.set(
                baseKey,
                occurrence
            );

            const key =
                occurrence === 1
                    ? baseKey
                    : `${baseKey}||#${occurrence}`;

            const node: HierarchyNode = {
                key,
                value,
                rawValue,
                identity,
                level,
                parent: parentNode,
                children: []
            };

            node.children = this.buildNodes(
                matrixNode.children ?? [],
                node,
                pathParts
            );

            hierarchyNodes.push(node);
        }

        return hierarchyNodes;
    }

    private formatHierarchyValue(
        value: PrimitiveValue
    ): string | null {
        if (
            value === null ||
            value === undefined
        ) {
            return null;
        }

        const formattedValue =
            String(value).trim();

        return formattedValue.length > 0
            ? formattedValue
            : null;
    }
}
