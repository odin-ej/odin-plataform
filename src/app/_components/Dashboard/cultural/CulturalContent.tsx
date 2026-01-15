"use client";
import { Handshake, Loader2 } from "lucide-react";
import CustomCard from "../../Global/Custom/CustomCard";
import CustomCarousel, { SlideData } from "../../Global/Custom/CustomCarousel";
import { AreaRoles } from "@prisma/client";
import CustomTable, { ColumnDef } from "../../Global/Custom/CustomTable";
import ValueCarousel, { ValueSlide } from "./ValueCarousel";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MemberViewModal from "./MemberViewModal";
import { MemberWithFullRoles } from "@/lib/schemas/memberFormSchema";
import AccountCard from "./AccountCard";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthProvider";
import { checkUserPermission, exportToExcel } from "@/lib/utils";
import Organograma from "../gerenciar-cargos/Organograma";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CulturePageProps } from "@/app/(dashboard)/cultural/page";
import { getUserStatus } from "../../../../lib/utils";

interface CulturalContentProps {
  initialData: CulturePageProps;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const fetchCulturalData = async (): Promise<CulturePageProps> => {
  const [pageRes, mondayRes] = await Promise.all([
    axios.get(`${API_URL}/api/culture`),
    axios.get(`${API_URL}/api/monday-stats`),
  ]);
  return {
    estrategy: pageRes.data.estrategyRes[0], // A API de cultura retorna um array
    allUsers: pageRes.data.usersRes,
    mondayStats: mondayRes.data,
    roles: pageRes.data.rolesRes,
    interestCategories: pageRes.data.categoriesInterestRes,
    professionalInterests: pageRes.data.interestRes,
    semesters: pageRes.data.semestersRes,
  };
};

const CulturalContent = ({ initialData }: CulturalContentProps) => {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MemberWithFullRoles | null>(
    null
  );
  const { user } = useAuth();

  const [filters, setFilters] = useState({
    isExMember: "all",
    isWorking: "all",
    interests: "all",
    interestCategories: "all",
    roleId: "all",
    semester: "all",
  });

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
    if (!data.estrategy || !data.mondayStats) return {};
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
          "Energia, garra e excelência definem quem somos. A Alfa ruge mais alto. Alfa!",
        imageUrl: "/alfa-3.png",
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
        imageUrl: "/delta-3.png",
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

  const filteredUsers = useMemo(() => {
    if (!data?.allUsers) return [];

    return data.allUsers.filter((user) => {
      const exMemberFilter =
        filters.isExMember === "all" ||
        user.isExMember === (filters.isExMember === "yes");

      const workingFilter =
        filters.isWorking === "all" ||
        (user.isWorking ?? false) === (filters.isWorking === "yes");

      const roleFilter =
        filters.roleId === "all" ||
        user.roles.some((role) => role.id === filters.roleId);

      const interestsFilter =
        filters.interests === "all" ||
        user.professionalInterests.some((i) => i.name === filters.interests);

      const categoriesInterestFilter =
        filters.interestCategories === "all" ||
        user.professionalInterests.some(
          (i) => i.category.name === filters.interestCategories
        );

      const semesterFilter =
        filters.semester === "all" || user.semesterEntryEj === filters.semester;

      return (
        exMemberFilter &&
        workingFilter &&
        roleFilter &&
        interestsFilter &&
        categoriesInterestFilter &&
        semesterFilter
      );
    });
  }, [data?.allUsers, filters]);

  const handleExport = () => {
    // Você pode querer formatar os dados antes de exportar
    if (!filteredUsers) return null;
    const dataToExport = filteredUsers.map((u) => {
      console.log(u);
      return {
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
        Historico_Cargos:
          u.roleHistory
            ?.map((roleH) => roleH.role.name + " - " + roleH.semester)
            .join(", ") || "Não preenchido",
        ExMembro: u.isExMember ? "Sim" : "Não",
        Trabalha: u.isWorking ? "Sim" : "Não",
        Local_Trabalho: u.workplace || "N/A",
        Linkedin: u.linkedin || "N/A",
        Instagram: u.instagram || "N/A",
        Outro_Cargo: u.otherRole || "N/A",
        Sobre: u.about || "N/A",
        Experiencia: u.aboutEj || "N/A",
        Imagem: u.imageUrl || "N/A",
        Interesses_Categorias: u.professionalInterests
          .map((i) => `${i.name} - ${i.category.name}`)
          .join(", "),
        Data_Exportacao: new Date().toLocaleDateString().split("T")[0],
      };
    });
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
      accessorKey: "currentRole",
      header: "Cargo Atual",
      cell: (row) => row.currentRole?.name ?? "Ex-Membro",
    },
    {
      accessorKey: "roles",
      header: "Todos os cargos",
      cell: (row) => row.roles.map((role) => role.name).join(", "),
    },
    {
      accessorKey: "semesterEntryEj",
      header: "Semestre de Entrada",
      cell: (row) => <span className="font-medium">{row.semesterEntryEj}</span>,
    },
    {
      accessorKey: "lastActiveAt",
      header: "Último Acesso",
      cell: (row) => <span className="font-medium">{getUserStatus(row.lastActiveAt).label === 'Online' ? (
        <span className="text-green-500 flex items-center gap-1"><span className='w-2 h-2 bg-green-500 rounded-full'></span> Online</span>
      ) : (
        <span className='text-gray-500'>{getUserStatus(row.lastActiveAt).label[0].toUpperCase() + getUserStatus(row.lastActiveAt).label.slice(1)}</span>
      )}</span>,
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
        <ValueCarousel slides={valueSlides!} />
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
        <CustomCarousel title={titles} type="title-in" slides={slidesData} />
      </div>

      <div className="mt-4">
        <Organograma
          users={data.allUsers!}
          areas={areas}
          isManagment={false}
          onClick={(user) => openModal(user)}
        />
      </div>

      <div className="mt-8 p-4 bg-[#010d26]/60 rounded-2xl border-2 border-[#0126fb]/30">
        <h3 className="text-xl font-bold text-[#0126fb] mb-4">
          Filtros Avançados
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="status-filter" className="text-white text-sm">
              Situação
            </Label>
            <Select
              value={filters.isExMember}
              onValueChange={(value) =>
                setFilters((p) => ({ ...p, isExMember: value }))
              }
            >
              <SelectTrigger
                id="status-filter"
                className="bg-[#00205e] border-gray-600 text-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#010d26] border-gray-600 text-white">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="no">Membro Ativo</SelectItem>
                <SelectItem value="yes">Ex-Membro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="working-filter" className="text-white text-sm">
              Trabalhando
            </Label>
            <Select
              value={filters.isWorking}
              onValueChange={(value) =>
                setFilters((p) => ({ ...p, isWorking: value }))
              }
            >
              <SelectTrigger
                id="working-filter"
                className="bg-[#00205e] border-gray-600 text-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#010d26] border-gray-600 text-white">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="yes">Sim</SelectItem>
                <SelectItem value="no">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="role-filter" className="text-white text-sm">
              Cargo
            </Label>
            <Select
              value={filters.roleId}
              onValueChange={(value) =>
                setFilters((p) => ({ ...p, roleId: value }))
              }
            >
              <SelectTrigger
                id="role-filter"
                className="bg-[#00205e] border-gray-600 text-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#010d26] border-gray-600 text-white">
                <SelectItem value="all">Todos os Cargos</SelectItem>
                {data.roles.map((role) => (
                  <SelectItem key={role.id + "-filter"} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor="interest-categories-filter"
              className="text-white text-sm"
            >
              Categoria de Interesse
            </Label>
            <Select
              value={filters.interestCategories}
              onValueChange={(value) =>
                setFilters((p) => ({ ...p, interestCategories: value }))
              }
            >
              <SelectTrigger
                id="interest-categories-filter"
                className="bg-[#00205e] border-gray-600 text-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#010d26] border-gray-600 text-white">
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {data.interestCategories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="interests-filter" className="text-white text-sm">
              Interesse Profissional
            </Label>
            <Select
              value={filters.interests}
              onValueChange={(value) =>
                setFilters((p) => ({ ...p, interests: value }))
              }
            >
              <SelectTrigger
                id="interests-filter"
                className="bg-[#00205e] border-gray-600 text-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#010d26] border-gray-600 text-white">
                <SelectItem value="all">Todos Interesses</SelectItem>
                {data.professionalInterests.map((i) => (
                  <SelectItem key={i.id} value={i.name}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* ✅ Filtro de Semestre Adicionado */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="semester-filter" className="text-white text-sm">
              Semestre de Entrada
            </Label>
            <Select
              value={filters.semester}
              onValueChange={(value) =>
                setFilters((p) => ({ ...p, semester: value }))
              }
            >
              <SelectTrigger
                id="semester-filter"
                className="bg-[#00205e] border-gray-600 text-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#010d26] border-gray-600 text-white">
                <SelectItem value="all">Todos os Semestres</SelectItem>
                {data.semesters?.map((s) => (
                  <SelectItem key={s.id} value={s.name}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <CustomTable<MemberWithFullRoles>
          title="Sócio(as) da Casinha"
          data={filteredUsers}
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
            "professionalInterests.name",
            "currentRole.name",
            "professionalInterests.category",
            "workplace",
            "isWorking",
            "roleHistory.semester",
            "roles",
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
          {accounts!.map((account) => (
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
