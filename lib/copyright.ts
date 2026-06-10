/**
 * Schedule Generation System
 *
 * Copyright (c) 2025 [SEU NOME/EMPRESA]
 * Todos os direitos reservados.
 *
 * Este software e o código-fonte associado são propriedade de [SEU NOME/EMPRESA].
 *
 * Uso não autorizado, cópia, modificação ou distribuição deste software
 * é estritamente proibido e pode resultar em penalidades civis e criminais.
 *
 * Para licenciamento ou mais informações, contacte:
 * Email: [SEU EMAIL]
 * Website: [SEU WEBSITE]
 *
 * @author [SEU NOME]
 * @version 1.0.0
 * @date 2025-01-20
 */

export const COPYRIGHT = {
  owner: "[SEU NOME/EMPRESA]",
  year: "2025",
  version: "1.0.0",
  email: "[SEU EMAIL]",
  website: "[SEU WEBSITE]",
  allRightsReserved: true,
} as const

export function getCopyrightNotice(): string {
  return `© ${COPYRIGHT.year} ${COPYRIGHT.owner}. Todos os direitos reservados.`
}

export function getFullLicense(): string {
  return `
    Schedule Generation System v${COPYRIGHT.version}
    
    Copyright (c) ${COPYRIGHT.year} ${COPYRIGHT.owner}
    Todos os direitos reservados.
    
    Este software é proprietário e confidencial.
    Uso não autorizado é proibido por lei.
    
    Contacto: ${COPYRIGHT.email}
  `.trim()
}
