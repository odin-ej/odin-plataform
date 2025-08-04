import { useAuth } from "@/lib/auth/AuthProvider";
import { LinkPoster } from "@prisma/client";
import Image from "next/image";
import LinkPosterCard from "./LinkPosterCard";
import CustomCard from "../Global/Custom/CustomCard";
import { CircleUser } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const ExMemberHomeContent = ({
  linkPosters,
}: {
  linkPosters: LinkPoster[];
}) => {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["countUsers"],
    queryFn: async () => {
      const users = await axios.get(`${API_URL}/api/users`);
      const membersCount = users.data.users.filter(
        (user: { isExMember: boolean }) => user.isExMember === false
      ).length;
      const exMembersCount = users.data.users.filter(
        (user: { isExMember: boolean }) => user.isExMember === true
      ).length;
      return { membersCount, exMembersCount };
    },
    initialData: {
      membersCount: 0,
      exMembersCount: 0,
    },
  });

  return (
    <>
      <div className="flex justify-center flex-col xl:flex-row gap-6">
        <div className="text-center flex flex-col items-center justify-center space-y-2  bg-[#010d26] p-6 rounded-lg">
          <h2 className="text-2xl md:text-3xl lg:text-4xl 2xl:text-5xl font-extrabold text-white leading-tight">
            Olá,{" "}
            <span className="text-[#f5b719] italic">
              {user!.name.split(" ")[0]}
            </span>
            !
          </h2>
          <h3 className="mt-4 text-md lg:text-lg font-medium text-white/80">
            Bem-vindo(a) à plataforma da Casinha dos Sonhos.
          </h3>
          <p className="mt-2 text-base lg:text-lg text-white/60 max-w-prose mx-auto lg:mx-0">
            Aqui você poderá se conectar com membros e se manter por dentro da
            cultura da Casinha.
          </p>
        </div>

        <div className="text-center  flex flex-col items-center justify-center bg-[#010d26] p-6 rounded-lg">
          <h2 className="text-2xl md:text-3xl lg:text-4xl 2xl:text-5xl font-extrabold text-white leading-tight">
            Faça um, <span className="text-[#f5b719]">report</span>!
          </h2>
          <h3 className="mt-4 text-md lg:text-lg font-medium text-white/80">
            Reports servem para se comunicar com membros da casinha!.
          </h3>
          <p className="mt-2 text-base lg:text-lg text-white/60 max-w-prose mx-auto lg:mx-0">
            Antes de enviar, leia as orientações que estão na página exclusiva
            para os reports.
          </p>
        </div>

        {/* Coluna da Imagem */}
        <div className="relative w-full max-w-xs mx-auto aspect-square">
          <Image
            src="/casinha.png"
            alt="Ilustração da Casinha dos Sonhos"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

      <div className="my-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <CustomCard
          type="link"
          href="/cultural"
          icon={CircleUser}
          title="Membros cadastrados"
          value={data?.membersCount}
        />
        <CustomCard
          type="link"
          href="/cultural"
          icon={CircleUser}
          title="Ex-Membros cadastrados"
          value={data?.exMembersCount}
        />
      </div>

      <div className="bg-[#010d26] p-6 rounded-lg">
        <h2 className="text-xl my-4 px-2 sm:text-2xl md:text-4xl lg:text-6xl font-extrabold text-white">
          Mural da Casinha:
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mt-6">
          {linkPosters.map((linkPoster) => (
            <LinkPosterCard key={linkPoster.id} linkPoster={linkPoster} />
          ))}
          {linkPosters.map((linkPoster) => (
            <LinkPosterCard key={linkPoster.id} linkPoster={linkPoster} />
          ))}
          {linkPosters.map((linkPoster) => (
            <LinkPosterCard key={linkPoster.id} linkPoster={linkPoster} />
          ))}
        </div>
      </div>
    </>
  );
};

export default ExMemberHomeContent;
