// src/app/(dashboard)/chat/_components/ChatSkeleton.tsx
import { MessageSquare, Paperclip, Send } from "lucide-react";

const SkeletonCard = () => (
  <div className="h-24 w-full bg-[#010d26] rounded-lg animate-pulse" />
);

const SkeletonMessage = ({ align = 'left' }: { align?: 'left' | 'right' }) => (
  <div className={`flex items-start gap-4 ${align === 'right' && 'justify-end'}`}>
    {/* Avatar */}
    <div className={`h-10 w-10 rounded-full bg-slate-700 animate-pulse flex-shrink-0 ${align === 'right' && 'order-2'}`} />
    
    {/* Bubble */}
    <div className={`w-full max-w-md space-y-2 ${align === 'right' && 'order-1'}`}>
      <div className="h-4 bg-slate-700 rounded w-3/4 animate-pulse" />
      <div className="h-4 bg-slate-700 rounded w-full animate-pulse" />
      <div className="h-4 bg-slate-700 rounded w-1/2 animate-pulse" />
    </div>
  </div>
);

const ChatSkeleton = () => {
  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <div className="rounded-lg flex flex-col h-full max-h-[85vh] bg-[#010d26]">
        {/* Header */}
        <div className="sticky top-0 z-10 w-full bg-[#010d26] border-b border-blue-500/20 p-4 flex justify-end">
          <div className="h-10 w-10 flex items-center justify-center bg-slate-800 rounded-lg animate-pulse">
            <MessageSquare className="text-slate-600" />
          </div>
        </div>

        {/* Message List */}
        <div className="flex-1 min-h-[60vh] space-y-8 px-4 py-6">
          <SkeletonMessage align="left" />
          <SkeletonMessage align="right" />
          <SkeletonMessage align="left" />
        </div>

        {/* Input Bar */}
        <div className="border-t border-slate-700 bg-[#00205e] p-4">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <div className="h-10 w-10 rounded-full bg-slate-700 animate-pulse"><Paperclip className="h-5 w-5 mx-auto mt-2.5 text-slate-600"/></div>
            <div className="flex-1 h-10 bg-slate-700 rounded-lg animate-pulse" />
            <div className="h-10 w-10 rounded-full bg-slate-700 animate-pulse"><Send className="h-5 w-5 mx-auto mt-2.5 text-slate-600"/></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatSkeleton;