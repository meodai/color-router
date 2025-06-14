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
  isPaletteNode?: boolean; // Added to identify palette nodes
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
      if (!tableItem.title || !tableItem.colors || !tableItem.topPositions || !tableItem.topPositions[tableItem.title]) return;

      // Create connection points for individual colors in the palette table
      Object.keys(tableItem.colors).forEach((colorKey) => {
        const fullKey = `${tableItem.title}.${colorKey}`;
        const position = tableItem.topPositions![colorKey];
        const isColorRowOnLeftHalfOfDiagram = tableItem.left! < tableBoundingRect.centerX; // This refers to the table's position
        const pointX = isColorRowOnLeftHalfOfDiagram ? tableItem.left! + tableItem.w : tableItem.left!;
        const pointY = position.rectTop + position.height / 2 + tableItem.top!;

        allConnectionPoints[fullKey] = {
          key: fullKey,
          x: pointX,
          y: pointY,
          isLeft: isColorRowOnLeftHalfOfDiagram, // Curve direction based on table's half
          color: tableItem.colors![colorKey] || '#000000',
          colorName: colorKey,
          isPaletteNode: false,
        };
      });

      // Create a connection point for the palette itself, on its header edge
      const paletteKey = `palette:${tableItem.title}`;
      const headerPosition = tableItem.topPositions[tableItem.title];
      // Determine if the table (and thus its header) is on the left or right half of the diagram center.
      // This is crucial for the 'isLeft' property which dictates connection curve direction.
      const isPaletteTableOnLeftHalfOfDiagram = tableItem.left! + tableItem.w / 2 < tableBoundingRect.centerX;
      
      // The dot is placed on the exact edge of the header, like individual color dots.
      const paletteNodeX = isPaletteTableOnLeftHalfOfDiagram ? tableItem.left! + tableItem.w : tableItem.left!;
      const paletteNodeY = tableItem.top! + headerPosition.rectTop + headerPosition.height / 2;

      allConnectionPoints[paletteKey] = {
        key: paletteKey,
        x: paletteNodeX, // Dot is centered on the header edge line
        y: paletteNodeY, 
        isLeft: isPaletteTableOnLeftHalfOfDiagram, // Curve direction based on table's half
        color: '#888888', // Distinct color for palette node dots/lines (can be same as header bg or contrasting)
        colorName: tableItem.title,
        isPaletteNode: true, 
      };
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
      // Skip trying to find dependencies *from* a palette node itself directly in this loop
      // Connections *to* palette nodes are handled when processing color keys.
      if (connectionPoints[key].isPaletteNode) return;

      const visualDependencies = router.getVisualDependencies(key); // Use getVisualDependencies
      const fromPoint = connectionPoints[key];

      if (fromPoint) {
        visualDependencies.forEach((depKey) => {
          const toPoint = connectionPoints[depKey];
          if (toPoint) {
            const connectionId = `${key}->${depKey}`;
            // No need to check reverse for visual graph, as it's directed
            
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

      // Background path is always solid
      return `<path d="${path}" stroke="#000" stroke-width="${strokeWidth + 1}" fill="none" stroke-dasharray="none" />`;
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

      const fromDefType = this.#router.getDefinitionType(from.key);
      const strokeDasharray = fromDefType === 'function' ? '5,5' : 'none';

      return `<path d="${path}" stroke="${from.color}" stroke-width="${strokeWidth}" fill="none" data-color="${from.color}" stroke-dasharray="${strokeDasharray}" />`;
    }).join('');

    return `
      <g class="connections-bg">${backgroundPaths}</g>
      <g class="connections">${colorPaths}</g>
    `;
  }
  
  #generateDots(connectionPoints: Record<string, ConnectionPoint>): string {
    const { dotRadius = 5 } = this.#options;

    const dots = Object.values(connectionPoints).map((point) => {
      if (point.isPaletteNode) {
        // For palette nodes, draw a rotated square (diamond shape)
        const sideLength = dotRadius * 1.6; 
        const xCoord = point.x - sideLength / 2;
        const yCoord = point.y - sideLength / 2;
        // Rotation is around the center of the square (point.x, point.y)
        return `<rect x="${xCoord}" y="${yCoord}" width="${sideLength}" height="${sideLength}" 
          fill="#000000" stroke="#333333" stroke-width="1" 
          data-key="${point.key}" transform="rotate(45 ${point.x} ${point.y})" />`;
      } else {
        // For individual color nodes, draw a circle
        const radius = dotRadius;
        const fillColor = point.color;
        const strokeColor = 'black';
        return `<circle cx="${point.x}" cy="${point.y}" r="${radius}" 
          fill="${fillColor}" stroke="${strokeColor}" stroke-width="1" 
          data-color="${point.color}" data-key="${point.key}" />`;
      }
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
        .dots rect:hover {
          stroke-width: 2;
          /* Optional: slightly increase size or change stroke color on hover for squares */
        }
        /* Style for palette node text */
        .dots text {
          font-family: monospace;
          pointer-events: none; /* So text doesn't interfere with circle hover/click */
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
