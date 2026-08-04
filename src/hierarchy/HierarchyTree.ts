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

import DataViewHierarchyLevel =
    powerbi.DataViewHierarchyLevel;

import PrimitiveValue =
    powerbi.PrimitiveValue;

import IVisualHost =
    powerbi.extensibility.visual.IVisualHost;

export class HierarchyTree {
    private static readonly defaultBlankLabel =
        "(No value)";

    public constructor(
        private readonly host: IVisualHost
    ) { }

    public build(
        matrix: DataViewMatrix,
        blankLabel: string =
            HierarchyTree.defaultBlankLabel
    ): HierarchyNode[] {
        const displayBlankLabel =
            blankLabel.trim().length > 0
                ? blankLabel.trim()
                : HierarchyTree
                    .defaultBlankLabel;

        return this.buildNodes(
            matrix.rows.root.children ?? [],
            null,
            [],
            displayBlankLabel,
            matrix.rows.levels
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

        return levels;
    }

    private buildNodes(
        matrixNodes: DataViewMatrixNode[],
        parentNode: HierarchyNode | null,
        parentPathParts: string[],
        blankLabel: string,
        matrixLevels: DataViewHierarchyLevel[]
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
                this.formatHierarchyValue(
                    rawValue,
                    blankLabel
                );
            const identity = matrixNode.identity;

            if (identity === undefined) {
                continue;
            }

            const selectionId =
                this.host
                    .createSelectionIdBuilder()
                    .withMatrixNode(
                        matrixNode,
                        matrixLevels
                    )
                    .createSelectionId();

            const level =
                matrixNode.level ??
                (parentNode?.level ?? -1) + 1;

            const keyPart =
                this.getHierarchyKeyPart(
                    rawValue,
                    value
                );

            const pathParts = [
                ...parentPathParts,
                keyPart
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
                selectionId,
                level,
                parent: parentNode,
                children: []
            };

            node.children = this.buildNodes(
                matrixNode.children ?? [],
                node,
                pathParts,
                blankLabel,
                matrixLevels
            );

            hierarchyNodes.push(node);
        }

        return hierarchyNodes;
    }

    private formatHierarchyValue(
        value: PrimitiveValue,
        blankLabel: string
    ): string {
        if (
            value === null ||
            value === undefined
        ) {
            return blankLabel;
        }

        const formattedValue =
            String(value).trim();

        return formattedValue.length > 0
            ? formattedValue
            : blankLabel;
    }

    private getHierarchyKeyPart(
        rawValue: PrimitiveValue,
        formattedValue: string
    ): string {
        if (
            rawValue === null ||
            rawValue === undefined ||
            String(rawValue).trim().length === 0
        ) {
            return "__hierarchy_blank__";
        }

        return formattedValue;
    }
}
