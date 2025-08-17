"use client";
import React, { useState, useMemo } from "react";
import {
  format,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isBefore,
  startOfToday,
  addDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  School,
  Box,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Estrutura de um evento unificado que o calendário espera
export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: "salinha" | "eaufba" | "item";
  color: string;
};

interface UnifiedCalendarProps {
  events: CalendarEvent[];
  onDateClick: (date: Date) => void; // Função para abrir o modal de criação
  onEventClick: (event: CalendarEvent) => void; // Função para abrir o modal de edição
}

enum CalendarView {
  MONTH = "month",
  WEEK = "week",
}

const UnifiedCalendar = ({
  events,
  onDateClick,
  onEventClick,
}: UnifiedCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>(CalendarView.MONTH); // Estado para a visão
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    events.forEach((event) => {
      // gera todos os dias entre o início e o fim da reserva
      const daysInRange = eachDayOfInterval({
        start: event.start,
        end: event.end,
      });

      daysInRange.forEach((day) => {
        const dayKey = format(day, "yyyy-MM-dd");
        if (!map.has(dayKey)) map.set(dayKey, []);
        map.get(dayKey)?.push(event);
      });
    });

    return map;
  }, [events]);

  const moveDate = (amount: number) => {
    if (view === CalendarView.MONTH) {
      setCurrentDate(addMonths(currentDate, amount));
    } else {
      setCurrentDate(addDays(currentDate, amount * 7)); // Move de 7 em 7 dias para a visão de semana
    }
  };

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  // Gera os dias a serem exibidos com base na visão (mês ou semana)
  const days = useMemo(() => {
    if (view === CalendarView.WEEK) {
      const weekStart = startOfWeek(currentDate, { locale: ptBR });
      return eachDayOfInterval({
        start: weekStart,
        end: endOfWeek(weekStart, { locale: ptBR }),
      });
    }
    // Lógica para o mês (padrão)
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { locale: ptBR }),
      end: endOfWeek(monthEnd, { locale: ptBR }),
    });
  }, [currentDate, view]);

  const headerFormat =
    view === CalendarView.MONTH ? "MMMM yyyy" : `'Semana de' d 'de' MMMM`;

  const getEventIcon = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "salinha":
        return <CalendarIcon className="h-3 w-3 mr-1.5" />;
      case "eaufba":
        return <School className="h-3 w-3 mr-1.5" />;
      case "item":
        return <Box className="h-3 w-3 mr-1.5" />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] p-4 sm:p-6 text-white shadow-lg">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
        {/* Navegação de Data */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => moveDate(-1)}>
            <ChevronLeft />
          </Button>
          <h2 className="text-lg sm:text-xl font-bold text-center text-[#f5b719] capitalize w-48 sm:w-auto">
            {format(currentDate, headerFormat, { locale: ptBR })}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => moveDate(1)}>
            <ChevronRight />
          </Button>
        </div>
        {/* Controles de Visualização e Ação */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-[#00205e]/50 rounded-lg">
            <Button
              size="sm"
              onClick={() => setView(CalendarView.WEEK)}
              variant={view === "week" ? "default" : "ghost"}
              className={cn(
                view === "week" && "bg-[#0126fb] hover:bg-[#0126fb]/90"
              )}
            >
              Semana
            </Button>
            <Button
              size="sm"
              onClick={() => setView(CalendarView.MONTH)}
              variant={view === "month" ? "default" : "ghost"}
              className={cn(
                view === "month" && "bg-[#0126fb] hover:bg-[#0126fb]/90"
              )}
            >
              Mês
            </Button>
          </div>
        </div>
      </div>

      {/* Grid do Calendário */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-2">
        {weekDays.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const dayEvents = (eventsByDay.get(dayKey) || []).sort(
            (a, b) => a.start.getTime() - b.start.getTime()
          );
          const isPast = isBefore(day, startOfToday());

          return (
            <div
              key={day.toString()}
              className={cn(
                "h-28 sm:h-36 p-1.5 sm:p-2 border border-gray-800 rounded-md transition-colors overflow-hidden flex flex-col",
                view === "month" &&
                  !isSameMonth(day, currentDate) &&
                  "bg-black/20 text-gray-600",
                isPast && "bg-black/20 text-gray-600 pointer-events-none",
                isToday(day) && "bg-blue-500/10",
                !isPast && "cursor-pointer hover:bg-[#00205e]"
              )}
              onClick={() => !isPast && onDateClick(day)}
            >
              <span
                className={cn(
                  "font-bold text-xs sm:text-sm",
                  isToday(day) && "text-[#f5b719]"
                )}
              >
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-1 text-[10px] sm:text-xs scrollbar-thin scrollbar-thumb-gray-700">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className="p-1 rounded truncate flex items-center"
                    style={{ backgroundColor: `${event.color}` }}
                    title={`${format(event.start, "HH:mm")} - ${format(event.end, "HH:mm")}  | ${event.title}`}
                  >
                    {getEventIcon(event.type)}
                    <span className="truncate">
                      {event.type !== "eaufba" &&
                        `${format(event.start, "HH:mm")} - ${format(event.end, "HH:mm")}`}{" "}
                      | {event.title}
                    </span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-center text-gray-400 font-bold pt-1 overflow-hidden">
                    + {dayEvents.length - 3} mais...
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UnifiedCalendar;
