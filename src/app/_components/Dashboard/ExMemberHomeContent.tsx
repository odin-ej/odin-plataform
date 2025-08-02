import { useAuth } from "@/lib/auth/AuthProvider";
import { LinkPoster } from "@prisma/client";
import Image from "next/image";
import LinkPosterCard from "./LinkPosterCard";

const ExMemberHomeContent = ({
  linkPosters,
}: {
  linkPosters: LinkPoster[];
}) => {
  const { user } = useAuth();

  return (
    <>
      <div className="text-center lg:text-left">
        <h2 className="text-md sm:text-xl md:text-2xl font-extrabold text-white leading-tight">
          Olá,{" "}
          <span className="text-[#f5b719] italic">
            {user!.name.split(" ")[0]}
          </span>
          !
        </h2>
        <h3 className="mt-4 text-sm md:text-md font-medium text-white/80">
          Bem-vindo(a) à plataforma da Casinha dos Sonhos.
        </h3>
        <p className="mt-2 text-xs md:text-base text-white/60 max-w-prose mx-auto lg:mx-0">
          Aqui você poderá se conectar com membros e se manter por dentro da
          cultura da Casinha.
        </p>
      </div>

      {/* Coluna da Imagem */}
      <div className="relative w-full max-w-md mx-auto aspect-square">
        <Image
          src="/casinha.png"
          alt="Ilustração da Casinha dos Sonhos"
          fill
          className="object-cover"
          priority
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mt-6">
        {linkPosters.map((linkPoster) => (
          <LinkPosterCard key={linkPoster.id} linkPoster={linkPoster} />
        ))}
      </div>
    </>
  );
};

export default ExMemberHomeContent;
