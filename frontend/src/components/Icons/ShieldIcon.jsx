/**
 * Professional SVG Icon: Shield/Network Security
 * Replaces: �� emoji
 * Usage: HYDRA module
 */
export default function ShieldIcon({ className = "w-12 h-12", color = "currentColor" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 8 L48 16 L48 32 C48 42 42 52 32 56 C22 52 16 42 16 32 L16 16 Z" stroke={color} strokeWidth="3" strokeLinejoin="round" />
      <path d="M32 14 L42 19 L42 30 C42 37 38 44 32 47 C26 44 22 37 22 30 L22 19 Z" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeOpacity="0.6" />
      <circle cx="32" cy="28" r="2" fill={color} />
      <circle cx="26" cy="34" r="1.5" fill={color} fillOpacity="0.7" />
      <circle cx="38" cy="34" r="1.5" fill={color} fillOpacity="0.7" />
      <circle cx="32" cy="40" r="1.5" fill={color} fillOpacity="0.7" />
      <line x1="32" y1="28" x2="26" y2="34" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
      <line x1="32" y1="28" x2="38" y2="34" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
    </svg>
  )
}
