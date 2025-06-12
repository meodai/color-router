import { ColorRenderer, RenderFormat } from './ColorRenderer';
import { ColorRouter } from './ColorRouter';
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
}

export interface Connection {
  from: ConnectionPoint;
  to: ConnectionPoint;
}

/**
 * SVG Renderer for ColorRouter - creates circular table visualizations
 * Adapted from paletter's toSVGviz.mjs
 */
export class SVGRenderer extends ColorRenderer {
  #options: SVGRenderOptions;
  #router: ColorRouter;

  constructor(router: ColorRouter, options: SVGRenderOptions = {}) {
    super(router, 'json' as RenderFormat); // Use JSON format as base
    this.#router = router;
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

  /**
   * Get the router instance
   */
  private get router(): ColorRouter {
    return this.#router;
  }

  /**
   * Create SVG element with viewBox
   */
  #createSVG(w: number, h: number, content: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${content}</svg>`;
  }

  /**
   * Generate SVG group for a table item (palette)
   */
  #createTableGroup(item: TableItem, left: number, top: number): string {
    if (!item.title || !item.colors || !item.topPositions) return '';

    const { w, h, title, colors, topPositions } = item;
    const { fontSize, itemPadding = [10, 5] } = this.#options;

    const allLabels = [title, ...Object.keys(colors)];
    
    const rows = allLabels.map((label) => {
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
    }).join('');

    return `<g transform="translate(${left}, ${top})">
      <rect class="palette-table" width="${w}" height="${h}" />
      ${rows}
    </g>`;
  }

  /**
   * Extract connection points from table items
   */
  #extractConnectionPoints(tableItems: TableItem[], tableBoundingRect: any): Record<string, ConnectionPoint> {
    const allConnectionPoints: Record<string, ConnectionPoint> = {};

    tableItems.forEach((tableItem) => {
      if (!tableItem.title || !tableItem.colors || !tableItem.topPositions) return;

      Object.keys(tableItem.colors).forEach((colorKey) => {
        const fullKey = `${tableItem.title}.${colorKey}`;
        const position = tableItem.topPositions![colorKey];
        const isLeft = tableItem.left! < tableBoundingRect.centerX;
        const pointX = isLeft ? tableItem.left! + tableItem.w : tableItem.left!;
        const pointY = position.rectTop + position.height / 2 + tableItem.top!;

        allConnectionPoints[fullKey] = {
          key: fullKey,
          x: pointX,
          y: pointY,
          isLeft,
          color: tableItem.colors![colorKey] || '#000000',
          colorName: colorKey,
        };
      });
    });

    return allConnectionPoints;
  }

  /**
   * Find connections between colors (references and function dependencies)
   */
  #findConnections(router: ColorRouter, connectionPoints: Record<string, ConnectionPoint>): Connection[] {
    const connections: Connection[] = [];
    const processedConnections = new Set<string>();

    Object.keys(connectionPoints).forEach((key) => {
      const dependencies = router.getDependencies(key);
      const fromPoint = connectionPoints[key];

      if (fromPoint) {
        dependencies.forEach((depKey) => {
          const toPoint = connectionPoints[depKey];
          if (toPoint) {
            const connectionId = `${key}->${depKey}`;
            const reverseConnectionId = `${depKey}->${key}`;
            
            if (!processedConnections.has(connectionId) && !processedConnections.has(reverseConnectionId)) {
              connections.push({ from: fromPoint, to: toPoint });
              processedConnections.add(connectionId);
            }
          }
        });
      }
    });

    return connections;
  }

  /**
   * Generate SVG paths for connections
   */
  #generateConnectionPaths(connections: Connection[]): string {
    if (!this.#options.showConnections || connections.length === 0) return '';

    const { strokeWidth = 2 } = this.#options;

    const backgroundPaths = connections.map((connection) => {
      const { from, to } = connection;
      const yDiff = Math.abs(from.y - to.y);
      const amp = 40 + (yDiff * 0.3);
      const path = `M ${from.x} ${from.y} C ${
        from.x + (from.isLeft ? amp : -amp)
      } ${from.y}, ${
        to.x + (to.isLeft ? amp : -amp)
      } ${to.y}, ${to.x} ${to.y}`;

      return `<path d="${path}" stroke="#000" stroke-width="${strokeWidth + 1.5}" fill="none" />`;
    }).join('');

    const colorPaths = connections.map((connection) => {
      const { from, to } = connection;
      const yDiff = Math.abs(from.y - to.y);
      const amp = 40 + (yDiff * 0.3);
      const path = `M ${from.x} ${from.y} C ${
        from.x + (from.isLeft ? amp : -amp)
      } ${from.y}, ${
        to.x + (to.isLeft ? amp : -amp)
      } ${to.y}, ${to.x} ${to.y}`;

      return `<path d="${path}" stroke="${from.color}" stroke-width="${strokeWidth}" fill="none" data-color="${from.color}" />`;
    }).join('');

    return `
      <g class="connections-bg">${backgroundPaths}</g>
      <g class="connections">${colorPaths}</g>
    `;
  }

  /**
   * Generate SVG dots for connection points
   */
  #generateDots(connectionPoints: Record<string, ConnectionPoint>): string {
    const { dotRadius = 5 } = this.#options;

    const dots = Object.values(connectionPoints).map((point) => {
      return `<circle cx="${point.x}" cy="${point.y}" r="${dotRadius}" 
        fill="${point.color}" stroke="black" stroke-width="1" 
        data-color="${point.color}" data-key="${point.key}" />`;
    }).join('');

    return `<g class="dots">${dots}</g>`;
  }

  /**
   * Main render method
   */
  render(): string {
    const router = this.router;
    const palettes = router.getAllPalettes();

    if (palettes.length === 0) {
      return this.#createSVG(200, 100, '<text x="100" y="50" text-anchor="middle" font-family="monospace">No palettes defined</text>');
    }

    // Create table items from palettes
    const tableItems: TableItem[] = palettes.map(({ name }: { name: string }) => {
      const keys = router.getAllKeysForPalette(name);
      const colors: Record<string, string> = {};
      
      keys.forEach((key: string) => {
        const shortKey = key.split('.').slice(1).join('.');
        colors[shortKey] = router.resolve(key);
      });

      return createTableItemFromPalette(name, colors, this.#options);
    });

    // Create circular layout
    const table = tableView(tableItems, this.#options);

    // Extract connection points
    const connectionPoints = this.#extractConnectionPoints(table.tableItems, table.tableBoundingRect);

    // Find connections
    const connections = this.#findConnections(router, connectionPoints);

    // Generate SVG elements
    const connectionPaths = this.#generateConnectionPaths(connections);
    const dots = this.#generateDots(connectionPoints);
    const tables = table.tableItems.map((item) => 
      this.#createTableGroup(item, item.left!, item.top!)
    ).join('');

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
      </style>
    `;

    const content = styles + connectionPaths + `<g class="tables">${tables}</g>` + dots;

    return this.#createSVG(
      table.tableBoundingRect.w,
      table.tableBoundingRect.h,
      content
    );
  }
}
