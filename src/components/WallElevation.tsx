import type { Wall } from '../types';
import { calculateTileLayout } from '../utils/tileLayout';
import type { TileRect, CornerObstacle } from '../utils/tileLayout';

interface Props {
  wall: Wall;
  effectiveWidth?: number;
  effectiveHeight?: number;
  cornerObstacles?: CornerObstacle[];
}

const PADDING_LEFT = 45;
const PADDING_RIGHT = 20;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 35;
const TILE_GAP = 0.8; // visual gap between tiles in px

// Colors — SIKO brand palette
const FULL_TILE_FILL = '#d9e4e7';
const FULL_TILE_STROKE = '#73979c';
const CUT_TILE_FILL = '#fff3c9';
const CUT_TILE_STROKE = '#ffcc00';
const DOOR_FILL = '#f0f4f4';
const DOOR_STROKE = '#0095b6';
const GEBERIT_STROKE = '#ffcc00';
const GEBERIT_TILE_FULL_FILL = '#c3d3d5';
const GEBERIT_TILE_FULL_STROKE = '#73979c';
const GEBERIT_TILE_CUT_FILL = '#fff3c9';
const GEBERIT_TILE_CUT_STROKE = '#ffcc00';
const NICHE_FILL = '#e8f4f8';
const NICHE_STROKE = '#0095b6';

function formatDim(n: number): string {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1);
}

