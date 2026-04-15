import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  description?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  change,
  changeType = "neutral",
  description,
}: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="mt-3">
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          <div className="mt-1 flex items-center gap-2">
            {change && (
              <span
                className={cn(
                  "flex items-center gap-0.5 text-sm font-medium",
                  changeType === "positive" && "text-emerald-500",
                  changeType === "negative" && "text-red-500",
                  changeType === "neutral" && "text-muted-foreground"
                )}
              >
                {changeType === "positive" && <TrendingUp className="h-3.5 w-3.5" />}
                {changeType === "negative" && <TrendingDown className="h-3.5 w-3.5" />}
                {change}
              </span>
            )}
            {description && (
              <span className="text-xs text-muted-foreground">{description}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
