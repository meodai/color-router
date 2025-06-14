import { ColorDefinition, ColorReference, ColorFunction, LogCallback } from './types';
import { CircularDependencyError } from './errors';

export class DependencyGraph {
  private readonly nodeToPrerequisites = new Map<string, Set<string>>();
  private readonly nodeToDependents = new Map<string, Set<string>>();
  private logCallback?: LogCallback;

  constructor(logCallback?: LogCallback) {
    this.logCallback = logCallback;
  }

  public setLogCallback(callback: LogCallback): void {
    this.logCallback = callback;
  }

  private getPrerequisitesFromValue(value: ColorDefinition): string[] {
    if (value instanceof ColorReference) return [value.key];
    if (value instanceof ColorFunction) return value.dependencies;
    return [];
  }

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

  public getPrerequisitesFor(key: string): string[] {
    return Array.from(this.nodeToPrerequisites.get(key) || []);
  }

  public getDependentsOf(key: string): string[] {
    return Array.from(this.nodeToDependents.get(key) || []);
  }

  public getConnectionGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    for (const [node, dependents] of this.nodeToDependents.entries()) {
      graph[node] = Array.from(dependents);
    }
    return graph;
  }
}
