import { Button } from "@/components/ui/button";
import { Room, ReservableItem } from "@prisma/client";
import {
  Box,
  School,
  User as UserIcon,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  addDays,
  format,
  getHours,
  getMinutes,
  subDays,
  isSameDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExtendedReservation } from "@/lib/schemas/reservationsSchema";
import { RequestWithApplicant } from "./SalasEaufbaContent";
import { ItemWithRelations } from "./ItemsContent";

// Tipos para as reservas que o componente recebe
type RoomReservation = ExtendedReservation & { type: "salinha" };
type ItemReservation = ItemWithRelations & { type: "item" };
type EaufbaReservation = RequestWithApplicant & { type: "eaufba" };

type CombinedReservation =
  | RoomReservation
  | ItemReservation
  | EaufbaReservation;

interface DailyScheduleViewProps {
  rooms: Room[];
  items: ReservableItem[];
  reservations: CombinedReservation[];
}

const DailyScheduleView = ({
  rooms,
  items,
  reservations,
}: DailyScheduleViewProps) => {
  // Gera os horários do dia, de 7h às 22h
  const timeSlots = Array.from(
    { length: 16 },
    (_, i) => `${String(i + 7).padStart(2, "0")}:00`
  );
  const [viewDate, setViewDate] = useState(new Date());
  const resources = useMemo(
    () => [...rooms, ...items, { id: "eaufba_resource", name: "Salas EAUFBA" }],
    [rooms, items]
  );

  const reservationsForViewDate = useMemo(() => {
    const rooms = reservations.filter(
      (r) => r.type === "salinha" && isSameDay(new Date(r.hourEnter), viewDate)
    ) as RoomReservation[];
    const items = reservations.filter(
      (r) => r.type === "item" && isSameDay(new Date(r.startDate), viewDate)
    ) as ItemReservation[];
    const eaufba = reservations.filter(
      (r) =>
        r.type === "eaufba" &&
        r.status === "APPROVED" &&
        isSameDay(new Date(r.date), viewDate)
    ) as EaufbaReservation[];
    return [...rooms, ...items, ...eaufba];
  }, [reservations, viewDate]);

  const getPosition = (date: Date) => {
    const hours = getHours(date);
    const minutes = getMinutes(date);
    // Cada hora tem 60px de altura. A posição é baseada na hora de início (a partir das 7h).
    return (hours - 7) * 60 + minutes;
  };

  const getDuration = (start: Date, end: Date) => {
    const durationInMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    return durationInMinutes;
  };

  return (
    <div className="w-full h-[50vh] sm:h-[60vh] md:h-[70vh] xl:h-full bg-[#010d26] border-2 border-[#0126fb]/30 rounded-2xl flex flex-col p-4 sm:p-6 text-white">
      <div className="flex-shrink-0 mb-4 flex flex-col sm:flex-row justify-center sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#f5b719]">
            Agenda do Dia
          </h2>
          <p className="text-sm sm:text-base text-gray-400">
            {format(viewDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
      
        <div className="flex items-center gap-2">
          <Button
            className="bg-[#0126fb] hover:bg-[#0126fb/90]"
            size="icon"
            onClick={() => setViewDate((prev) => subDays(prev, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            className="bg-[#0126fb] hover:bg-[#0126fb/90] active:bg-transparent"
            onClick={() => setViewDate(new Date())}
          >
            Hoje
          </Button>
          <Button
            className="bg-[#0126fb] hover:bg-[#0126fb/90]"
            size="icon"
            onClick={() => setViewDate((prev) => addDays(prev, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-grow overflow-auto scrollbar-thin scrollbar-thumb-[#0126fb] scrollbar-track-[#00205e]">
        <div className="flex-grow overflow-auto scrollbar-thin scrollbar-thumb-[#0126fb] scrollbar-track-[#00205e]">
          <div className="relative flex min-w-[1200px]">
            {/* Coluna da Linha do Tempo */}
            <div className="sticky left-0 z-10 w-[60px] flex-shrink-0 bg-[#010d26]">
              <div className="h-[60px]"></div> {/* Espaço para o cabeçalho */}
              {timeSlots.map((time) => (
                <div
                  key={time}
                  className="relative h-[60px] text-xs text-gray-500 text-right pr-2 -translate-y-2"
                >
                  {time}
                </div>
              ))}
            </div>

            {/* Colunas dos Recursos */}
            <div
              className="relative grid flex-grow"
              style={{
                gridTemplateColumns: `repeat(${resources.length}, minmax(150px, 1fr))`,
              }}
            >
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="relative border-l border-gray-800"
                >
                  {/* Cabeçalho do Recurso */}
                  <div className="sticky top-0 z-10 bg-[#010d26] text-center font-semibold text-sm py-2 border-b-2 border-gray-800 flex items-center justify-center gap-2 h-[60px]">
                    {resource.id === "eaufba_resource" ? (
                      <School className="h-4 w-4 text-[#f5b719]" />
                    ) : "description" in resource ? (
                      <Box className="h-4 w-4 text-[#f5b719]" />
                    ) : (
                      <CalendarIcon className="h-4 w-4 text-[#f5b719]" />
                    )}
                    <span className="truncate">{resource.name}</span>
                  </div>

                  {/* Linhas da Grade */}
                  <div className="absolute top-[60px] left-0 right-0 bottom-0">
                    {timeSlots.map((time) => (
                      <div
                        key={time}
                        className="h-[60px] border-t border-gray-800"
                      ></div>
                    ))}
                  </div>

                  {/* Eventos */}
                  <div className="absolute top-[60px] left-0 right-0 bottom-0 p-1">
                    {reservationsForViewDate
                      .filter((event) => {
                        if (event.type === "eaufba")
                          return resource.id === "eaufba_resource";
                        if (event.type === "salinha")
                          return event.roomId === resource.id;
                        if (event.type === "item")
                          return event.item.id === resource.id;
                        return false;
                      })
                      .map((event) => {
                        if (event.type === "eaufba") {
                          return (
                            <div
                              key={event.id}
                              className="p-2 mb-2 rounded-lg border text-xs overflow-hidden bg-slate-800/50 border-slate-700"
                            >
                              <p className="font-bold truncate">
                                {event.title}
                              </p>
                              <p className="font-ligh text-[9px] text-slate-100 italic truncate">
                                {event.type === "eaufba" &&
                                  "Horário Específico" }
                              </p>
                              <div className="flex items-center gap-1.5 opacity-80 mt-1">
                                <UserIcon className="h-3 w-3" />
                                <span className="truncate">
                                  {event.applicant.name}
                                </span>
                              </div>
                            </div>
                          );
                        }

                        const start = new Date(
                          event.type === "salinha"
                            ? event.hourEnter
                            : event.startDate
                        );
                        const end = new Date(
                          event.type === "salinha"
                            ? event.hourLeave
                            : event.endDate
                        );
                        const top = getPosition(start);
                        const height = getDuration(start, end);

                        return (
                          <div
                            key={event.id}
                            className="absolute w-[calc(100%-8px)] left-[4px] p-2 rounded-lg border text-xs overflow-hidden"
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                              backgroundColor:
                                event.type === "salinha"
                                  ? "rgba(1, 38, 251, 0.2)"
                                  : "rgba(245, 183, 25, 0.2)",
                              borderColor:
                                event.type === "salinha"
                                  ? "#0126fb"
                                  : "#f5b719",
                            }}
                          >
                            <p className="font-bold truncate">
                              {event.type === "salinha"
                                ? event.title
                                : event.item.name}
                            </p>

                            <div className="flex items-center gap-1.5 opacity-80 mt-1">
                              {event.type === "salinha" ? (
                                <UserIcon className="h-3 w-3" />
                              ) : (
                                <Box className="h-3 w-3" />
                              )}
                              <span className="truncate">
                                {event.user.name}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyScheduleView;
