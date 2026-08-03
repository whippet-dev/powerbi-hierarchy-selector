"use strict";

import {
    PrimitiveValueType
} from "powerbi-models";

import {
    HierarchyLevel,
    HierarchyNode
} from "../models/hierarchy";

export enum HierarchySelectionState {
    Unselected = "unselected",
    Explicit = "explicit",
    Inherited = "inherited",
    Partial = "partial"
}

export class HierarchySelection {
    private readonly selectedEndpointKeys =
        new Set<string>();

    private readonly selectedPathKeysByLevel =
        new Map<number, Set<string>>();

    private lastSelectedEndpointKey:
        string | undefined;

    public clear(): void {
        this.selectedEndpointKeys.clear();
        this.selectedPathKeysByLevel.clear();
        this.lastSelectedEndpointKey = undefined;
    }

    public hasSelection(): boolean {
        return this.selectedEndpointKeys.size > 0;
    }

    public clearFromLevel(
        startingLevel: number,
        levels: HierarchyLevel[]
    ): void {
        if (startingLevel <= 0) {
            this.clear();
            return;
        }

        const replacementEndpoints:
            HierarchyNode[] = [];

        for (
            const endpoint of
            this.getSelectedEndpoints(levels)
        ) {
            if (endpoint.level < startingLevel) {
                replacementEndpoints.push(endpoint);
                continue;
            }

            const replacement =
                this.getAncestorAtLevel(
                    endpoint,
                    startingLevel - 1
                );

            if (replacement) {
                replacementEndpoints.push(
                    replacement
                );
            }
        }

        this.setEndpoints(
            replacementEndpoints,
            levels
        );
    }

    public getSelectedKey(
        level: number
    ): string | undefined {
        return this.selectedPathKeysByLevel
            .get(level)
            ?.values()
            .next()
            .value;
    }

    public getSelectedKeys(
        level: number
    ): ReadonlySet<string> {
        return (
            this.selectedPathKeysByLevel.get(
                level
            ) ?? new Set<string>()
        );
    }

    public getSelectedNodesAtLevel(
        level: number,
        levels: HierarchyLevel[]
    ): HierarchyNode[] {
        const selectedKeys =
            this.selectedPathKeysByLevel.get(
                level
            );

        if (!selectedKeys) {
            return [];
        }

        return (
            levels[level]?.nodes.filter(
                (node) =>
                    selectedKeys.has(node.key)
            ) ?? []
        );
    }

    public getSelectedEndpoints(
        levels: HierarchyLevel[]
    ): HierarchyNode[] {
        const nodesByKey =
            this.createNodeLookup(levels);

        const endpoints:
            HierarchyNode[] = [];

        for (
            const key of
            this.selectedEndpointKeys
        ) {
            const node = nodesByKey.get(key);

            if (node) {
                endpoints.push(node);
            }
        }

        return endpoints.sort(
            (first, second) =>
                first.key.localeCompare(
                    second.key
                )
        );
    }

    public getSelectedPaths(
        levels: HierarchyLevel[]
    ): HierarchyNode[][] {
        return this.getSelectedEndpoints(
            levels
        ).map(
            (endpoint) =>
                this.getPathToNode(endpoint)
        );
    }

    public getSelectedPath(
        levels: HierarchyLevel[]
    ): HierarchyNode[] {
        return (
            this.getSelectedPaths(levels)[0] ??
            []
        );
    }

    public isSelected(
        node: HierarchyNode
    ): boolean {
        return (
            this.selectedPathKeysByLevel
                .get(node.level)
                ?.has(node.key) ??
            false
        );
    }

    public getSelectionState(
        node: HierarchyNode
    ): HierarchySelectionState {
        if (
            this.selectedEndpointKeys.has(
                node.key
            )
        ) {
            return HierarchySelectionState.Explicit;
        }

        if (this.getInheritedFromNode(node)) {
            return HierarchySelectionState.Inherited;
        }

        if (this.isSelected(node)) {
            return HierarchySelectionState.Partial;
        }

        return HierarchySelectionState.Unselected;
    }

    public getInheritedFromNode(
        node: HierarchyNode
    ): HierarchyNode | null {
        let currentNode = node.parent;

        while (currentNode) {
            if (
                this.selectedEndpointKeys.has(
                    currentNode.key
                )
            ) {
                return currentNode;
            }

            currentNode = currentNode.parent;
        }

        return null;
    }

    public getInheritedNodesAtLevel(
        level: number,
        levels: HierarchyLevel[]
    ): HierarchyNode[] {
        return (
            levels[level]?.nodes.filter(
                (node) =>
                    this.getSelectionState(
                        node
                    ) ===
                    HierarchySelectionState
                        .Inherited
            ) ?? []
        );
    }

