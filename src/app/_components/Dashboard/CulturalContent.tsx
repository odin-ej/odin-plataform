"use client";
import { Handshake } from "lucide-react";
import CustomCard from "../Global/Custom/CustomCard";
import CustomCarousel, { SlideData } from "../Global/Custom/CustomCarousel";
import { User, Role } from ".prisma/client";
import CustomTable, { ColumnDef } from "../Global/Custom/CustomTable";
import ValueCarousel, { ValueSlide } from "./ValueCarousel";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MemberViewModal from "./MemberViewModal";
import { MemberWithFullRoles } from "@/lib/schemas/memberFormSchema";
import AccountCard from "./AccountCard";
import { fullStrategy } from "@/app/(dashboard)/atualizar-estrategia/page";

interface CulturalContentProps {
  estrategy: fullStrategy;
  allUsers: MemberWithFullRoles[];
  mondayStats: {
    totalProjects: number;
    details: { accountName: string; projectCount: number }[];
  };
}

const CulturalContent = ({ estrategy, allUsers, mondayStats }: CulturalContentProps) => {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MemberWithFullRoles | null>(
    null
  );
  const motherValue = estrategy.values.find(
    (value) => value.isMotherValue === true
  )?.name;

  const titles = ["Propósito", "Missão", "Visão"];

  const slidesData: SlideData[] = [
    {
      subtitle: estrategy.propose,
      progress: 0,
      valueText: "",
      mainText: "",
      date: "",
    },
    {
      subtitle: estrategy.mission,
      progress: 0,
      valueText: "",
      mainText: "",
      date: "",
    },
    {
      subtitle: estrategy.vision,
      progress: 0,
      valueText: "",
      mainText: "",
      date: "",
    },
  ];

  const valueSlides: ValueSlide[] = estrategy.values
    .filter((value) => !value.isMotherValue)
    .map((value) => ({
      title: value.name,
      description: value.description,
    }));

  const usersColumns: ColumnDef<MemberWithFullRoles>[] = [
    {
      accessorKey: "name",
      header: "Nome",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.imageUrl ?? undefined} />
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

  const alfaTotalProjects = mondayStats.details.find(
    (detail) => detail.accountName === "ALFA 🧡")?.projectCount
  const betaTotalProjects = mondayStats.details.find(
    (detail) => detail.accountName === "BETA 💜")?.projectCount
  const deltaTotalProjects = mondayStats.details.find(
    (detail) => detail.accountName === "DELTA🔺")?.projectCount

  const accounts = [
    {
      name: "ALFA",
      description:
        "A Alfa conjura a perfeição. Somos a essência do poder bruxo, e nossa grandeza é inquestionável! Expectrum Patronum!",
      imageUrl: "/alfa.png",
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
      imageUrl: "/delta.png",
      totalProjects: deltaTotalProjects!,
      color: "text-rose-500",
    },
  ];

  const openModal = (user: MemberWithFullRoles) => {
    setSelectedUser(user!);
    setIsOpenModal(true);
  };

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

      <div className="mt-4">
        <CustomTable<User & { roles: Role[]; currentRole: Role }>
          title="Sócio(as) da Casinha"
          data={allUsers}
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
