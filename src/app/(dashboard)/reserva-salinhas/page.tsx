import RoomsContent from "@/app/_components/Dashboard/RoomsContent";
import { Room } from "@prisma/client";
import { ExtendedReservation } from "@/lib/schemas/roomSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { constructMetadata } from "@/lib/metadata";
import { cookies } from "next/headers";

export const metadata = constructMetadata({ title: "Reservas de Salinhas" });
export const dynamic = "force-dynamic";

// Define the shape of our page data
export interface RoomsPageData {
  reservations: ExtendedReservation[];
  rooms: Room[];
}

async function getPageData(): Promise<RoomsPageData> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    const response = await fetch(`${baseUrl}/api/reserve`, {
      cache: "no-store",
      headers,
    });

    if (!response.ok) throw new Error("Falha ao buscar dados.");

    const responseJson = await response.json();
    return {
      rooms: responseJson.rooms,
      reservations: responseJson.reservations,
    };
  } catch (error) {
    console.error("Falha ao buscar os dados da página.", error);
    return { rooms: [], reservations: [] };
  }
}

const Page = async () => {
  const initialData = await getPageData();
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    return <div>Usuário não autenticado.</div>;
  }

  // Passamos todos os dados para o cliente, que fará a filtragem
  return (
    <div className="p-4 sm:p-8">
      <RoomsContent
        initialData={initialData}
        currentUserId={authUser.id}
        isDirector={authUser.currentRole.area.includes("DIRETORIA")}
      />
    </div>
  );
};

export default Page;
