import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CustomEmoji } from "@prisma/client";
import { PlusCircle, Smile } from "lucide-react";
import { useMemo, useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CustomEmojiImage from "./CustomEmojiImage";
import { defaultEmojis } from "@/lib/utils";

interface EmojiComponentProps {
  onEmojiSelect: (emoji: string) => void;
  setIsEmojiModalOpen: (isOpen: boolean) => void;
  customEmojis: CustomEmoji[];
  isEmojiModalOpen: boolean;
  emojiName: string;
  setEmojiName: (name: string) => void;
  setImageToCrop: (url: string | null) => void;
}

const EmojiComponent = ({
  onEmojiSelect,
  setIsEmojiModalOpen,
  customEmojis,
  isEmojiModalOpen,
  emojiName,
  setEmojiName,
  setImageToCrop,
}: EmojiComponentProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCount, setVisibleCount] = useState(30); // emojis por vez
  const containerRef = useRef<HTMLDivElement>(null);

  const allEmojis = useMemo(() => {
    const base = defaultEmojis.map((e, i) => ({
      id: `default-${i}`,
      emoji: e.emoji,
      name: e.name,
      type: "default" as const,
    }));

    const customs = (customEmojis ?? []).map((e) => ({
      id: `custom-${e.id}`,
      emoji: e.imageUrl,
      name: e.name,
      type: "custom" as const,
      raw: e,
    }));

    return [...base, ...customs];
  }, [customEmojis]);

  // Filtro de busca
  const filteredEmojis = useMemo(() => {
    return allEmojis.filter((e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allEmojis, searchTerm]);

  const visibleEmojis = filteredEmojis.slice(0, visibleCount);

  // Detecta scroll no container para carregar mais
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 20) {
        setVisibleCount((prev) => Math.min(prev + 30, filteredEmojis.length));
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [filteredEmojis]);

  // Função para renderizar cada emoji (default ou custom)
  const renderEmoji = (emoji: typeof allEmojis[number]) => {
    if (emoji.type === "custom" && emoji.raw) {
      return (
        <div
          key={emoji.id}
          className="flex items-center justify-center cursor-pointer"
        >
          <CustomEmojiImage emoji={emoji.raw} onEmojiSelect={onEmojiSelect} />
        </div>
      );
    }
    return (
      <span
        key={emoji.id}
        onClick={() => onEmojiSelect(emoji.emoji)}
        className="cursor-pointer p-1 text-2xl hover:bg-white/10 rounded-md text-center"
        title={emoji.name}
      >
        {emoji.emoji}
      </span>
    );
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" size="icon" variant="ghost">
            <Smile size={24} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-72 bg-[#010d26] border-gray-700 text-white flex flex-col"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-sm">JR Emojis</h4>
            <PlusCircle
              className="mr-2 text-white hover:text-[#f5b719] transition-colors cursor-pointer h-6 w-6"
              onClick={() => setIsEmojiModalOpen(true)}
            />
          </div>

          <Input
            placeholder="Buscar emoji (ex: coração)"
            className="mb-2 text-white"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setVisibleCount(30); // reset ao buscar
            }}
          />

          <div
            ref={containerRef}
            className="grid grid-cols-6 gap-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent max-h-64"
          >
            {visibleEmojis.map((e) => renderEmoji(e))}
          </div>
        </PopoverContent>
      </Popover>

      {isEmojiModalOpen && (
        <Dialog open={isEmojiModalOpen} onOpenChange={setIsEmojiModalOpen}>
          <DialogContent className="bg-[#010d26] border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>Criar Novo Emoji</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Nome do emoji (ex: odin_feliz)"
              value={emojiName}
              onChange={(e) => setEmojiName(e.target.value)}
            />
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setImageToCrop(URL.createObjectURL(e.target.files[0]));
                }
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default EmojiComponent;
