"use strict";

export interface HierarchyNode {
    key: string;
    value: string;
    level: number;
    parent: HierarchyNode | null;
    children: HierarchyNode[];
}

export interface HierarchyLevel {
    name: string;
    nodes: HierarchyNode[];
}
