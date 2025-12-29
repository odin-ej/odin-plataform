/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Settings2, Loader2, Check, Trophy } from "lucide-react";
import { toast } from "sonner";
import { createRecognitionModel } from "@/lib/actions/recognitions";
import { cn } from "@/lib/utils";
import { RecognitionAreas, RecognitionType } from "@prisma/client";

const CreateModelModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estados do Formulário
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAreas, setSelectedAreas] = useState<string[]>(["GERAL"]);

  const toggleArea = (area: string) => {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const handleSubmit = async () => {
    if (!title || !type || selectedAreas.length === 0) {
      toast.error("Preencha o título, tipo e pelo menos uma área.");
      return;
    }

    setLoading(true);
    try {
      await createRecognitionModel({
        title,
        type,
        description,
        areas: selectedAreas as any,
      });

      toast.success("Modelo de reconhecimento criado!");
      setIsOpen(false);
      // Reset
      setTitle("");
      setType("");
      setDescription("");
      setSelectedAreas(["GERAL"]);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar modelo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-white/10 bg-white/5 text-white hover:bg-white/10 gap-2"
        >
          <Settings2 size={16} />
          <span>Configurar Modelos</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-[#010d26] border-[#0126fb]/30 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Trophy className="text-[#f5b719]" />
            Modelo de Reconhecimento
          </DialogTitle>
          <p className="text-gray-400 text-sm">
            Crie modelo de reconhecimento para poder atribuir aos membros.
          </p>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {/* Título do Modelo */}
          <div className="grid gap-2">
            <Label htmlFor="title" className="text-sm font-bold text-blue-200">
              Título do Modelo (Ex: Semana 1, Casinha de Ouro)
            </Label>
            <Input
              id="title"
              placeholder="Digite o nome do reconhecimento..."
              className="bg-black/40 border-white/10 text-white focus:border-[#0126fb]"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Tipo de Reconhecimento*/}
          <div className="w-full">
            <Label className="text-sm font-bold text-blue-200">Tipo</Label>
            <Select onValueChange={setType} value={type}>
              <SelectTrigger className="bg-black/40 border-white/10 w-full">
                <SelectValue placeholder="Selecione o tipo..." />
              </SelectTrigger>
              <SelectContent className="bg-[#010d26] border-white/10 text-white w-full">
                {Object.values(RecognitionType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "CULTURAL"
                      ? "Cultural"
                      : t === "PERFORMANCE"
                      ? "Performance"
                      : "Resultado"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seleção de Áreas (Múltipla) */}
          <div className="grid gap-2">
            <Label className="text-sm font-bold text-blue-200">
              Áreas do Reconhecimento
            </Label>
            <div className="flex flex-wrap gap-2">
              {Object.values(RecognitionAreas).map((area) => (
                <Button
                  key={area}
                  onClick={() => toggleArea(area)}
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold transition-all border",
                    selectedAreas.includes(area)
                      ? "bg-[#0126fb] border-white text-white"
                      : "bg-black/40 border-white/10 text-gray-400 hover:border-white/30"
                  )}
                >
                  {selectedAreas.includes(area) && (
                    <Check size={10} className="inline mr-1" />
                  )}
                  {area}
                </Button>
              ))}
            </div>
          </div>

          {/* Descrição Interna */}
          <div className="grid gap-2">
            <Label htmlFor="desc" className="text-sm font-bold text-blue-200">
              Descrição do Modelo (Opcional)
            </Label>
            <Textarea
              id="desc"
              placeholder="Para que serve este reconhecimento?"
              className="bg-black/40 border-white/10 text-white min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <p className="text-[10px] text-gray-500 flex-1 italic">
            * Modelos criados ficam disponíveis para seleção imediata na Seção
            2.
          </p>
          <Button
            className="bg-[#0126fb] hover:bg-[#0126fb]/80 text-white font-bold px-8"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" /> : "Criar Modelo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateModelModal;
