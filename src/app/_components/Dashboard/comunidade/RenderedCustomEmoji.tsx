import { getCommunityFileSignedUrl } from "@/lib/actions/community";
import { CustomEmoji } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";

const RenderedCustomEmoji = ({ emoji }: { emoji: CustomEmoji }) => {
  const { data: signedUrl, isLoading } = useQuery({
    queryKey: ["emojiUrl", emoji.id],
    queryFn: () => getCommunityFileSignedUrl(emoji.imageUrl), // imageUrl é a 'key'
    staleTime: 60 * 60 * 1000, // Cache de 1 hora
    refetchOnWindowFocus: false,
  });
  if (isLoading || !signedUrl)
    return (
      <span className="inline-block w-6 h-6 bg-gray-700 rounded-sm animate-pulse" />
    );
  return <Image src={signedUrl} alt={emoji.name} width={22} height={22} />;
};

export default RenderedCustomEmoji