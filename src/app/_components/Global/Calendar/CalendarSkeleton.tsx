import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const CalendarSkeleton = () => {
    return (
        <div
            className={cn(
                "w-full h-auto rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] p-4 sm:p-6 text-white shadow-lg flex flex-col items-center justify-center"
            )}
        >
            <LoaderCircle className="h-12 w-12 animate-spin text-[#0126fb]" />
            <p className="mt-4 text-lg text-gray-400">Preparando o calendário...</p>
        </div>
    );
};

export default CalendarSkeleton;