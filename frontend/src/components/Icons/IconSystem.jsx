import { 
  Clock, 
  FileText, 
  Shield, 
  Users,
  Search,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Network,
  Layers,
  Target,
  Zap,
  Eye,
  Download,
  Upload,
  Settings,
  LogOut,
  User,
  Home,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  BarChart3,
  PieChart,
  LineChart,
  AlertCircle,
  MapPin,
  Globe,
  ArrowRight,
  ArrowLeft,
  Filter,
  RefreshCw,
  X
} from 'lucide-react';

export const Icons = {
  // Navigation
  Clock,
  FileText,
  Shield,
  Users,
  Home,
  
  // Actions
  Search,
  Download,
  Upload,
  Settings,
  LogOut,
  Filter,
  RefreshCw,
  X,
  
  // Status
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  
  // Data visualization
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  LineChart,
  Network,
  
  // Business
  DollarSign,
  Target,
  Eye,
  Zap,
  Layers,
  
  // Time
  Calendar,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  
  // Navigation arrows
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
  
  // Location
  MapPin,
  Globe,
  
  // User
  User,
};

// Icon wrapper component with consistent sizing
export function Icon({ name, size = 20, className = "", ...props }) {
  const IconComponent = Icons[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }
  
  return <IconComponent size={size} className={className} {...props} />;
}

// Status icon with color
export function StatusIcon({ status, size = 20, className = "" }) {
  const statusConfig = {
    success: { icon: 'CheckCircle', color: 'text-green-400' },
    error: { icon: 'XCircle', color: 'text-red-400' },
    warning: { icon: 'AlertTriangle', color: 'text-yellow-400' },
    info: { icon: 'Info', color: 'text-blue-400' },
    loading: { icon: 'RefreshCw', color: 'text-gray-400 animate-spin' },
  };
  
  const config = statusConfig[status] || statusConfig.info;
  
  return <Icon name={config.icon} size={size} className={`${config.color} ${className}`} />;
}

// Risk level icon
export function RiskIcon({ level, size = 20, className = "" }) {
  const riskConfig = {
    LOW: { icon: 'CheckCircle', color: 'text-green-400' },
    MEDIUM: { icon: 'AlertCircle', color: 'text-yellow-400' },
    HIGH: { icon: 'AlertTriangle', color: 'text-orange-400' },
    CRITICAL: { icon: 'XCircle', color: 'text-red-400' },
  };
  
  const config = riskConfig[level?.toUpperCase()] || riskConfig.LOW;
  
  return <Icon name={config.icon} size={size} className={`${config.color} ${className}`} />;
}

export default Icon;
