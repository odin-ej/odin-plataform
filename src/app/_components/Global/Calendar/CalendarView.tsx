/* eslint-disable @typescript-eslint/no-explicit-any */
import { cn } from "@/lib/utils";
import { Clock, LogIn, LogOut } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";
import { endOfMonth, startOfMonth } from "date-fns";

// --- Tipagem para os dados do evento ---
interface CalendarEvent {
  id: string;
  summary: string; // Título do evento
  start: {
    dateTime?: string; // Para eventos com hora
    date?: string; // Para eventos de dia inteiro
  };
  _internalDate?: Date;
}

export interface CustomCalendarProps {
  className?: string;
  clientId: string;
  calendarId: string;
}

// O componente principal que lida com a lógica de login e exibição
const CalendarView = ({
  className,
  clientId,
  calendarId,
}: CustomCalendarProps) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [gsiClient, setGsiClient] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  
  // ✅ NOVO ESTADO: Armazena o mês que está sendo exibido no calendário
  const [displayMonth, setDisplayMonth] = useState(new Date());

  useEffect(() => {
    const storedToken = localStorage.getItem("google_calendar_token");
    const storedExpiry = localStorage.getItem("google_calendar_token_expiry");

    if (
      storedToken &&
      storedExpiry &&
      Date.now() < parseInt(storedExpiry, 10)
    ) {
      setToken(storedToken);
    }
  }, []);

  // Efeito para inicializar o cliente OAuth do Google
  useEffect(() => {
    if (clientId && (window as any).google && (window as any).google.accounts) {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/calendar.readonly",
        callback: (tokenResponse: {
          access_token: string;
          expires_in: number; // O token do Google expira em 3600 segundos (1 hora)
        }) => {
          if (tokenResponse && tokenResponse.access_token) {
            // O tempo máximo de expiração é de 1 hora, definido pelo Google.
            const expiryTime = Date.now() + tokenResponse.expires_in * 1000;
            localStorage.setItem(
              "google_calendar_token",
              tokenResponse.access_token
            );
            localStorage.setItem(
              "google_calendar_token_expiry",
              expiryTime.toString()
            );
            setToken(tokenResponse.access_token);
          } else {
            setError("Falha ao obter o token de acesso.");
          }
        },
        error_callback: () => setError("Falha no login com o Google."),
      });
      setGsiClient(client);
    }
  }, [clientId]);

  const handleLogin = () => {
    if (gsiClient) gsiClient.requestAccessToken();
    else setError("O cliente de autenticação do Google não está pronto.");
  };

  const handleLogout = () => {
    if (token && (window as any).google) {
      (window as any).google.accounts.oauth2.revoke(token, () => {
        console.log("Token revogado com sucesso.");
      });
    }
    localStorage.removeItem("google_calendar_token");
    localStorage.removeItem("google_calendar_token_expiry");
    setToken(null);
    setEvents([]);
  };

  // ✅ EFEITO ATUALIZADO: Busca eventos quando o token ou o mês de exibição mudam
  useEffect(() => {
    if (!token || !calendarId) return;

    const fetchEvents = async () => {
      setLoading(true);
      setError(null);

      // Define o período de busca para o mês inteiro que está sendo exibido
      const timeMin = startOfMonth(displayMonth).toISOString();
      const timeMax = endOfMonth(displayMonth).toISOString();

      const apiUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin}&timeMax=${timeMax}&orderBy=startTime&singleEvents=true&maxResults=250`;

      try {
        const response = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
            // Se o token expirou (erro 401), desloga o usuário para que ele possa logar novamente
            if (response.status === 401) {
                handleLogout();
                setError("Sua sessão expirou. Por favor, conecte-se novamente.");
                return;
            }
            throw new Error(`Erro ao buscar eventos: ${response.statusText}`);
        }

        const data = await response.json();
        const correctedEvents = (data.items || []).map((event: any) => {
          let internalDate;
          if (event.start.date) {
            internalDate = new Date(event.start.date + "T12:00:00");
          } else if (event.start.dateTime) {
            internalDate = new Date(event.start.dateTime);
          }
          return { ...event, _internalDate: internalDate };
        });

        setEvents(correctedEvents);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, calendarId, displayMonth]); // Dispara a busca ao mudar o mês

  const formatTime = (start: CalendarEvent["start"]) => {
    if (!start.dateTime) return "Dia inteiro";
    return new Date(start.dateTime).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const selectedDayEvents = events.filter((event) => {
    if (!event._internalDate || !selectedDate) return false;
    return event._internalDate.toDateString() === selectedDate.toDateString();
  });

  const eventDays = events
    .map((event) => event._internalDate)
    .filter(Boolean) as Date[];
  return (
    <div
      className={cn(
        "w-full h-auto rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] p-4 sm:p-6 text-white shadow-lg grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8",
        className
      )}
    >
      <div className="w-full flex justify-center">
        <style>{`
        .event-day {
          position: relative;
        }
        .event-day::after {
          content: '';
          display: block;
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background-color: #f5b719;
        }
         .today-style {
          border: 1px solid #0126fb;
          color: #0126fb;
          font-weight: bold;
        }
      `}</style>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          locale={ptBR}
          className="rounded-md w-full bg-transparent p-4  [data-selected-single='true']:!bg-[#0126fb] font-semibold"
          classNames={{
            button_next:
              "bg-transparent p-0 opacity-70 hover:opacity-100 border border-transparent hover:border-[#0126fb] hover:!bg-[#f5b719] rounded-md transition-colors",
            button_previous:
              "bg-transparent p-0 opacity-70 hover:opacity-100 border border-transparent hover:border-[#0126fb] hover:!bg-[#f5b719] rounded-md transition-colors",
            day_button:
              "bg-transparent text-white focus:text-white hover:bg-[#f5b719] hover:text-white focus-visible:ring-0",
            months: "text-white",
            month:
              "space-y-4 text-white flex flex-col items-center justify-center",
            caption:
              "flex justify-center pt-1 relative items-center text-white",
            caption_label: "text-xl font-bold text-[#0126fb]",
            nav: "space-x-1 flex items-center",
            nav_button:
              "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 border border-transparent hover:border-[#0126fb] hover:!bg-[#f5b719] rounded-md transition-colors",
            table: "w-full items-center justify-center border-collapse mt-4",
            head_row: "",
            head_cell:
              "text-gray-400 rounded-md w-10 text-center font-normal text-[0.8rem] pb-2",
            row: "mt-2",
            cell: "h-10 w-10 text-center text-sm p-0 relative",
            day: "h-10 w-10 p-0 font-normal rounded-md transition-colors bg-transparent hover:bg-transparent focus-visible:outline-none focus-visible:ring-0",
            selected: "text-white focus-visible:ring-0 font-semibold ",
          }}
          modifiers={{ event: eventDays }}
          modifiersClassNames={{ event: "event-day", today: "today-style" }}
          month={displayMonth} // Controla o mês exibido
          onMonthChange={setDisplayMonth} // Atualiza o estado quando o usuário navega
        />
      </div>

      {/* Coluna de Eventos */}
      <div className="w-full flex flex-col">
        <div className="flex items-center justify-center relative mb-4">
          <h2 className="text-xl md:text-2xl mt-2 md:mt-0 font-bold text-center mb-4 text-[#0126fb]">
            Eventos do Dia
          </h2>
          {/* CORREÇÃO: Botão de Logout aparece se o usuário estiver logado */}
          {token && (
            <button
              onClick={handleLogout}
              title="Desconectar conta Google"
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
        {!token && (
          <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#00205e]/20 rounded-lg">
            <p className="mb-4 text-gray-400 text-center">
              Conecte sua conta Google para ver os eventos.
            </p>
            <button
              onClick={handleLogin}
              disabled={!gsiClient}
              className="flex items-center gap-2 px-6 py-3 bg-[#0126fb] rounded-lg font-semibold hover:bg-[#0126fb]/80 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              <LogIn size={18} />
              Conectar com Google
            </button>
            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
          </div>
        )}
        {token && (
          <div className="flex-1 h-full min-h-[300px]">
            {loading && (
              <p className="text-center pt-16">Carregando eventos...</p>
            )}
            {!loading && (
              <div className="space-y-3 h-full max-h-[400px] overflow-y-auto pr-2">
                {selectedDayEvents.length > 0 ? (
                  selectedDayEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-4 rounded-lg bg-[#00205e] p-3 transition-all hover:bg-[#00205e]/70"
                    >
                      <div className="flex-1">
                        <h3 className="font-bold text-sm">{event.summary}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Clock size={14} />
                        <span>{formatTime(event.start)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-center text-gray-400">
                      Nenhum evento para este dia.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarView;
