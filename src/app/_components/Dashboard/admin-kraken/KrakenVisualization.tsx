"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { AgentIcon, KrakenIcon } from "../kraken-icons/AgentIcons";

interface KrakenVisualizationProps {
  agents: Array<{
    id: string;
    displayName: string;
    color: string | null;
    iconUrl?: string | null;
    isActive: boolean;
  }>;
  activeAgent: string | null;
  stats: {
    requestsToday: number;
    costToday: number;
  };
}

const VIEW_SIZE = 600;
const CENTER = VIEW_SIZE / 2;
const ORBIT_RADIUS = 220;
const NODE_SIZE = 56;

export default function KrakenVisualization({
  agents,
  activeAgent,
  stats,
}: KrakenVisualizationProps) {
  // Filter out kraken_router — it's the orchestrator, not a sub-agent
  const visibleAgents = useMemo(
    () => agents.filter((a) => a.id !== "kraken_router"),
    [agents]
  );

  const agentPositions = useMemo(() => {
    const count = visibleAgents.length || 1;
    return visibleAgents.map((agent, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      return {
        ...agent,
        x: CENTER + ORBIT_RADIUS * Math.cos(angle),
        y: CENTER + ORBIT_RADIUS * Math.sin(angle),
        angle,
      };
    });
  }, [visibleAgents]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Stats bar */}
      <div className="flex gap-4">
        <div className="rounded-xl border border-[#0126fb]/30 bg-[#010d26] px-5 py-3 text-center">
          <div className="text-2xl font-bold text-white">{stats.requestsToday}</div>
          <div className="text-[11px] text-white/50">Requests Hoje</div>
        </div>
        <div className="rounded-xl border border-[#0126fb]/30 bg-[#010d26] px-5 py-3 text-center">
          <div className="text-2xl font-bold text-white">
            ${stats.costToday.toFixed(4)}
          </div>
          <div className="text-[11px] text-white/50">Custo Hoje</div>
        </div>
      </div>

      {/* Visualization */}
      <div className="relative" style={{ width: VIEW_SIZE, height: VIEW_SIZE }}>
        <svg
          width={VIEW_SIZE}
          height={VIEW_SIZE}
          viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
          className="absolute inset-0"
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="bgGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0126fb" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#0126fb" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background glow */}
          <circle cx={CENTER} cy={CENTER} r={ORBIT_RADIUS + 40} fill="url(#bgGradient)" />

          {/* Orbit ring */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={ORBIT_RADIUS}
            fill="none"
            stroke="#0126fb"
            strokeWidth="1"
            strokeDasharray="6 4"
            opacity="0.15"
          />

          {/* Tentacle connections from center to agents */}
          {agentPositions.map((agent) => {
            const isActive = activeAgent === agent.id;
            const agentColor = agent.color || "#0126fb";

            // Cubic bezier for organic tentacle curve
            const dx = agent.x - CENTER;
            const dy = agent.y - CENTER;
            const midX = CENTER + dx * 0.5;
            const midY = CENTER + dy * 0.5;
            const offsetX = dy * 0.2;
            const offsetY = -dx * 0.2;

            return (
              <motion.path
                key={agent.id}
                d={`M ${CENTER} ${CENTER} C ${midX + offsetX} ${midY + offsetY}, ${midX - offsetX * 0.5} ${midY - offsetY * 0.5}, ${agent.x} ${agent.y}`}
                fill="none"
                stroke={agent.isActive ? agentColor : "#ffffff10"}
                strokeWidth={isActive ? 3 : 1.5}
                strokeLinecap="round"
                opacity={agent.isActive ? (isActive ? 0.8 : 0.3) : 0.1}
                animate={{
                  strokeWidth: isActive ? [2, 4, 2] : 1.5,
                  opacity: isActive ? [0.5, 1, 0.5] : agent.isActive ? 0.3 : 0.1,
                }}
                transition={{
                  repeat: isActive ? Infinity : 0,
                  duration: 1.5,
                }}
              />
            );
          })}
        </svg>

        {/* Center — Kraken octopus */}
        <motion.div
          className="absolute flex flex-col items-center justify-center"
          style={{
            left: CENTER - 50,
            top: CENTER - 50,
            width: 100,
            height: 100,
          }}
          animate={{
            scale: activeAgent ? [1, 1.05, 1] : 1,
          }}
          transition={{
            repeat: activeAgent ? Infinity : 0,
            duration: 2,
          }}
        >
          <KrakenIcon size={80} color="#0126fb" />
          <span className="mt-1 text-[10px] font-bold text-white/70 tracking-wider uppercase">
            Kraken
          </span>
        </motion.div>

        {/* Agent nodes */}
        {agentPositions.map((agent) => {
          const isActive = activeAgent === agent.id;
          const agentColor = agent.color || "#0126fb";

          return (
            <motion.div
              key={agent.id}
              className="absolute flex flex-col items-center"
              style={{
                left: agent.x - NODE_SIZE / 2,
                top: agent.y - NODE_SIZE / 2,
                width: NODE_SIZE,
              }}
              animate={{
                scale: isActive ? [1, 1.18, 1.05, 1.18, 1] : 1,
              }}
              transition={{
                repeat: isActive ? Infinity : 0,
                duration: 1.6,
                ease: "easeInOut",
              }}
            >
              {/* Outer glow ring when active */}
              {isActive && (
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: NODE_SIZE + 16,
                    height: NODE_SIZE + 16,
                    left: -8,
                    top: -8,
                    border: `2px solid ${agentColor}`,
                    boxShadow: `0 0 20px ${agentColor}80, 0 0 40px ${agentColor}40`,
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: [0.4, 1, 0.4], scale: [0.95, 1.05, 0.95] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                />
              )}

              <div
                className="relative flex items-center justify-center rounded-full border-2 overflow-hidden"
                style={{
                  width: NODE_SIZE,
                  height: NODE_SIZE,
                  borderColor: agent.isActive ? agentColor : "#ffffff20",
                  backgroundColor: agent.isActive ? `${agentColor}15` : "#ffffff05",
                  opacity: agent.isActive ? 1 : 0.4,
                  filter: isActive ? `drop-shadow(0 0 12px ${agentColor})` : "none",
                  transition: "filter 0.3s, opacity 0.3s",
                }}
              >
                {agent.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={agent.iconUrl}
                    alt={agent.displayName}
                    className="absolute inset-[3px] h-[calc(100%-6px)] w-[calc(100%-6px)] rounded-full"
                    style={{
                      opacity: agent.isActive ? 1 : 0.4,
                      objectFit: "cover",
                      objectPosition: "center top",
                    }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <AgentIcon
                    agentId={agent.id}
                    size={32}
                    color={agent.isActive ? agentColor : "#ffffff40"}
                  />
                )}
                {/* Status dot */}
                <div
                  className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#010d26]"
                  style={{
                    backgroundColor: agent.isActive ? "#22c55e" : "#ef4444",
                  }}
                />
              </div>
              <span
                className="mt-1.5 text-[9px] font-medium text-center leading-tight max-w-[70px] truncate"
                style={{ color: agent.isActive ? "#ffffffcc" : "#ffffff40" }}
              >
                {agent.displayName}
              </span>
            </motion.div>
          );
        })}

        {/* Active routing pulse animation */}
        {activeAgent && (
          <motion.div
            className="absolute rounded-full"
            style={{
              left: CENTER - 6,
              top: CENTER - 6,
              width: 12,
              height: 12,
              backgroundColor: "#0126fb",
            }}
            animate={{
              x: [
                0,
                (agentPositions.find((a) => a.id === activeAgent)?.x ?? CENTER) - CENTER,
              ],
              y: [
                0,
                (agentPositions.find((a) => a.id === activeAgent)?.y ?? CENTER) - CENTER,
              ],
              scale: [1, 0.8, 1.2, 1],
              opacity: [1, 0.8, 1, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </div>
    </div>
  );
}
