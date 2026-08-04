"use strict";

import powerbi from "powerbi-visuals-api";

import PrimitiveValue =
    powerbi.PrimitiveValue;

import CustomVisualOpaqueIdentity =
    powerbi.visuals.CustomVisualOpaqueIdentity;

import ISelectionId =
    powerbi.visuals.ISelectionId;

export interface HierarchyNode {
    key: string;
    value: string;
    rawValue: PrimitiveValue;
    identity: CustomVisualOpaqueIdentity;
    selectionId: ISelectionId;
    level: number;
    parent: HierarchyNode | null;
    children: HierarchyNode[];
}

export interface HierarchyLevel {
    name: string;
    nodes: HierarchyNode[];
}
