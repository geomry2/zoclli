import { Component, computed, inject, signal } from '@angular/core';
import { TranslationService } from '../../services/translation.service';

type EmailAudience = 'individuals' | 'companies' | 'agents';

interface EmailTemplate {
  id: string;
  audience: EmailAudience;
  titleEn: string;
  titleRu: string;
  scenarioEn: string;
  scenarioRu: string;
  subject: string;
  body: string[];
}

interface EmailAudienceOption {
  id: EmailAudience;
  labelEn: string;
  labelRu: string;
  descriptionEn: string;
  descriptionRu: string;
}

const AUDIENCES: EmailAudienceOption[] = [
  {
    id: 'individuals',
    labelEn: 'Individuals',
    labelRu: 'Физические лица',
    descriptionEn: 'Buyer-facing replies, viewings, follow-ups, and reservation steps.',
    descriptionRu: 'Письма покупателям: ответы, просмотры, follow-up и резервирование.',
  },
  {
    id: 'companies',
    labelEn: 'Companies',
    labelRu: 'Юридические лица',
    descriptionEn: 'Investor communication, project updates, and private opportunities.',
    descriptionRu: 'Коммуникация с инвесторами, апдейты проектов и закрытые предложения.',
  },
  {
    id: 'agents',
    labelEn: 'Agents',
    labelRu: 'Агенты',
    descriptionEn: 'Partner cooperation, commissions, client handoff, and marketing packs.',
    descriptionRu: 'Партнёрство, комиссии, передача клиентов и маркетинговые материалы.',
  },
];

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'individuals-inquiry-response',
    audience: 'individuals',
    titleEn: 'Reply to an Initial Inquiry',
    titleRu: 'Ответ на первый запрос',
    scenarioEn: 'Use this when someone contacts us through the website, BuySell, or email.',
    scenarioRu: 'Когда человек написал через сайт / BuySell / email.',
    subject: 'Thank you for your interest in Zortive Limited',
    body: [
      'Dear [Name],',
      'Thank you for your interest in our properties.',
      'My name is [Your Name], and I represent Zortive Limited. We specialize in construction, development, and investment projects in Cyprus.',
      'I would be happy to provide you with detailed information about the property you are interested in. Please let me know if you would like to receive:',
      'full specifications',
      'floor plans',
      'pricing and availability',
      'additional photos and videos',
      'If convenient, we can also arrange a call or a viewing.',
      'Looking forward to hearing from you.',
      'Kind regards,\n[Your Name]\nZortive Limited',
    ],
  },
  {
    id: 'individuals-property-info',
    audience: 'individuals',
    titleEn: 'Send Details for a Specific Property',
    titleRu: 'Отправка информации о конкретном объекте',
    scenarioEn: 'Use this when a client needs the key details for one selected property.',
    scenarioRu: 'Когда клиенту нужно отправить карточку конкретного объекта.',
    subject: 'Property Information - [Project / Property Name]',
    body: [
      'Dear [Name],',
      'Thank you for your interest in our property.',
      'Please find below the main information about the property:',
      'Property: [Property Name]\nLocation: [Area]\nBedrooms: [Number]\nTotal Area: [Size]\nPrice: [Price]',
      'Key features include:',
      'modern architectural design',
      'private outdoor area',
      'premium materials and finishes',
      'convenient location near amenities',
      'I would be happy to send you additional materials such as floor plans, specifications, or videos of the property.',
      'Please let me know if you would like to schedule a viewing or receive further information.',
      'Kind regards,\n[Your Name]\nZortive Limited',
    ],
  },
  {
    id: 'individuals-viewing',
    audience: 'individuals',
    titleEn: 'Invite a Client to a Viewing',
    titleRu: 'Приглашение на просмотр',
    scenarioEn: 'Use this when arranging an in-person viewing, online viewing, or project presentation.',
    scenarioRu: 'Когда нужно согласовать просмотр объекта.',
    subject: 'Viewing Appointment - [Property Name]',
    body: [
      'Dear [Name],',
      'Thank you for your interest in our property.',
      'We would be happy to arrange a viewing for you at a convenient time.',
      'Available options include:',
      'in-person viewing at the property',
      'online video viewing',
      'presentation with full project details',
      'Please let me know your preferred date and time, and we will be glad to arrange everything for you.',
      'Kind regards,\n[Your Name]\nZortive Limited',
    ],
  },
  {
    id: 'individuals-follow-up',
    audience: 'individuals',
    titleEn: 'Follow Up After No Reply',
    titleRu: 'Follow-up письмо',
    scenarioEn: 'Use this when the client has not replied after the first contact.',
    scenarioRu: 'Если клиент не отвечает после первичного контакта.',
    subject: 'Following up on your property inquiry',
    body: [
      'Dear [Name],',
      'I hope you are doing well.',
      'I just wanted to follow up regarding your interest in our property.',
      'Please let me know if you would like to receive additional information, updated availability, or schedule a viewing.',
      'I would be happy to assist you with any questions you may have.',
      'Kind regards,\n[Your Name]\nZortive Limited',
    ],
  },
  {
    id: 'individuals-after-viewing',
    audience: 'individuals',
    titleEn: 'Follow Up After a Viewing',
    titleRu: 'Письмо после просмотра',
    scenarioEn: 'Use this after a property viewing or project presentation.',
    scenarioRu: 'После просмотра объекта или презентации проекта.',
    subject: 'Thank you for visiting [Property Name]',
    body: [
      'Dear [Name],',
      'Thank you for taking the time to view the property.',
      'It was a pleasure meeting you and presenting the project.',
      'Please feel free to contact me if you would like additional information, updated availability, or assistance with the next steps.',
      'I would be happy to support you throughout the process.',
      'Kind regards,\n[Your Name]\nZortive Limited',
    ],
  },
  {
    id: 'individuals-reservation',
    audience: 'individuals',
    titleEn: 'Offer to Reserve the Property',
    titleRu: 'Письмо с предложением зарезервировать объект',
    scenarioEn: 'Use this when the client is ready to move forward with the selected property.',
    scenarioRu: 'Когда клиент готов двигаться дальше по выбранному объекту.',
    subject: 'Reservation Opportunity - [Property Name]',
    body: [
      'Dear [Name],',
      'Thank you for your interest in the property.',
      'If you would like to proceed, the next step would be to reserve the property. Reservation allows the property to be held for you while the necessary documentation is prepared.',
      'Please let me know if you would like to receive the reservation details and next steps.',
      'Kind regards,\n[Your Name]\nZortive Limited',
    ],
  },
  {
    id: 'companies-first-investor',
    audience: 'companies',
    titleEn: 'First Message to an Investor',
    titleRu: 'Первое письмо инвестору',
    scenarioEn: 'Use this for the first contact with a potential investor.',
    scenarioRu: 'Для первого контакта с потенциальным инвестором.',
    subject: 'Investment Opportunity - Zortive Limited Projects',
    body: [
      'Dear [Name],',
      'My name is [Your Name], and I represent Zortive Limited.',
      'We are a development and investment company specializing in residential real estate projects in Cyprus.',
      'We would be pleased to present you with investment opportunities in our current and upcoming projects. Our developments focus on high-quality construction, attractive locations, and strong long-term value.',
      'If you are interested, I would be happy to share a brief investment overview including project details, estimated returns, and available investment formats.',
      'Please let me know if you would like to receive further information.',
      'Kind regards,\n[Your Name]\nZortive Limited',
    ],
  },
  {
    id: 'companies-investment-overview',
    audience: 'companies',
    titleEn: 'Send an Investment Overview',
    titleRu: 'Отправка инвестиционного предложения',
    scenarioEn: 'Use this when an investor asks for more information about a project.',
    scenarioRu: 'Когда инвестор запросил детали по проекту.',
    subject: 'Investment Overview - [Project Name]',
    body: [
      'Dear [Name],',
      'Thank you for your interest in our investment opportunities.',
      'Please find below a brief overview of the project:',
      'Project: [Project Name]\nLocation: [Area, Cyprus]\nProperty Type: [Villas / Apartments]\nProject Stage: [Planned / Under Construction]',
      'Investment highlights:',
      'attractive location with strong demand',
      'modern architectural concept',
      'premium construction standards',
      'potential for capital appreciation',
      'I would be happy to provide a full investment presentation including financial projections and project details.',
      'Please let me know if you would like to receive the full investment package.',
      'Kind regards,\n[Your Name]\nZortive Limited',
    ],
  },
  {
    id: 'companies-returns',
    audience: 'companies',
    titleEn: 'Share Expected Investment Returns',
    titleRu: 'Письмо с финансовыми показателями',
    scenarioEn: 'Use this to discuss projected returns and the advantages of early entry.',
    scenarioRu: 'Для обсуждения ожидаемой доходности и преимуществ входа.',
    subject: 'Investment Returns - [Project Name]',
    body: [
      'Dear [Name],',
      'Further to our previous message, please find a summary of the investment potential for the project.',
      'Estimated investment advantages include:',
      'potential capital appreciation',
      'attractive entry price during early project stage',
      'strong demand in the local property market',
      'long-term value growth',
      'A detailed financial overview including projected returns and investment structure can be provided upon request.',
      'Please feel free to contact me if you would like to discuss the opportunity in more detail.',
      'Kind regards,\n[Your Name]\nZortive Limited',
    ],
  },
  {
    id: 'companies-investment-call',
    audience: 'companies',
    titleEn: 'Invite an Investor to Discuss the Opportunity',
    titleRu: 'Приглашение обсудить инвестицию',
    scenarioEn: 'Use this to schedule a call or meeting about the investment opportunity.',
    scenarioRu: 'Когда нужно назначить звонок или встречу по инвестиции.',
    subject: 'Investment Discussion - Zortive Limited',
    body: [
      'Dear [Name],',
      'Thank you for your interest in our investment opportunities.',
      'We would be happy to arrange a call or meeting to discuss the project in more detail, including the investment structure, timeline, and expected returns.',
      'Please let me know a convenient time for you.',
      'Kind regards,\n[Your Name]\nZortive Limited',
    ],
  },
  {
    id: 'companies-private-offer',
    audience: 'companies',
    titleEn: 'Private Investment Offer',
    titleRu: 'Закрытое предложение',
    scenarioEn: 'Use this for a selective private offer on an early-stage project.',
    scenarioRu: 'Для точечного private offer по проекту на ранней стадии.',
    subject: 'Private Investment Opportunity - Zortive Limited',
    body: [
      'Dear [Name],',
      'We would like to present a private investment opportunity related to one of our upcoming projects.',
      'The opportunity involves participation in the development stage of the project, offering potential advantages compared to purchasing completed properties.',
      'Due to the limited number of investment positions available, we are sharing this information selectively.',
      'Please let me know if you would like to receive further details.',
      'Kind regards,\n[Your Name]\nZortive Limited',
    ],
  },
  {
    id: 'companies-project-update',
    audience: 'companies',
    titleEn: 'Project Update for Investors',
    titleRu: 'Апдейт проекта для инвесторов',
    scenarioEn: 'Use this for regular updates on construction, sales progress, and next milestones.',
    scenarioRu: 'Для регулярного статуса по стройке, продажам и следующему этапу.',
    subject: 'Project Update - [Project Name]',
    body: [
      'Dear [Name],',
      'We would like to share a brief update regarding the progress of our project.',
      'Current status:',
      'construction progress: [stage]',
      'sales progress: [number of units sold]',
      'upcoming milestones: [next stage]',
      'If you would like to receive further updates or discuss investment opportunities in this or future projects, please feel free to contact us.',
      'Kind regards,\n[Your Name]\nZortive Limited',
    ],
  },
  {
    id: 'agents-first-contact',
    audience: 'agents',
    titleEn: 'First Message to an Agent',
    titleRu: 'Первое письмо агенту',
    scenarioEn: 'Use this for the first contact with an agency or broker.',
    scenarioRu: 'Для первого контакта с агентством или брокером.',
    subject: 'Cooperation Opportunity - Zortive Limited',
    body: [
      'Dear [Agent Name],',
      'My name is [Your Name], and I represent Zortive Limited.',
      'We are a development and investment company specializing in high-quality residential properties in Cyprus.',
      'We would be happy to cooperate with your agency and provide access to our current projects.',
      'Our properties offer:',
      'competitive agent commissions',
      'modern architecture and premium materials',
      'strong investment potential',
      'attractive locations',
      'If you are interested, I would be happy to send you full project details, pricing, and available units.',
      'Looking forward to working together.',
      'Kind regards,\n[Your Name]\nZortive Limited',
    ],
  },
  {
    id: 'agents-project-info',
    audience: 'agents',
    titleEn: 'Send Project Details to an Agent',
    titleRu: 'Отправка проекта агенту',
    scenarioEn: 'Use this when an agent needs property details for a client.',
    scenarioRu: 'Когда агенту нужны детали объекта для клиента.',
    subject: 'Property Information - [Project / Property Name]',
    body: [
      'Dear [Agent Name],',
      'Thank you for your interest in our project.',
      'Please find the main information below:',
      'Project: [Project Name]\nLocation: [Area]\nProperty Type: [Villas / Apartments]\nBedrooms: [Number]\nStarting Price: [Price]',
      'Key advantages:',
      'modern design and premium specifications',
      'attractive location close to amenities',
      'strong investment potential',
      'I can also provide:',
      'floor plans',
      'price list',
      'specifications',
      'marketing materials',
      'Please let me know if you have a client interested in this type of property.',
      'Kind regards,\n[Your Name]\nZortive Limited',
    ],
  },
  {
    id: 'agents-commission',
    audience: 'agents',
    titleEn: 'Explain Agent Commission Terms',
    titleRu: 'Комиссия агенту',
    scenarioEn: 'Use this when an agent asks about commission terms.',
    scenarioRu: 'Когда агент уточняет условия комиссии.',
    subject: 'Agent Commission - Zortive Limited Projects',
    body: [
      'Dear [Agent Name],',
      'Thank you for your interest in cooperating with Zortive Limited.',
      'We offer competitive commission terms for agents introducing clients to our projects.',
      'Commission is paid upon successful completion of the sale according to the agreed terms.',
      'If you have an interested client, please feel free to contact me and I will be happy to provide full project information and assist throughout the process.',
      'Kind regards,\n[Your Name]\nZortive Limited',
    ],
  },
  {
    id: 'agents-client-intro',
    audience: 'agents',
    titleEn: 'Request Client Introduction Details',
    titleRu: 'Запрос информации о клиенте',
    scenarioEn: 'Use this when an agent introduces a client and we need the basic details.',
    scenarioRu: 'Когда агент передаёт клиента и нужно собрать вводные.',
    subject: 'Client Introduction - Zortive Limited',
    body: [
      'Dear [Agent Name],',
      'Thank you for introducing your client.',
      'To proceed further, could you please share the following information:',
      'client name',
      'property interest (project / type)',
      'preferred budget',
      'timeline for purchase',
      'Once we receive the details, we will be happy to provide full support and arrange a viewing if required.',
      'Kind regards,\n[Your Name]\nZortive Limited',
    ],
  },
  {
    id: 'agents-viewing',
    audience: 'agents',
    titleEn: 'Arrange a Viewing for an Agent’s Client',
    titleRu: 'Организация просмотра для клиента агента',
    scenarioEn: 'Use this when an agent’s client is ready to view a property.',
    scenarioRu: 'Когда агентский клиент готов посмотреть объект.',
    subject: 'Viewing Arrangement - [Project Name]',
    body: [
      'Dear [Agent Name],',
      'Thank you for introducing your client.',
      'We would be happy to arrange a viewing of the property.',
      'Please let me know your preferred date and time, and we will organize the viewing accordingly.',
      'If needed, we can also provide a full presentation of the project and available units.',
      'Kind regards,\n[Your Name]\nZortive Limited',
    ],
  },
  {
    id: 'agents-marketing-materials',
    audience: 'agents',
    titleEn: 'Send Marketing Materials',
    titleRu: 'Отправка маркетинговых материалов',
    scenarioEn: 'Use this to send presentations, floor plans, price lists, and specifications to a partner.',
    scenarioRu: 'Для передачи презентаций, планировок и прайсов партнёру.',
    subject: 'Marketing Materials - [Project Name]',
    body: [
      'Dear [Agent Name],',
      'Please find attached the marketing materials for our project [Project Name].',
      'Included:',
      'project presentation',
      'floor plans',
      'price list',
      'specifications',
      'If you need additional information or customized materials for your clients, please let me know.',
      'Kind regards,\n[Your Name]\nZortive Limited',
    ],
  },
  {
    id: 'agents-new-project',
    audience: 'agents',
    titleEn: 'Announce a New Project',
    titleRu: 'Уведомление о новых проектах',
    scenarioEn: 'Use this to tell partner agents about a newly released project.',
    scenarioRu: 'Когда нужно сообщить партнёрам о запуске нового проекта.',
    subject: 'New Project Release - Zortive Limited',
    body: [
      'Dear [Agent Name],',
      'We are pleased to announce a new project by Zortive Limited.',
      'Project: [Project Name]\nLocation: [Area]',
      'The project includes modern properties designed with premium materials and strong investment potential.',
      'If you have clients interested in this type of property, I would be happy to share full project information.',
      'Kind regards,\n[Your Name]\nZortive Limited',
    ],
  },
];

