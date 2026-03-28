"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Download, Check } from "lucide-react";

interface KrakenSettings {
  cacheTtlDays: number;
  cacheSimilarityThreshold: number;
  templateSimilarityThreshold: number;
  defaultModel: string;
}

const STORAGE_KEY = "kraken-settings";

const defaultSettings: KrakenSettings = {
  cacheTtlDays: 7,
  cacheSimilarityThreshold: 0.92,
  templateSimilarityThreshold: 0.92,
  defaultModel: "claude-haiku-4-5-20251001",
};

function loadSettings(): KrakenSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...defaultSettings, ...JSON.parse(stored) };
  } catch {
    // ignore parse errors
  }
  return defaultSettings;
}

export default function SettingsTab() {
  const [settings, setSettings] = useState<KrakenSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const saveSettings = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings]);

  function updateSetting<K extends keyof KrakenSettings>(
    key: K,
    value: KrakenSettings[K]
  ) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleExportCsv() {
    setExporting(true);
    try {
      const res = await fetch("/api/kraken/metrics");
      if (!res.ok) throw new Error("Falha ao buscar métricas");
      const data = await res.json();

      const rows: string[][] = [];

      if (Array.isArray(data)) {
        if (data.length > 0) {
          rows.push(Object.keys(data[0]));
          data.forEach((item: Record<string, unknown>) => {
            rows.push(Object.values(item).map(String));
          });
        }
      } else if (typeof data === "object" && data !== null) {
        rows.push(Object.keys(data));
        rows.push(Object.values(data as Record<string, unknown>).map(String));
      }

      const csvContent = rows.map((row) => row.join(",")).join("\n");
      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kraken-metrics-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(
        `Erro ao exportar: ${err instanceof Error ? err.message : "Erro desconhecido"}`
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Configurações</h2>
        <p className="text-sm text-muted-foreground">
          Configurações locais do painel Kraken
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Parâmetros Gerais
          </CardTitle>
          <CardDescription>
            Estas configurações são salvas localmente no navegador
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cacheTtl">Cache TTL (dias)</Label>
              <Input
                id="cacheTtl"
                type="number"
                min={1}
                max={365}
                value={settings.cacheTtlDays}
                onChange={(e) =>
                  updateSetting(
                    "cacheTtlDays",
                    parseInt(e.target.value) || 7
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                Tempo de vida do cache de respostas
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cacheThreshold">
                Threshold de similaridade do cache
              </Label>
              <Input
                id="cacheThreshold"
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={settings.cacheSimilarityThreshold}
                onChange={(e) =>
                  updateSetting(
                    "cacheSimilarityThreshold",
                    parseFloat(e.target.value) || 0.92
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                Valor entre 0.0 e 1.0 para matching de cache
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="templateThreshold">
                Threshold de similaridade dos templates
              </Label>
              <Input
                id="templateThreshold"
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={settings.templateSimilarityThreshold}
                onChange={(e) =>
                  updateSetting(
                    "templateSimilarityThreshold",
                    parseFloat(e.target.value) || 0.92
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                Valor entre 0.0 e 1.0 para matching de templates
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="defaultModel">
                Modelo padrão para novos agentes
              </Label>
              <Select
                value={settings.defaultModel}
                onValueChange={(value) =>
                  updateSetting("defaultModel", value)
                }
              >
                <SelectTrigger id="defaultModel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude-haiku-4-5-20251001">
                    Claude Haiku 4.5
                  </SelectItem>
                  <SelectItem value="claude-sonnet-4-6">
                    Claude Sonnet 4.6
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Modelo selecionado ao criar novos agentes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={saveSettings}>
              {saved ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Salvo
                </>
              ) : (
                "Salvar Configurações"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportação
          </CardTitle>
          <CardDescription>Exporte dados do Kraken</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={exporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Exportando..." : "Exportar Métricas (CSV)"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
