import { SendEmailCommand } from "@aws-sdk/client-ses";
import { Prisma } from "@prisma/client";
import { EMAIL_CONFIG } from "./constants";

// ─── Template base reutilizável ─────────────────────────────────────

interface EmailTemplateParams {
  heading: string;
  greeting: string;
  paragraphs: string[];
  buttonText: string;
  buttonUrl: string;
  footerText?: string;
}

function buildEmailHtml({
  heading,
  greeting,
  paragraphs,
  buttonText,
  buttonUrl,
  footerText,
}: EmailTemplateParams): string {
  const paragraphsHtml = paragraphs
    .map((p) => `<p style="font-size: 16px; line-height: 1.6;">${p}</p>`)
    .join("");

  return `<html>
  <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 40px; border-radius: 12px; border: 1px solid #ddd; text-align: center;">
      <div style="margin-bottom: 30px;">
        <img src="${EMAIL_CONFIG.LOGO_URL}" alt="Logotipo da Empresa JR" style="border:0; max-width: 150px;"/>
      </div>
      <h1 style="color: #0126fb;">${heading}</h1>
      <p style="font-size: 16px; line-height: 1.6;">${greeting}</p>
      ${paragraphsHtml}
      <a href="${buttonUrl}" style="display: inline-block; background-color: #0126fb; color: #ffffff; font-weight: bold; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 30px 0;">${buttonText}</a>
      ${footerText ? `<p style="font-size: 14px; color: #555;">${footerText}</p>` : ""}
      <p style="font-size: 14px; color: #555;">Você pode realizar o login com o mesmo email e senha cadastrados.</p>
    </div>
  </body>
</html>`;
}

function createEmailCommand({
  to,
  subject,
  html,
  plainText,
}: {
  to: string;
  subject: string;
  html: string;
  plainText?: string;
}): SendEmailCommand {
  return new SendEmailCommand({
    Source: EMAIL_CONFIG.FROM,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: "UTF-8" },
      Body: {
        Html: { Charset: "UTF-8", Data: html },
        ...(plainText && { Text: { Charset: "UTF-8", Data: plainText } }),
      },
    },
  });
}

// ─── Emails específicos ─────────────────────────────────────────────

interface EmailRecipient {
  email: string;
  name: string;
}

export const welcomeEmailCommand = ({ email, name }: EmailRecipient) => {
  const html = buildEmailHtml({
    heading: "A sua jornada começa agora!",
    greeting: `Olá, ${name}!`,
    paragraphs: [
      "É com enorme alegria que confirmamos a aprovação do seu registo! Seja oficialmente bem-vindo(a) à nossa <strong>Casinha dos Sonhos</strong>.",
      "Estamos muito felizes por ter você conosco para construir um legado e transformar o ecossistema empreendedor. O seu primeiro passo nesta jornada é aceder à nossa plataforma.",
    ],
    buttonText: "Entrar na Casinha",
    buttonUrl: `${EMAIL_CONFIG.APP_URL}/login`,
    footerText: "Mal podemos esperar para ver tudo o que vamos conquistar juntos.",
  });

  return createEmailCommand({
    to: email,
    subject: "Bem-vindo(a) à Plataforma da Casinha dos Sonhos!",
    html,
    plainText: `Olá, ${name}!\n\nA sua conta na Plataforma da Casinha dos Sonhos foi aprovada. Já pode fazer login em ${EMAIL_CONFIG.APP_URL}/login`,
  });
};

export const exMemberWelcomeEmailCommand = ({ email, name }: EmailRecipient) => {
  const html = buildEmailHtml({
    heading: "Bem-vindo(a) de volta Sócio(a)!",
    greeting: `Olá, ${name}!`,
    paragraphs: [
      'Uma vez parte da Casinha, sempre parte da Casinha. É com grande satisfação que aprovamos o seu cadastro na plataforma da <b style="color: #0126fb;">Casinha dos Sonhos</b>.',
      "Aqui, você poderá se reconectar com outros membros, acompanhar o crescimento da empresa e continuar a fazer parte do nosso legado. O seu percurso pode ter terminado, mas a sua história conosco continua.",
    ],
    buttonText: "Entrar na Casinha",
    buttonUrl: `${EMAIL_CONFIG.APP_URL}/login`,
    footerText: "Estamos ansiosos para reencontrá-lo(a).",
  });

  return createEmailCommand({
    to: email,
    subject: `O seu legado continua, ${name}!`,
    html,
  });
};

export const completeProfileEmailCommand = ({ email, name }: EmailRecipient) => {
  const html = buildEmailHtml({
    heading: "Seu perfil está quase completo!",
    greeting: `Olá, ${name}!`,
    paragraphs: [
      "Vimos que ainda faltam algumas informações importantes no seu perfil, como seus <strong>interesses profissionais</strong> e/ou seu <strong>histórico de cargos</strong>.",
      "Manter seu perfil atualizado nos ajuda a conectar você com oportunidades e conteúdos que realmente importam.",
    ],
    buttonText: "Completar Perfil Agora",
    buttonUrl: `${EMAIL_CONFIG.APP_URL}/perfil`,
    footerText: "Leva só alguns minutos!",
  });

  return createEmailCommand({
    to: email,
    subject: `Quase lá, ${name}! Complete seu perfil na Casinha.`,
    html,
  });
};

