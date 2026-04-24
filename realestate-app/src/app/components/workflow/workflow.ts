import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslationService } from '../../services/translation.service';

type WorkflowTone =
  | 'neutral'
  | 'source'
  | 'arrival'
  | 'action'
  | 'document'
  | 'support'
  | 'milestone'
  | 'final'
  | 'conditional';

interface WorkflowNote {
  num: number;
  textEn: string;
  textRu: string;
}

interface WorkflowCard {
  titleEn: string;
  titleRu: string;
  descEn: string;
  descRu: string;
  route: string;
  pageLabelEn: string;
  pageLabelRu: string;
  badgeEn?: string;
  badgeRu?: string;
  tone?: WorkflowTone;
}

interface WorkflowLane {
  titleEn: string;
  titleRu: string;
  cards: WorkflowCard[];
}

interface WorkflowSection {
  id: string;
  layout: 'single' | 'stack' | 'grid' | 'lanes' | 'merge';
  titleEn?: string;
  titleRu?: string;
  captionEn?: string;
  captionRu?: string;
  cards?: WorkflowCard[];
  lanes?: WorkflowLane[];
}

interface WorkflowStage {
  num: number;
  titleEn: string;
  titleRu: string;
  summaryEn: string;
  summaryRu: string;
  sections: WorkflowSection[];
}

@Component({
  selector: 'app-workflow',
  standalone: true,
  imports: [],
  templateUrl: './workflow.html',
  styleUrls: ['./workflow.scss'],
})
export class Workflow {
  readonly ts = inject(TranslationService);
  private readonly router = inject(Router);

  readonly notes: WorkflowNote[] = [
    {
      num: 1,
      textEn: 'Preparation for arrival',
      textRu: 'Подготовка к приезду',
    },
    {
      num: 2,
      textEn: 'Primary actions on Cyprus',
      textRu: 'Действия (первичные) на Кипре',
    },
    {
      num: 3,
      textEn: 'Send completed translations to the bank and the lawyer',
      textRu: 'Отправка готовых переводов в банк и адвокату',
    },
    {
      num: 4,
      textEn: 'Approval to buy property if the buyer is outside the EU',
      textRu: 'Получение разрешения на покупку недвижимости, если покупатель не в ЕС',
    },
  ];

