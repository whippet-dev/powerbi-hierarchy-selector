"use strict";

import powerbi from "powerbi-visuals-api";
import {
    FilterType,
    IFilterColumnTarget,
    ITupleElementValue,
    ITupleFilter,
    ITupleFilterTarget,
    PrimitiveValueType,
    TupleValueType
} from "powerbi-models";

import { HierarchyNode } from "../models/hierarchy";

import DataViewCategoryColumn =
    powerbi.DataViewCategoryColumn;

import FilterAction =
    powerbi.FilterAction;

import IVisualHost =
    powerbi.extensibility.visual.IVisualHost;

export class HierarchyFilterService {
    private static readonly objectName = "general";
    private static readonly propertyName = "filter";

    public constructor(
        private readonly host: IVisualHost
    ) {}

    public apply(
        categories: DataViewCategoryColumn[],
        selectedPath: HierarchyNode[]
    ): void {
        if (selectedPath.length === 0) {
            this.clear();
            return;
        }

        const selectedCategories =
            categories.slice(0, selectedPath.length);

        const target: ITupleFilterTarget =
            selectedCategories.map(
                (category) =>
                    this.createTarget(category)
            );

        const tuple: TupleValueType =
            selectedPath.map(
                (node): ITupleElementValue => ({
                    value:
                        this.toTuplePrimitive(node.rawValue)
                })
            );

        const filter: ITupleFilter = {
            $schema:
                "https://powerbi.com/product/schema#tuple",
            filterType: FilterType.Tuple,
            operator: "In",
            target,
            values: [tuple]
        };

        this.host.applyJsonFilter(
            filter,
            HierarchyFilterService.objectName,
            HierarchyFilterService.propertyName,
            FilterAction.merge
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

    private createTarget(
        category: DataViewCategoryColumn
    ): IFilterColumnTarget {
        const queryName = category.source.queryName;
        const separatorIndex =
            queryName?.indexOf(".") ?? -1;

        if (
            !queryName ||
            separatorIndex <= 0 ||
            separatorIndex === queryName.length - 1
        ) {
            throw new Error(
                `Unable to create a filter target for ` +
                `"${category.source.displayName}".`
            );
        }

        return {
            table: queryName.substring(0, separatorIndex),
            column: queryName.substring(separatorIndex + 1)
        };
    }

    private toTuplePrimitive(
        value: powerbi.PrimitiveValue
    ): PrimitiveValueType {
        if (value instanceof Date) {
            return value.toISOString();
        }

        if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
        ) {
            return value;
        }

        /*
         * Null and undefined hierarchy values are excluded while the tree is
         * built, so reaching this branch indicates an unsupported host value.
         */
        throw new Error(
            "The selected hierarchy value cannot be used in a tuple filter."
        );
    }
}