export default function WallElevation({ wall, effectiveWidth, effectiveHeight, cornerObstacles }: Props) {
  const effW = effectiveWidth ?? wall.width;
  const effH = effectiveHeight ?? wall.height;
  const layout = calculateTileLayout(wall, effW, effH, cornerObstacles);

  const svgWidth = 580;
  const availW = svgWidth - PADDING_LEFT - PADDING_RIGHT;
  const maxH = 400;
  const availH = maxH - PADDING_TOP - PADDING_BOTTOM;

  const scaleX = availW / effW;
  const scaleY = availH / effH;
  const scale = Math.min(scaleX, scaleY);

  const wallW = effW * scale;
  const wallH = effH * scale;
  const svgHeight = wallH + PADDING_TOP + PADDING_BOTTOM;

  const ox = PADDING_LEFT;
  const oy = PADDING_TOP;

  // Helper to render a single wall tile
  const renderTile = (t: TileRect, idx: number) => {
    if (t.isOverDoor || t.isOverGeberit) return null;

    const tx = ox + t.x * scale + TILE_GAP;
    const ty = oy + t.y * scale + TILE_GAP;
    const tw = t.w * scale - TILE_GAP * 2;
    const th = t.h * scale - TILE_GAP * 2;

    if (tw < 1 || th < 1) return null;

    const isCut = t.isCutX || t.isCutY || t.hasObstacleCut;
    const fill = isCut ? CUT_TILE_FILL : FULL_TILE_FILL;
    const stroke = isCut ? CUT_TILE_STROKE : FULL_TILE_STROKE;

    // Show dimension label on cut tiles
    const isEdgeCut = t.isCutX || t.isCutY;
    const showEdgeLabel = isEdgeCut && tw > 18 && th > 12;
    const showNotchLabel = t.hasObstacleCut && t.notchW > 0 && t.notchH > 0 && tw > 22 && th > 14;
    let label = '';
    if (showNotchLabel) {
      label = `${formatDim(t.notchW)}×${formatDim(t.notchH)}`;
    } else if (showEdgeLabel) {
      if (t.isCutX && t.isCutY) {
        label = `${formatDim(t.w)}×${formatDim(t.h)}`;
      } else if (t.isCutX) {
        label = formatDim(t.w);
      } else {
        label = formatDim(t.h);
      }
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
          <marker id={`arR-${wall.id}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="#73979c" />
          </marker>
          <marker id={`arL-${wall.id}`} markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
            <path d="M6,0 L0,3 L6,6" fill="#73979c" />
          </marker>
        </defs>

        {/* Wall background */}
        <rect
          x={ox} y={oy} width={wallW} height={wallH}
          fill="#f9fafb" stroke="#193137" strokeWidth={1.5}
        />

        {/* Wall tiles */}
        {layout && layout.tiles.map((t, i) => renderTile(t, i))}

        {/* Geberit background (covers wall tiles behind geberit) */}
        {wall.geberits.map(g => {
          const gx = ox + g.offsetFromLeft * scale;
          const gy = oy + (effH - g.height) * scale;
          const gw = g.width * scale;
          const gh = g.height * scale;
          return (
            <rect key={`geb-bg-${g.id}`}
              x={gx} y={gy} width={gw} height={gh}
              fill="#f9fafb"
            />
          );
        })}

        {/* Geberit face tiles */}
        {layout && layout.geberitLayouts.map(gl =>
          gl.tiles.map((t, i) => {
            const tx = ox + t.x * scale + TILE_GAP;
            const ty = oy + t.y * scale + TILE_GAP;
            const tw = t.w * scale - TILE_GAP * 2;
            const th = t.h * scale - TILE_GAP * 2;
            if (tw < 1 || th < 1) return null;
            const isCut = t.isCutX || t.isCutY;
            const fill = isCut ? GEBERIT_TILE_CUT_FILL : GEBERIT_TILE_FULL_FILL;
            const stroke = isCut ? GEBERIT_TILE_CUT_STROKE : GEBERIT_TILE_FULL_STROKE;
            const showLabel = isCut && tw > 18 && th > 12;
            let label = '';
            if (showLabel) {
              if (t.isCutX && t.isCutY) label = `${formatDim(t.w)}×${formatDim(t.h)}`;
              else if (t.isCutX) label = formatDim(t.w);
              else label = formatDim(t.h);
            }
            return (
              <g key={`geb-tile-${gl.geberitId}-${i}`}>
                <rect x={tx} y={ty} width={tw} height={th}
                  fill={fill} stroke={stroke} strokeWidth={0.7} rx={0.5} />
                {showLabel && (
                  <text x={tx + tw / 2} y={ty + th / 2}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={Math.min(9, tw / 3, th / 2)} fill="#193137" fontWeight={600}>
                    {label}
                  </text>
                )}
              </g>
            );
          })
        )}

        {/* Geberit dashed border */}
        {wall.geberits.map(g => {
          const gx = ox + g.offsetFromLeft * scale;
          const gy = oy + (effH - g.height) * scale;
          const gw = g.width * scale;
          const gh = g.height * scale;
          const hasOwnTiles = layout?.geberitLayouts.some(gl => gl.geberitId === g.id);

          return (
            <g key={`geb-${g.id}`}>
              <rect
                x={gx} y={gy} width={gw} height={gh}
                fill="none"
                stroke={GEBERIT_STROKE} strokeWidth={2}
                strokeDasharray="6,3"
              />
              {!hasOwnTiles && (
                <>
                  <text
                    x={gx + gw / 2} y={gy + Math.min(gh / 2, 20)}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={10} fill="#193137" fontWeight={700}
                  >
                    Geberit
                  </text>
                  <text
                    x={gx + gw / 2} y={gy + Math.min(gh / 2, 20) + 13}
                    textAnchor="middle" fontSize={9} fill="#193137"
                  >
                    {g.width}×{g.height} cm
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* Corner geberit projections */}
        {(cornerObstacles ?? []).map((co, i) => {
          const cx = ox + co.x * scale;
          const cy = oy + co.y * scale;
          const cw = co.w * scale;
          const ch = co.h * scale;
          return (
            <g key={`corner-obs-${i}`}>
              <rect x={cx} y={cy} width={cw} height={ch}
                fill="#f0f4f4" stroke="#73979c" strokeWidth={1.5}
                strokeDasharray="6,3" />
              {cw > 20 && ch > 20 && (
                <text x={cx + cw / 2} y={cy + ch / 2}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={9} fill="#73979c" fontWeight={600}>
                  Geberit
                </text>
              )}
            </g>
          );
        })}

        {/* Door overlay */}
        {wall.doors.map(d => {
          const dx = ox + d.offsetFromLeft * scale;
          const dy = oy + (effH - d.height) * scale;
          const dw = d.width * scale;
          const dh = d.height * scale;

          return (
            <g key={`door-${d.id}`}>
              <rect
                x={dx} y={dy} width={dw} height={dh}
                fill={DOOR_FILL} stroke={DOOR_STROKE} strokeWidth={2}
              />
              <path
                d={`M${dx},${dy + dh} A${dw * 0.7},${dw * 0.7} 0 0,1 ${dx + dw},${dy + dh}`}
                fill="none" stroke={DOOR_STROKE} strokeWidth={1} strokeDasharray="4,3" opacity={0.4}
              />
              <text
                x={dx + dw / 2} y={dy + dh / 2 - 6}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={11} fill="#0095b6" fontWeight={700}
              >
                Dveře
              </text>
              <text
                x={dx + dw / 2} y={dy + dh / 2 + 8}
                textAnchor="middle" fontSize={9} fill="#0095b6"
              >
                {d.width}×{d.height} cm
              </text>
            </g>
          );
        })}

        {/* Niche overlay */}
        {(wall.niches ?? []).map(n => {
          const nx = ox + n.offsetFromLeft * scale;
          const ny = oy + (effH - n.offsetFromBottom - n.height) * scale;
          const nw = n.width * scale;
          const nh = n.height * scale;

          return (
            <g key={`niche-${n.id}`}>
              <rect
                x={nx} y={ny} width={nw} height={nh}
                fill={NICHE_FILL} stroke={NICHE_STROKE} strokeWidth={2}
                strokeDasharray="6,3"
              />
              <text
                x={nx + nw / 2} y={ny + nh / 2 - 6}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={10} fill={NICHE_STROKE} fontWeight={700}
              >
                Výklenek
              </text>
              <text
                x={nx + nw / 2} y={ny + nh / 2 + 8}
                textAnchor="middle" fontSize={9} fill={NICHE_STROKE}
              >
                {n.width}×{n.height}×{n.depth} cm
              </text>
            </g>
          );
        })}

        {/* Dimension: width (bottom) */}
        <line
          x1={ox} y1={oy + wallH + 14} x2={ox + wallW} y2={oy + wallH + 14}
          stroke="#73979c" strokeWidth={1}
          markerStart={`url(#arL-${wall.id})`} markerEnd={`url(#arR-${wall.id})`}
        />
        <text x={ox + wallW / 2} y={oy + wallH + 27} textAnchor="middle" fontSize={11} fill="#193137" fontWeight={600}>
          {formatDim(effW)} cm
        </text>

        {/* Dimension: height (left) */}
        <line x1={ox - 14} y1={oy} x2={ox - 14} y2={oy + wallH}
          stroke="#73979c" strokeWidth={1}
          markerStart={`url(#arL-${wall.id})`} markerEnd={`url(#arR-${wall.id})`}
        />
        <text x={ox - 22} y={oy + wallH / 2} textAnchor="middle" fontSize={11} fill="#193137" fontWeight={600}
          transform={`rotate(-90, ${ox - 22}, ${oy + wallH / 2})`}>
          {formatDim(effH)} cm
        </text>

        {/* Edge cut dimension annotations */}
        {layout && layout.leftCut > 0 && (
          <>
            <line x1={ox} y1={oy - 6} x2={ox + layout.leftCut * scale} y2={oy - 6}
              stroke="#ffcc00" strokeWidth={1.5} />
            <text x={ox + layout.leftCut * scale / 2} y={oy - 10}
              textAnchor="middle" fontSize={9} fill="#193137" fontWeight={600}>
              {formatDim(layout.leftCut)}
            </text>
          </>
        )}
        {layout && layout.rightCut > 0 && (
          <>
            <line x1={ox + wallW - layout.rightCut * scale} y1={oy - 6} x2={ox + wallW} y2={oy - 6}
              stroke="#ffcc00" strokeWidth={1.5} />
            <text x={ox + wallW - layout.rightCut * scale / 2} y={oy - 10}
              textAnchor="middle" fontSize={9} fill="#193137" fontWeight={600}>
              {formatDim(layout.rightCut)}
            </text>
          </>
        )}
      </svg>

      {/* Legend & stats below SVG */}
      {layout && (
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
            Dlaždice: <b>{wall.tileConfig?.name}</b>
          </div>
          {layout.geberitLayouts.map(gl => (
            <div key={gl.geberitId} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 14, height: 14, background: GEBERIT_TILE_FULL_FILL, border: `1px solid ${GEBERIT_TILE_FULL_STROKE}`, borderRadius: 2 }} />
              Geberit: <b>{gl.fullTiles}</b> celé, <b>{gl.cutTiles}</b> řezané
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
