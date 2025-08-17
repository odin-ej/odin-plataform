import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface AccountCardProps {
  name: string;
  color: string;
  description: string;
  imageUrl: string;
  totalProjects: number;
}

const AccountCard = ({
  name,
  color,
  description,
  imageUrl,
  totalProjects,
}: AccountCardProps) => {
  return (
    <Card className="w-full border-2 border-[#0126fb]/30 overflow-hidden rounded-2xl bg-[#010d26] flex flex-col justify-start items-center pb-0">
      {/* Header com imagem */}
      <CardHeader className="flex items-end w-full h-full justify-center p-0 m-0">
        {/* Imagem do personagem */}
        <div className="relative w-[250px] h-[250px] z-10">
          <Image src={imageUrl} alt={name} fill className="object-contain" />
        </div>
      </CardHeader>

      {/* Conteúdo branco colado na imagem */}
      <div className="relative  z-30 bg-white w-full flex-1 flex flex-col items-center justify-center rounded-t-[2rem] pt-6 pb-6 -mt-6">
        <CardTitle
          className={cn("text-2xl font-semibold flex items-center pb-1", color)}
        >
          <span className={cn("mr-2 text-6xl font-bold", color)}>
            {name === "ALFA" ? "𝛂" : name === "BETA" ? "β" : "∆"}{" "}
          </span>
          {name}
        </CardTitle>

        <CardDescription className="text-center px-4 text-sm text-gray-600 mt-2">
          {description}
        </CardDescription>

        <p className="text-gray-800 text-xs flex-wrap justify-center gap-2 md:text-sm text-center flex items-center mt-4 px-2">
          <span
            className={cn(
              "mr-2 text-3xl md:text-4xl  lg:text-6xl font-bold",
              color
            )}
          >
            {totalProjects}
          </span>
          Projetos em andamento
        </p>
      </div>
    </Card>
  );
};

export default AccountCard;
