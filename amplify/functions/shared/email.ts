import { SendEmailCommand } from "@aws-sdk/client-ses";

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
                                    <img src="${process.env.NEXT_PUBLIC_APP_URL}/logo-azul.png" alt="Logotipo da Empresa JR" style="border:0; max-width: 150px;"/>
                                </div>    
                                <h1 style="color: #0126fb;">A sua jornada começa agora!</h1>
                                    <p style="font-size: 16px; line-height: 1.6;">Olá, ${name}!</p>
                                    <p style="font-size: 16px; line-height: 1.6;">É com enorme alegria que confirmamos a aprovação do seu registo! Seja oficialmente bem-vindo(a) à nossa <strong>Casinha dos Sonhos</strong>.</p>
                                    <p style="font-size: 16px; line-height: 1.6;">Estamos muito felizes por ter você conosco para construir um legado e transformar o ecossistema empreendedor. O seu primeiro passo nesta jornada é aceder à nossa plataforma.</p>
                                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="display: inline-block; background-color: #0126fb;; color: #ffffff; font-weight: bold; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 30px 0;">Aceder à Plataforma</a>
                                    <p style="font-size: 14px; color: #555;">Mal podemos esperar para ver tudo o que vamos conquistar juntos.</p>
                                    <p style="font-size: 14px; color: #555;">Até já! Você pode realizar o login com o mesmo email e senha cadastrados.</p>
                                </div>
                            </body>
                           </html>`,
        },
        Text: {
          Charset: "UTF-8",
          Data: `Olá, ${name}!\n\nA sua conta na Plataforma da Casinha dos Sonhos foi aprovada. Já pode fazer login em ${process.env.NEXT_PUBLIC_APP_URL}/login`,
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
                            <img src="${process.env.NEXT_PUBLIC_APP_URL}/logo-azul.png" alt="Logotipo da Empresa JR" style="border:0; max-width: 150px;"/>
                        </div>    
                        <h1 style="color: #0126fb;">Bem-vindo(a) de volta Sócio(a)!</h1>
                            <p style="font-size: 16px; line-height: 1.6;">Olá, ${name}!</p>
                            <p style="font-size: 16px; line-height: 1.6;">Uma vez parte da Casinha, sempre parte da Casinha. É com grande satisfação que aprovamos o seu cadastro na plataforma da <b style="color: #0126fb;">Casinha dos Sonhos</b>.</p>
                            <p style="font-size: 16px; line-height: 1.6;">Aqui, você poderá se reconectar com outros membros, acompanhar o crescimento da empresa e continuar a fazer parte do nosso legado. O seu percurso pode ter terminado, mas a sua história conosco continua.</p>
                            <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="display: inline-block; background-color: #0126fb; color: #ffffff; font-weight: bold; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 30px 0;">Acessar a Plataforma</a>
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
