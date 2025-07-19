import KnowledgeContent from "@/app/_components/Dashboard/KnowledgeContent";
import { constructMetadata } from "@/lib/metadata";

export const metadata = constructMetadata({ title: "Conhecimento IA" });

const Page = () => {
  return ( <KnowledgeContent /> );
}
 
export default Page;