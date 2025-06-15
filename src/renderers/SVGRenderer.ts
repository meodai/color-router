import { TokenEngine } from '../engine/TokenEngine';
import { DesignSystem } from '../system';
import { ColorFunction, ColorReference } from '../types';
import { tableView, createTableItemFromPalette, TableItem, TableViewOptions } from './TableViewRenderer';

export interface SVGRenderOptions extends TableViewOptions {
  showConnections?: boolean;
  strokeWidth?: number;
  dotRadius?: number;
}

export interface ConnectionPoint {
  key: string;
  x: number;
  y: number;
  isLeft: boolean;
  color: string;
  colorName: string;
  isPaletteNode?: boolean;
}

export interface Connection {
  from: ConnectionPoint;
  to: ConnectionPoint;
}

/**
 * SVG Renderer for TokenEngine/DesignSystem - creates circular table visualizations
 */
export class SVGRenderer {
  #options: SVGRenderOptions;
  #engine: TokenEngine;
  #designSystem: DesignSystem;

  constructor(designSystem: DesignSystem, options: SVGRenderOptions = {}) {
    this.#designSystem = designSystem;
    this.#engine = designSystem.getEngine();
    this.#options = {
      gap: 20,
      useMaxDiagonal: true,
      padding: 0.2,
      widthPerLetter: 7,
      fontSize: 10,
      lineHeight: 1.5,
      itemPadding: [10, 5],
      showConnections: true,
      strokeWidth: 2,
      dotRadius: 5,
      ...options,
    };
  }

  #createSVG(w: number, h: number, content: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${content}</svg>`;
  }

  #createTableGroup(item: TableItem, left: number, top: number): string {
    if (!item.title || !item.colors || !item.topPositions) return '';

    const { w, h, title, colors, topPositions } = item;
    const { fontSize, itemPadding = [10, 5] } = this.#options;

    const allLabels = [title, ...Object.keys(colors)];

    const rows = allLabels
      .map((label) => {
        const isHeader = label === title;
        const { rectTop, textTop, height } = topPositions[label];
        const colorValue = isHeader ? '' : colors[label];

        const rect = `<rect class="palette-table__row ${
          isHeader ? 'palette-table__row--header' : ''
        }" width="${w}" height="${height}" y="${rectTop}" 
        ${colorValue ? `data-color="${colorValue}"` : ''} />`;

        const text = `<text class="palette-table__label ${
          isHeader ? 'palette-table__label--header' : ''
        }" x="${itemPadding[0]}" y="${textTop}" font-size="${fontSize}"
        ${colorValue ? `data-color="${colorValue}"` : ''}>${label}</text>`;

        return rect + text;
      })
      .join('');

    return `<g transform="translate(${left}, ${top})">
      <rect class="palette-table" width="${w}" height="${h}" />
      ${rows}
    </g>`;
  }

  #extractConnectionPoints(tableItems: TableItem[], tableBoundingRect: any): Record<string, ConnectionPoint> {
    const allConnectionPoints: Record<string, ConnectionPoint> = {};

    tableItems.forEach((tableItem) => {
      if (!tableItem.title || !tableItem.colors || !tableItem.topPositions || !tableItem.topPositions[tableItem.title])
        return;

      Object.keys(tableItem.colors).forEach((colorKey) => {
        const fullKey = `${tableItem.title}.${colorKey}`;
        const position = tableItem.topPositions![colorKey];
        const isColorRowOnLeftHalfOfDiagram = tableItem.left! < tableBoundingRect.centerX;
        const pointX = isColorRowOnLeftHalfOfDiagram ? tableItem.left! + tableItem.w : tableItem.left!;
        const pointY = position.rectTop + position.height / 2 + tableItem.top!;

        allConnectionPoints[fullKey] = {
          key: fullKey,
          x: pointX,
          y: pointY,
          isLeft: isColorRowOnLeftHalfOfDiagram,
          color: tableItem.colors![colorKey] || '#000000',
          colorName: colorKey,
          isPaletteNode: false,
        };
      });

      const paletteKey = `palette:${tableItem.title}`;
      const headerPosition = tableItem.topPositions[tableItem.title];
      const isPaletteTableOnLeftHalfOfDiagram = tableItem.left! + tableItem.w / 2 < tableBoundingRect.centerX;
      const paletteNodeX = isPaletteTableOnLeftHalfOfDiagram ? tableItem.left! + tableItem.w : tableItem.left!;
      const paletteNodeY = tableItem.top! + headerPosition.rectTop + headerPosition.height / 2;

      allConnectionPoints[paletteKey] = {
        key: paletteKey,
        x: paletteNodeX,
        y: paletteNodeY,
        isLeft: isPaletteTableOnLeftHalfOfDiagram,
        color: '#888888',
        colorName: tableItem.title,
        isPaletteNode: true,
      };
    });

    return allConnectionPoints;
  }

  #findConnections(connectionPoints: Record<string, ConnectionPoint>): Connection[] {
    const connections: Connection[] = [];
    const processedConnections = new Set<string>();

    Object.keys(connectionPoints).forEach((key) => {
      if (connectionPoints[key].isPaletteNode) return;

      const visualDependencies = this.#getVisualDependencies(key);
      const fromPoint = connectionPoints[key];

      if (fromPoint) {
        visualDependencies.forEach((depKey: string) => {
          const toPoint = connectionPoints[depKey];
          if (toPoint) {
            const connectionId = `${key}->${depKey}`;
            if (!processedConnections.has(connectionId)) {
              connections.push({ from: fromPoint, to: toPoint });
              processedConnections.add(connectionId);
            }
          }
        });
      }
    });

    return connections;
  }

  #getVisualDependencies(key: string): Set<string> {
    const definition = this.#engine.getDefinition(key);
    if (definition instanceof ColorFunction) {
      return new Set(definition.dependencies);
    }
    if (definition instanceof ColorReference) {
      return new Set([definition.key]);
    }
    return new Set<string>();
  }

  #getDefinitionType(key: string): 'value' | 'reference' | 'function' {
    const definition = this.#engine.getDefinition(key);
    if (!definition) return 'value';
    if (typeof definition === 'string') return 'value';
    if (definition instanceof ColorReference) return 'reference';
    if (definition instanceof ColorFunction) return 'function';
    return 'value';
  }

  #generateConnectionPaths(connections: Connection[]): string {
    if (!this.#options.showConnections || connections.length === 0) return '';

    const { strokeWidth = 2 } = this.#options;

    const backgroundPaths = connections
      .map((connection) => {
        const { from, to } = connection;
        const yDiff = Math.abs(from.y - to.y);
        const amp = 40 + yDiff * 0.3;
        const path = `M ${from.x} ${from.y} C ${from.x + (from.isLeft ? amp : -amp)} ${from.y}, ${
          to.x + (to.isLeft ? amp : -amp)
        } ${to.y}, ${to.x} ${to.y}`;

        return `<path d="${path}" stroke="#000" stroke-width="${strokeWidth + 1}" fill="none" stroke-dasharray="none" />`;
      })
      .join('');

    const colorPaths = connections
      .map((connection) => {
        const { from, to } = connection;
        const yDiff = Math.abs(from.y - to.y);
        const amp = 40 + yDiff * 0.3;
        const path = `M ${from.x} ${from.y} C ${from.x + (from.isLeft ? amp : -amp)} ${from.y}, ${
          to.x + (to.isLeft ? amp : -amp)
        } ${to.y}, ${to.x} ${to.y}`;

        const fromDefType = this.#getDefinitionType(from.key);
        const strokeDasharray = fromDefType === 'function' ? '5,5' : 'none';

        return `<path d="${path}" stroke="${from.color}" stroke-width="${strokeWidth}" fill="none" data-color="${from.color}" stroke-dasharray="${strokeDasharray}" />`;
      })
      .join('');

    return `
      <g class="connections-bg">${backgroundPaths}</g>
      <g class="connections">${colorPaths}</g>
    `;
  }

  #generateDots(connectionPoints: Record<string, ConnectionPoint>): string {
    const { dotRadius = 5 } = this.#options;

    const dots = Object.values(connectionPoints)
      .map((point) => {
        if (point.isPaletteNode) {
          const sideLength = dotRadius * 1.6;
          const xCoord = point.x - sideLength / 2;
          const yCoord = point.y - sideLength / 2;
          return `<rect x="${xCoord}" y="${yCoord}" width="${sideLength}" height="${sideLength}" 
          fill="#000000" stroke="#333333" stroke-width="1" 
          data-key="${point.key}" transform="rotate(45 ${point.x} ${point.y})" />`;
        } else {
          const radius = dotRadius;
          const fillColor = point.color;
          const strokeColor = 'black';
          return `<circle cx="${point.x}" cy="${point.y}" r="${radius}" 
          fill="${fillColor}" stroke="${strokeColor}" stroke-width="1" 
          data-color="${point.color}" data-key="${point.key}" />`;
        }
      })
      .join('');

    return `<g class="dots">${dots}</g>`;
  }

  render(): string {
    const scopes = this.#designSystem.getAllScopes();

    if (scopes.length === 0) {
      return this.#createSVG(
        200,
        100,
        '<text x="100" y="50" text-anchor="middle" font-family="monospace">No scopes defined</text>',
      );
    }

    const tableItems: TableItem[] = scopes.map((scope) => {
      const tokens = scope.allTokens();
      const colors: Record<string, string> = {};

      Object.keys(tokens).forEach((name: string) => {
        const fullKey = `${scope.name}.${name}`;
        colors[name] = this.#engine.resolve(fullKey);
      });

      return createTableItemFromPalette(scope.name, colors, this.#options);
    });

    const table = tableView(tableItems, this.#options);
    const connectionPoints = this.#extractConnectionPoints(table.tableItems, table.tableBoundingRect);
    const connections = this.#findConnections(connectionPoints);
    const connectionPaths = this.#generateConnectionPaths(connections);
    const dots = this.#generateDots(connectionPoints);
    const tables = table.tableItems.map((item) => this.#createTableGroup(item, item.left!, item.top!)).join('');

    const styles = `
      <style>
        .palette-table {
          fill: white;
          stroke: black;
          stroke-width: 1;
        }
        .palette-table__row {
          fill: none;
          stroke: black;
          stroke-width: 1;
        }
        .palette-table__row--header {
          fill: black;
        }
        text {
          font-family: monospace;
        }
        .palette-table__label {
          fill: black;
        }
        .palette-table__label--header {
          font-weight: bold;
          fill: white;
        }
        .connections-bg {
          opacity: 0.8;
        }
        .connections {
          opacity: 0.9;
        }
        .dots {
          cursor: pointer;
        }
        .dots circle:hover {
          stroke-width: 2;
          r: ${(this.#options.dotRadius || 5) + 1};
        }
        .dots rect:hover {
          stroke-width: 2;
        }
        .dots text {
          font-family: monospace;
          pointer-events: none;
        }
      </style>
    `;

    const content = styles + connectionPaths + `<g class="tables">${tables}</g>` + dots;

    return this.#createSVG(table.tableBoundingRect.w, table.tableBoundingRect.h, content);
  }
}
