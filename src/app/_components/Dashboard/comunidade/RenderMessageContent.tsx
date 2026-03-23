import RenderedCustomEmoji from "./RenderedCustomEmoji";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CustomEmoji } from "@prisma/client";
import React from 'react'

const RenderMessageContent = ({
  content,
  customEmojis,
}: {
  content: string;
  customEmojis: CustomEmoji[];
}) => {
  const emojiMap = new Map(customEmojis.map((e) => [e.name, e]));
  const regex = /(:[a-z0-9_]+:)/g;
  const parts = content.split(regex);

  return (
    <p className="whitespace-pre-wrap break-words text-gray-200">
      {parts.map((part, index) => {
        if (emojiMap.has(part)) {
          const emoji = emojiMap.get(part)!;
          return (
            <TooltipProvider key={index} delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block align-middle mx-0.5">
                    <RenderedCustomEmoji emoji={emoji} />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{part}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </p>
  );
};

export default RenderMessageContent