@Component({
  selector: 'app-email-templates',
  standalone: true,
  imports: [],
  templateUrl: './email-templates.html',
  styleUrl: './email-templates.scss',
})
export class EmailTemplates {
  readonly ts = inject(TranslationService);
  readonly audiences = AUDIENCES;
  readonly activeAudience = signal<EmailAudience>('individuals');
  readonly query = signal('');
  readonly copiedTemplateId = signal<string | null>(null);

  readonly templates = computed(() => {
    const query = this.query().trim().toLowerCase();
    return EMAIL_TEMPLATES.filter(template => {
      const audienceMatches = template.audience === this.activeAudience();
      const haystack = [
        template.titleEn,
        template.titleRu,
        template.scenarioEn,
        template.scenarioRu,
        template.subject,
        ...template.body,
      ].join(' ').toLowerCase();
      return audienceMatches && (!query || haystack.includes(query));
    });
  });

  readonly activeAudienceMeta = computed(() =>
    this.audiences.find(audience => audience.id === this.activeAudience()) ?? this.audiences[0]
  );

  readonly totalTemplates = EMAIL_TEMPLATES.length;

  setAudience(audience: EmailAudience) {
    this.activeAudience.set(audience);
    this.copiedTemplateId.set(null);
  }

  setQuery(event: Event) {
    this.query.set((event.target as HTMLInputElement).value);
  }

  async copyTemplate(template: EmailTemplate) {
    const text = `Subject: ${template.subject}\n\n${template.body.join('\n\n')}`;
    await navigator.clipboard.writeText(text);
    this.copiedTemplateId.set(template.id);
    window.setTimeout(() => {
      if (this.copiedTemplateId() === template.id) {
        this.copiedTemplateId.set(null);
      }
    }, 1600);
  }

  audienceLabel(audience: EmailAudienceOption): string {
    return this.ts.lang() === 'ru' ? audience.labelRu : audience.labelEn;
  }

  audienceDescription(audience: EmailAudienceOption): string {
    return this.ts.lang() === 'ru' ? audience.descriptionRu : audience.descriptionEn;
  }

  templateTitle(template: EmailTemplate): string {
    return this.ts.lang() === 'ru' ? template.titleRu : template.titleEn;
  }

  templateScenario(template: EmailTemplate): string {
    return this.ts.lang() === 'ru' ? template.scenarioRu : template.scenarioEn;
  }

  t(en: string, ru: string): string {
    return this.ts.lang() === 'ru' ? ru : en;
  }
}