    public toggle(
        selectedNode: HierarchyNode,
        levels: HierarchyLevel[],
        multipleSelectionEnabled: boolean
    ): void {
        if (!multipleSelectionEnabled) {
            this.toggleSingle(
                selectedNode,
                levels
            );
            return;
        }

        this.toggleMultiple(
            selectedNode,
            levels
        );
    }

    public synchronizeFromNode(
        selectedNode: HierarchyNode | null,
        levels: HierarchyLevel[]
    ): void {
        this.synchronizeFromNodes(
            selectedNode
                ? [selectedNode]
                : [],
            levels
        );
    }

    public synchronizeFromNodes(
        selectedNodes: HierarchyNode[],
        levels: HierarchyLevel[]
    ): void {
        this.setEndpoints(
            selectedNodes,
            levels
        );
    }

    public synchronizeFromValues(
        levels: HierarchyLevel[],
        selectedValues:
            PrimitiveValueType[] | null
    ): void {
        this.clear();

        if (
            selectedValues === null ||
            selectedValues.length === 0 ||
            selectedValues.length > levels.length
        ) {
            return;
        }

        let selectedParent:
            HierarchyNode | null = null;

        let deepestSelectedNode:
            HierarchyNode | null = null;

        for (
            let levelIndex = 0;
            levelIndex < selectedValues.length;
            levelIndex++
        ) {
            const selectedValue =
                selectedValues[levelIndex];

            const selectedNode =
                levels[levelIndex]?.nodes.find(
                    (node) => {
                        const parentMatches =
                            levelIndex === 0
                                ? node.parent === null
                                : node.parent?.key ===
                                    selectedParent?.key;

                        return (
                            parentMatches &&
                            this.nodeMatchesValue(
                                node,
                                selectedValue
                            )
                        );
                    }
                );

            if (!selectedNode) {
                this.clear();
                return;
            }

            selectedParent = selectedNode;
            deepestSelectedNode = selectedNode;
        }

        if (deepestSelectedNode) {
            this.setEndpoints(
                [deepestSelectedNode],
                levels
            );
        }
    }

    public removeInvalidSelections(
        levels: HierarchyLevel[]
    ): void {
        this.rebuildSelectionState(levels);
    }

    public setMultipleSelectionEnabled(
        enabled: boolean,
        levels: HierarchyLevel[]
    ): boolean {
        if (
            enabled ||
            this.selectedEndpointKeys.size <= 1
        ) {
            return false;
        }

        const endpoints =
            this.getSelectedEndpoints(levels);

        const preferredEndpoint =
            endpoints.find(
                (node) =>
                    node.key ===
                    this.lastSelectedEndpointKey
            ) ??
            endpoints.sort(
                (first, second) =>
                    second.level - first.level ||
                    first.key.localeCompare(
                        second.key
                    )
            )[0];

        this.setEndpoints(
            preferredEndpoint
                ? [preferredEndpoint]
                : [],
            levels
        );

        return true;
    }

    private toggleSingle(
        selectedNode: HierarchyNode,
        levels: HierarchyLevel[]
    ): void {
        if (this.isSelected(selectedNode)) {
            const replacementEndpoint =
                selectedNode.parent;

            this.setEndpoints(
                replacementEndpoint
                    ? [replacementEndpoint]
                    : [],
                levels
            );
            return;
        }

        this.setEndpoints(
            [selectedNode],
            levels
        );
    }

    private toggleMultiple(
        selectedNode: HierarchyNode,
        levels: HierarchyLevel[]
    ): void {
        const currentEndpoints =
            this.getSelectedEndpoints(levels);

        if (this.isSelected(selectedNode)) {
            const remainingEndpoints =
                currentEndpoints.filter(
                    (endpoint) =>
                        !this.isSameNodeOrDescendant(
                            endpoint,
                            selectedNode
                        )
                );

            this.setEndpoints(
                remainingEndpoints,
                levels
            );
            return;
        }

        const retainedEndpoints =
            currentEndpoints.filter(
                (endpoint) =>
                    !this.isSameNodeOrDescendant(
                        endpoint,
                        selectedNode
                    ) &&
                    !this.isSameNodeOrDescendant(
                        selectedNode,
                        endpoint
                    )
            );

        retainedEndpoints.push(selectedNode);
        this.lastSelectedEndpointKey =
            selectedNode.key;

        this.setEndpoints(
            retainedEndpoints,
            levels
        );
    }