  readonly stages: WorkflowStage[] = [
    {
      num: 1,
      titleEn: 'Preparation For Arrival',
      titleRu: 'Подготовка К Приезду',
      summaryEn: 'Partner agents bring the buyer in, the Cyprus team takes over locally, and all arrival logistics are prepared in parallel.',
      summaryRu: 'Партнёрские агенты приводят покупателя, кипрская команда подхватывает кейс локально, а вся логистика приезда готовится параллельно.',
      sections: [
        {
          id: 'sources',
          layout: 'grid',
          titleEn: 'Agent handoff',
          titleRu: 'Передача от агентов',
          cards: [
            {
              titleEn: 'Cyprus Agents',
              titleRu: 'Кипрские агенты',
              descEn: 'Local side prepares the visit after the mailing to partner agents.',
              descRu: 'Локальная команда готовит визит после рассылки по партнёрским агентам.',
              route: '/leads/board',
              pageLabelEn: 'Leads',
              pageLabelRu: 'Лиды',
              badgeEn: 'Local owner',
              badgeRu: 'Локальная сторона',
              tone: 'source',
            },
            {
              titleEn: 'International Agents',
              titleRu: 'Международные агенты',
              descEn: 'Referral partners bring the buyer and pass the case into Cyprus.',
              descRu: 'Партнёрские агенты приводят покупателя и передают кейс на Кипр.',
              route: '/leads/board',
              pageLabelEn: 'Leads',
              pageLabelRu: 'Лиды',
              badgeEn: 'Referral source',
              badgeRu: 'Источник лида',
              tone: 'source',
            },
          ],
        },
        {
          id: 'arrival',
          layout: 'single',
          cards: [
            {
              titleEn: 'Client Arrival',
              titleRu: 'Приезд клиента',
              descEn: 'The case moves from agent handoff into the local visit plan.',
              descRu: 'Кейс переходит от агентской передачи в локальный план визита.',
              route: '/tasks',
              pageLabelEn: 'Tasks',
              pageLabelRu: 'Задачи',
              badgeEn: 'Main flow',
              badgeRu: 'Основной поток',
              tone: 'arrival',
            },
          ],
        },
        {
          id: 'arrival-logistics',
          layout: 'grid',
          titleEn: 'Parallel logistics',
          titleRu: 'Параллельная логистика',
          cards: [
            {
              titleEn: 'Air Tickets',
              titleRu: 'Авиабилеты',
              descEn: 'Coordinate the trip before the buyer lands.',
              descRu: 'Скоординировать перелёт до прилёта покупателя.',
              route: '/tasks',
              pageLabelEn: 'Tasks',
              pageLabelRu: 'Задачи',
              badgeEn: 'Parallel',
              badgeRu: 'Параллельно',
              tone: 'arrival',
            },
            {
              titleEn: 'Hotel',
              titleRu: 'Отель',
              descEn: 'Reserve accommodation for the visit window.',
              descRu: 'Забронировать проживание на время визита.',
              route: '/tasks',
              pageLabelEn: 'Tasks',
              pageLabelRu: 'Задачи',
              badgeEn: 'Parallel',
              badgeRu: 'Параллельно',
              tone: 'arrival',
            },
            {
              titleEn: 'Taxi',
              titleRu: 'Такси',
              descEn: 'Plan airport and on-island transport.',
              descRu: 'Спланировать трансфер из аэропорта и передвижение по острову.',
              route: '/tasks',
              pageLabelEn: 'Tasks',
              pageLabelRu: 'Задачи',
              badgeEn: 'Parallel',
              badgeRu: 'Параллельно',
              tone: 'arrival',
            },
            {
              titleEn: 'Client Schedule',
              titleRu: 'Расписание клиента',
              descEn: 'Build the visit calendar before showings start.',
              descRu: 'Собрать календарь визита до начала показов.',
              route: '/tasks',
              pageLabelEn: 'Tasks',
              pageLabelRu: 'Задачи',
              badgeEn: 'Parallel',
              badgeRu: 'Параллельно',
              tone: 'arrival',
            },
          ],
        },
        {
          id: 'arrived',
          layout: 'merge',
          cards: [
            {
              titleEn: 'Client Arrived',
              titleRu: 'Приехал клиент',
              descEn: 'All arrival preparation converges into the on-island visit.',
              descRu: 'Вся подготовка к приезду сходится в фактический визит на острове.',
              route: '/clients',
              pageLabelEn: 'Clients',
              pageLabelRu: 'Клиенты',
              badgeEn: 'Checkpoint',
              badgeRu: 'Контрольная точка',
              tone: 'milestone',
            },
          ],
        },
      ],
    },
    {
      num: 2,
      titleEn: 'Primary Actions On Cyprus',
      titleRu: 'Первичные Действия На Кипре',
      summaryEn: 'Consultations and showings run in parallel during the trip; after the client leaves, the process immediately switches into the purchase decision and document request.',
      summaryRu: 'Во время визита параллельно идут консультации и показы; после отъезда клиента процесс сразу переключается в решение о покупке и запрос документов.',
      sections: [
        {
          id: 'cyprus-actions',
          layout: 'grid',
          titleEn: 'Parallel actions during the visit',
          titleRu: 'Параллельные действия во время визита',
          cards: [
            {
              titleEn: 'Agenda',
              titleRu: 'Распорядок',
              descEn: 'Coordinate the day-by-day plan on the island.',
              descRu: 'Собрать и вести по дням весь план пребывания на острове.',
              route: '/tasks',
              pageLabelEn: 'Tasks',
              pageLabelRu: 'Задачи',
              badgeEn: 'Note 2',
              badgeRu: 'Этап 2',
              tone: 'action',
            },
            {
              titleEn: 'Lawyer Consultation',
              titleRu: 'Консультация с адвокатом',
              descEn: 'Discuss legal framing, purchase risks and contract expectations.',
              descRu: 'Обсудить юридическую рамку, риски покупки и ожидания по контракту.',
              route: '/tasks',
              pageLabelEn: 'Tasks',
              pageLabelRu: 'Задачи',
              badgeEn: 'Parallel',
              badgeRu: 'Параллельно',
              tone: 'action',
            },
            {
              titleEn: 'Accountant Consultation',
              titleRu: 'Консультация с бухгалтером',
              descEn: 'Clarify tax and service implications before the client leaves.',
              descRu: 'Уточнить налоговые и сервисные вопросы до отъезда клиента.',
              route: '/tasks',
              pageLabelEn: 'Tasks',
              pageLabelRu: 'Задачи',
              badgeEn: 'Parallel',
              badgeRu: 'Параллельно',
              tone: 'action',
            },
            {
              titleEn: 'Bank Consultation',
              titleRu: 'Консультация с банком',
              descEn: 'Check account-opening and payment requirements.',
              descRu: 'Проверить требования к открытию счёта и к платежам.',
              route: '/tasks',
              pageLabelEn: 'Tasks',
              pageLabelRu: 'Задачи',
              badgeEn: 'Parallel',
              badgeRu: 'Параллельно',
              tone: 'action',
            },
            {
              titleEn: 'Building & Apartment Viewing',
              titleRu: 'Показ здания и квартиры',
              descEn: 'Show the building and the target unit on site.',
              descRu: 'Показать объект, здание и конкретную квартиру на месте.',
              route: '/properties',
              pageLabelEn: 'Properties',
              pageLabelRu: 'Объекты',
              badgeEn: 'Parallel',
              badgeRu: 'Параллельно',
              tone: 'action',
            },
          ],
        },
        {
          id: 'leaves',
          layout: 'merge',
          cards: [
            {
              titleEn: 'Client Leaves',
              titleRu: 'Клиент уезжает',
              descEn: 'The visit is complete and the case moves into post-visit execution.',
              descRu: 'Визит завершён, и кейс переходит в послевизитную реализацию.',
              route: '/clients',
              pageLabelEn: 'Clients',
              pageLabelRu: 'Клиенты',
              badgeEn: 'Checkpoint',
              badgeRu: 'Контрольная точка',
              tone: 'milestone',
            },
          ],
        },
        {
          id: 'post-visit',
          layout: 'stack',
          titleEn: 'After the visit',
          titleRu: 'После визита',
          cards: [
            {
              titleEn: 'Buyer Decides To Buy',
              titleRu: 'Покупатель решил купить',
              descEn: 'The client calls back and confirms they want to proceed.',
              descRu: 'Клиент возвращается с решением и подтверждает, что хочет покупать.',
              route: '/clients',
              pageLabelEn: 'Clients',
              pageLabelRu: 'Клиенты',
              badgeEn: 'Decision',
              badgeRu: 'Решение',
              tone: 'document',
            },
            {
              titleEn: 'Document Request',
              titleRu: 'Запрос документов',
              descEn: 'Send the template list of required documents to the buyer.',
              descRu: 'Отправить покупателю шаблонный список необходимых документов.',
              route: '/tasks',
              pageLabelEn: 'Tasks',
              pageLabelRu: 'Задачи',
              badgeEn: 'Template',
              badgeRu: 'Шаблон',
              tone: 'document',
            },
            {
              titleEn: 'Buyer Sends Documents',
              titleRu: 'Покупатель отправляет документы',
              descEn: 'The checklist comes back together with the passport data package.',
              descRu: 'Чек-лист возвращается вместе с пакетом паспортных данных.',
              route: '/clients',
              pageLabelEn: 'Clients',
              pageLabelRu: 'Клиенты',
              badgeEn: 'Input package',
              badgeRu: 'Входящий пакет',
              tone: 'document',
            },
          ],
        },
      ],
    },
    {
      num: 3,
      titleEn: 'Translations, Bank, Lawyer',
      titleRu: 'Переводы, Банк, Адвокат',
      summaryEn: 'Passport data goes into translation, translated documents are distributed to the bank and the lawyer, and the parallel document pack is prepared before the 30% signature point.',
      summaryRu: 'Паспортные данные уходят в перевод, готовые переводы расходятся в банк и адвокату, а параллельный пакет документов готовится до точки подписи на 30%.',
      sections: [
        {
          id: 'passport-stream',
          layout: 'stack',
          titleEn: 'Passport-data stream',
          titleRu: 'Поток паспортных данных',
          captionEn: 'The hand-drawn scheme explicitly splits the passport data into a translation branch before distribution.',
          captionRu: 'На схеме паспортные данные явно уходят в отдельную ветку перевода перед дальнейшей рассылкой.',
          cards: [
            {
              titleEn: 'Multiglossa',
              titleRu: 'Multiglossa',
              descEn: 'Passport data goes into translation.',
              descRu: 'Паспортные данные уходят в перевод.',
              route: '/tasks',
              pageLabelEn: 'Tasks',
              pageLabelRu: 'Задачи',
              badgeEn: 'Passport data',
              badgeRu: 'Паспортные данные',
              tone: 'document',
            },
            {
              titleEn: 'Ready Translation Package',
              titleRu: 'Готовый перевод документов',
              descEn: 'Completed translations become the package for the bank and the lawyer.',
              descRu: 'Готовые переводы становятся пакетом для банка и адвоката.',
              route: '/tasks',
              pageLabelEn: 'Tasks',
              pageLabelRu: 'Задачи',
              badgeEn: 'Note 3',
              badgeRu: 'Этап 3',
              tone: 'document',
            },
          ],
        },
        {
          id: 'parallel-doc-work',
          layout: 'lanes',
          titleEn: 'Parallel work after translated docs are ready',
          titleRu: 'Параллельная работа после готовых переводов',
          lanes: [
            {
              titleEn: 'Buyer pack',
              titleRu: 'Пакет для покупателя',
              cards: [
                {
                  titleEn: 'Preliminary Contracts (Common Area)',
                  titleRu: 'Предварительные контракты (Common Area)',
                  descEn: 'The initial contract pack is assembled before sending downstream documents.',
                  descRu: 'Собирается стартовый пакет предварительных контрактов перед дальнейшей отправкой.',
                  route: '/tasks',
                  pageLabelEn: 'Tasks',
                  pageLabelRu: 'Задачи',
                  badgeEn: 'Internal pack',
                  badgeRu: 'Внутренний пакет',
                  tone: 'support',
                },
                {
                  titleEn: '7% Contract',
                  titleRu: '7% Contract',
                  descEn: 'Prepare the 7% contract stream from the common-area pack.',
                  descRu: 'Подготовить ветку 7% contract из пакета common area.',
                  route: '/tasks',
                  pageLabelEn: 'Tasks',
                  pageLabelRu: 'Задачи',
                  badgeEn: 'Parallel',
                  badgeRu: 'Параллельно',
                  tone: 'support',
                },
                {
                  titleEn: 'Common Area',
                  titleRu: 'Common Area',
                  descEn: 'Prepare the common-area document set.',
                  descRu: 'Подготовить комплект документов по common area.',
                  route: '/tasks',
                  pageLabelEn: 'Tasks',
                  pageLabelRu: 'Задачи',
                  badgeEn: 'Parallel',
                  badgeRu: 'Параллельно',
                  tone: 'support',
                },
                {
                  titleEn: 'Management Agreement',
                  titleRu: 'Management Agreement',
                  descEn: 'Prepare the management agreement on our side.',
                  descRu: 'Подготовить management agreement с нашей стороны.',
                  route: '/tasks',
                  pageLabelEn: 'Tasks',
                  pageLabelRu: 'Задачи',
                  badgeEn: 'Parallel',
                  badgeRu: 'Параллельно',
                  tone: 'support',
                },
                {
                  titleEn: 'Inventory',
                  titleRu: 'Инвентарь',
                  descEn: 'Prepare the inventory package in parallel.',
                  descRu: 'Подготовить пакет инвентаря параллельно.',
                  route: '/tasks',
                  pageLabelEn: 'Tasks',
                  pageLabelRu: 'Задачи',
                  badgeEn: 'Parallel',
                  badgeRu: 'Параллельно',
                  tone: 'support',
                },
                {
                  titleEn: 'Send To Buyer',
                  titleRu: 'Отправка покупателю',
                  descEn: 'All buyer-facing documents are sent as one package.',
                  descRu: 'Все клиентские документы отправляются единым пакетом.',
                  route: '/clients',
                  pageLabelEn: 'Clients',
                  pageLabelRu: 'Клиенты',
                  badgeEn: 'Output',
                  badgeRu: 'Выход',
                  tone: 'document',
                },
              ],
            },
            {
              titleEn: 'Bank',
              titleRu: 'Банк',
              cards: [
                {
                  titleEn: 'Forward To Bank',
                  titleRu: 'Переправить банку',
                  descEn: 'Send the completed translated package to the bank.',
                  descRu: 'Переслать готовый переведённый пакет в банк.',
                  route: '/tasks',
                  pageLabelEn: 'Tasks',
                  pageLabelRu: 'Задачи',
                  badgeEn: 'From translations',
                  badgeRu: 'Из переводов',
                  tone: 'document',
                },
                {
                  titleEn: 'Open Account',
                  titleRu: 'Открытие счёта',
                  descEn: 'Account opening follows the bank submission.',
                  descRu: 'После отправки в банк запускается открытие счёта.',
                  route: '/tasks',
                  pageLabelEn: 'Tasks',
                  pageLabelRu: 'Задачи',
                  badgeEn: 'Bank follow-up',
                  badgeRu: 'Следом за банком',
                  tone: 'document',
                },
              ],
            },
            {
              titleEn: 'Legal',
              titleRu: 'Юридический поток',
              cards: [
                {
                  titleEn: 'Forward To Lawyer',
                  titleRu: 'Переправить адвокату',
                  descEn: 'The same translated package is forwarded to the lawyer.',
                  descRu: 'Тот же готовый пакет переводов пересылается адвокату.',
                  route: '/tasks',
                  pageLabelEn: 'Tasks',
                  pageLabelRu: 'Задачи',
                  badgeEn: 'From translations',
                  badgeRu: 'Из переводов',
                  tone: 'document',
                },
                {
                  titleEn: 'Preliminary Purchase Contract',
                  titleRu: 'Предварительный контракт покупки',
                  descEn: 'The lawyer forms the preliminary purchase contract.',
                  descRu: 'Адвокат формирует предварительный контракт покупки.',
                  route: '/tasks',
                  pageLabelEn: 'Tasks',
                  pageLabelRu: 'Задачи',
                  badgeEn: 'Lawyer output',
                  badgeRu: 'Результат адвоката',
                  tone: 'support',
                },
                {
                  titleEn: 'Buyer Approval',
                  titleRu: 'Согласование покупателем',
                  descEn: 'The draft is agreed with the buyer before signing.',
                  descRu: 'Черновик согласовывается с покупателем до подписания.',
                  route: '/clients',
                  pageLabelEn: 'Clients',
                  pageLabelRu: 'Клиенты',
                  badgeEn: 'Approval',
                  badgeRu: 'Согласование',
                  tone: 'support',
                },
              ],
            },
            {
              titleEn: 'Additional',
              titleRu: 'Дополнительно',
              cards: [
                {
                  titleEn: 'Design',
                  titleRu: 'Дизайн',
                  descEn: 'The note list keeps design as a separate parallel stream.',
                  descRu: 'В заметках дизайн вынесен в отдельный параллельный поток.',
                  route: '/tasks',
                  pageLabelEn: 'Tasks',
                  pageLabelRu: 'Задачи',
                  badgeEn: 'Parallel',
                  badgeRu: 'Параллельно',
                  tone: 'support',
                },
              ],
            },
          ],
        },
        {
          id: 'signing',
          layout: 'merge',
          cards: [
            {
              titleEn: 'Sign & Pay 30%',
              titleRu: 'Подпись и оплата 30%',
              descEn: 'All parallel streams converge into signing by the lawyer or the buyer with the first 30% payment.',
              descRu: 'Все параллельные потоки сходятся в подпись у адвоката или клиента с первым платежом 30%.',
              route: '/clients',
              pageLabelEn: 'Clients',
              pageLabelRu: 'Клиенты',
              badgeEn: 'Key milestone',
              badgeRu: 'Ключевой этап',
              tone: 'milestone',
            },
          ],
        },
      ],
    },
    {
      num: 4,
      titleEn: 'Approval And Re-Registration',
      titleRu: 'Разрешение И Переоформление',
      summaryEn: 'After the 30% signature point, the non-EU approval branch and the accountant branch both feed into the final re-registration and remaining payment.',
      summaryRu: 'После точки подписи на 30% ветка разрешения для не-ЕС и ветка бухгалтера обе сходятся в финальное переоформление и оплату остатка.',
      sections: [
        {
          id: 'post-signing',
          layout: 'grid',
          titleEn: 'After signing',
          titleRu: 'После подписи',
          cards: [
            {
              titleEn: 'Approval To Buy Property',
              titleRu: 'Разрешение на покупку недвижимости',
              descEn: 'Lawyer handles the purchase approval when the buyer is outside the EU.',
              descRu: 'Адвокат получает разрешение на покупку, если покупатель не из ЕС.',
              route: '/tasks',
              pageLabelEn: 'Tasks',
              pageLabelRu: 'Задачи',
              badgeEn: 'Non-EU only',
              badgeRu: 'Только не-ЕС',
              tone: 'conditional',
            },
            {
              titleEn: 'Accountant Services',
              titleRu: 'Услуги бухгалтера',
              descEn: 'The accountant branch continues toward the final completion point.',
              descRu: 'Ветка бухгалтера продолжается до финальной точки завершения.',
              route: '/tasks',
              pageLabelEn: 'Tasks',
              pageLabelRu: 'Задачи',
              badgeEn: 'Parallel',
              badgeRu: 'Параллельно',
              tone: 'support',
            },
          ],
        },
        {
          id: 'completion',
          layout: 'merge',
          cards: [
            {
              titleEn: 'Re-Registration And Payment',
              titleRu: 'Переоформление и оплата',
              descEn: 'The process closes at re-registration with the remaining amount paid.',
              descRu: 'Процесс закрывается на переоформлении с оплатой оставшейся суммы.',
              route: '/clients',
              pageLabelEn: 'Clients',
              pageLabelRu: 'Клиенты',
              badgeEn: 'Final point',
              badgeRu: 'Финальная точка',
              tone: 'final',
            },
          ],
        },
      ],
    },
  ];

  readonly legend = [
    {
      labelEn: 'Sequential checkpoint',
      labelRu: 'Последовательная контрольная точка',
      tone: 'milestone' as const,
    },
    {
      labelEn: 'Parallel stream',
      labelRu: 'Параллельный поток',
      tone: 'support' as const,
    },
    {
      labelEn: 'Conditional non-EU branch',
      labelRu: 'Условная ветка для не-ЕС',
      tone: 'conditional' as const,
    },
  ];

  navigate(route: string): void {
    void this.router.navigateByUrl(route);
  }

  t(en: string, ru: string): string {
    return this.ts.lang() === 'ru' ? ru : en;
  }
}
