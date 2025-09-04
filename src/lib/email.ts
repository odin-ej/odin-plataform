import { SendEmailCommand } from "@aws-sdk/client-ses";
import { Prisma } from "@prisma/client";

export const welcomeEmailCommand = ({
  email,
  name,
}: {
  email: string;
  name: string;
}) => {
  return new SendEmailCommand({
    Source: "plataforma@empresajr.org", // Usa diretamente "plataforma@empresajr.org"
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: "Bem-vindo(a) à Plataforma da Casinha dos Sonhos!" },
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `<html>
                            <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333; padding: 20px;">
                                <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 40px; border-radius: 12px; border: 1px solid #ddd; text-align: center;">
                                <div style="margin-bottom: 30px;">
                                    <img src="${process.env.NEXT_PUBLIC_API_URL}/logo-azul.png" alt="Logotipo da Empresa JR" style="border:0; max-width: 150px;"/>
                                </div>    
                                <h1 style="color: #0126fb;">A sua jornada começa agora!</h1>
                                    <p style="font-size: 16px; line-height: 1.6;">Olá, ${name}!</p>
                                    <p style="font-size: 16px; line-height: 1.6;">É com enorme alegria que confirmamos a aprovação do seu registo! Seja oficialmente bem-vindo(a) à nossa <strong>Casinha dos Sonhos</strong>.</p>
                                    <p style="font-size: 16px; line-height: 1.6;">Estamos muito felizes por ter você conosco para construir um legado e transformar o ecossistema empreendedor. O seu primeiro passo nesta jornada é aceder à nossa plataforma.</p>
                                    <a href="${process.env.NEXT_PUBLIC_API_URL}/login" style="display: inline-block; background-color: #0126fb;; color: #ffffff; font-weight: bold; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 30px 0;">Entrar na Casinha</a>
                                    <p style="font-size: 14px; color: #555;">Mal podemos esperar para ver tudo o que vamos conquistar juntos.</p>
                                    <p style="font-size: 14px; color: #555;">Até já! Você pode realizar o login com o mesmo email e senha cadastrados.</p>
                                </div>
                            </body>
                           </html>`,
        },
        Text: {
          Charset: "UTF-8",
          Data: `Olá, ${name}!\n\nA sua conta na Plataforma da Casinha dos Sonhos foi aprovada. Já pode fazer login em ${process.env.NEXT_PUBLIC_API_URL}/login`,
        },
      },
    },
  });
};

export const exMemberWelcomeEmailCommand = ({
  email,
  name,
}: {
  email: string;
  name: string;
}) => {
  return new SendEmailCommand({
    Source: "plataforma@empresajr.org",
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: `O seu legado continua, ${name}!` },
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `<html>
                    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333; padding: 20px;">
                        <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 40px; border-radius: 12px; border: 1px solid #ddd; text-align: center;">
                        <div style="margin-bottom: 30px;">
                            <img src="${process.env.NEXT_PUBLIC_API_URL}/logo-azul.png" alt="Logotipo da Empresa JR" style="border:0; max-width: 150px;"/>
                        </div>    
                        <h1 style="color: #0126fb;">Bem-vindo(a) de volta Sócio(a)!</h1>
                            <p style="font-size: 16px; line-height: 1.6;">Olá, ${name}!</p>
                            <p style="font-size: 16px; line-height: 1.6;">Uma vez parte da Casinha, sempre parte da Casinha. É com grande satisfação que aprovamos o seu cadastro na plataforma da <b style="color: #0126fb;">Casinha dos Sonhos</b>.</p>
                            <p style="font-size: 16px; line-height: 1.6;">Aqui, você poderá se reconectar com outros membros, acompanhar o crescimento da empresa e continuar a fazer parte do nosso legado. O seu percurso pode ter terminado, mas a sua história conosco continua.</p>
                            <a href="${process.env.NEXT_PUBLIC_API_URL}/login" style="display: inline-block; background-color: #0126fb; color: #ffffff; font-weight: bold; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 30px 0;">Entrar na Casinha</a>
                            <p style="font-size: 14px; color: #555;">Estamos ansiosos para reencontrá-lo(a).</p>
                            <p style="font-size: 14px; color: #555;">Você pode realizar o login com o mesmo email e senha cadastrados.</p>
                        </div>
                    </body>
                   </html>`,
        },
      },
    },
  });
};

export const completeProfileEmailCommand = ({
  email,
  name,
}: {
  email: string;
  name: string;
}) => {
  return new SendEmailCommand({
    Source: "plataforma@empresajr.org",
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: `Quase lá, ${name}! Complete seu perfil na Casinha.` },
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `<html>
                    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333; padding: 20px;">
                       <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 40px; border-radius: 12px; border: 1px solid #ddd; text-align: center;">
                        <div style="margin-bottom: 30px;">
                            <img src="${process.env.NEXT_PUBLIC_API_URL}/logo-azul.png" alt="Logotipo da Empresa JR" style="border:0; max-width: 150px;"/>
                        </div>    
                        <h1 style="color: #0126fb;">Seu perfil está quase completo!</h1>
                            <p style="font-size: 16px; line-height: 1.6;">Olá, ${name}!</p>
                            <p style="font-size: 16px; line-height: 1.6;">Vimos que ainda faltam algumas informações importantes no seu perfil, como seus <strong>interesses profissionais</strong> e/ou seu <strong>histórico de cargos</strong>.</p>
                            <p style="font-size: 16px; line-height: 1.6;">Manter seu perfil atualizado nos ajuda a conectar você com oportunidades e conteúdos que realmente importam.</p>
                            <a href="${process.env.NEXT_PUBLIC_API_URL}/perfil" style="display: inline-block; background-color: #0126fb; color: #ffffff; font-weight: bold; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 30px 0;">Completar Perfil Agora</a>
                            <p style="font-size: 14px; color: #555;">Leva só alguns minutos!</p>
                        </div>
                    </body>
                   </html>`,
        },
      },
    },
  });
};

