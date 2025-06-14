import { ColorDefinition, ColorReference, ColorFunction, LogCallback } from '../types';
import { CircularDependencyError } from './errors';

/**
 * Manages the dependency graph between color definitions.
 * This class is responsible for tracking dependencies, detecting circular dependencies,
 * and determining the correct evaluation order for color resolution.
 */
export class DependencyGraph {
  private readonly nodeToPrerequisites = new Map<string, Set<string>>();
  private readonly nodeToDependents = new Map<string, Set<string>>();
  private logCallback?: LogCallback;

  /**
   * Creates an instance of DependencyGraph.
   * @param logCallback An optional callback function for logging.
   */
  constructor(logCallback?: LogCallback) {
    this.logCallback = logCallback;
  }

  /**
   * Sets the log callback function.
   * @param callback The callback function for logging.
   */
  public setLogCallback(callback: LogCallback): void {
    this.logCallback = callback;
  }

  /**
   * Extracts prerequisite keys from a color definition.
   * @param value The color definition.
   * @returns An array of prerequisite color keys.
   */
  private getPrerequisitesFromValue(value: ColorDefinition): string[] {
    if (value instanceof ColorReference) return [value.key];
    if (value instanceof ColorFunction) return value.dependencies;
    return [];
  }

  /**
   * Updates the dependency edges for a given color key based on its new definition.
   * @param key The color key being updated.
   * @param value The new color definition.
   */
  public updateEdges(key: string, value: ColorDefinition): void {
    const oldPrerequisites = this.nodeToPrerequisites.get(key);
    if (oldPrerequisites) {
      for (const prereq of oldPrerequisites) {
        this.nodeToDependents.get(prereq)?.delete(key);
      }
    }
    this.nodeToPrerequisites.set(key, new Set());

    const newPrerequisites = this.getPrerequisitesFromValue(value);
    for (const prereq of newPrerequisites) {
      this.nodeToPrerequisites.get(key)!.add(prereq);
      if (!this.nodeToDependents.has(prereq)) {
        this.nodeToDependents.set(prereq, new Set());
      }
      this.nodeToDependents.get(prereq)!.add(key);
    }
  }

  /**
   * Removes a node (color key) and its associated edges from the dependency graph.
   * @param key The color key to remove.
   */
  public removeNode(key: string): void {
    const prerequisites = this.nodeToPrerequisites.get(key);
    if (prerequisites) {
      for (const prereq of prerequisites) {
        this.nodeToDependents.get(prereq)?.delete(key);
      }
    }
    this.nodeToPrerequisites.delete(key);

    const dependents = this.nodeToDependents.get(key);
    if (dependents) {
      for (const dep of dependents) {
        this.nodeToPrerequisites.get(dep)?.delete(key);
      }
    }
    this.nodeToDependents.delete(key);
  }

