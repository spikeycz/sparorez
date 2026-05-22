import type { Room, Wall } from '../types';

interface Props {
  room: Room;
  selectedWallId: string | null;
  onSelectWall: (wallId: string) => void;
}

const PADDING = 40;
const LABEL_OFFSET = 18;

export default function RoomFloorPlan({ room, selectedWallId, onSelectWall }: Props) {
  // Scale room to fit SVG viewport
  const svgWidth = 360;
  const svgHeight = 300;

  const scaleX = (svgWidth - PADDING * 2) / room.width;
  const scaleY = (svgHeight - PADDING * 2) / room.depth;
  const scale = Math.min(scaleX, scaleY);

  const roomW = room.width * scale;
  const roomD = room.depth * scale;

  const ox = (svgWidth - roomW) / 2;
  const oy = (svgHeight - roomD) / 2;

  const wallLines: { wall: Wall; x1: number; y1: number; x2: number; y2: number; labelX: number; labelY: number }[] = [
    {
      wall: room.walls[0], // top - wall A
      x1: ox, y1: oy, x2: ox + roomW, y2: oy,
      labelX: ox + roomW / 2, labelY: oy - LABEL_OFFSET,
    },
    {
      wall: room.walls[1], // right - wall B
      x1: ox + roomW, y1: oy, x2: ox + roomW, y2: oy + roomD,
      labelX: ox + roomW + LABEL_OFFSET, labelY: oy + roomD / 2,
    },
    {
      wall: room.walls[2], // bottom - wall C
      x1: ox + roomW, y1: oy + roomD, x2: ox, y2: oy + roomD,
      labelX: ox + roomW / 2, labelY: oy + roomD + LABEL_OFFSET + 4,
    },
    {
      wall: room.walls[3], // left - wall D
      x1: ox, y1: oy + roomD, x2: ox, y2: oy,
      labelX: ox - LABEL_OFFSET, labelY: oy + roomD / 2,
    },
  ];

  // Dimension labels
  const widthCm = room.width;
  const depthCm = room.depth;

  return (
    <svg width={svgWidth} height={svgHeight} style={{ background: '#f8fafc', borderRadius: 12 }}>
      {/* Floor area */}
      <defs>
        <clipPath id={`floor-clip-${room.id}`}>
          <rect x={ox} y={oy} width={roomW} height={roomD} />
        </clipPath>
      </defs>
      <rect
        x={ox}
        y={oy}
        width={roomW}
        height={roomD}
        fill={room.floorTileConfig ? room.floorTileConfig.color + '40' : '#f0f0f0'}
        stroke="none"
      />
      {/* Floor tile grid */}
      {room.floorTileConfig && (
        <g clipPath={`url(#floor-clip-${room.id})`}>
          {(() => {
            const tw = room.floorTileConfig!.width * scale;
            const th = room.floorTileConfig!.height * scale;
            const lines: React.JSX.Element[] = [];
            for (let x = tw; x < roomW; x += tw) {
              lines.push(
                <line key={`fv-${x}`} x1={ox + x} y1={oy} x2={ox + x} y2={oy + roomD}
                  stroke={room.floorTileConfig!.color} strokeWidth={0.5} opacity={0.5} />
              );
            }
            for (let y = th; y < roomD; y += th) {
              lines.push(
                <line key={`fh-${y}`} x1={ox} y1={oy + y} x2={ox + roomW} y2={oy + y}
                  stroke={room.floorTileConfig!.color} strokeWidth={0.5} opacity={0.5} />
              );
            }
            return lines;
          })()}
        </g>
      )}

      {/* Geberit boxes on floor plan */}
      {room.walls.map((wall, wallIdx) => {
        return wall.geberits.map(g => {
          const gScale = scale;
          const gw = g.width * gScale;
          const gd = g.depth * gScale;
          const gOffset = g.offsetFromLeft * gScale;

          let gx = 0, gy = 0;
          if (wallIdx === 0) { // top wall
            gx = ox + gOffset;
            gy = oy;
          } else if (wallIdx === 1) { // right wall
            gx = ox + roomW - gd;
            gy = oy + gOffset;
          } else if (wallIdx === 2) { // bottom wall
            gx = ox + roomW - gOffset - gw;
            gy = oy + roomD - gd;
          } else { // left wall
            gx = ox;
            gy = oy + roomD - gOffset - gw;
          }

          // For side walls, swap width/height representation
          const rectW = wallIdx === 1 || wallIdx === 3 ? gd : gw;
          const rectH = wallIdx === 1 || wallIdx === 3 ? gw : gd;

          return (
            <rect
              key={g.id}
              x={gx}
              y={gy}
              width={rectW}
              height={rectH}
              fill={g.tileConfig ? g.tileConfig.color + '80' : '#ccc'}
              stroke="#999"
              strokeWidth={1}
              strokeDasharray="3,2"
            />
          );
        });
      })}

      {/* Shower cabins on floor plan */}
      {(room.showerCabins ?? []).map(sc => {
        let sx = 0, sy = 0;
        if (sc.corner === 'top-left') { sx = ox; sy = oy; }
        else if (sc.corner === 'top-right') { sx = ox + roomW - sc.width * scale; sy = oy; }
        else if (sc.corner === 'bottom-left') { sx = ox; sy = oy + roomD - sc.depth * scale; }
        else { sx = ox + roomW - sc.width * scale; sy = oy + roomD - sc.depth * scale; }
        const sw = sc.width * scale;
        const sd = sc.depth * scale;

        return (
          <g key={`shower-${sc.id}`}>
            <rect
              x={sx} y={sy} width={sw} height={sd}
              fill="#e2e8f0" fillOpacity={0.4}
              stroke="#3b82f6" strokeWidth={1.5}
              strokeDasharray="5,3"
            />
            <text
              x={sx + sw / 2} y={sy + sd / 2}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={9} fill="#1e293b" fontWeight={600}
            >
              Sprcha
            </text>
          </g>
        );
      })}

      {/* Niche recesses on floor plan (extend beyond room boundary) */}
      {room.walls.map((wall, wallIdx) => {
        return (wall.niches ?? []).map(n => {
          if (n.offsetFromBottom > 0) return null; // only show floor-level niches on floor plan
          const nOffset = n.offsetFromLeft * scale;
          const nw = n.width * scale;
          const nd = n.depth * scale;

          let nx = 0, ny = 0, rw = 0, rh = 0;
          if (wallIdx === 0) { // top wall — niche extends upward
            nx = ox + nOffset; ny = oy - nd; rw = nw; rh = nd;
          } else if (wallIdx === 1) { // right wall — niche extends rightward
            nx = ox + roomW; ny = oy + nOffset; rw = nd; rh = nw;
          } else if (wallIdx === 2) { // bottom wall — niche extends downward
            nx = ox + roomW - nOffset - nw; ny = oy + roomD; rw = nw; rh = nd;
          } else { // left wall — niche extends leftward
            nx = ox - nd; ny = oy + roomD - nOffset - nw; rw = nd; rh = nw;
          }

          return (
            <g key={`niche-${n.id}`}>
              <rect
                x={nx} y={ny} width={rw} height={rh}
                fill="#eff6ff" fillOpacity={0.6}
                stroke="#3b82f6" strokeWidth={1.5}
                strokeDasharray="4,2"
              />
              {rw > 25 && rh > 12 && (
                <text
                  x={nx + rw / 2} y={ny + rh / 2}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={8} fill="#3b82f6" fontWeight={600}
                >
                  Výkl.
                </text>
              )}
            </g>
          );
        });
      })}

      {/* Door openings on floor plan */}
      {room.walls.map((wall, wallIdx) => {
        return wall.doors.map(d => {
          const dOffset = d.offsetFromLeft * scale;
          const dw = d.width * scale;
          const gap = 3; // visual gap thickness

          let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
          // Door arc params
          let arcCx = 0, arcCy = 0, arcR = dw;

          if (wallIdx === 0) { // top
            x1 = ox + dOffset; y1 = oy - gap;
            x2 = x1 + dw; y2 = oy + gap;
            arcCx = x1; arcCy = oy;
          } else if (wallIdx === 1) { // right
            x1 = ox + roomW - gap; y1 = oy + dOffset;
            x2 = ox + roomW + gap; y2 = y1 + dw;
            arcCx = ox + roomW; arcCy = y1;
          } else if (wallIdx === 2) { // bottom
            x1 = ox + roomW - dOffset - dw; y1 = oy + roomD - gap;
            x2 = x1 + dw; y2 = oy + roomD + gap;
            arcCx = x1 + dw; arcCy = oy + roomD;
          } else { // left
            x1 = ox - gap; y1 = oy + roomD - dOffset - dw;
            x2 = ox + gap; y2 = y1 + dw;
            arcCx = ox; arcCy = y1 + dw;
          }

          // Door swing arc
          let arcPath = '';
          if (wallIdx === 0) {
            arcPath = `M${arcCx},${arcCy} A${arcR},${arcR} 0 0,0 ${arcCx + dw},${arcCy}`;
          } else if (wallIdx === 1) {
            arcPath = `M${arcCx},${arcCy} A${arcR},${arcR} 0 0,0 ${arcCx},${arcCy + dw}`;
          } else if (wallIdx === 2) {
            arcPath = `M${arcCx},${arcCy} A${arcR},${arcR} 0 0,0 ${arcCx - dw},${arcCy}`;
          } else {
            arcPath = `M${arcCx},${arcCy} A${arcR},${arcR} 0 0,0 ${arcCx},${arcCy - dw}`;
          }

          return (
            <g key={d.id}>
              {/* Gap in wall */}
              <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1}
                fill="#f8fafc" />
              {/* Door swing arc */}
              <path d={arcPath} fill="none" stroke="#3b82f6" strokeWidth={1}
                strokeDasharray="3,2" opacity={0.6} />
            </g>
          );
        });
      })}

      {/* Walls */}
      {wallLines.map(({ wall, x1, y1, x2, y2, labelX, labelY }) => {
        const isSelected = selectedWallId === wall.id;
        const hasConfig = !!wall.tileConfig;
        const hasGeberit = wall.geberits.length > 0;

        return (
          <g key={wall.id}>
            {/* Clickable thick invisible line for easier click target */}
            <line
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="transparent"
              strokeWidth={16}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelectWall(wall.id)}
            />
            {/* Visible wall */}
            <line
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={isSelected ? '#3b82f6' : hasConfig ? '#64748b' : '#1e293b'}
              strokeWidth={isSelected ? 5 : hasConfig ? 4 : 3}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelectWall(wall.id)}
            />
            {/* Geberit indicators on walls */}
            {hasGeberit && (
              <circle
                cx={(x1 + x2) / 2}
                cy={(y1 + y2) / 2}
                r={5}
                fill="#f59e0b"
                stroke="#fff"
                strokeWidth={1.5}
              />
            )}
            {/* Wall label */}
            <text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={13}
              fontWeight={isSelected ? 700 : 500}
              fill={isSelected ? '#3b82f6' : '#1e293b'}
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => onSelectWall(wall.id)}
            >
              {wall.label}
            </text>
          </g>
        );
      })}

      {/* Dimension labels */}
      <text x={ox + roomW / 2} y={oy + roomD / 2 - 8} textAnchor="middle" fontSize={12} fill="#64748b">
        {widthCm} × {depthCm} cm
      </text>
      <text x={ox + roomW / 2} y={oy + roomD / 2 + 8} textAnchor="middle" fontSize={11} fill="#64748b">
        h = {room.height} cm
      </text>
    </svg>
  );
}
