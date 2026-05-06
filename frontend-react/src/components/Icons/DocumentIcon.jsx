/**
 * Professional SVG Icon: Document/Report
 * Replaces: 📋 emoji
 * Usage: Auto-SAR module
 */
export default function DocumentIcon({ className = "w-12 h-12", color = "currentColor" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 8 L14 56 L50 56 L50 20 L38 8 Z" stroke={color} strokeWidth="3" strokeLinejoin="round" />
      <path d="M38 8 L38 20 L50 20" stroke={color} strokeWidth="2" strokeLinejoin="round" fill="none" />
      <line x1="20" y1="28" x2="44" y2="28" stroke={color} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.8" />
      <line x1="20" y1="34" x2="44" y2="34" stroke={color} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6" />
      <line x1="20" y1="40" x2="38" y2="40" stroke={color} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6" />
      <line x1="20" y1="46" x2="42" y2="46" stroke={color} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4" />
    </svg>
  )
}
