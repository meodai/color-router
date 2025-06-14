export class PaletteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaletteError';
  }
}

export class CircularDependencyError extends Error {
  constructor(public readonly path: string[]) {
    super(`Circular dependency detected: ${path.join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}
