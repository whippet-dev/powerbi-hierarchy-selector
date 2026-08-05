"use strict";

import powerbi from "powerbi-visuals-api";
import {
    FilterType,
    HierarchyIdentityFilter,
    IHierarchyIdentityFilterNode,
    PrimitiveValueType
} from "powerbi-models";

import { HierarchyNode } from "../models/hierarchy";

import CustomVisualOpaqueIdentity =
    powerbi.visuals.CustomVisualOpaqueIdentity;

import FilterAction =
    powerbi.FilterAction;

import IVisualHost =
    powerbi.extensibility.visual.IVisualHost;

export class HierarchyFilterService {
    private static readonly objectName =
        "general";

    private static readonly propertyName =
        "filter";

    private readonly compareIdentities: (
        first: CustomVisualOpaqueIdentity,
        second: CustomVisualOpaqueIdentity
    ) => boolean;

    public constructor(
        private readonly host: IVisualHost
    ) {
        const opaqueUtils =
            this.host.createOpaqueUtils();

        this.compareIdentities = (
            first,
            second
        ) =>
            opaqueUtils
                .compareCustomVisualOpaqueIdentities(
                    first,
                    second
                );
    }

    public apply(
        selectedEndpoints: HierarchyNode[]
    ): void {
        if (selectedEndpoints.length === 0) {
            this.clear();
            return;
        }

        const hierarchyData =
            this.createSelectionTree(
                selectedEndpoints
            );

        const filter =
            new HierarchyIdentityFilter<
                CustomVisualOpaqueIdentity
            >(
                [],
                hierarchyData
            ).toJSON();

        this.host.applyJsonFilter(
            filter,
            HierarchyFilterService.objectName,
            HierarchyFilterService.propertyName,
            FilterAction.merge
        );
    }

    public readSelectedNodes(
        filters: powerbi.IFilter[] | undefined,
        rootNodes: HierarchyNode[]
    ): HierarchyNode[] {
        const hierarchyData =
            this.readHierarchyData(filters);

        if (hierarchyData === null) {
            return [];
        }

        const selectedNodes:
            HierarchyNode[] = [];

        this.collectSelectedNodes(
            hierarchyData,
            rootNodes,
            selectedNodes
        );

        return selectedNodes;
    }

    public readSelectedNode(
        filters: powerbi.IFilter[] | undefined,
        rootNodes: HierarchyNode[]
    ): HierarchyNode | null {
        return (
            this.readSelectedNodes(
                filters,
                rootNodes
            ).sort(
                (first, second) =>
                    second.level - first.level
            )[0] ?? null
        );
    }

    public readSelectedValuePaths(
        filters: powerbi.IFilter[] | undefined
    ): PrimitiveValueType[][] | null {
        if (!filters || filters.length === 0) {
            return null;
        }

        for (const filter of filters) {
            if (!this.isRecord(filter)) {
                continue;
            }

            if (
                filter.filterType ===
                FilterType.Tuple
            ) {
                const tuplePaths =
                    this.tryReadTupleFilter(
                        filter
                    );

                if (tuplePaths !== null) {
                    return tuplePaths;
                }
            }

            if (
                filter.filterType ===
                FilterType.Basic
            ) {
                const basicPaths =
                    this.tryReadBasicFilter(
                        filter
                    );

                if (basicPaths !== null) {
                    return basicPaths;
                }
            }
        }

        return null;
    }

    public identitiesEqual(
        first:
            CustomVisualOpaqueIdentity | null,
        second:
            CustomVisualOpaqueIdentity | null
    ): boolean {
        if (first === null || second === null) {
            return first === second;
        }

        return this.compareIdentities(
            first,
            second
        );
    }

    public identityCollectionsEqual(
        first:
            CustomVisualOpaqueIdentity[] | null,
        second:
            CustomVisualOpaqueIdentity[] | null
    ): boolean {
        if (first === null || second === null) {
            return first === second;
        }

        if (first.length !== second.length) {
            return false;
        }

        const unmatchedSecond = [
            ...second
        ];

        for (const firstIdentity of first) {
            const matchingIndex =
                unmatchedSecond.findIndex(
                    (secondIdentity) =>
                        this.compareIdentities(
                            firstIdentity,
                            secondIdentity
                        )
                );

            if (matchingIndex === -1) {
                return false;
            }

            unmatchedSecond.splice(
                matchingIndex,
                1
            );
        }

        return unmatchedSecond.length === 0;
    }

    public clear(): void {
        this.host.applyJsonFilter(
            null,
            HierarchyFilterService.objectName,
            HierarchyFilterService.propertyName,
            FilterAction.merge
        );
    }

