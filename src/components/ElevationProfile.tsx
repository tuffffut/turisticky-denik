import React, { useState } from 'react';
import { ElevationPoint } from '../types';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Mountain } from 'lucide-react';

interface ElevationProfileProps {
  profile: ElevationPoint[];
  highestPointM: number;
  lowestPointM: number;
  totalDistanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
}

export const ElevationProfile: React.FC<ElevationProfileProps> = ({
  profile,
  highestPointM,
  lowestPointM,
  totalDistanceKm,
  elevationGainM,
  elevationLossM,
}) => {
  const [hoverPoint, setHoverPoint] = useState<ElevationPoint | null>(null);

  if (!profile || profile.length < 2) {
    return (
      <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-4 text-center text-stone-400 text-sm">
        Pro tuto trasu není k dispozici podrobný výškový profil.
      </div>
    );
  }

  const width = 800;
  const height = 220;
  const padding = { top: 25, right: 30, bottom: 35, left: 55 };

  const minEle = Math.max(0, lowestPointM - 50);
  const maxEle = highestPointM + 50;
  const eleRange = maxEle - minEle || 1;

  const maxDist = totalDistanceKm || profile[profile.length - 1].distKm || 1;

  const getX = (dist: number) => padding.left + (dist / maxDist) * (width - padding.left - padding.right);
  const getY = (ele: number) => height - padding.bottom - ((ele - minEle) / eleRange) * (height - padding.top - padding.bottom);

  // Build SVG path
  const points = profile.map((p) => `${getX(p.distKm)},${getY(p.eleM)}`).join(' ');
  const areaPath = `${points} L${getX(profile[profile.length - 1].distKm)},${height - padding.bottom} L${getX(profile[0].distKm)},${height - padding.bottom} Z`;

  // Grid lines
  const eleTicks = [minEle, Math.round(minEle + eleRange * 0.33), Math.round(minEle + eleRange * 0.66), maxEle];
  const distTicks = [0, Math.round(maxDist * 0.25 * 10) / 10, Math.round(maxDist * 0.5 * 10) / 10, Math.round(maxDist * 0.75 * 10) / 10, Math.round(maxDist * 10) / 10];

  return (
    <div className="bg-stone-900/90 border border-stone-800/80 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <Mountain className="w-5 h-5 text-emerald-400" />
          <h4 className="font-semibold text-stone-100 text-base">Výškový profil trasy</h4>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-800/40">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+{elevationGainM} m stoupání</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-800/40">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>-{elevationLossM} m klesání</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-stone-300 bg-stone-800/50 px-2.5 py-1 rounded-md">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>Max: {highestPointM} m / Min: {lowestPointM} m</span>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          onMouseLeave={() => setHoverPoint(null)}
        >
          <defs>
            <linearGradient id="eleGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#059669" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {eleTicks.map((tick, i) => (
            <g key={`y-${i}`}>
              <line
                x1={padding.left}
                y1={getY(tick)}
                x2={width - padding.right}
                y2={getY(tick)}
                stroke="#44403c"
                strokeDasharray="3,3"
                strokeWidth="0.8"
                opacity="0.6"
              />
              <text
                x={padding.left - 8}
                y={getY(tick) + 4}
                textAnchor="end"
                className="text-[10px] fill-stone-400 font-mono"
              >
                {tick} m
              </text>
            </g>
          ))}

          {/* Vertical Grid lines / Distances */}
          {distTicks.map((d, i) => (
            <g key={`x-${i}`}>
              <line
                x1={getX(d)}
                y1={padding.top}
                x2={getX(d)}
                y2={height - padding.bottom}
                stroke="#44403c"
                strokeDasharray="2,2"
                strokeWidth="0.6"
                opacity="0.4"
              />
              <text
                x={getX(d)}
                y={height - padding.bottom + 16}
                textAnchor="middle"
                className="text-[10px] fill-stone-400 font-mono"
              >
                {d} km
              </text>
            </g>
          ))}

          {/* Area fill */}
          <path d={areaPath} fill="url(#eleGradient)" />

          {/* Line stroke */}
          <polyline
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* Interactive invisible hover points */}
          {profile.map((p, idx) => {
            const cx = getX(p.distKm);
            const cy = getY(p.eleM);
            return (
              <circle
                key={idx}
                cx={cx}
                cy={cy}
                r="6"
                className="opacity-0 hover:opacity-100 fill-emerald-400 stroke-white stroke-2 cursor-pointer transition-opacity"
                onMouseEnter={() => setHoverPoint(p)}
              />
            );
          })}

          {/* Active Hover Marker */}
          {hoverPoint && (
            <g>
              <line
                x1={getX(hoverPoint.distKm)}
                y1={padding.top}
                x2={getX(hoverPoint.distKm)}
                y2={height - padding.bottom}
                stroke="#34d399"
                strokeWidth="1.5"
              />
              <circle
                cx={getX(hoverPoint.distKm)}
                cy={getY(hoverPoint.eleM)}
                r="5"
                className="fill-emerald-400 stroke-white stroke-2"
              />
            </g>
          )}
        </svg>

        {/* Hover Tooltip display */}
        {hoverPoint && (
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none bg-stone-950/95 border border-emerald-500/50 text-stone-100 px-3 py-1.5 rounded-lg text-xs flex items-center gap-3 shadow-lg"
          >
            <span className="font-semibold text-emerald-400">{hoverPoint.eleM} m n. m.</span>
            <span className="text-stone-400">Vzdálenost: <strong className="text-white">{hoverPoint.distKm} km</strong></span>
          </div>
        )}
      </div>
    </div>
  );
};
