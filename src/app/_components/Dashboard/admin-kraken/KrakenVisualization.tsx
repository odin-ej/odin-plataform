"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KrakenVisualizationProps {
  agents: Array<{
    id: string;
    displayName: string;
    color: string | null;
    isActive: boolean;
  }>;
  activeAgent: string | null;
  stats: {
    requestsToday: number;
    costToday: number;
  };
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

const VIEW_SIZE = 500;
const CENTER = VIEW_SIZE / 2;
const BODY_RADIUS = 48;
const ORBIT_RADIUS = 190;
const NODE_RADIUS = 28;

/** Return x,y on the orbit circle for index `i` out of `total` items. */
function orbitPoint(i: number, total: number) {
  const angle = (2 * Math.PI * i) / total - Math.PI / 2; // start from top
  return {
    x: CENTER + ORBIT_RADIUS * Math.cos(angle),
    y: CENTER + ORBIT_RADIUS * Math.sin(angle),
  };
}

/**
 * Build a cubic bezier tentacle path from the centre body edge to the agent
 * node edge. The control points are offset perpendicular to the straight line
 * so the tentacle curves organically.
 */
function tentaclePath(i: number, total: number) {
  const target = orbitPoint(i, total);
  const dx = target.x - CENTER;
  const dy = target.y - CENTER;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / dist;
  const ny = dy / dist;

  // Start on body edge, end on node edge
  const sx = CENTER + nx * BODY_RADIUS;
  const sy = CENTER + ny * BODY_RADIUS;
  const ex = target.x - nx * NODE_RADIUS;
  const ey = target.y - ny * NODE_RADIUS;

  // Perpendicular unit vector
  const px = -ny;
  const py = nx;

  // Alternating curve direction per tentacle
  const sign = i % 2 === 0 ? 1 : -1;
  const bulge = 30 + (i % 3) * 10;

  const midX = (sx + ex) / 2;
  const midY = (sy + ey) / 2;

  const c1x = sx + nx * (dist * 0.25) + px * bulge * sign;
  const c1y = sy + ny * (dist * 0.25) + py * bulge * sign;
  const c2x = midX + nx * (dist * 0.15) - px * bulge * sign * 0.5;
  const c2y = midY + ny * (dist * 0.15) - py * bulge * sign * 0.5;

  return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Tentacle({
  index,
  total,
  isRouting,
  color,
}: {
  index: number;
  total: number;
  isRouting: boolean;
  color: string;
}) {
  const d = useMemo(() => tentaclePath(index, total), [index, total]);

  return (
    <motion.path
      d={d}
      fill="none"
      stroke={isRouting ? color : "var(--kraken-tentacle)"}
      strokeWidth={isRouting ? 3 : 2}
      strokeLinecap="round"
      opacity={isRouting ? 1 : 0.5}
      // Gentle undulation via dashOffset animation
      strokeDasharray="6 4"
      animate={{
        strokeDashoffset: [0, -20],
        opacity: isRouting ? [0.8, 1, 0.8] : [0.35, 0.55, 0.35],
      }}
      transition={{
        strokeDashoffset: {
          duration: 2 + (index % 3) * 0.4,
          repeat: Infinity,
          ease: "linear",
        },
        opacity: {
          duration: 3 + (index % 2),
          repeat: Infinity,
          ease: "easeInOut",
        },
      }}
      filter={isRouting ? "url(#glow)" : undefined}
    />
  );
}

function AgentNode({
  agent,
  index,
  total,
  isRouting,
}: {
  agent: KrakenVisualizationProps["agents"][number];
  index: number;
  total: number;
  isRouting: boolean;
}) {
  const { x, y } = useMemo(() => orbitPoint(index, total), [index, total]);
  const color = agent.color ?? "#8b5cf6";

  return (
    <motion.g
      animate={
        isRouting
          ? { scale: [1, 1.18, 1], transition: { duration: 0.6, repeat: 2 } }
          : agent.isActive
            ? {
                scale: [1, 1.04, 1],
                transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
              }
            : { scale: 1 }
      }
      style={{ originX: `${x}px`, originY: `${y}px` }}
    >
      {/* Outer ring */}
      <circle
        cx={x}
        cy={y}
        r={NODE_RADIUS}
        fill="var(--kraken-node-bg)"
        stroke={color}
        strokeWidth={2}
      />

      {/* Inner colored circle */}
      <circle cx={x} cy={y} r={16} fill={color} opacity={0.85} />

      {/* Agent initial */}
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={13}
        fontWeight={600}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {agent.displayName.charAt(0).toUpperCase()}
      </text>

      {/* Display name below node */}
      <text
        x={x}
        y={y + NODE_RADIUS + 14}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--kraken-label)"
        fontSize={10}
        fontWeight={500}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {agent.displayName}
      </text>

      {/* Status dot */}
      <circle
        cx={x + NODE_RADIUS * 0.65}
        cy={y - NODE_RADIUS * 0.65}
        r={5}
        fill={agent.isActive ? "#22c55e" : "#ef4444"}
        stroke="var(--kraken-node-bg)"
        strokeWidth={1.5}
      />
    </motion.g>
  );
}

