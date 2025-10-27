"use client";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { CustomEmoji } from "@prisma/client";
import { getCommunityFileSignedUrl } from "@/lib/actions/community";
import { cn } from "@/lib/utils";

interface CustomEmojiImageProps {
    emoji: CustomEmoji;
    onEmojiSelect: (name: string) => void;
    isReaction?: boolean;
}

const CustomEmojiImage = ({ emoji, onEmojiSelect, isReaction }: CustomEmojiImageProps) => {
    // Busca a URL segura para esta imagem específica
    const { data: signedUrl, isLoading } = useQuery({
        queryKey: ['emojiUrl', emoji.id],
       queryFn: () => getCommunityFileSignedUrl(emoji.imageUrl), // imageUrl aqui é a 'key'
        staleTime: 60 * 5 * 1000, // Cache de 5 minutos
        refetchOnWindowFocus: false,
    });

    if (isLoading) {
        return <div className="h-6 w-6 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>;
    }

    if (!signedUrl) {
        return <div className="h-6 w-6 bg-red-500/20 rounded-sm" title="Erro ao carregar" />;
    }
  
    return (
        <Image
            src={signedUrl}
            alt={emoji.name}
            width={24}
            height={24}
            onClick={() => onEmojiSelect(emoji.name)}
            className={cn("cursor-pointer", !isReaction && "hover:scale-125 transition-transform")}
        />
    );
};

export default CustomEmojiImage;