import FeedContent from "@/app/_components/Dashboard/comunidade/Feed/FeedContent";
import { constructMetadata } from "@/lib/metadata";

import { getAuthenticatedUser } from "@/lib/server-utils";
export const metadata = constructMetadata({ title: "Feed - Comunidade" });

export const dynamic = "force-dynamic";

const Page = async () => {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser) return null
  return (
    <>
      <FeedContent currentUser={currentUser} />
    </>
  );
};

export default Page;