export const notificationEmailCommand = ({
  email,
  name,
  title,
  message,
  priority,
  link,
}: {
  email: string;
  name: string;
  title: string;
  message: string;
  priority: "NORMAL" | "IMPORTANT" | "EVENT";
  link?: string | null;
}) => {
  const priorityLabels = {
    NORMAL: { label: "Notificação", color: "#0126fb" },
    IMPORTANT: { label: "Importante", color: "#e53e3e" },
    EVENT: { label: "Evento / Alerta", color: "#f5b719" },
  };
  const { label: priorityLabel, color: priorityColor } = priorityLabels[priority];

  const html = `<html>
  <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 40px; border-radius: 12px; border: 1px solid #ddd; text-align: center;">
      <div style="margin-bottom: 30px;">
        <img src="${EMAIL_CONFIG.LOGO_URL}" alt="Logotipo da Empresa JR" style="border:0; max-width: 150px;"/>
      </div>
      <div style="display: inline-block; background-color: ${priorityColor}20; color: ${priorityColor}; padding: 4px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 16px; border: 1px solid ${priorityColor}40;">
        ${priorityLabel}
      </div>
      <h1 style="color: #0126fb; margin-top: 12px;">${title}</h1>
      <p style="font-size: 16px; line-height: 1.6;">Olá, ${name}!</p>
      <p style="font-size: 16px; line-height: 1.6;">${message}</p>
      ${link ? `<a href="${EMAIL_CONFIG.APP_URL}${link}" style="display: inline-block; background-color: #0126fb; color: #ffffff; font-weight: bold; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 30px 0;">Ver mais</a>` : ""}
      <p style="font-size: 14px; color: #555;">Você recebeu esta notificação através da Plataforma da Casinha dos Sonhos.</p>
    </div>
  </body>
</html>`;

  return createEmailCommand({
    to: email,
    subject: `[${priorityLabel}] ${title}`,
    html,
    plainText: `Olá, ${name}!\n\n${title}\n\n${message}${link ? `\n\nVer mais: ${EMAIL_CONFIG.APP_URL}${link}` : ""}`,
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
    <li style="margin-bottom: 8px;"><strong>Curso:</strong> ${newUser.course || "Não informado"}</li>
    <li style="margin-bottom: 8px;"><strong>Semestre de Entrada:</strong> ${newUser.semesterEntryEj}</li>
    ${
      newUser.isExMember
        ? `
      <li style="margin-bottom: 8px;"><strong>Semestre de Saída:</strong> ${newUser.semesterLeaveEj || "Não informado"}</li>
      <li style="margin-bottom: 8px;"><strong>Tipo de Cadastro:</strong> Ex-Membro</li>
      <li style="margin-bottom: 8px;"><strong>É Alumni Dreamer?</strong> ${newUser.alumniDreamer ? "Sim" : "Não"}</li>
      <li style="margin-bottom: 8px;"><strong>Está trabalhando?</strong> ${newUser.isWorking ? "Sim" : "Não"}</li>
      <li style="margin-bottom: 8px;"><strong>Local de Trabalho:</strong> ${newUser.workplace || "Não informado"}</li>
    `
        : `
      <li style="margin-bottom: 8px;"><strong>Tipo de Cadastro:</strong> Membro</li>
    `
    }
    ${
      newUser.roles.length > 0
        ? `
      <li style="margin-bottom: 8px;">
        <strong>Cargo(s) Solicitado(s):</strong>
        <ul style="margin-top: 5px; padding-left: 20px;">
          ${newUser.roles.map((role) => `<li style="margin-bottom: 5px;">${role.name}</li>`).join("")}
        </ul>
      </li>
    `
        : ""
    }
  `;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nova Solicitação de Cadastro</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #ddd;">
        <div style="margin-bottom: 30px; background-color: #f8f9fa; padding: 20px; text-align: center;">
            <img src="${EMAIL_CONFIG.LOGO_URL}" alt="Logotipo da Empresa JR" style="max-width: 150px; height: auto;"/>
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
            <a href="${EMAIL_CONFIG.APP_URL}/aprovacao-cadastro" style="display: inline-block; background-color: #0126fb; color: #ffffff; font-weight: bold; padding: 14px 28px; margin: 20px 0; text-decoration: none; border-radius: 8px; font-size: 16px;">Verificar Agora</a>
            <p style="font-size: 14px; color: #555;">Leva só alguns minutos!</p>
        </div>
        <div style="background-color: #f8f9fa; padding: 15px; font-size: 12px; color: #777; border-top: 1px solid #ddd; text-align: center;">
            <p style="margin: 0;">Empresa JR &copy; 2025</p>
            <p style="margin: 5px 0 0 0;">Este é um e-mail automático, por favor não responda.</p>
        </div>
    </div>
</body>
</html>`;

  return createEmailCommand({
    to: email,
    subject: `Olá, ${name}! Chegou uma nova solicitação de cadastro.`,
    html,
  });
};
