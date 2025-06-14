import { ColorDefinition, ColorReference, ColorFunction, LogCallback } from './types';
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
   */
  public getConnectionGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    for (const [node, dependents] of this.nodeToDependents.entries()) {
      graph[node] = Array.from(dependents);
    }
    return graph;
  }
}
