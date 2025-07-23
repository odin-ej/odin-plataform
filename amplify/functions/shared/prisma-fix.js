// amplify/functions/shared/prisma-fix.js
const fs = require('fs');
const path = require('path');

// Encontra o local onde o Prisma foi instalado
const prismaClientDir = path.dirname(require.resolve('@prisma/client'));

// Procura pelo arquivo binário do engine do Lambda
const engineFile = fs.readdirSync(prismaClientDir).find(f => f.includes('libquery_engine-rhel'));

if (!engineFile) {
  throw new Error('Could not find Prisma Engine for RHEL. Please run `npx prisma generate`.');
}

// O destino onde o arquivo precisa estar na função Lambda
const finalEnginePath = path.join(__dirname, path.basename(engineFile));

// Se o arquivo ainda não foi copiado, copie-o
if (!fs.existsSync(finalEnginePath)) {
  fs.copyFileSync(path.join(prismaClientDir, engineFile), finalEnginePath);
}