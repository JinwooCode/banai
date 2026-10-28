// A small front-view drawing (SVG) of a design's interior, for the landing page's template cards:
// the carcass, partitions, shelves, drawers and hanging rails, in the carcass colour. Drawn from
// the design only, so it always matches what the template opens. Illustrative, not to scale.
import { frameOf } from '../viewer/builders/frame.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const node = (tag, attrs) => {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, String(value)));
  return el;
};

const colourOf = (appearance, catalog) => (appearance.color.custom
  ? appearance.color.hex
  : catalog.colors.find((c) => c.id === appearance.color.catalogId)?.hex) ?? '#e8e2d8';

export function elevation(design, catalog) {
  const { width, height } = design.dimensions;
  const panel = design.carcass.panelThickness;
  const frame = frameOf(design);
  const fill = colourOf(design.carcass.appearance, catalog);
  // SVG y grows downwards; the design measures from the interior floor up.
  const y = (mm) => height - panel - mm;
  const svg = node('svg', { viewBox: `0 0 ${width} ${height}`, class: 'elevation', 'aria-hidden': 'true', preserveAspectRatio: 'xMidYMax meet' });
  svg.append(node('rect', { x: 0, y: 0, width, height, rx: 24, fill, class: 'elevation__carcass' }));
  svg.append(node('rect', { x: panel, y: panel, width: width - panel * 2, height: height - panel * 2, fill: '#000', opacity: 0.07 }));
  design.partitions.forEach((partition, i) => {
    const x = frame.ranges[i][1];
    svg.append(node('rect', { x, y: panel, width: partition.thickness, height: height - panel * 2, fill }));
  });
  design.compartments.forEach((compartment, i) => {
    const [x0, x1] = frame.ranges[i];
    compartment.shelves.forEach((shelf) => svg.append(node('rect', { x: x0, y: y(shelf.y + shelf.thickness), width: x1 - x0, height: shelf.thickness, fill })));
    compartment.drawers.forEach((drawer) => {
      svg.append(node('rect', { x: x0 + 12, y: y(drawer.y + drawer.height) + 8, width: x1 - x0 - 24, height: drawer.height - 16, rx: 10, fill, stroke: '#000', 'stroke-opacity': 0.18, 'stroke-width': 8 }));
      svg.append(node('rect', { x: (x0 + x1) / 2 - 60, y: y(drawer.y + drawer.height / 2) - 8, width: 120, height: 16, rx: 8, fill: '#3b3530', opacity: 0.6 }));
    });
    compartment.rails.forEach((rail) => svg.append(node('rect', { x: x0 + 20, y: y(rail.y) - 10, width: x1 - x0 - 40, height: 20, rx: 10, fill: '#9ea3a8' })));
  });
  return svg;
}
