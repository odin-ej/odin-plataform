'use server'

import { prisma } from "@/db"

export async function getInterestCategoriesForRegistration() {
   const interestCategories = await prisma.interestCategory.findMany({
     include: {
       interests: true,
       },
   });
   return interestCategories;
}