import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CustomEmoji } from "@prisma/client";
import { Smile } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CustomEmojiImage from "./CustomEmojiImage";
import { defaultEmojis } from "@/lib/utils";

interface ReactionPopoverProps {
  customEmojis: CustomEmoji[];
  toggleReactionMutation: (payload: { emoji?: string; customEmojiId?: string }) => void;
}

const DEFAULT_REACTIONS = [...new Set(["👍", "❤️", "😂", "🎉", "🙏", "🔥", ...defaultEmojis.slice(0, 10).map(e => e.emoji)])];

export default function ReactionPopover({ customEmojis, toggleReactionMutation }: ReactionPopoverProps) {
  // --- scroll / paginação leve para custom emojis ---
  const pageSize = 18;
  const [visibleCustomCount, setVisibleCustomCount] = useState(pageSize);
  const customContainerRef = useRef<HTMLDivElement | null>(null);

  // Reset quando customEmojis mudam
  useEffect(() => setVisibleCustomCount(pageSize), [customEmojis]);

  // Listener de scroll (carrega mais quando chegar perto do fim)
  useEffect(() => {
    const el = customContainerRef.current;
    if (!el) return;

    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
        setVisibleCustomCount((prev) => Math.min(prev + pageSize, customEmojis.length));
      }
    };

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [customEmojis.length]);

  // Memo para evitar recriar arrays em cada render
  const visibleCustomEmojis = useMemo(() => customEmojis.slice(0, visibleCustomCount), [customEmojis, visibleCustomCount]);

  // Click handlers com useCallback
  const handleDefaultClick = useCallback((emoji: string) => {
    toggleReactionMutation({ emoji });
  }, [toggleReactionMutation]);

  const handleCustomClick = useCallback((id: string) => {
    toggleReactionMutation({ customEmojiId: id });
  }, [toggleReactionMutation]);

  // Render de cada reação padrão: button com acessibilidade
  const renderDefaultButtons = () => {
    return DEFAULT_REACTIONS.map((e) => (
      <button
        key={`def-${e}`}
        onClick={() => handleDefaultClick(e)}
        aria-label={`Reagir com ${e}`}
        className="cursor-pointer p-1 text-2xl hover:bg-white/10 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#f5b719]"
        title={e}
        type="button"
      >
        {e}
      </button>
    ));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="h-6 w-6">
          <Smile size={16} />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto bg-[#010d26] border-gray-700 p-2" sideOffset={6}>
        {/* Reactions defaults */}
        <div className="grid grid-cols-6 gap-1 mb-2" role="list" aria-label="Reações rápidas">
          {renderDefaultButtons()}
        </div>

        {/* Linha separadora */}
        <div className="border-t border-gray-700 pt-2 -mx-2 px-2">
          {/* Área de custom emojis com scroll e paginação leve */}
          <div
            ref={customContainerRef}
            className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
            role="list"
            aria-label="Emojis personalizados"
          >
            {visibleCustomEmojis.length === 0 ? (
              <div className="col-span-6 text-xs text-gray-400 px-1">Nenhum emoji personalizado</div>
            ) : (
              visibleCustomEmojis.map((e) => (
                <div key={e.id} className="flex items-center justify-center">
                  {/* CustomEmojiImage já deve chamar onEmojiSelect com a string se for esse o comportamento.
                      Como você precisa chamar a mutação com customEmojiId, delegamos o clique diretamente. */}
                  <div
                    onClick={() => handleCustomClick(e.id)}
                    className="cursor-pointer rounded-md p-0.5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#f5b719]"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") handleCustomClick(e.id);
                    }}
                    title={e.name}
                  >
                    <CustomEmojiImage emoji={e} onEmojiSelect={() => handleCustomClick(e.id)} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* indicador simples "carregar mais" (apenas visual quando há mais) */}
          {visibleCustomCount < customEmojis.length && (
            <div className="text-xs text-center text-gray-400 mt-2">Role para ver mais</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
