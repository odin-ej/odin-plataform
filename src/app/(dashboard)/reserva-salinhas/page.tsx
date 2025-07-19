import RoomsContent from "@/app/_components/Dashboard/RoomsContent";
import { Room } from ".prisma/client";
import { ExtendedReservation } from "@/lib/schemas/roomSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { constructMetadata } from "@/lib/metadata";
import { cookies } from "next/headers";

export const metadata = constructMetadata({ title: "Reservas de Salinhas" });

export const dynamic = "force-dynamic";

interface PageProps {
  reservations: ExtendedReservation[];
  rooms: Room[];
}

async function getPageData(): Promise<PageProps> {
  try {

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const cookiesStore = await cookies();
      const headers = { Cookie: cookiesStore.toString() };
    const response = await fetch(`${baseUrl}/api/reserve`, {
      next: { revalidate: 45 },
      headers,
    });

    const responseJson = await response.json();

    const reservations: ExtendedReservation[] = responseJson.reservations;
    const rooms: Room[] = responseJson.rooms;

    return { rooms, reservations };
  } catch (error) {
    console.error("Falha ao buscar os dados da página.", error);
    return { rooms: [], reservations: [] };
  }
}

const Page = async () => {
  const { rooms, reservations } = await getPageData();

  const authUser = await getAuthenticatedUser();
  const myReservations = reservations.filter(
    (reservation) => reservation.user.id === authUser!.id
  );
  const isDirector =
    authUser!.currentRole.area.map((area) => area === "DIRETORIA").length > 0;

  return (
    <div className="p-4 sm:p-8">
      <RoomsContent
        allReservations={reservations}
        myReservations={myReservations}
        availableRooms={rooms}
        currentUserId={authUser!.id}
        isDirector={isDirector}
      />
    </div>
  );
};

export default Page;
