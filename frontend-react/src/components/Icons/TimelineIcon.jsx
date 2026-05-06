/**
 * Professional SVG Icon: Timeline/Clock
 * Replaces: 🕐 emoji
 * Usage: CHRONOS module
 */
export default function TimelineIcon({ className = "w-12 h-12", color = "currentColor" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="32" r="28" stroke={color} strokeWidth="2" strokeOpacity="0.3" />
      <circle cx="32" cy="32" r="24" stroke={color} strokeWidth="3" />
      <line x1="32" y1="8" x2="32" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="50" x2="32" y2="56" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="32" x2="14" y2="32" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="32" x2="56" y2="32" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="32" x2="32" y2="18" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <line x1="32" y1="32" x2="42" y2="32" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="32" r="3" fill={color} />
    </svg>
  )
}
