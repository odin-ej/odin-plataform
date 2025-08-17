"use client";
import { Handshake, Loader2 } from "lucide-react";
import CustomCard from "../../Global/Custom/CustomCard";
import CustomCarousel, { SlideData } from "../../Global/Custom/CustomCarousel";
import { Role, AreaRoles } from "@prisma/client";
import CustomTable, { ColumnDef } from "../../Global/Custom/CustomTable";
import ValueCarousel, { ValueSlide } from "./ValueCarousel";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MemberViewModal from "./MemberViewModal";
import { MemberWithFullRoles } from "@/lib/schemas/memberFormSchema";
import AccountCard from "./AccountCard";
import { fullStrategy } from "@/app/(dashboard)/atualizar-estrategia/page";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthProvider";
import { checkUserPermission, exportToExcel } from "@/lib/utils";
import Organograma from "../gerenciar-cargos/Organograma";

interface MondayStats {
  totalProjects: number;
  details: { accountName: string; projectCount: number }[];
}

interface CulturePageData {
  estrategy: fullStrategy;
  allUsers: MemberWithFullRoles[];
  mondayStats: MondayStats;
  roles: Role[]
}

interface CulturalContentProps {
  initialData: CulturePageData;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const fetchCulturalData = async (): Promise<CulturePageData> => {
  const [estrategyRes, usersRes, mondayRes, rolesRes] = await Promise.all([
    axios.get(`${API_URL}/api/culture`),
    axios.get(`${API_URL}/api/users`),
    axios.get(`${API_URL}/api/monday-stats`),
    axios.get(`${API_URL}/api/roles`),
  ]);
  return {
    estrategy: estrategyRes.data[0], // A API de cultura retorna um array
    allUsers: usersRes.data.users,
    mondayStats: mondayRes.data,
    roles: rolesRes.data,
  };
};

const CulturalContent = ({ initialData }: CulturalContentProps) => {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MemberWithFullRoles | null>(
  null
  );
  const { user } = useAuth();

  const isDirector = useMemo(() => {
    if (!user) return false;
    return checkUserPermission(user, { allowedAreas: [AreaRoles.DIRETORIA] });
  }, [user]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["culturalPageData"],
    queryFn: fetchCulturalData,
    initialData: initialData, // "Hidrata" com os dados do servidor
  });
  const titles = ["Propósito", "Missão", "Visão"];

  const { motherValue, slidesData, valueSlides, accounts } = useMemo(() => {
    const motherValue = data.estrategy.values.find(
      (value: { isMotherValue: boolean }) => value.isMotherValue === true
    )?.name;

    const slidesData: SlideData[] = [
      {
        subtitle: data.estrategy.propose,
        progress: 0,
        valueText: "",
        mainText: "",
        date: "",
      },
      {
        subtitle: data.estrategy.mission,
        progress: 0,
        valueText: "",
        mainText: "",
        date: "",
      },
      {
        subtitle: data.estrategy.vision,
        progress: 0,
        valueText: "",
        mainText: "",
        date: "",
      },
    ];

    const valueSlides: ValueSlide[] = data.estrategy.values
      .filter((value: { isMotherValue: boolean }) => !value.isMotherValue)
      .map((value: { name: string; description: string }) => ({
        title: value.name,
        description: value.description,
      }));

    const alfaTotalProjects = data.mondayStats.details.find(
      (detail: { accountName: string }) => detail.accountName === "ALFA 🧡"
    )?.projectCount;
    const betaTotalProjects = data.mondayStats.details.find(
      (detail: { accountName: string }) => detail.accountName === "BETA 💜"
    )?.projectCount;
    const deltaTotalProjects = data.mondayStats.details.find(
      (detail: { accountName: string }) => detail.accountName === "DELTA🔺"
    )?.projectCount;

    const accounts = [
      {
        name: "ALFA",
        description:
          "A Alfa conjura a perfeição. Somos a essência do poder bruxo, e nossa grandeza é inquestionável! Alfa!",
        imageUrl: "/alfa-2.png",
        totalProjects: alfaTotalProjects!,
        color: "text-orange-500",
      },
      {
        name: "BETA",
        description:
          "Com ou sem joias, a Beta já possui o poder ilimitado. Nosso reinado é absoluto. Somos inevitáveis!",
        imageUrl: "/beta.png",
        totalProjects: betaTotalProjects!,
        color: "text-purple-500",
      },
      {
        name: "DELTA",
        description:
          "O palco é nosso, e a Delta é a estrela. Ninguém nos iguala. Somos a própria obra-prima. Open the Delta!",
        imageUrl: "/delta-2.png",
        totalProjects: deltaTotalProjects!,
        color: "text-rose-500",
      },
    ];
    return { motherValue, slidesData, valueSlides, accounts };
  }, [data]);

