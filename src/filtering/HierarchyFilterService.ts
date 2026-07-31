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

        const selectedValues =
            this.getSelectedValues(selectedPath);

        const tuple: TupleValueType =
            selectedValues.map(
                (value): ITupleElementValue => ({
                    value
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

    public getSelectedValues(
        selectedPath: HierarchyNode[]
    ): PrimitiveValueType[] {
        return selectedPath.map(
            (node) =>
                this.toTuplePrimitive(node.rawValue)
        );
    }

    public readSelectedValues(
        filters: powerbi.IFilter[] | undefined,
        categories: DataViewCategoryColumn[]
    ): PrimitiveValueType[] | null {
        if (!filters || filters.length === 0) {
            return null;
        }

        for (const filter of filters) {
            const selectedValues =
                this.tryReadSelectedValues(
                    filter,
                    categories
                );

            if (selectedValues !== null) {
                return selectedValues;
            }
        }

        return null;
    }

    public clear(): void {
        this.host.applyJsonFilter(
            null,
            HierarchyFilterService.objectName,
            HierarchyFilterService.propertyName,
            FilterAction.merge
        );
    }

    private tryReadSelectedValues(
        value: unknown,
        categories: DataViewCategoryColumn[]
    ): PrimitiveValueType[] | null {
        if (!this.isRecord(value)) {
            return null;
        }

        if (value.filterType === FilterType.Tuple) {
            return this.tryReadTupleFilter(
                value,
                categories
            );
        }

        if (value.filterType === FilterType.Basic) {
            return this.tryReadBasicFilter(
                value,
                categories
            );
        }

        return null;
    }

    private tryReadTupleFilter(
        value: Record<string, unknown>,
        categories: DataViewCategoryColumn[]
    ): PrimitiveValueType[] | null {
        if (
            value.operator !== "In" ||
            !Array.isArray(value.target) ||
            !Array.isArray(value.values)
        ) {
            return null;
        }

        if (
            !this.targetMatchesCategories(
                value.target,
                categories
            )
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

    private tryReadBasicFilter(
        value: Record<string, unknown>,
        categories: DataViewCategoryColumn[]
    ): PrimitiveValueType[] | null {
        const firstCategory = categories[0];

        if (
            !firstCategory ||
            value.operator !== "In" ||
            !this.isRecord(value.target) ||
            !Array.isArray(value.values) ||
            value.values.length !== 1
        ) {
            return null;
        }

        if (
            !this.targetMatchesCategory(
                value.target,
                firstCategory
            )
        ) {
            return null;
        }

        const selectedValue = value.values[0];

        if (!this.isTuplePrimitive(selectedValue)) {
            return null;
        }

        return [selectedValue];
    }

    private targetMatchesCategories(
        target: unknown[],
        categories: DataViewCategoryColumn[]
    ): boolean {
        if (
            target.length === 0 ||
            target.length > categories.length
        ) {
            return false;
        }

        return target.every(
            (targetItem, index) => {
                const category = categories[index];

                return (
                    category !== undefined &&
                    this.isRecord(targetItem) &&
                    this.targetMatchesCategory(
                        targetItem,
                        category
                    )
                );
            }
        );
    }

    private targetMatchesCategory(
        target: Record<string, unknown>,
        category: DataViewCategoryColumn
    ): boolean {
        const expectedTarget =
            this.createTarget(category);

        return (
            target.table === expectedTarget.table &&
            target.column === expectedTarget.column
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
            separatorIndex ===
                queryName.length - 1
        ) {
            throw new Error(
                `Unable to create a filter target for ` +
                `"${category.source.displayName}".`
            );
        }

        return {
            table:
                queryName.substring(
                    0,
                    separatorIndex
                ),
            column:
                queryName.substring(
                    separatorIndex + 1
                )
        };
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

    private toTuplePrimitive(
        value: powerbi.PrimitiveValue
    ): PrimitiveValueType {
        if (value instanceof Date) {
            return value.toISOString();
        }

        if (this.isTuplePrimitive(value)) {
            return value;
        }

        throw new Error(
            "The selected hierarchy value cannot be used in a tuple filter."
        );
    }
}