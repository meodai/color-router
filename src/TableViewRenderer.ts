// TableView renderer for circular color palette layouts
// Adapted from paletter's tableView.mjs

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
  topPositions?: Record<string, { rectTop: number; textTop: number; height: number }>;
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
 * Calculate diagonal of a rectangle
 */
const diagonal = (rect: { w: number; h: number }): number => 
  Math.sqrt(Math.pow(rect.w, 2) + Math.pow(rect.h, 2));

/**
 * Arranges rectangles around a circle
 */
export const tableView = (
  sizes: TableItem[], 
  options: TableViewOptions = {}
): TableViewResult => {
  const {
    gap = 0,
    useMaxDiagonal = true,
    padding = 0.2,
  } = options;

  let tableItems = [...sizes];

  const maxHeight = Math.max(...tableItems.map((item) => item.h));
  const maxWidth = Math.max(...tableItems.map((item) => item.w));
  const maxSide = Math.max(maxHeight, maxWidth);

  let diagonalsTotal = 0;

  tableItems = tableItems.map((item) => {
    const { w, h } = item;
    const itemMaxSide = Math.max(w, h);
    const itemDiagonal = diagonal(
      useMaxDiagonal ? { w: itemMaxSide, h: itemMaxSide } : item
    );
    diagonalsTotal += itemDiagonal;
    item.diagonal = itemDiagonal;
    item.diagonalHalf = itemDiagonal / 2;

    return item;
  });

  const cumulatedGaps = gap * (tableItems.length - 1);
  const circumference = diagonalsTotal + cumulatedGaps;
  const diameter = Math.max(circumference / Math.PI, maxSide + gap * 2);

  const boundingW = diameter + maxWidth + gap * 2;
  const boundingH = diameter + maxHeight + gap * 2;
  const tableBoundingRect: TableBoundingRect = {
    w: boundingW + boundingW * padding,
    h: boundingH + boundingH * padding,
    r: diameter / 2,
    centerX: 0,
    centerY: 0,
  };

  tableBoundingRect.centerX = tableBoundingRect.w / 2;
  tableBoundingRect.centerY = tableBoundingRect.h / 2;

  // Calculate each diagonal's center in percent
  const centersPercent: number[] = [];

  tableItems.reduce((rem, item) => {
    const center = item.diagonalHalf!;
    const currentPercent = (rem + center) / (circumference - cumulatedGaps);
    centersPercent.push(currentPercent);
    return rem + item.diagonal!;
  }, 0);

  tableItems = tableItems.map((item, i) => {
    item.angle = (360 * centersPercent[i]) % 360;
    item.angleRadians = item.angle * (Math.PI / 180);

    item.cx = tableBoundingRect.centerX + (diameter / 2) * Math.cos(item.angleRadians);
    item.cy = tableBoundingRect.centerY + (diameter / 2) * Math.sin(item.angleRadians);

    const top = item.cy - item.h / 2;
    const bottom = item.cy + item.h / 2;
    const left = item.cx - item.w / 2;
    const right = item.cx + item.w / 2;

    item.top = top;
    item.left = left;
    item.bottom = bottom;
    item.right = right;

    return item;
  });

  return {
    tableItems,
    tableBoundingRect,
  };
};

/**
 * Create a table item from a palette
 */
export const createTableItemFromPalette = (
  title: string,
  colors: Record<string, string>,
  options: TableViewOptions = {}
): TableItem => {
  const {
    widthPerLetter = 7,
    fontSize = 10,
    lineHeight = 1.5,
    itemPadding = [10, 5],
  } = options;

  const allLabels = [title, ...Object.keys(colors)];
  const maxLabelLength = Math.max(...allLabels.map((label) => label.length));
  const heightPerItem = fontSize * lineHeight + itemPadding[1] * 2;
  const w = maxLabelLength * widthPerLetter + itemPadding[0] * 2;
  const h = allLabels.length * heightPerItem;

  const topPositions: Record<string, { rectTop: number; textTop: number; height: number }> = {};

  allLabels.forEach((label, i) => {
    const rectTop = i * heightPerItem;
    const textTop = rectTop + heightPerItem / 2 + fontSize / 2 - 1;
    topPositions[label] = {
      rectTop,
      textTop,
      height: heightPerItem,
    };
  });

  return {
    w,
    h,
    title,
    colors,
    topPositions,
  };
};
