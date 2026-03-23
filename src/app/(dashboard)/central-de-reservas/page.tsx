import { getAuthenticatedUser } from "@/lib/server-utils";
import { ExtendedReservation } from "@/lib/schemas/reservationsSchema";
import { ReservableItem, Room, } from "@prisma/client";
import ReservationsContent from "@/app/_components/Dashboard/reservas/ReservationsContent";
import { RequestWithApplicant } from "@/app/_components/Dashboard/reservas/SalasEaufbaContent";
import { cookies } from "next/headers";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { verifyAccess } from "@/lib/utils";
import { constructMetadata } from "@/lib/metadata";
import { ItemWithRelations } from "@/app/_components/Dashboard/reservas/ItemsContent";

export const dynamic = "force-dynamic";

export const metadata = constructMetadata({ title: "Central de Reservas" });

// Tipagem para todos os dados que a página precisa
export interface ReservationsPageData {
  rooms: Room[];
  roomReservations: ExtendedReservation[];
  eaufbaRequests: RequestWithApplicant[];
  reservableItems: ReservableItem[];
  itemReservations: ItemWithRelations[];
}

async function getReservationsData(): Promise<ReservationsPageData> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    const response = await fetch(`${baseUrl}/api/reserve/central`, {
      headers,
    });

    if (!response.ok)
      throw new Error("Falha ao buscar os dados da central de reservas.");
    return response.json();
  } catch (error) {
    console.error(error);
    return {
      rooms: [],
      roomReservations: [],
      eaufbaRequests: [],
      reservableItems: [],
      itemReservations: [],
    };
  }
}
const ReservationsPage = async () => {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return <p>Não autorizado.</p>;

  const hasPermission = verifyAccess({
    pathname: "/central-de-reservas",
    user: authUser,
  });
  if (!hasPermission) return <DeniedAccess />;

  // A função getReservationsData buscará todos os dados em paralelo no servidor
  const initialData = await getReservationsData();

  return (
    <div className="p-4 sm:p-8">
      <ReservationsContent initialData={initialData} />
    </div>
  );
};

export default ReservationsPage;
