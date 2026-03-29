"use client";

import React from "react";

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

/** Kraken — Octopus with flowing tentacles */
export function KrakenIcon({ size = 40, color = "#0126fb", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className}>
      {/* Glow effect */}
      <defs>
        <radialGradient id="krakenGlow" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <filter id="krakenShadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={color} floodOpacity="0.4" />
        </filter>
      </defs>
      <circle cx="60" cy="50" r="45" fill="url(#krakenGlow)" />
      {/* Head */}
      <path d="M60 12 C35 12 20 30 20 48 C20 62 32 72 60 74 C88 72 100 62 100 48 C100 30 85 12 60 12Z" fill={color} filter="url(#krakenShadow)" />
      {/* Forehead detail */}
      <path d="M42 28 C48 22 72 22 78 28" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
      {/* Eyes */}
      <ellipse cx="44" cy="42" rx="8" ry="10" fill="white" />
      <ellipse cx="76" cy="42" rx="8" ry="10" fill="white" />
      <ellipse cx="45" cy="43" rx="4.5" ry="5.5" fill="#010d26" />
      <ellipse cx="77" cy="43" rx="4.5" ry="5.5" fill="#010d26" />
      <circle cx="47" cy="40" r="2" fill="white" opacity="0.9" />
      <circle cx="79" cy="40" r="2" fill="white" opacity="0.9" />
      {/* Tentacles */}
      <path d="M28 68 C18 78 8 92 6 104 C4 110 10 112 14 106 C18 98 16 88 22 78" stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M36 72 C28 84 22 98 26 108 C28 112 34 110 34 104 C34 96 28 86 34 76" stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M46 74 C42 88 40 100 44 110 C45 113 50 112 50 108 C50 100 44 90 46 80" stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M60 75 C60 90 58 102 60 110 C60 114 64 114 64 110 C64 102 62 92 62 80" stroke={color} strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M74 74 C78 88 80 100 76 110 C75 113 70 112 70 108 C70 100 76 90 74 80" stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M84 72 C92 84 98 98 94 108 C92 112 86 110 86 104 C86 96 92 86 86 76" stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M92 68 C102 78 112 92 114 104 C116 110 110 112 106 106 C102 98 104 88 98 78" stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M52 75 C50 86 46 96 42 102 C40 106 44 108 46 104 C48 100 52 88 54 78" stroke={color} strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

/** Odin — One-eyed Norse god with helmet */
export function OdinIcon({ size = 40, color = "#185FA5", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      {/* Helmet */}
      <path d="M50 8 L30 35 L20 35 L15 50 L25 48 L30 60 L70 60 L75 48 L85 50 L80 35 L70 35 L50 8Z" fill={color} />
      {/* Helmet wings */}
      <path d="M20 35 C10 25 5 18 8 12 C12 18 18 22 20 35Z" fill={color} opacity="0.8" />
      <path d="M80 35 C90 25 95 18 92 12 C88 18 82 22 80 35Z" fill={color} opacity="0.8" />
      {/* Helmet detail lines */}
      <path d="M35 35 L50 15 L65 35" stroke="white" strokeWidth="1.5" fill="none" opacity="0.3" />
      {/* Face */}
      <rect x="30" y="52" width="40" height="30" rx="8" fill="#e8d5b7" />
      {/* One eye (right) — left is covered */}
      <rect x="30" y="52" width="18" height="12" rx="4" fill={color} opacity="0.6" />
      <line x1="32" y1="58" x2="46" y2="58" stroke="white" strokeWidth="1" opacity="0.3" />
      <ellipse cx="62" cy="62" rx="6" ry="5" fill="white" />
      <circle cx="63" cy="62" r="3" fill="#1a3a5c" />
      <circle cx="64" cy="61" r="1" fill="white" />
      {/* Beard */}
      <path d="M34 82 C34 95 45 100 50 100 C55 100 66 95 66 82" fill="#c4a46c" />
      <path d="M40 82 L40 94" stroke="#b08f4c" strokeWidth="1" opacity="0.4" />
      <path d="M50 82 L50 98" stroke="#b08f4c" strokeWidth="1" opacity="0.4" />
      <path d="M60 82 L60 94" stroke="#b08f4c" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

/** Oráculo — Mystical eye / crystal ball */
export function OraculoIcon({ size = 40, color = "#0F6E56", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <radialGradient id="crystalGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="40" fill="url(#crystalGlow)" />
      {/* Crystal ball */}
      <circle cx="50" cy="45" r="28" fill={color} opacity="0.2" stroke={color} strokeWidth="2" />
      {/* Inner eye */}
      <path d="M25 45 Q50 25 75 45 Q50 65 25 45Z" fill="white" />
      <circle cx="50" cy="45" r="12" fill={color} />
      <circle cx="50" cy="45" r="6" fill="#010d26" />
      <circle cx="53" cy="42" r="2.5" fill="white" opacity="0.8" />
      {/* Rays */}
      <line x1="50" y1="10" x2="50" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="22" y1="22" x2="28" y2="28" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="78" y1="22" x2="72" y2="28" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      {/* Base */}
      <path d="M35 75 C35 70 40 68 50 68 C60 68 65 70 65 75 L68 85 L32 85 Z" fill={color} opacity="0.6" />
    </svg>
  );
}

/** Hórus — Eye of Horus */
export function HorusIcon({ size = 40, color = "#D85A30", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      {/* Eye of Horus */}
      <path d="M10 45 Q50 15 90 45 Q50 75 10 45Z" fill={color} opacity="0.15" stroke={color} strokeWidth="2.5" />
      {/* Eye */}
      <ellipse cx="50" cy="45" rx="18" ry="14" fill="white" />
      <circle cx="50" cy="45" r="10" fill={color} />
      <circle cx="50" cy="45" r="5" fill="#1a0a00" />
      <circle cx="53" cy="42" r="2" fill="white" opacity="0.8" />
      {/* Horus tear drop (iconic marking) */}
      <path d="M50 59 C48 65 44 75 40 85 C38 90 42 92 44 88 L48 78" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Spiral underneath */}
      <path d="M44 88 C40 86 36 80 38 76 C40 72 46 74 46 78" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Eyebrow line */}
      <path d="M8 40 Q50 10 92 40" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Side extension */}
      <path d="M90 45 L95 42 L98 38" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Hermes — Winged helmet */
export function HermesIcon({ size = 40, color = "#D4537E", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      {/* Helmet base */}
      <ellipse cx="50" cy="55" rx="25" ry="20" fill={color} />
      {/* Helmet visor */}
      <path d="M25 55 Q50 35 75 55" fill={color} />
      <path d="M28 55 Q50 40 72 55" stroke="white" strokeWidth="1" fill="none" opacity="0.3" />
      {/* Wings — left */}
      <path d="M25 48 C15 38 5 28 2 18 C8 22 14 30 20 38" fill="white" opacity="0.9" />
      <path d="M24 52 C12 42 2 34 -2 24 C6 28 14 36 22 44" fill="white" opacity="0.7" />
      <path d="M23 44 C14 32 8 22 8 12 C12 18 18 28 24 38" fill="white" opacity="0.5" />
      {/* Wings — right */}
      <path d="M75 48 C85 38 95 28 98 18 C92 22 86 30 80 38" fill="white" opacity="0.9" />
      <path d="M76 52 C88 42 98 34 102 24 C94 28 86 36 78 44" fill="white" opacity="0.7" />
      <path d="M77 44 C86 32 92 22 92 12 C88 18 82 28 76 38" fill="white" opacity="0.5" />
      {/* Face hint */}
      <ellipse cx="42" cy="60" rx="4" ry="5" fill="white" opacity="0.6" />
      <ellipse cx="58" cy="60" rx="4" ry="5" fill="white" opacity="0.6" />
    </svg>
  );
}

/** Thoth — Ibis bird head */
export function ThothIcon({ size = 40, color = "#639922", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      {/* Head */}
      <ellipse cx="55" cy="40" rx="22" ry="25" fill={color} />
      {/* Long curved beak */}
      <path d="M38 42 C30 44 15 48 10 55 C8 58 10 60 14 58 C20 54 30 48 38 46" fill="#f5b719" />
      <path d="M38 42 C34 46 15 52 10 55" stroke="#d4a010" strokeWidth="1" fill="none" />
      {/* Eye */}
      <circle cx="58" cy="34" r="7" fill="white" />
      <circle cx="59" cy="34" r="4" fill="#1a0a00" />
      <circle cx="60.5" cy="32.5" r="1.5" fill="white" />
      {/* Crown/headdress */}
      <path d="M55 15 L48 8 L50 18" fill={color} />
      <path d="M55 15 L62 6 L58 18" fill={color} />
      <circle cx="55" cy="14" r="4" fill="#f5b719" />
      {/* Neck */}
      <path d="M50 65 C48 75 46 85 48 95" stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" />
      {/* Scroll */}
      <rect x="62" y="70" width="25" height="20" rx="3" fill="white" opacity="0.2" />
      <line x1="66" y1="76" x2="82" y2="76" stroke="white" strokeWidth="1" opacity="0.3" />
      <line x1="66" y1="80" x2="80" y2="80" stroke="white" strokeWidth="1" opacity="0.3" />
      <line x1="66" y1="84" x2="78" y2="84" stroke="white" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

/** Iris — Rainbow arc goddess */
export function IrisIcon({ size = 40, color = "#BA7517", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      {/* Rainbow arc */}
      <path d="M10 70 Q50 10 90 70" stroke="#ff4444" strokeWidth="4" fill="none" opacity="0.7" />
      <path d="M14 70 Q50 16 86 70" stroke="#ff8844" strokeWidth="4" fill="none" opacity="0.7" />
      <path d="M18 70 Q50 22 82 70" stroke="#ffcc00" strokeWidth="4" fill="none" opacity="0.7" />
      <path d="M22 70 Q50 28 78 70" stroke="#44cc44" strokeWidth="4" fill="none" opacity="0.7" />
      <path d="M26 70 Q50 34 74 70" stroke="#4488ff" strokeWidth="4" fill="none" opacity="0.7" />
      <path d="M30 70 Q50 40 70 70" stroke="#8844ff" strokeWidth="4" fill="none" opacity="0.7" />
      {/* Figure */}
      <circle cx="50" cy="55" r="12" fill={color} />
      <circle cx="50" cy="55" r="8" fill="white" opacity="0.3" />
      {/* Star */}
      <path d="M50 46 L52 52 L58 52 L53 56 L55 62 L50 58 L45 62 L47 56 L42 52 L48 52 Z" fill="white" opacity="0.6" />
      {/* Sparkles */}
      <circle cx="25" cy="65" r="2" fill="#ffcc00" opacity="0.6" />
      <circle cx="75" cy="65" r="2" fill="#ff4444" opacity="0.6" />
      <circle cx="35" cy="50" r="1.5" fill="#44cc44" opacity="0.6" />
      <circle cx="65" cy="50" r="1.5" fill="#4488ff" opacity="0.6" />
    </svg>
  );
}

/** Apolo — Lyre / sun */
export function ApoloIcon({ size = 40, color = "#378ADD", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      {/* Sun rays */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
        <line
          key={angle}
          x1={50 + 28 * Math.cos((angle * Math.PI) / 180)}
          y1={50 + 28 * Math.sin((angle * Math.PI) / 180)}
          x2={50 + 38 * Math.cos((angle * Math.PI) / 180)}
          y2={50 + 38 * Math.sin((angle * Math.PI) / 180)}
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.5"
        />
      ))}
      {/* Sun */}
      <circle cx="50" cy="50" r="24" fill={color} opacity="0.2" />
      <circle cx="50" cy="50" r="18" fill={color} />
      {/* Lyre shape */}
      <path d="M42 42 C38 30 42 22 50 20 C58 22 62 30 58 42" stroke="white" strokeWidth="2.5" fill="none" />
      <line x1="42" y1="42" x2="58" y2="42" stroke="white" strokeWidth="2" />
      {/* Strings */}
      <line x1="45" y1="42" x2="45" y2="28" stroke="white" strokeWidth="1" opacity="0.6" />
      <line x1="50" y1="42" x2="50" y2="24" stroke="white" strokeWidth="1" opacity="0.6" />
      <line x1="55" y1="42" x2="55" y2="28" stroke="white" strokeWidth="1" opacity="0.6" />
      {/* Chart bars for data */}
      <rect x="38" y="56" width="6" height="14" rx="1" fill="white" opacity="0.5" />
      <rect x="47" y="52" width="6" height="18" rx="1" fill="white" opacity="0.6" />
      <rect x="56" y="48" width="6" height="22" rx="1" fill="white" opacity="0.7" />
    </svg>
  );
}

/** Hefesto — Hammer and anvil */
export function HefestoIcon({ size = 40, color = "#888780", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      {/* Anvil */}
      <path d="M25 70 L35 60 L65 60 L75 70 L80 75 L20 75 Z" fill={color} />
      <rect x="35" y="55" width="30" height="6" rx="2" fill={color} opacity="0.8" />
      {/* Hammer head */}
      <rect x="40" y="18" width="28" height="16" rx="3" fill={color} />
      <rect x="38" y="20" width="4" height="12" rx="1" fill={color} opacity="0.7" />
      <rect x="66" y="20" width="4" height="12" rx="1" fill={color} opacity="0.7" />
      {/* Handle */}
      <rect x="52" y="34" width="4" height="22" rx="2" fill="#8B6F47" />
      {/* Sparks */}
      <circle cx="30" cy="55" r="2" fill="#f5b719" opacity="0.7" />
      <circle cx="70" cy="52" r="1.5" fill="#f5b719" opacity="0.6" />
      <circle cx="38" cy="48" r="1.5" fill="#ff6b35" opacity="0.5" />
      <circle cx="65" cy="46" r="2" fill="#f5b719" opacity="0.7" />
      {/* Content icon (camera/media) */}
      <rect x="15" y="82" width="18" height="12" rx="2" fill={color} opacity="0.4" />
      <circle cx="24" cy="88" r="3" stroke="white" strokeWidth="1" fill="none" opacity="0.4" />
    </svg>
  );
}

/** Map agent ID to its icon component */
export const AGENT_ICON_MAP: Record<string, React.ComponentType<IconProps>> = {
  kraken_router: KrakenIcon,
  odin_ia: OdinIcon,
  oraculo: OraculoIcon,
  horus_ia: HorusIcon,
  hermes: HermesIcon,
  thoth: ThothIcon,
  iris: IrisIcon,
  apolo: ApoloIcon,
  hefesto: HefestoIcon,
};

/** Get the icon component for an agent, with fallback to KrakenIcon */
export function AgentIcon({ agentId, size = 40, color, className }: IconProps & { agentId: string }) {
  const IconComponent = AGENT_ICON_MAP[agentId] || KrakenIcon;
  return <IconComponent size={size} color={color} className={className} />;
}
