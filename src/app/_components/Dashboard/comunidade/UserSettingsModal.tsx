"use client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { FullUser } from "@/lib/server-utils"; // Use seu tipo FullUser
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import UserPhraseStatus from "./UserPhraseStatus";
import { FileDown, LinkIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

const settingsSchema = z.object({
  phraseStatus: z
    .string()
    .max(20, "O status pode ter no máximo 20 caracteres.")
    .optional(),
});

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: FullUser;
  isCurrentUser: boolean;
}

const UserSettingsModal = ({
  isOpen,
  onClose,
  user,
  isCurrentUser,
}: UserSettingsModalProps) => {
  const [phrase, setPhrase] = useState(user.phraseStatus || "Olá");
  const form = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: { phraseStatus: user.phraseStatus || "" },
  });

  const { mutate: updateUser, isPending: isUpdating } = useMutation({
    mutationFn: async (data: { phraseStatus: string }) => {
      const response = await axios.patch(
        `/api/users/${user.id}/phrase-status`,
        data
      );
      return response.data;
    },
    onSuccess: async () => {
      toast.success("Frase atualizada com sucesso!");
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error("Erro ao Atualizar", {
        description:
          error.response?.data?.message || "Ocorreu um erro inesperado.",
      });
    },
  });

  useEffect(() => {
    form.reset({ phraseStatus: user.phraseStatus || "" });
  }, [user, form, isOpen]);

  useEffect(() => {
    console.log("Interesses recebidos:", user.professionalInterests);
  }, [user.professionalInterests]);

  const groupedInterests = useMemo(() => {
    if (
      !user?.professionalInterests ||
      user.professionalInterests.length === 0
    ) {
      return {};
    }

    return user.professionalInterests.reduce<Record<string, string[]>>(
      (acc, interest) => {
        if (interest && interest.category && interest.category.name) {
          const categoryName = interest.category.name;
          if (!acc[categoryName]) {
            acc[categoryName] = [];
          }
          acc[categoryName].push(interest.name);
        }
        // Retorna o acumulador em todos os casos para continuar o loop
        return acc;
      },
      {}
    );
  }, [user?.professionalInterests]);

  const formatOtherRole = (otherRole: string) => {
    return otherRole.charAt(0).toUpperCase() + otherRole.slice(1);
  };

  const formatedInstagram =
    user.instagram && user.instagram !== "N/A"
      ? user.instagram.startsWith("http")
        ? user.instagram
        : user.instagram.includes("@")
        ? `https://instagram.com/${user.instagram.split("@")[1]}`
        : `https://instagram.com/${user.instagram}`
      : "";

  const formatedLinkedin =
    user.linkedin && user.linkedin !== "N/A"
      ? user.linkedin.startsWith("http")
        ? user.linkedin
        : user.linkedin.startsWith("www.")
        ? `https://${user.linkedin}`
        : user.linkedin.startsWith("linkedin.com")
        ? `https://${user.linkedin}`
        : `https://linkedin.com/in/${user.linkedin}`
      : "";

  const roleHistorys = user.roleHistory
    .filter((roleH) => roleH.role)
    .map((roleH) => ({
      name: roleH.role.name,
      managementReportLink: roleH.managementReportLink || null,
      managementReportUrl: roleH.managementReport
        ? roleH.managementReport.url
        : null,
      semester: roleH.semester,
    }));


  // 2. Cria um conjunto (Set) com os nomes dos cargos que já estão no histórico.
  //    Isso serve para uma verificação rápida e eficiente.
  const rolesInHistory = new Set(roleHistorys.map((h) => h.name));

  // 3. Filtra a lista de cargos atuais (`user.roles`) para pegar apenas
  //    aqueles que NÃO estão no histórico e mapeia para o formato desejado.
  const currentRolesWithoutHistory = user.roles
    .filter(
      (role) => role && role.name !== "Outro" && !rolesInHistory.has(role.name)
    )
    .map((role) => ({
      name: role.name,
      semester: "N/A",
      managementReportLink: null,
      managementReportUrl: null,
    }));

  // 4. Combina as duas listas: o histórico completo + os cargos atuais sem histórico.
  const rolesArray = [...roleHistorys, ...currentRolesWithoutHistory];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#010d26] text-white rounded-2xl border-2 border-[#f5b719] p-0 max-w-md w-full max-h-[80vh] overflow-y-auto scrollbar-thin-secondary">
        <div className="relative pt-12 pb-8 px-8 flex flex-col items-center text-center">
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-[#f5b719]/30 to-transparent rounded-t-xl" />
          <div className="relative">
            <Avatar className="h-28 w-28 rounded-full border-4 border-[#010d26] z-10">
              <AvatarImage src={user.imageUrl} className="object-cover" />
              <AvatarFallback className="text-3xl bg-[#00205e]">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>

            <UserPhraseStatus phraseStatus={phrase} />
          </div>
          <DialogTitle className="text-2xl mt-4 font-bold">
            {user.name}
          </DialogTitle>
          <p className="text-base text-gray-400">{user.currentRole?.name}</p>
        </div>

        <div className="bg-[#00205e]/20 px-8 pb-8 pt-6 space-y-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) =>
                updateUser({ phraseStatus: data.phraseStatus ?? "" })
              )}
              className="space-y-4"
            >
              {isCurrentUser && (
                <FormField
                  control={form.control}
                  name="phraseStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Defina seu status..."
                          {...field}
                          onChange={(event) => {
                            form.setValue("phraseStatus", event.target.value);
                            setPhrase(event.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <div className="grid grid-cols-2 gap-2">
                {isCurrentUser && (
                  <>
                    <Button
                      disabled={isUpdating}
                      type="submit"
                      className=" bg-[#f5b719]/10 border text-[#f5b719] hover:text-white border-[#f5b719] hover:bg-[#f5b719]/30 transition-colors"
                    >
                      {isUpdating ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="bg-transparent hover:bg-transparent hover:text-[#f5b719] border-none"
                    >
                      <Link href="/perfil">Ir para Meu Perfil</Link>
                    </Button>
                  </>
                )}
              </div>
            </form>
          </Form>

          <div className="grid grid-cols-3 gap-x-4 gap-y-3 text-sm">
            <span className="text-zinc-400 font-medium col-span-1">
              Email pessoal
            </span>
            <span className="col-span-2 break-words">{user.email || "-"}</span>

            <span className="text-zinc-400 font-medium col-span-1">
              Email EJ
            </span>
            <span className="col-span-2 break-words">
              {user.emailEJ || "-"}
            </span>

            <span className="text-zinc-400 font-medium col-span-1">
              Telefone
            </span>
            <span className="col-span-2">{user.phone || "-"}</span>

            <span className="text-zinc-400 font-medium col-span-1">Curso</span>
            <span className="col-span-2">{user.course || "-"}</span>

            <span className="text-zinc-400 font-medium col-span-1">
              Semestre de Entrada
            </span>
            <span className="col-span-2">{user.semesterEntryEj || "-"}</span>

            {user.isExMember && (
              <>
                <span className="text-zinc-400 font-medium col-span-1">
                  Semestre da Saída
                </span>
                <span className="col-span-2">
                  {user.semesterLeaveEj || "-"}
                </span>
                <span className="text-zinc-400 font-medium col-span-1">
                  Local de Trabalho
                </span>
                <span className="col-span-2">{user.workplace || "-"}</span>
              </>
            )}

            <span className="text-zinc-400 font-medium col-span-1">
              Instagram
            </span>
            <div className="col-span-2">
              {user.instagram && user.instagram !== "N/A" ? (
                <a
                  className="flex items-center gap-1.5 text-[#f5b719] hover:underline"
                  href={formatedInstagram}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <LinkIcon className="w-4 h-4" /> Acessar Perfil
                </a>
              ) : (
                <span>-</span>
              )}
            </div>

            <span className="text-zinc-400 font-medium col-span-1">
              LinkedIn
            </span>
            <div className="col-span-2">
              {user.linkedin && user.linkedin !== "N/A" ? (
                <a
                  className="flex items-center gap-1.5 text-[#f5b719] hover:underline"
                  href={formatedLinkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <LinkIcon className="w-4 h-4" /> Acessar Perfil
                </a>
              ) : (
                <span>-</span>
              )}
            </div>
          </div>
          <div className="border-t border-white/10 pt-4 space-y-3">
            <h4 className="text-base font-semibold text-zinc-300">Sobre</h4>
            <p className="text-sm text-zinc-400 leading-relaxed break-words">
              {user.about || "Nenhuma informação sobre."}
            </p>
          </div>

          {user.isExMember && (
            <>
              <div className="border-t border-white/10 pt-4 space-y-3">
                <h4 className="text-base font-semibold text-zinc-300">
                  Experiência na EJ
                </h4>
                <p className="text-sm text-zinc-400 leading-relaxed break-words">
                  {user.aboutEj ||
                    "Nenhuma informação sobre a experiência na EJ."}
                </p>
              </div>
            </>
          )}
          <div className="border-t border-white/10 pt-4 space-y-3">
            <h4 className="text-base font-semibold text-zinc-300">
              Interesses Profissionais
            </h4>
            {Object.keys(groupedInterests).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(groupedInterests).map(
                  ([category, interests]) => (
                    <div key={category}>
                      <p className="text-sm font-medium text-zinc-400 mb-2">
                        {category}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(interests as string[]).map((interest) => (
                          <Badge
                            key={interest}
                            variant="secondary"
                            className="bg-teal-500/20 text-teal-300 text-xs font-medium px-2.5 py-1 rounded-md border border-teal-500/30"
                          >
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <span className="text-sm text-zinc-400">
                Nenhum interesse registrado.
              </span>
            )}
          </div>
          <div className="border-t border-white/10 pt-4">
            <h4 className="text-base font-semibold text-zinc-300 mb-2">
              Cargos na EJ
            </h4>
            <div className="flex flex-wrap gap-2">
              {rolesArray.map((role) => (
                  <Badge
                    className="bg-[#0126fb]/30 text-white text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1"
                    key={role.name}
                  >
                    {role.name} {" "} ({role.semester}){" "}
                    {role.managementReportLink && (
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href={role.managementReportLink}
                      >
                        <LinkIcon className="w-4 h-4 text-[#f5b719]" />
                      </a>
                    )}{" "}
                    {role.managementReportUrl && (
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href={role.managementReportUrl}
                      >
                        <FileDown className="w-4 h-4 text-[#f5b719]" />
                      </a>
                    )}
                  </Badge>
                ))}
              {user.otherRole && (
                <span className="bg-[#f5b719]/30 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                  {formatOtherRole(user.otherRole)}
                </span>
              )}
              {user.roles.length === 0 && (
                <span className="text-sm text-zinc-400">
                  Nenhum cargo registrado.
                </span>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default UserSettingsModal;