  /**
   * Determines the evaluation order for a given starting key and all its dependents.
   * This involves finding all reachable nodes from the start key and then performing a topological sort.
   * @param startKey The color key to start the evaluation from.
   * @returns An array of color keys in the correct evaluation order.
   */
  public getEvaluationOrderFor(startKey: string): string[] {
    const nodesToInclude = new Set<string>();
    const queue: string[] = [startKey];
    const visitedForReachability = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visitedForReachability.has(current)) continue;
      visitedForReachability.add(current);
      nodesToInclude.add(current);
      (this.nodeToDependents.get(current) || []).forEach((dependent) => queue.push(dependent));
    }
    return this.topologicalSort([...nodesToInclude]);
  }

  /**
   * Performs a topological sort on a given set of keys.
   * @param keysToSort An array of color keys to sort.
   * @returns An array of color keys in topologically sorted order.
   * @throws {CircularDependencyError} If a circular dependency is detected.
   */
  public topologicalSort(keysToSort: string[]): string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const visit = (node: string): void => {
      if (visited.has(node)) return;
      if (recursionStack.has(node)) {
        const error = new CircularDependencyError([...recursionStack, node]);
        if (this.logCallback) {
          this.logCallback(`Circular dependency detected for '${node}': ${error.message}`);
        }
        throw error;
      }
      recursionStack.add(node);

      const prerequisites = this.nodeToPrerequisites.get(node);
      if (prerequisites) {
        for (const prereq of prerequisites) {
          if (keysToSort.includes(prereq)) {
            visit(prereq);
          }
        }
      }
      recursionStack.delete(node);
      visited.add(node);
      sorted.push(node);
    };

    for (const key of keysToSort) {
      if (!visited.has(key)) {
        visit(key);
      }
    }
    return sorted;
  }

  /**
   * Retrieves the direct prerequisites for a given color key.
   * @param key The color key.
   * @returns An array of prerequisite color keys.
   */
  public getPrerequisitesFor(key: string): string[] {
    return Array.from(this.nodeToPrerequisites.get(key) || []);
  }

  /**
   * Retrieves the direct dependents of a given color key.
   * @param key The color key.
   * @returns An array of dependent color keys.
   */
  public getDependentsOf(key: string): string[] {
    return Array.from(this.nodeToDependents.get(key) || []);
  }

  /**
   * Gets the entire dependency graph as an adjacency list (node to its dependents).
   * @returns A record where keys are color names and values are arrays of their dependents.
   * @deprecated Use getAdjacencyList(false) instead for better graph terminology.
   */
  public getConnectionGraph(): Record<string, string[]> {
    return this.getAdjacencyList(false);
  }

  // Graph terminology aliases for better API
  
  /**
   * Alias for getPrerequisitesFor() using graph terminology.
   * Gets the incoming edges (prerequisites) for a node.
   */
  public getIncomingEdges(node: string): string[] {
    return this.getPrerequisitesFor(node);
  }

  /**
   * Alias for getDependentsOf() using graph terminology.
   * Gets the outgoing edges (dependents) for a node.
   */
  public getOutgoingEdges(node: string): string[] {
    return this.getDependentsOf(node);
  }

  /**
   * Gets the degree (number of connections) of a node.
   * @param node The node to check.
   * @param incoming If true, counts incoming edges; if false, counts outgoing edges.
   * @returns The degree of the node.
   */
  public getNodeDegree(node: string, incoming: boolean = true): number {
    return incoming 
      ? (this.nodeToPrerequisites.get(node)?.size || 0)
      : (this.nodeToDependents.get(node)?.size || 0);
  }

  /**
   * Performs a depth-first search (DFS) traversal starting from a given node.
   * @param startNode The node to start traversal from.
   * @param visitPrerequisites If true, traverses prerequisites (upstream); if false, traverses dependents (downstream).
   * @returns An array of nodes in DFS order.
   */
  public dfsTraversal(startNode: string, visitPrerequisites: boolean = true): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const dfs = (node: string): void => {
      if (visited.has(node)) return;
      visited.add(node);
      result.push(node);

      const neighbors = visitPrerequisites 
        ? this.nodeToPrerequisites.get(node) || new Set()
        : this.nodeToDependents.get(node) || new Set();

      for (const neighbor of neighbors) {
        dfs(neighbor);
      }
    };

    dfs(startNode);
    return result;
  }

  /**
   * Performs a breadth-first search (BFS) traversal starting from a given node.
   * @param startNode The node to start traversal from.
   * @param visitPrerequisites If true, traverses prerequisites (upstream); if false, traverses dependents (downstream).
   * @returns An array of nodes in BFS order.
   */
  public bfsTraversal(startNode: string, visitPrerequisites: boolean = true): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    const queue: string[] = [startNode];

    while (queue.length > 0) {
      const node = queue.shift()!;
      if (visited.has(node)) continue;
      
      visited.add(node);
      result.push(node);

      const neighbors = visitPrerequisites 
        ? this.nodeToPrerequisites.get(node) || new Set()
        : this.nodeToDependents.get(node) || new Set();

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    return result;
  }

  /**
   * Finds the shortest path between two nodes using BFS.
   * @param fromNode The starting node.
   * @param toNode The target node.
   * @param traverseUpstream If true, follows prerequisites; if false, follows dependents.
   * @returns The shortest path as an array of nodes, or null if no path exists.
   */
  public findShortestPath(fromNode: string, toNode: string, traverseUpstream: boolean = true): string[] | null {
    if (fromNode === toNode) return [fromNode];

    const visited = new Set<string>();
    const queue: { node: string; path: string[] }[] = [{ node: fromNode, path: [fromNode] }];

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;
      
      if (visited.has(node)) continue;
      visited.add(node);

      const neighbors = traverseUpstream 
        ? this.nodeToPrerequisites.get(node) || new Set()
        : this.nodeToDependents.get(node) || new Set();

      for (const neighbor of neighbors) {
        if (neighbor === toNode) {
          return [...path, neighbor];
        }
        
        if (!visited.has(neighbor)) {
          queue.push({ node: neighbor, path: [...path, neighbor] });
        }
      }
    }

    return null; // No path found
  }

  /**
   * Checks if there is a path (connectivity) between two nodes.
   * @param fromNode The starting node.
   * @param toNode The target node.
   * @param traverseUpstream If true, follows prerequisites; if false, follows dependents.
   * @returns True if a path exists, false otherwise.
   */
  public hasPath(fromNode: string, toNode: string, traverseUpstream: boolean = true): boolean {
    return this.findShortestPath(fromNode, toNode, traverseUpstream) !== null;
  }

  /**
   * Detects if the graph contains any cycles using DFS.
   * @returns True if cycles exist, false otherwise.
   */
  public hasCycles(): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (node: string): boolean => {
      if (recursionStack.has(node)) return true;
      if (visited.has(node)) return false;

      visited.add(node);
      recursionStack.add(node);

      const prerequisites = this.nodeToPrerequisites.get(node) || new Set();
      for (const prereq of prerequisites) {
        if (hasCycleDFS(prereq)) return true;
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of this.nodeToPrerequisites.keys()) {
      if (!visited.has(node) && hasCycleDFS(node)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Gets all nodes in the graph.
   * @returns An array of all node keys.
   */
  public getAllNodes(): string[] {
    const allNodes = new Set<string>();
    
    // Add all nodes that have prerequisites
    for (const node of this.nodeToPrerequisites.keys()) {
      allNodes.add(node);
    }
    
    // Add all nodes that are prerequisites of others
    for (const prerequisites of this.nodeToPrerequisites.values()) {
      for (const prereq of prerequisites) {
        allNodes.add(prereq);
      }
    }
    
    return Array.from(allNodes);
  }

  /**
   * Gets the graph as an adjacency list representation.
   * @param showPrerequisites If true, shows prerequisites; if false, shows dependents.
   * @returns A record where keys are nodes and values are arrays of connected nodes.
   */
  public getAdjacencyList(showPrerequisites: boolean = true): Record<string, string[]> {
    const adjacencyList: Record<string, string[]> = {};
    
    if (showPrerequisites) {
      for (const [node, prerequisites] of this.nodeToPrerequisites.entries()) {
        adjacencyList[node] = Array.from(prerequisites);
      }
    } else {
      for (const [node, dependents] of this.nodeToDependents.entries()) {
        adjacencyList[node] = Array.from(dependents);
      }
    }
    
    return adjacencyList;
  }
}