  const openModal = (user: MemberWithFullRoles) => {
    setSelectedUser(user!);
    setIsOpenModal(true);
  };

  const handleExport = () => {
    // Você pode querer formatar os dados antes de exportar
    const dataToExport = data.allUsers.map((u) => ({
      Nome: u.name,
      Email: u.email,
      EmailEj: u.emailEJ,
      Nascimento: u.birthDate,
      Telefone: u.phone,
      Curso: u.course || "N/A",
      Semestre_Entrada: u.semesterEntryEj || "N/A",
      Semestre_Saida: u.semesterLeaveEj || "N/A",
      Cargo: u.currentRole?.name || "Ex Membro",
      Cargos: u.roles.map((role) => role.name).join(", "),
      Historico_Cargos: u.roleHistory?.map(roleH => roleH.role.name+' - '+roleH.semester).join(", ") || 'Não preenchido',
      ExMembro: u.isExMember ? "Sim" : "Não",
      Trabalha: u.isWorking ? "Sim" : "Não",
      Local_Trabalho: u.workplace || "N/A",
      Linkedin: u.linkedin || "N/A",
      Instagram: u.instagram || "N/A",
      Outro_Cargo: u.otherRole || "N/A",
      Sobre: u.about || "N/A",
      Experiencia: u.aboutEj || "N/A",
      Imagem: u.imageUrl || "N/A",
      Interesses_Categoria: u.professionalInterests.map(i => i.name + ' - '+i.category.name),
      Data_Exportacao: new Date().toLocaleDateString().split("T")[0],
    }));
    exportToExcel(dataToExport, "banco_de_socios");
  };

  const usersColumns: ColumnDef<MemberWithFullRoles>[] = [
    {
      accessorKey: "name",
      header: "Nome",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 ">
            <AvatarImage
              className="object-cover"
              src={row.imageUrl ?? undefined}
            />
            <AvatarFallback>{row.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "emailEJ",
      header: "Email EJ",
    },
    {
      accessorKey: "isExMember",
      header: "Ex-Membro",
      cell: (row) => (
        <span className="font-medium">{row.isExMember ? "Sim" : "Não"}</span>
      ),
    },
  ];

    const areas = useMemo(() => {
      const allAreas = new Set<AreaRoles>();
      data?.roles.forEach((role) =>
        role.area.forEach((area) => allAreas.add(area))
      );
      return Array.from(allAreas);
    }, [data?.roles]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-[#f5b719]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-8 text-white">
        Erro ao carregar os dados da página cultural.
      </div>
    );
  }

  return (
    <>
      <CustomCard
        icon={Handshake}
        title="Área Cultural Digital"
        type="introduction"
        description="Aqui está uma pequena parte da cultura da nossa casinha."
        value={0}
      />

      <div className="mt-4 text-center w-full flex items-center justify-center flex-col">
        <h3 className="uppercase tracking-widest font-semibold  text-md sm:text-lg text-white">
          Nosso valores
        </h3>
        <h2 className="font-bold text-2xl sm:text-5xl text-[#f5b719]">
          &quot;{motherValue}&quot;
        </h2>
        <ValueCarousel slides={valueSlides} />
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
        <CustomCarousel title={titles} type="title-in" slides={slidesData} />
      </div>

      <div className='mt-4'>
        <Organograma users={data.allUsers} areas={areas} isManagment={false} />
      </div>

      <div className="mt-4">
        <CustomTable<MemberWithFullRoles>
          title="Sócio(as) da Casinha"
          data={data.allUsers}
          columns={usersColumns}
          itemsPerPage={10}
          filterColumns={[
            "name",
            "email",
            "phone",
            "emailEJ",
            "instagram",
            "linkedin",
            "course",
            "semesterEntryEj",
            "semesterLeaveEj",
            "isExMember",
          ]}
          type="onlyView"
          onRowClick={(row) => openModal(row)}
          onExportClick={isDirector ? handleExport : undefined}
        />
      </div>

      <div className="mt-10">
        <h2 className="text-center text-white text-5xl font-semibold -textwhite pb-6">
          &quot;Qual a melhor conta da{" "}
          <b className="text-[#f5b719]">Empresa JR?</b>&quot;
        </h2>
        <div className=" flex flex-col sm:flex-row justify-center items-stretch gap-6 flex-wrap md:flex-nowrap">
          {accounts.map((account) => (
            <AccountCard key={account.name} {...account} />
          ))}
        </div>
      </div>
      {selectedUser && (
        <MemberViewModal
          user={selectedUser}
          open={isOpenModal}
          onOpenChange={setIsOpenModal}
        />
      )}
    </>
  );
};

export default CulturalContent;
