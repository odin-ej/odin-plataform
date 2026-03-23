import { CustomEmoji } from "@prisma/client";
import { FullMessage } from "./MessageInput";
import RenderMessageContent from "./RenderMessageContent";
import { useEffect, useState } from "react";
import { decryptMessage } from "@/lib/actions/community";

const RenderParentMessage = ({ message, customEmojis }: { message: NonNullable<FullMessage['parent']>, customEmojis: CustomEmoji[] }) => {
    const [decryptedParentContent, setDecryptedParentContent] = useState<string | null>(null);

    useEffect(() => {
        decryptMessage(message.content).then(setDecryptedParentContent);
    }, [message.content]);

    return (
        <div className="bg-black/20 p-2 rounded-md mb-2 text-xs border-l-2 border-yellow-500">
            <p className="font-semibold text-gray-300">{message.author.name}</p>
            {decryptedParentContent === null ? (
                 <p className="text-gray-500 italic">Carregando...</p>
            ) : (
                <div className="text-gray-400 truncate">
                    <RenderMessageContent content={decryptedParentContent} customEmojis={customEmojis} />
                </div>
            )}
        </div>
    );
}

export default RenderParentMessage