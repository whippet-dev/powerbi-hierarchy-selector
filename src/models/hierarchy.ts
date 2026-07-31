"use strict";

import powerbi from "powerbi-visuals-api";

import PrimitiveValue =
    powerbi.PrimitiveValue;

export interface HierarchyNode {
    key: string;
    value: string;
    rawValue: PrimitiveValue;
    level: number;
    parent: HierarchyNode | null;
    children: HierarchyNode[];
}

export interface HierarchyLevel {
    name: string;
    nodes: HierarchyNode[];
}