    private setEndpoints(
        endpoints: HierarchyNode[],
        levels: HierarchyLevel[]
    ): void {
        const normalizedEndpoints =
            this.normalizeEndpoints(endpoints);

        this.selectedEndpointKeys.clear();

        for (const endpoint of normalizedEndpoints) {
            this.selectedEndpointKeys.add(
                endpoint.key
            );
        }

        if (
            this.lastSelectedEndpointKey &&
            !this.selectedEndpointKeys.has(
                this.lastSelectedEndpointKey
            )
        ) {
            this.lastSelectedEndpointKey =
                normalizedEndpoints[
                    normalizedEndpoints.length - 1
                ]?.key;
        }

        if (
            !this.lastSelectedEndpointKey &&
            normalizedEndpoints.length > 0
        ) {
            this.lastSelectedEndpointKey =
                normalizedEndpoints[
                    normalizedEndpoints.length - 1
                ].key;
        }

        this.rebuildSelectionState(levels);
    }

    private rebuildSelectionState(
        levels: HierarchyLevel[]
    ): void {
        const nodesByKey =
            this.createNodeLookup(levels);

        const validEndpoints:
            HierarchyNode[] = [];

        for (
            const key of
            this.selectedEndpointKeys
        ) {
            const node = nodesByKey.get(key);

            if (node) {
                validEndpoints.push(node);
            }
        }

        const normalizedEndpoints =
            this.normalizeEndpoints(
                validEndpoints
            );

        this.selectedEndpointKeys.clear();
        this.selectedPathKeysByLevel.clear();

        for (const endpoint of normalizedEndpoints) {
            this.selectedEndpointKeys.add(
                endpoint.key
            );

            for (
                const pathNode of
                this.getPathToNode(endpoint)
            ) {
                let levelKeys =
                    this.selectedPathKeysByLevel.get(
                        pathNode.level
                    );

                if (!levelKeys) {
                    levelKeys = new Set<string>();
                    this.selectedPathKeysByLevel.set(
                        pathNode.level,
                        levelKeys
                    );
                }

                levelKeys.add(pathNode.key);
            }
        }

        if (
            this.lastSelectedEndpointKey &&
            !this.selectedEndpointKeys.has(
                this.lastSelectedEndpointKey
            )
        ) {
            this.lastSelectedEndpointKey =
                normalizedEndpoints[
                    normalizedEndpoints.length - 1
                ]?.key;
        }
    }

    private normalizeEndpoints(
        endpoints: HierarchyNode[]
    ): HierarchyNode[] {
        const uniqueEndpoints =
            Array.from(
                new Map(
                    endpoints.map(
                        (node) => [node.key, node]
                    )
                ).values()
            ).sort(
                (first, second) =>
                    first.level - second.level ||
                    first.key.localeCompare(
                        second.key
                    )
            );

        const normalized:
            HierarchyNode[] = [];

        for (const endpoint of uniqueEndpoints) {
            const hasSelectedAncestor =
                normalized.some(
                    (candidate) =>
                        this.isSameNodeOrDescendant(
                            endpoint,
                            candidate
                        )
                );

            if (!hasSelectedAncestor) {
                normalized.push(endpoint);
            }
        }

        return normalized;
    }

    private createNodeLookup(
        levels: HierarchyLevel[]
    ): Map<string, HierarchyNode> {
        const nodesByKey =
            new Map<string, HierarchyNode>();

        for (const level of levels) {
            for (const node of level.nodes) {
                nodesByKey.set(node.key, node);
            }
        }

        return nodesByKey;
    }

    private getPathToNode(
        node: HierarchyNode
    ): HierarchyNode[] {
        const path: HierarchyNode[] = [];

        let currentNode:
            HierarchyNode | null = node;

        while (currentNode) {
            path.unshift(currentNode);
            currentNode = currentNode.parent;
        }

        return path;
    }

    private getAncestorAtLevel(
        node: HierarchyNode,
        targetLevel: number
    ): HierarchyNode | null {
        let currentNode:
            HierarchyNode | null = node;

        while (
            currentNode &&
            currentNode.level > targetLevel
        ) {
            currentNode = currentNode.parent;
        }

        return (
            currentNode?.level === targetLevel
                ? currentNode
                : null
        );
    }

    private isSameNodeOrDescendant(
        node: HierarchyNode,
        possibleAncestor: HierarchyNode
    ): boolean {
        let currentNode:
            HierarchyNode | null = node;

        while (currentNode) {
            if (
                currentNode.key ===
                possibleAncestor.key
            ) {
                return true;
            }

            currentNode = currentNode.parent;
        }

        return false;
    }

    private nodeMatchesValue(
        node: HierarchyNode,
        selectedValue: PrimitiveValueType
    ): boolean {
        if (node.rawValue instanceof Date) {
            return (
                node.rawValue.toISOString() ===
                selectedValue
            );
        }

        return node.rawValue === selectedValue;
    }
}
