import type { Room } from '../types';
import { calculateFloorLayout } from '../utils/tileLayout';
import type { TileRect } from '../utils/tileLayout';

interface Props {
  room: Room;
  effectiveWidth?: number;
  effectiveDepth?: number;
}

const PADDING_LEFT = 45;
const PADDING_RIGHT = 20;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 35;
const TILE_GAP = 0.8;

const FULL_TILE_FILL = '#d9e4e7';
const FULL_TILE_STROKE = '#73979c';
const CUT_TILE_FILL = '#fff3c9';
const CUT_TILE_STROKE = '#ffcc00';
const OBSTACLE_FILL = '#f0f4f4';
const OBSTACLE_STROKE = '#c3d3d5';
const SHOWER_BORDER_STROKE = '#0095b6';

function formatDim(n: number): string {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1);
}

export default function FloorElevation({ room, effectiveWidth, effectiveDepth }: Props) {
  const effW = effectiveWidth ?? room.width;
  const effD = effectiveDepth ?? room.depth;
  const result = calculateFloorLayout(room, effW, effD);
  if (!result) return null;

  const { layout, obstacles, tileStartX } = result;

  const svgWidth = 580;
  const availW = svgWidth - PADDING_LEFT - PADDING_RIGHT;
  const maxH = 400;
  const availH = maxH - PADDING_TOP - PADDING_BOTTOM;

  const scaleX = availW / effW;
  const scaleY = availH / effD;
  const scale = Math.min(scaleX, scaleY);

  const floorW = effW * scale;
  const floorH = effD * scale;
  const svgHeight = floorH + PADDING_TOP + PADDING_BOTTOM;

  const ox = PADDING_LEFT;
  const oy = PADDING_TOP;

  const renderTile = (t: TileRect, idx: number) => {
    if (t.isOverDoor) return null; // obstacle

    const tx = ox + t.x * scale + TILE_GAP;
    const ty = oy + t.y * scale + TILE_GAP;
    const tw = t.w * scale - TILE_GAP * 2;
    const th = t.h * scale - TILE_GAP * 2;

    if (tw < 1 || th < 1) return null;

    const isCut = t.isCutX || t.isCutY || t.hasObstacleCut;
    const fill = isCut ? CUT_TILE_FILL : FULL_TILE_FILL;
    const stroke = isCut ? CUT_TILE_STROKE : FULL_TILE_STROKE;

    const isEdgeCut = t.isCutX || t.isCutY;
    const showEdgeLabel = isEdgeCut && tw > 18 && th > 12;
    const showNotchLabel = t.hasObstacleCut && t.notchW > 0 && t.notchH > 0 && tw > 22 && th > 14;
    let label = '';
    if (showNotchLabel) {
      label = `${formatDim(t.notchW)}×${formatDim(t.notchH)}`;
    } else if (showEdgeLabel) {
      if (t.isCutX && t.isCutY) label = `${formatDim(t.w)}×${formatDim(t.h)}`;
      else if (t.isCutX) label = formatDim(t.w);
      else label = formatDim(t.h);
    }

    return (
      <g key={idx}>
        <rect
          x={tx} y={ty} width={tw} height={th}
          fill={fill} stroke={stroke} strokeWidth={0.7}
          rx={0.5}
        />
        {(showEdgeLabel || showNotchLabel) && (
          <text
            x={tx + tw / 2} y={ty + th / 2}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={Math.min(9, tw / 3, th / 2)} fill="#193137" fontWeight={600}
          >
            {label}
          </text>
        )}
      </g>
    );
  };

  return (
    <div>
      <svg width={svgWidth} height={svgHeight} style={{ background: '#f0f4f4', borderRadius: 12, display: 'block' }}>
        <defs>
          <marker id={`arR-floor-${room.id}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="#73979c" />
          </marker>
          <marker id={`arL-floor-${room.id}`} markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
            <path d="M6,0 L0,3 L6,6" fill="#73979c" />
          </marker>
        </defs>

        {/* Floor background */}
        <rect
          x={ox} y={oy} width={floorW} height={floorH}
          fill="#f9fafb" stroke="#193137" strokeWidth={1.5}
        />

        {/* Floor tiles */}
        {layout.tiles.map((t, i) => renderTile(t, i))}

        {/* Obstacle overlays (geberit footprints) */}
        {obstacles.map((obs, i) => {
          const rx = ox + obs.x * scale;
          const ry = oy + obs.y * scale;
          const rw = obs.w * scale;
          const rh = obs.h * scale;
          return (
            <g key={`obs-${i}`}>
              <rect
                x={rx} y={ry} width={rw} height={rh}
                fill={OBSTACLE_FILL} stroke={OBSTACLE_STROKE} strokeWidth={1.5}
                strokeDasharray="6,3"
              />
              <text
                x={rx + rw / 2} y={ry + rh / 2}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={9} fill="#73979c" fontWeight={600}
              >
                {obs.label}
              </text>
            </g>
          );
        })}

        {/* Shower cabin boundary overlay — for glass showers, floor tiles continue through */}
        {(room.showerCabins ?? []).filter(sc => !sc.prefabricated).map(sc => {
          let sx = 0, sy = 0;
          if (sc.corner === 'top-left') { sx = 0; sy = 0; }
          else if (sc.corner === 'top-right') { sx = effW - sc.width; sy = 0; }
          else if (sc.corner === 'bottom-left') { sx = 0; sy = effD - sc.depth; }
          else { sx = effW - sc.width; sy = effD - sc.depth; }
          const rx = ox + sx * scale;
          const ry = oy + sy * scale;
          const rw = sc.width * scale;
          const rh = sc.depth * scale;
          return (
            <g key={`shower-${sc.id}`}>
              <rect x={rx} y={ry} width={rw} height={rh}
                fill="#d9e4e7" fillOpacity={0.15}
                stroke={SHOWER_BORDER_STROKE} strokeWidth={2}
                strokeDasharray="6,3"
              />
              <text x={rx + rw / 2} y={ry + rh / 2}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={10} fill="#193137" fontWeight={600}>
                Sprcha
              </text>
            </g>
          );
        })}

        {/* Wall labels on edges */}
        {room.walls.map((wall, idx) => {
          let lx: number, ly: number;
          if (idx === 0) { lx = ox + floorW / 2; ly = oy - 8; }
          else if (idx === 1) { lx = ox + floorW + 10; ly = oy + floorH / 2; }
          else if (idx === 2) { lx = ox + floorW / 2; ly = oy + floorH + 12; }
          else { lx = ox - 10; ly = oy + floorH / 2; }
          return (
            <text key={wall.id} x={lx} y={ly}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={10} fill="#73979c" fontWeight={500}>
              {wall.label}
            </text>
          );
        })}

        {/* Dimension: width (bottom) */}
        <line
          x1={ox} y1={oy + floorH + 20} x2={ox + floorW} y2={oy + floorH + 20}
          stroke="#73979c" strokeWidth={1}
          markerStart={`url(#arL-floor-${room.id})`} markerEnd={`url(#arR-floor-${room.id})`}
        />
        <text x={ox + floorW / 2} y={oy + floorH + 32} textAnchor="middle" fontSize={11} fill="#193137" fontWeight={600}>
          {formatDim(effW)} cm
        </text>

        {/* Dimension: depth (left) */}
        <line x1={ox - 14} y1={oy} x2={ox - 14} y2={oy + floorH}
          stroke="#73979c" strokeWidth={1}
          markerStart={`url(#arL-floor-${room.id})`} markerEnd={`url(#arR-floor-${room.id})`}
        />
        <text x={ox - 22} y={oy + floorH / 2} textAnchor="middle" fontSize={11} fill="#193137" fontWeight={600}
          transform={`rotate(-90, ${ox - 22}, ${oy + floorH / 2})`}>
          {formatDim(effD)} cm
        </text>

        {/* Edge cut annotations — positioned at tiling area edges */}
        {layout.leftCut > 0 && (() => {
          const cutX = ox + tileStartX * scale;
          return (
            <>
              <line x1={cutX} y1={oy - 6} x2={cutX + layout.leftCut * scale} y2={oy - 6}
                stroke="#ffcc00" strokeWidth={1.5} />
              <text x={cutX + layout.leftCut * scale / 2} y={oy - 10}
                textAnchor="middle" fontSize={9} fill="#193137" fontWeight={600}>
                {formatDim(layout.leftCut)}
              </text>
            </>
          );
        })()}
        {layout.rightCut > 0 && (() => {
          const tileEndX = tileStartX + (layout.tiles.length > 0
            ? Math.max(...layout.tiles.map(t => t.x + t.w)) - tileStartX
            : effW - tileStartX);
          const cutX = ox + (tileEndX - layout.rightCut) * scale;
          return (
            <>
              <line x1={cutX} y1={oy - 6} x2={ox + tileEndX * scale} y2={oy - 6}
                stroke="#ffcc00" strokeWidth={1.5} />
              <text x={cutX + layout.rightCut * scale / 2} y={oy - 10}
                textAnchor="middle" fontSize={9} fill="#193137" fontWeight={600}>
                {formatDim(layout.rightCut)}
              </text>
            </>
          );
        })()}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8, fontSize: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 14, height: 14, background: FULL_TILE_FILL, border: `1px solid ${FULL_TILE_STROKE}`, borderRadius: 2 }} />
          Celé: <b>{layout.fullTiles}</b>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 14, height: 14, background: CUT_TILE_FILL, border: `1px solid ${CUT_TILE_STROKE}`, borderRadius: 2 }} />
          Řezané: <b>{layout.cutTiles}</b>
        </div>
        {layout.leftCut > 0 && (
          <div style={{ color: '#193137' }}>
            Okraj L/R: <b>{formatDim(layout.leftCut)} cm</b>
          </div>
        )}
        {layout.topCut > 0 && (
          <div style={{ color: '#193137' }}>
            Okraj nahoře/dole: <b>{formatDim(layout.topCut)} cm</b>
          </div>
        )}
        <div style={{ color: '#73979c' }}>
          Dlaždice: <b>{room.floorTileConfig?.name}</b>
        </div>
      </div>
    </div>
  );
}
