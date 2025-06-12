export interface TableItem {
    w: number;
    h: number;
    diagonal?: number;
    diagonalHalf?: number;
    angle?: number;
    angleRadians?: number;
    cx?: number;
    cy?: number;
    top?: number;
    left?: number;
    bottom?: number;
    right?: number;
    title?: string;
    colors?: Record<string, string>;
    topPositions?: Record<string, {
        rectTop: number;
        textTop: number;
        height: number;
    }>;
}
export interface TableBoundingRect {
    w: number;
    h: number;
    r: number;
    centerX: number;
    centerY: number;
}
export interface TableViewResult {
    tableItems: TableItem[];
    tableBoundingRect: TableBoundingRect;
}
export interface TableViewOptions {
    gap?: number;
    useMaxDiagonal?: boolean;
    padding?: number;
    widthPerLetter?: number;
    fontSize?: number;
    lineHeight?: number;
    itemPadding?: [number, number];
}
/**
 * Arranges rectangles around a circle
 */
export declare const tableView: (sizes: TableItem[], options?: TableViewOptions) => TableViewResult;
/**
 * Create a table item from a palette
 */
export declare const createTableItemFromPalette: (title: string, colors: Record<string, string>, options?: TableViewOptions) => TableItem;
//# sourceMappingURL=TableViewRenderer.d.ts.map