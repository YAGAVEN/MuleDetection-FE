import { RiskIcon, StatusIcon } from '../Icons/IconSystem';

// Status Badge Component
export function StatusBadge({ status, size = 'md', showIcon = true, className = "" }) {
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };
  
  const statusStyles = {
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    loading: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  
  const statusLabels = {
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
    loading: 'Loading',
  };
  
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border ${sizes[size]} ${statusStyles[status]} ${className}`}>
      {showIcon && <StatusIcon status={status} size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />}
      <span className="font-medium">{statusLabels[status]}</span>
    </div>
  );
}

// Risk Level Badge Component
export function RiskBadge({ level, score, size = 'md', showIcon = true, showScore = true, className = "" }) {
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };
  
  const riskStyles = {
    LOW: 'bg-green-500/20 text-green-400 border-green-500/30',
    MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  
  const normalizedLevel = level?.toUpperCase() || 'LOW';
  
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border ${sizes[size]} ${riskStyles[normalizedLevel]} ${className}`}>
      {showIcon && <RiskIcon level={normalizedLevel} size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />}
      <span className="font-medium">{normalizedLevel}</span>
      {showScore && score !== undefined && (
        <span className="opacity-75">({typeof score === 'number' ? Math.round(score) : score})</span>
      )}
    </div>
  );
}

// Generic Badge Component
export function Badge({ children, variant = 'default', size = 'md', className = "" }) {
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };
  
  const variants = {
    default: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    primary: 'bg-[#00ff87]/20 text-[#00ff87] border-[#00ff87]/30',
    secondary: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };
  
  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export default { StatusBadge, RiskBadge, Badge };
