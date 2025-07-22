import Image from "next/image";
import LoginForm from "./_components/LoginForm";
import Link from "next/link";
import { DARKBLUE, YELLOW } from "@/lib/colors";
import { cn } from "@/lib/utils";
import MaxWidthWrapper from "@/app/_components/Global/MaxWidthWrapper";
import { cookies } from "next/headers";

interface Props {
  estrategyPlan: { vision: string };
}

export const dynamic = "force-dynamic";

async function getPageData(): Promise<Props> {
  try {
    const cookiesStore = await cookies();
    const headers = { Cookie: cookiesStore.toString() };
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const estrategyPlanResponse = await fetch(
      `${baseUrl}/api/culture/safe-route`,
      {
        next: { revalidate: 30 },
        headers,
      }
    );

    if (!estrategyPlanResponse.ok) {
      const errorText = await estrategyPlanResponse.text(); // Lê a resposta como texto para debug
      console.error(
        "Erro na resposta da API de plano estratégico:",
        estrategyPlanResponse.status,
        errorText
      );
      throw new Error(
        `Falha ao carregar plano estratégico: ${estrategyPlanResponse.statusText}`
      );
    }

    const estrategyPlan: { vision: string } =
      await estrategyPlanResponse.json();
    return { estrategyPlan };
  } catch (error) {
    console.error(error);
    return { estrategyPlan: { vision: "" } };
  }
}

const Page = async () => {
  const { estrategyPlan } = await getPageData();
  return (
    <div
      style={{ backgroundColor: DARKBLUE }}
      className={cn("flex flex-col min-h-screen")}
    >
      {/* Conteúdo centralizado */}
      <div className="min-h-[calc(100vh-84px)] flex items-center justify-center">
        <div className="mt-16 mb-48 md:mb-24 md:mt-4 lg:mt-0 lg:mb-12 flex flex-1 flex-col justify-center items-center gap-16 px-6 h-full">
          {/* Frase destaque */}
          <div className="text-center max-w-3xl ">
            <h1 className="text-2xl lg:text-3xl font-semibold italic text-[#f5b719]">
              {" "}
              {estrategyPlan.vision}
            </h1>
          </div>

          {/* Formulário e imagem */}
          <MaxWidthWrapper className="flex flex-col md:flex-row items-center justify-center gap-12">
            {/* Formulário */}
            <div className="w-full max-w-sm">
              <h2 className="text-6xl font-bold text-white">
                Olá, <span className={`text-[${YELLOW}] italic`}>sócio(a)</span>
                !
              </h2>

              <div>
                <LoginForm />
                <div>
                  <p className="text-white mt-4">
                    Não tem uma conta?{" "}
                    <Link
                      href="/registrar"
                      className={`text-[${YELLOW}] underline font-semibold hover:text-[#0126fb] transition-colors duration-200`}
                    >
                      Cadastre-se!
                    </Link>
                  </p>
                  <p className="text-white mt-4">
                    <Link
                      href="/esqueci-minha-senha"
                      className="text-[#f5b719] underline font-semibold hover:text-[#0126fb] transition-colors duration-200"
                    >
                      Esqueci minha senha
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            {/* Imagem da casa */}
            <div className="hidden lg:block  relative w-72 h-72 md:w-[400px] md:h-[400px]">
              <Image
                src="/casinha.png"
                alt="Casa dos sonhos"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover"
                priority
              />
            </div>
          </MaxWidthWrapper>
        </div>
      </div>
    </div>
  );
};

export default Page;
