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
        selectedPath: HierarchyNode[]
    ): void {
        if (selectedPath.length === 0) {
            this.clear();
            return;
        }

        const hierarchyData =
            this.createSingleSelectionTree(
                selectedPath
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

    public readSelectedNode(
        filters: powerbi.IFilter[] | undefined,
        rootNodes: HierarchyNode[]
    ): HierarchyNode | null {
        const hierarchyData =
            this.readHierarchyData(filters);

        if (hierarchyData === null) {
            return null;
        }

        return this.findDeepestSelectedNode(
            hierarchyData,
            rootNodes
        );
    }

    public readLegacySelectedValues(
        filters: powerbi.IFilter[] | undefined
    ): PrimitiveValueType[] | null {
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
                const tupleValues =
                    this.tryReadLegacyTupleFilter(
                        filter
                    );

                if (tupleValues !== null) {
                    return tupleValues;
                }
            }

            if (
                filter.filterType ===
                FilterType.Basic
            ) {
                const basicValues =
                    this.tryReadLegacyBasicFilter(
                        filter
                    );

                if (basicValues !== null) {
                    return basicValues;
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

    public clear(): void {
        this.host.applyJsonFilter(
            null,
            HierarchyFilterService.objectName,
            HierarchyFilterService.propertyName,
            FilterAction.merge
        );
    }

    private createSingleSelectionTree(
        selectedPath: HierarchyNode[]
    ): IHierarchyIdentityFilterNode<
        CustomVisualOpaqueIdentity
    >[] {
        let children:
            IHierarchyIdentityFilterNode<
                CustomVisualOpaqueIdentity
            >[] = [];

        for (
            let pathIndex =
                selectedPath.length - 1;
            pathIndex >= 0;
            pathIndex--
        ) {
            const selectedNode =
                selectedPath[pathIndex];

            const filterNode:
                IHierarchyIdentityFilterNode<
                    CustomVisualOpaqueIdentity
                > = {
                    identity:
                        selectedNode.identity,
                    operator:
                        pathIndex ===
                        selectedPath.length - 1
                            ? "Selected"
                            : "Inherited"
                };

            if (children.length > 0) {
                filterNode.children = children;
            }

            children = [filterNode];
        }

        return children;
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

    private findDeepestSelectedNode(
        filterNodes:
            IHierarchyIdentityFilterNode<
                CustomVisualOpaqueIdentity
            >[],
        hierarchyNodes: HierarchyNode[]
    ): HierarchyNode | null {
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

            const selectedDescendant =
                filterNode.children
                    ? this.findDeepestSelectedNode(
                        filterNode.children,
                        hierarchyNode.children
                    )
                    : null;

            if (selectedDescendant) {
                return selectedDescendant;
            }

            if (
                filterNode.operator ===
                "Selected"
            ) {
                return hierarchyNode;
            }
        }

        return null;
    }

    private tryReadLegacyTupleFilter(
        value: Record<string, unknown>
    ): PrimitiveValueType[] | null {
        if (
            value.operator !== "In" ||
            !Array.isArray(value.values)
        ) {
            return null;
        }

        const firstTuple = value.values[0];

        if (!Array.isArray(firstTuple)) {
            return null;
        }

        const selectedValues:
            PrimitiveValueType[] = [];

        for (const element of firstTuple) {
            if (
                !this.isRecord(element) ||
                !this.isTuplePrimitive(
                    element.value
                )
            ) {
                return null;
            }

            selectedValues.push(
                element.value
            );
        }

        return selectedValues.length > 0
            ? selectedValues
            : null;
    }

    private tryReadLegacyBasicFilter(
        value: Record<string, unknown>
    ): PrimitiveValueType[] | null {
        if (
            value.operator !== "In" ||
            !Array.isArray(value.values) ||
            value.values.length !== 1
        ) {
            return null;
        }

        const selectedValue =
            value.values[0];

        return this.isTuplePrimitive(
            selectedValue
        )
            ? [selectedValue]
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
