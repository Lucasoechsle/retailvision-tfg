"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  BarChart3,
  Activity,
  RefreshCw,
} from "lucide-react";

interface Store {
  id: string;
  name: string;
  address: string | null;
}

interface Insight {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  metric?: string;
  value?: number;
  change?: number;
  store_id: string;
  generated_at: string;
}

interface Prediction {
  date: string;
  predicted_visitors: number;
  predicted_conversion: number | null;
  confidence: number;
}

const severityConfig: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10" },
  success: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
  alert: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
};

const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function AnalyticsOverview({ stores }: { stores: Store[] }) {
  const [selectedStore, setSelectedStore] = useState(stores[0]?.id || "");
  const [insights, setInsights] = useState<Insight[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  const fetchInsights = async (storeId: string) => {
    setLoadingInsights(true);
    try {
      const res = await fetch(`/api/insights/${storeId}`);
      const data = await res.json();
      setInsights(data.insights || []);
    } catch {
      setInsights([]);
    } finally {
      setLoadingInsights(false);
    }
  };

  const fetchPredictions = async (storeId: string) => {
    setLoadingPredictions(true);
    try {
      const res = await fetch(`/api/predictions/${storeId}?type=daily&days=7`);
      const data = await res.json();
      setPredictions(data.predictions || []);
    } catch {
      setPredictions([]);
    } finally {
      setLoadingPredictions(false);
    }
  };

  useEffect(() => {
    if (selectedStore) {
      fetchInsights(selectedStore);
      fetchPredictions(selectedStore);
    }
  }, [selectedStore]);

  if (stores.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Sin tiendas</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Crea una tienda para comenzar a recibir insights automáticos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Select value={selectedStore} onValueChange={setSelectedStore}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Seleccionar tienda" />
          </SelectTrigger>
          <SelectContent>
            {stores.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            fetchInsights(selectedStore);
            fetchPredictions(selectedStore);
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-400" />
            Insights Automáticos
          </CardTitle>
          <CardDescription>
            Análisis inteligente de tus datos de la última semana
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInsights ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : insights.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Info className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>Sin insights disponibles aún. Se generarán cuando haya suficientes datos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {insights.map((insight) => {
                const config = severityConfig[insight.severity] || severityConfig.info;
                const Icon = config.icon;
                return (
                  <div
                    key={insight.id}
                    className={`flex items-start gap-3 rounded-lg border p-4 ${config.bg}`}
                  >
                    <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{insight.title}</p>
                        {insight.change != null && (
                          <Badge variant={insight.change > 0 ? "default" : "destructive"} className="text-xs">
                            {insight.change > 0 ? (
                              <TrendingUp className="mr-1 h-3 w-3" />
                            ) : (
                              <TrendingDown className="mr-1 h-3 w-3" />
                            )}
                            {insight.change > 0 ? "+" : ""}{insight.change}%
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{insight.description}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 capitalize text-xs">
                      {insight.type}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Predictions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-400" />
            Predicciones de Tráfico
          </CardTitle>
          <CardDescription>
            Estimación de visitantes para los próximos 7 días
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPredictions ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : predictions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Activity className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>Se necesitan al menos 7 días de datos para generar predicciones.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {predictions.map((pred) => {
                const date = new Date(pred.date + "T12:00:00");
                const dow = date.getDay();
                const confidencePct = Math.round(pred.confidence * 100);

                return (
                  <div key={pred.date} className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{dayNames[dow]}</span>
                      <span className="text-xs text-muted-foreground">
                        {date.toLocaleDateString("es", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <div className="text-2xl font-bold">
                      {pred.predicted_visitors.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">visitantes estimados</div>
                    <div className="flex items-center justify-between text-xs">
                      {pred.predicted_conversion != null && (
                        <span className="text-muted-foreground">
                          Conv: ~{pred.predicted_conversion}%
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className={
                          confidencePct >= 70
                            ? "text-emerald-400 border-emerald-400/30"
                            : confidencePct >= 40
                            ? "text-amber-400 border-amber-400/30"
                            : "text-red-400 border-red-400/30"
                        }
                      >
                        {confidencePct}% conf
                      </Badge>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${
                          confidencePct >= 70
                            ? "bg-emerald-500"
                            : confidencePct >= 40
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${confidencePct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
