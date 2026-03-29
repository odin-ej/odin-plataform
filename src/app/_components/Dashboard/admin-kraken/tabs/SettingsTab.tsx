"use client";

import { useState, useEffect, useCallback } from "react";
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

      // Flatten nested objects into rows
      const rows: string[][] = [];
      const flatData: Record<string, unknown>[] = [];

      if (Array.isArray(data)) {
        flatData.push(...data);
      } else if (typeof data === "object" && data !== null) {
        // API returns { key: value, ... } — flatten each value
        for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
          if (Array.isArray(value)) {
            flatData.push(...(value as Record<string, unknown>[]).map((v) =>
              typeof v === "object" && v !== null ? v as Record<string, unknown> : { [key]: v }
            ));
          } else {
            flatData.push({ metrica: key, valor: String(value) });
          }
        }
      }

      if (flatData.length > 0) {
        const headers = Object.keys(flatData[0]);
        rows.push(headers);
        flatData.forEach((item) => {
          rows.push(headers.map((h) => {
            const val = item[h];
            const str = String(val ?? "");
            // Escape values containing separator or quotes
            return str.includes(";") || str.includes('"') || str.includes("\n")
              ? `"${str.replace(/"/g, '""')}"` : str;
          }));
        });
      }

      // Use semicolon separator + BOM for Excel compatibility
      const BOM = "\uFEFF";
      const csvContent = BOM + rows.map((row) => row.join(";")).join("\n");
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
        <h2 className="text-lg font-semibold text-white">Configurações</h2>
        <p className="text-sm text-white/50">
          Configurações locais do painel Kraken
        </p>
      </div>

      <div className="rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] shadow-lg">
        <div className="px-6 pt-6 pb-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Settings className="h-5 w-5 text-[#0126fb]" />
            Parâmetros Gerais
          </h3>
          <p className="text-sm text-white/50 mt-1">
            Estas configurações são salvas localmente no navegador
          </p>
        </div>
        <div className="px-6 pb-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cacheTtl" className="text-white/80">Cache TTL (dias)</Label>
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
                className="border-2 border-white/30 bg-transparent text-white focus:border-[#0126fb]"
              />
              <p className="text-xs text-white/40">
                Tempo de vida do cache de respostas
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cacheThreshold" className="text-white/80">
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
                className="border-2 border-white/30 bg-transparent text-white focus:border-[#0126fb]"
              />
              <p className="text-xs text-white/40">
                Valor entre 0.0 e 1.0 para matching de cache
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="templateThreshold" className="text-white/80">
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
                className="border-2 border-white/30 bg-transparent text-white focus:border-[#0126fb]"
              />
              <p className="text-xs text-white/40">
                Valor entre 0.0 e 1.0 para matching de templates
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="defaultModel" className="text-white/80">
                Modelo padrão para novos agentes
              </Label>
              <Select
                value={settings.defaultModel}
                onValueChange={(value) =>
                  updateSetting("defaultModel", value)
                }
              >
                <SelectTrigger id="defaultModel" className="bg-[#00205e] border-2 border-[#0126fb] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#00205e] border border-[#0126fb]/30 text-white">
                  <SelectItem value="claude-haiku-4-5-20251001" className="text-white hover:!bg-[#00205e] hover:!text-[#f5b719] focus:!bg-[#0126fb]/20 focus:!text-white">
                    Claude Haiku 4.5
                  </SelectItem>
                  <SelectItem value="claude-sonnet-4-6" className="text-white hover:!bg-[#00205e] hover:!text-[#f5b719] focus:!bg-[#0126fb]/20 focus:!text-white">
                    Claude Sonnet 4.6
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-white/40">
                Modelo selecionado ao criar novos agentes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={saveSettings} className="bg-[#0126fb] text-white hover:bg-[#0126fb]/80">
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
        </div>
      </div>

      <div className="rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] shadow-lg">
        <div className="px-6 pt-6 pb-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Download className="h-5 w-5 text-[#0126fb]" />
            Exportação
          </h3>
          <p className="text-sm text-white/50 mt-1">Exporte dados do Kraken</p>
        </div>
        <div className="px-6 pb-6">
          <Button
            variant="ghost"
            onClick={handleExportCsv}
            disabled={exporting}
            className="border-2 border-white/30 text-white hover:bg-white/10 hover:text-[#f5b719]"
          >
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Exportando..." : "Exportar Métricas (CSV)"}
          </Button>
        </div>
      </div>
    </div>
  );
}