export const newRegistrationRequestCommand = ({
  email,
  name,
  newUser,
}: {
  email: string;
  name: string;
  newUser: Prisma.RegistrationRequestGetPayload<{ include: { roles: true } }>;
}) => {
    const detailsHtml = `
    <li style="margin-bottom: 8px;"><strong>Nome:</strong> ${newUser.name}</li>
    <li style="margin-bottom: 8px;"><strong>Email Pessoal:</strong> ${newUser.email}</li>
    <li style="margin-bottom: 8px;"><strong>Email EJ:</strong> ${newUser.emailEJ}</li>
    <li style="margin-bottom: 8px;"><strong>Curso:</strong> ${newUser.course || 'Não informado'}</li>
    <li style="margin-bottom: 8px;"><strong>Semestre de Entrada:</strong> ${newUser.semesterEntryEj}</li>
    ${newUser.isExMember ? `
      <li style="margin-bottom: 8px;"><strong>Semestre de Saída:</strong> ${newUser.semesterLeaveEj || 'Não informado'}</li>
      <li style="margin-bottom: 8px;"><strong>Tipo de Cadastro:</strong> Ex-Membro</li>
      <li style="margin-bottom: 8px;"><strong>É Alumni Dreamer?</strong> ${newUser.alumniDreamer ? 'Sim' : 'Não'}</li>
      <li style="margin-bottom: 8px;"><strong>Está trabalhando?</strong> ${newUser.isWorking ? 'Sim' : 'Não'}</li>
      <li style="margin-bottom: 8px;"><strong>Local de Trabalho:</strong> ${newUser.workplace || 'Não informado'}</li>
    ` : `
      <li style="margin-bottom: 8px;"><strong>Tipo de Cadastro:</strong> Membro</li>
    `}
    ${newUser.roles.length > 0 ? `
      <li style="margin-bottom: 8px;">
        <strong>Cargo(s) Solicitado(s):</strong>
        <ul style="margin-top: 5px; padding-left: 20px;">
          ${newUser.roles.map(role => `<li style="margin-bottom: 5px;">${role.name}</li>`).join('')}
        </ul>
      </li>
    ` : ''}
  `;

  return new SendEmailCommand({
    Source: "plataforma@empresajr.org", // Seu e-mail verificado no SES
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: {
        Data: `Olá, ${name}! Chegou uma nova solicitação de cadastro.`,
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nova Solicitação de Cadastro</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #ddd;">
        
        <div style="margin-bottom: 30px; background-color: #f8f9fa; padding: 20px; text-align: center;">
            <img src="${process.env.NEXT_PUBLIC_API_URL}/logo-azul.png" alt="Logotipo da Empresa JR" style="max-width: 150px; height: auto;"/>
        </div>
        
        <div style="padding: 0 30px 30px 30px; text-align: center;">
            <h1 style="color: #0126fb; font-size: 24px; margin-bottom: 20px;">Chegou uma nova solicitação de cadastro!</h1>
            
            <p style="font-size: 16px; line-height: 1.6; text-align: left;">Olá, ${name}!</p>
            <p style="font-size: 16px; line-height: 1.6; text-align: left;">
                Uma <strong>nova solicitação de cadastro</strong> foi enviada e aguarda sua aprovação.
            </p>
            
            <div style="background-color: #f9f9f9; border: 1px solid #eee; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: left;">
                <h3 style="margin-top: 0; color: #333;">Detalhes da Solicitação</h3>
                <ul style="padding-left: 0; list-style-type: none;">
                    ${detailsHtml}
                </ul>
            </div>

            <p style="font-size: 16px; line-height: 1.6; text-align: left;">
                Talvez hajam outras solicitações pendentes além dessa, então, verifique-as o mais rápido possível e realize as ações necessárias.
            </p>
            
            <a href="${process.env.NEXT_PUBLIC_API_URL}/aprovacao-cadastro" style="display: inline-block; background-color: #0126fb; color: #ffffff; font-weight: bold; padding: 14px 28px; margin: 20px 0; text-decoration: none; border-radius: 8px; font-size: 16px;">Verificar Agora</a>
            
            <p style="font-size: 14px; color: #555;">Leva só alguns minutos!</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 15px; font-size: 12px; color: #777; border-top: 1px solid #ddd; text-align: center;">
            <p style="margin: 0;">Empresa JR &copy; 2025</p>
            <p style="margin: 5px 0 0 0;">Este é um e-mail automático, por favor não responda.</p>
        </div>
    </div>
</body>
</html>`,
        },
      },
    },
  });
};
