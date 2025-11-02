import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string;
  change?: string;
  changePercent?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}

export function KPICard({
  title,
  value,
  change,
  changePercent,
  icon,
  trend,
  subtitle,
}: KPICardProps): React.JSX.Element {
  const isPositive = trend === 'up';
  const isNegative = trend === 'down';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon ? <div className="h-4 w-4 text-muted-foreground">{icon}</div> : null}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(change || changePercent || subtitle) && (
          <div className="flex items-center gap-2 mt-1">
            {change && (
              <div
                className={cn(
                  'flex items-center text-xs font-medium',
                  isPositive && 'text-green-600',
                  isNegative && 'text-red-600',
                  !isPositive && !isNegative && 'text-muted-foreground'
                )}
              >
                {isPositive && <ArrowUpIcon className="h-3 w-3 mr-1" />}
                {isNegative && <ArrowDownIcon className="h-3 w-3 mr-1" />}
                {change}
                {changePercent && ` (${changePercent})`}
              </div>
            )}
            {subtitle && !change && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

