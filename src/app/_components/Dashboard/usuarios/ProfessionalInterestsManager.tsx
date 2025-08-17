"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import CustomCheckboxGroup from "../../Global/Custom/CustomCheckboxGroup";
import { InterestCategory, ProfessionalInterest } from "@prisma/client";
import { useFormContext } from "react-hook-form";

interface InterestsWithCategory extends InterestCategory {
  interests: ProfessionalInterest[];
}

interface ProfessionalInterestsManagerProps {
  interestCategories: InterestsWithCategory[];
}


const ProfessionalInterestsManager = ({ interestCategories }: ProfessionalInterestsManagerProps) => {
  const { control } = useFormContext();
  return (
    <div className="space-y-4 p-4 border border-dashed border-gray-600 rounded-lg">
      <h3 className="font-semibold text-lg text-[#f5b719]">Interesses Profissionais</h3>
      <p className="text-sm text-gray-400">Selecione as áreas que mais te interessam. Isso nos ajuda a direcionar oportunidades e conteúdos relevantes para você.</p>
      
      <Accordion type="multiple" className="w-full">
        {interestCategories.map(category => (
          <AccordionItem key={category.id} value={category.id} className="border-b-gray-700">
            <AccordionTrigger className="font-semibold hover:no-underline text-white">{category.name}</AccordionTrigger>
            <AccordionContent className="pt-2">
              <CustomCheckboxGroup
              label='Interesses'
                control={control}
                name={"professionalInterests"}
                options={category.interests.map(interest => ({
                  value: interest.id,
                  label: interest.name,
                }))}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default ProfessionalInterestsManager;