function OctopusBody() {
  return (
    <motion.g
      animate={{ scale: [1, 1.03, 1] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      style={{ originX: `${CENTER}px`, originY: `${CENTER}px` }}
    >
      {/* Body glow */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={BODY_RADIUS + 8}
        fill="var(--kraken-body-glow)"
      />
      {/* Main body */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={BODY_RADIUS}
        fill="var(--kraken-body)"
        stroke="var(--kraken-body-stroke)"
        strokeWidth={2}
      />
      {/* Eyes */}
      <circle cx={CENTER - 14} cy={CENTER - 6} r={6} fill="white" opacity={0.9} />
      <circle cx={CENTER + 14} cy={CENTER - 6} r={6} fill="white" opacity={0.9} />
      <motion.circle
        cx={CENTER - 14}
        cy={CENTER - 6}
        r={3}
        fill="#1e1b4b"
        animate={{ cy: [CENTER - 7, CENTER - 5, CENTER - 7] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx={CENTER + 14}
        cy={CENTER - 6}
        r={3}
        fill="#1e1b4b"
        animate={{ cy: [CENTER - 7, CENTER - 5, CENTER - 7] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Mouth */}
      <path
        d={`M ${CENTER - 8} ${CENTER + 12} Q ${CENTER} ${CENTER + 18}, ${CENTER + 8} ${CENTER + 12}`}
        fill="none"
        stroke="#c4b5fd"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Label */}
      <text
        x={CENTER}
        y={CENTER + BODY_RADIUS + 18}
        textAnchor="middle"
        fill="var(--kraken-label)"
        fontSize={12}
        fontWeight={700}
        letterSpacing={1}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        KRAKEN
      </text>
    </motion.g>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function KrakenVisualization({
  agents,
  activeAgent,
  stats,
}: KrakenVisualizationProps) {
  const total = agents.length || 1;

  return (
    <div
      className="flex flex-col items-center gap-4"
      style={
        {
          "--kraken-body": "#581c87",
          "--kraken-body-stroke": "#7c3aed",
          "--kraken-body-glow": "rgba(139,92,246,0.18)",
          "--kraken-tentacle": "#7c3aed",
          "--kraken-node-bg": "hsl(var(--card))",
          "--kraken-label": "hsl(var(--muted-foreground))",
        } as React.CSSProperties
      }
    >
      {/* Visualization */}
      <div className="w-full max-w-[500px] aspect-square">
        <svg
          viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
          className="w-full h-full"
          aria-label="Kraken AI Agent Network Visualization"
        >
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Tentacles (render below nodes) */}
          {agents.map((agent, i) => (
            <Tentacle
              key={`t-${agent.id}`}
              index={i}
              total={total}
              isRouting={activeAgent === agent.id}
              color={agent.color ?? "#8b5cf6"}
            />
          ))}

          {/* Central octopus */}
          <OctopusBody />

          {/* Agent nodes */}
          <AnimatePresence>
            {agents.map((agent, i) => (
              <AgentNode
                key={agent.id}
                agent={agent}
                index={i}
                total={total}
                isRouting={activeAgent === agent.id}
              />
            ))}
          </AnimatePresence>
        </svg>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-[500px]">
        <Card className="py-3">
          <CardContent className="flex flex-col items-center gap-1 px-4 py-0">
            <span className="text-muted-foreground text-xs font-medium">
              Requests Hoje
            </span>
            <span className="text-2xl font-bold tabular-nums">
              {stats.requestsToday.toLocaleString("pt-BR")}
            </span>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="flex flex-col items-center gap-1 px-4 py-0">
            <span className="text-muted-foreground text-xs font-medium">
              Custo Hoje
            </span>
            <span className="text-2xl font-bold tabular-nums">
              ${stats.costToday.toFixed(2)}
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
