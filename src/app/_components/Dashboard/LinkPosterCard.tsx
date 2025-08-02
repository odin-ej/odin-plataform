import { LinkPoster } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";

const LinkPosterCard = ({ linkPoster }: { linkPoster: LinkPoster }) => {
  return (
    <div className="relative w-full aspect-[2/1]">
      <Link href={linkPoster.link} target="_blank" rel="noopener noreferrer">
        <Image
          src={linkPoster.imageUrl}
          alt={linkPoster.title}
          fill
          className="object-cover aspect-[2/1] rounded-2xl"
        />
      </Link>
    </div>
  );
};

export default LinkPosterCard;