    private createSelectionTree(
        selectedEndpoints: HierarchyNode[]
    ): IHierarchyIdentityFilterNode<
        CustomVisualOpaqueIdentity
    >[] {
        const rootFilterNodes:
            IHierarchyIdentityFilterNode<
                CustomVisualOpaqueIdentity
            >[] = [];

        for (const endpoint of selectedEndpoints) {
            const selectedPath =
                this.getPathToNode(endpoint);

            let currentFilterNodes =
                rootFilterNodes;

            for (
                let pathIndex = 0;
                pathIndex < selectedPath.length;
                pathIndex++
            ) {
                const hierarchyNode =
                    selectedPath[pathIndex];

                const isLeaf =
                    pathIndex ===
                    selectedPath.length - 1;

                let filterNode =
                    currentFilterNodes.find(
                        (candidate) =>
                            this.compareIdentities(
                                candidate.identity,
                                hierarchyNode.identity
                            )
                    );

                if (!filterNode) {
                    filterNode = {
                        identity:
                            hierarchyNode.identity,
                        operator:
                            isLeaf
                                ? "Selected"
                                : "Inherited"
                    };

                    currentFilterNodes.push(
                        filterNode
                    );
                }

                if (isLeaf) {
                    filterNode.operator =
                        "Selected";
                    delete filterNode.children;
                    continue;
                }

                if (
                    filterNode.operator !==
                    "Selected"
                ) {
                    filterNode.operator =
                        "Inherited";
                }

                filterNode.children ??= [];
                currentFilterNodes =
                    filterNode.children;
            }
        }

        return rootFilterNodes;
    }

    private readHierarchyData(
        filters: powerbi.IFilter[] | undefined
    ): IHierarchyIdentityFilterNode<
        CustomVisualOpaqueIdentity
    >[] | null {
        if (!filters || filters.length === 0) {
            return null;
        }

        for (const filter of filters) {
            if (
                !this.isRecord(filter) ||
                filter.filterType !==
                    FilterType.HierarchyIdentity ||
                !Array.isArray(
                    filter.hierarchyData
                )
            ) {
                continue;
            }

            return filter.hierarchyData as
                IHierarchyIdentityFilterNode<
                    CustomVisualOpaqueIdentity
                >[];
        }

        return null;
    }

    private collectSelectedNodes(
        filterNodes:
            IHierarchyIdentityFilterNode<
                CustomVisualOpaqueIdentity
            >[],
        hierarchyNodes: HierarchyNode[],
        selectedNodes: HierarchyNode[]
    ): void {
        for (const filterNode of filterNodes) {
            const hierarchyNode =
                hierarchyNodes.find(
                    (node) =>
                        this.compareIdentities(
                            node.identity,
                            filterNode.identity
                        )
                );

            if (!hierarchyNode) {
                continue;
            }

            if (
                filterNode.operator ===
                "Selected"
            ) {
                selectedNodes.push(
                    hierarchyNode
                );
                continue;
            }

            if (
                filterNode.operator ===
                    "Inherited" &&
                filterNode.children
            ) {
                this.collectSelectedNodes(
                    filterNode.children,
                    hierarchyNode.children,
                    selectedNodes
                );
            }
        }
    }

    private getPathToNode(
        node: HierarchyNode
    ): HierarchyNode[] {
        const path:
            HierarchyNode[] = [];

        let currentNode:
            HierarchyNode | null = node;

        while (currentNode) {
            path.unshift(currentNode);
            currentNode = currentNode.parent;
        }

        return path;
    }

    private tryReadTupleFilter(
        value: Record<string, unknown>
    ): PrimitiveValueType[][] | null {
        if (
            value.operator !== "In" ||
            !Array.isArray(value.values)
        ) {
            return null;
        }

        const selectedPaths:
            PrimitiveValueType[][] = [];

        for (const tuple of value.values) {
            if (
                !Array.isArray(tuple) ||
                tuple.length === 0
            ) {
                return null;
            }

            const selectedPath:
                PrimitiveValueType[] = [];

            for (const element of tuple) {
                if (
                    !this.isRecord(element) ||
                    !this.isTuplePrimitive(
                        element.value
                    )
                ) {
                    return null;
                }

                selectedPath.push(
                    element.value
                );
            }

            selectedPaths.push(
                selectedPath
            );
        }

        return selectedPaths.length > 0
            ? selectedPaths
            : null;
    }

    private tryReadBasicFilter(
        value: Record<string, unknown>
    ): PrimitiveValueType[][] | null {
        if (
            value.operator !== "In" ||
            !Array.isArray(value.values)
        ) {
            return null;
        }

        const selectedPaths:
            PrimitiveValueType[][] = [];

        for (const selectedValue of value.values) {
            if (
                !this.isTuplePrimitive(
                    selectedValue
                )
            ) {
                return null;
            }

            selectedPaths.push(
                [selectedValue]
            );
        }

        return selectedPaths.length > 0
            ? selectedPaths
            : null;
    }

    private isRecord(
        value: unknown
    ): value is Record<string, unknown> {
        return (
            typeof value === "object" &&
            value !== null
        );
    }

    private isTuplePrimitive(
        value: unknown
    ): value is PrimitiveValueType {
        return (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
        );
    }
}
