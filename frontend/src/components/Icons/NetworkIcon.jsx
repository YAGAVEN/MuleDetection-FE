/**
 * Professional SVG Icon: Network/Detection
 * Replaces: 🐴 emoji
 * Usage: Mule Detection module
 */
export default function NetworkIcon({ className = "w-12 h-12", color = "currentColor" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="6" stroke={color} strokeWidth="3" />
      <circle cx="32" cy="32" r="3" fill={color} />
      <circle cx="16" cy="16" r="4" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.3" />
      <circle cx="48" cy="16" r="4" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.3" />
      <circle cx="16" cy="48" r="4" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.3" />
      <circle cx="48" cy="48" r="4" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.3" />
      <line x1="32" y1="32" x2="16" y2="16" stroke={color} strokeWidth="2" strokeOpacity="0.4" />
      <line x1="32" y1="32" x2="48" y2="16" stroke={color} strokeWidth="2" strokeOpacity="0.4" />
      <line x1="32" y1="32" x2="16" y2="48" stroke={color} strokeWidth="2" strokeOpacity="0.4" />
      <line x1="32" y1="32" x2="48" y2="48" stroke={color} strokeWidth="2" strokeOpacity="0.4" />
    </svg>
  )
}
