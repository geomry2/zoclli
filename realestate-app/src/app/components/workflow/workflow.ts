import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslationService } from '../../services/translation.service';

interface WorkflowStep {
  num: number;
  icon: string;
  titleEn: string;
  titleRu: string;
  descEn: string;
  descRu: string;
  detailsEn: string[];
  detailsRu: string[];
  route: string;
  pageLabelEn: string;
  pageLabelRu: string;
  isConditional?: boolean;
}

interface WorkflowPhase {
  labelEn: string;
  labelRu: string;
  colorClass: string;
  steps: WorkflowStep[];
}

@Component({
  selector: 'app-workflow',
  standalone: true,
  imports: [],
  templateUrl: './workflow.html',
  styleUrl: './workflow.scss',
})
export class Workflow {
  readonly ts = inject(TranslationService);
  private readonly router = inject(Router);

  readonly phases: WorkflowPhase[] = [
    {
      labelEn: 'Acquisition',
      labelRu: 'Привлечение',
      colorClass: 'phase--green',
      steps: [
        {
          num: 1,
          icon: 'signal',
          titleEn: 'Lead Received',
          titleRu: 'Лид получен',
          descEn: 'Inquiry from portal, social media, or referral',
          descRu: 'Запрос с портала, соцсетей или рекомендации',
          detailsEn: ['Bazaraki, home.cy, Instagram', 'Referral network', 'Direct website inquiry'],
          detailsRu: ['Bazaraki, home.cy, Instagram', 'Реферальная сеть', 'Прямой запрос с сайта'],
          route: '/leads/board',
          pageLabelEn: 'Leads',
          pageLabelRu: 'Лиды',
        },
        {
          num: 2,
          icon: 'check-user',
          titleEn: 'Qualification',
          titleRu: 'Квалификация',
          descEn: 'Budget, EU / non-EU status, property preferences',
          descRu: 'Бюджет, статус ЕС / не-ЕС, предпочтения',
          detailsEn: ['Budget range min–max', 'EU or non-EU citizen', 'Property type & location'],
          detailsRu: ['Диапазон бюджета', 'Гражданин ЕС или не-ЕС', 'Тип объекта и локация'],
          route: '/leads/board',
          pageLabelEn: 'Leads',
          pageLabelRu: 'Лиды',
        },
        {
          num: 3,
          icon: 'phone',
          titleEn: 'First Contact',
          titleRu: 'Первый контакт',
          descEn: 'Video call, shortlist prepared, follow-up date set',
          descRu: 'Видеозвонок, шортлист объектов, дата follow-up',
          detailsEn: ['Video / phone call', 'Property shortlist sent', 'Follow-up date agreed'],
          detailsRu: ['Видео / звонок', 'Шортлист объектов отправлен', 'Дата follow-up согласована'],
          route: '/leads/board',
          pageLabelEn: 'Leads',
          pageLabelRu: 'Лиды',
        },
      ],
    },
    {
      labelEn: 'Showing',
      labelRu: 'Показ',
      colorClass: 'phase--blue',
      steps: [
        {
          num: 4,
          icon: 'map-pin',
          titleEn: 'Inspection Trip',
          titleRu: 'Инспекционный тур',
          descEn: '3–4 day organised visit to Cyprus',
          descRu: '3–4-дневный организованный визит на Кипр',
          detailsEn: ['Airport transfer arranged', 'Hotel coordination', 'Personal agent throughout'],
          detailsRu: ['Трансфер из аэропорта', 'Организация отеля', 'Личный агент весь тур'],
          route: '/leads/board',
          pageLabelEn: 'Leads',
          pageLabelRu: 'Лиды',
        },
        {
          num: 5,
          icon: 'eye',
          titleEn: 'Property Viewings',
          titleRu: 'Просмотры объектов',
          descEn: 'Up to 8 curated viewings with agency transport',
          descRu: 'До 8 объектов с транспортом агентства',
          detailsEn: ['5–8 properties per trip', 'Agency transport provided', 'Follow-up next morning'],
          detailsRu: ['5–8 объектов за тур', 'Транспорт от агентства', 'Follow-up на следующее утро'],
          route: '/properties',
          pageLabelEn: 'Properties',
          pageLabelRu: 'Объекты',
        },
      ],
    },
    {
      labelEn: 'Deal',
      labelRu: 'Сделка',
      colorClass: 'phase--gold',
      steps: [
        {
          num: 6,
          icon: 'tag',
          titleEn: 'Offer',
          titleRu: 'Оффер',
          descEn: 'Offer made, price & payment terms negotiated',
          descRu: 'Предложение сделано, переговоры по цене и условиям',
          detailsEn: ['Typically 5–10% below asking', 'Payment schedule agreed', 'Completion date set'],
          detailsRu: ['Обычно -5–10% от цены', 'График платежей согласован', 'Дата завершения сделки'],
          route: '/leads/board',
          pageLabelEn: 'Leads',
          pageLabelRu: 'Лиды',
        },
        {
          num: 7,
          icon: 'file-check',
          titleEn: 'Reservation',
          titleRu: 'Резервирование',
          descEn: 'Agreement signed + €3,000–10,000 deposit',
          descRu: 'Соглашение подписано + депозит €3 000–10 000',
          detailsEn: ['Property taken off market', 'Deposit held by agent / lawyer', 'Terms locked in'],
          detailsRu: ['Объект снят с продажи', 'Депозит у агента / юриста', 'Условия зафиксированы'],
          route: '/leads/board',
          pageLabelEn: 'Leads',
          pageLabelRu: 'Лиды',
        },
        {
          num: 8,
          icon: 'user-plus',
          titleEn: 'Convert to Client',
          titleRu: 'Перевод в клиента',
          descEn: 'Lead converted, deal value & commission recorded',
          descRu: 'Лид переведён, стоимость сделки и комиссия зафиксированы',
          detailsEn: ['All lead data transferred', 'Deal value & commission set', 'Property linked to client'],
          detailsRu: ['Все данные перенесены', 'Стоимость и комиссия записаны', 'Объект привязан к клиенту'],
          route: '/clients',
          pageLabelEn: 'Clients',
          pageLabelRu: 'Клиенты',
        },
      ],
    },
    {
      labelEn: 'Legal',
      labelRu: 'Юридический',
      colorClass: 'phase--purple',
      steps: [
        {
          num: 9,
          icon: 'file-text',
          titleEn: 'Contract & Due Diligence',
          titleRu: 'Договор и проверка',
          descEn: 'Lawyer review, search certificate, contract signed, 10–30% deposit',
          descRu: 'Юрист, свидетельство о поиске, договор, депозит 10–30%',
          detailsEn: ['Search cert. (€10, 5-day window)', 'Encumbrance check', 'Contract filed at Land Registry'],
          detailsRu: ['Свидетельство о поиске (€10, 5 дней)', 'Проверка обременений', 'Договор в земельном реестре'],
          route: '/tasks',
          pageLabelEn: 'Tasks',
          pageLabelRu: 'Задачи',
        },
        {
          num: 10,
          icon: 'shield',
          titleEn: 'CoM Approval',
          titleRu: 'Разрешение Совета Министров',
          descEn: 'Non-EU buyers only · 30–90 days processing',
          descRu: 'Только для не-граждан ЕС · 30–90 дней',
          detailsEn: ['Non-EU buyers only', 'Criminal record check', 'Proof of funds required'],
          detailsRu: ['Только для не-граждан ЕС', 'Проверка судимостей', 'Подтверждение источника средств'],
          route: '/tasks',
          pageLabelEn: 'Tasks',
          pageLabelRu: 'Задачи',
          isConditional: true,
        },
        {
          num: 11,
          icon: 'credit-card',
          titleEn: 'Final Payment',
          titleRu: 'Финальный платёж',
          descEn: 'Full balance paid, N.270 form submitted, transfer fees 3–8%',
          descRu: 'Полный остаток, форма N.270, сбор за передачу 3–8%',
          detailsEn: ['All conditions met', 'Form N.270 at Land Registry', 'Transfer fees 3–8% (resale)'],
          detailsRu: ['Все условия выполнены', 'Форма N.270 в земельном реестре', 'Сбор за передачу 3–8%'],
          route: '/clients',
          pageLabelEn: 'Clients',
          pageLabelRu: 'Клиенты',
        },
      ],
    },
    {
      labelEn: 'Completion',
      labelRu: 'Завершение',
      colorClass: 'phase--teal',
      steps: [
        {
          num: 12,
          icon: 'award',
          titleEn: 'Title Deed',
          titleRu: 'Свидетельство о праве',
          descEn: 'Issued by Land Registry in 2–6 weeks',
          descRu: 'Выдаётся Земельным реестром через 2–6 недель',
          detailsEn: ['Registered in buyer\'s name', 'Full legal ownership', 'Deal marked closed'],
          detailsRu: ['Оформлено на покупателя', 'Полное юридическое владение', 'Сделка закрыта'],
          route: '/clients',
          pageLabelEn: 'Clients',
          pageLabelRu: 'Клиенты',
        },
        {
          num: 13,
          icon: 'briefcase',
          titleEn: 'Post-Sale',
          titleRu: 'После сделки',
          descEn: 'Property management & rental. Up to 10% annual yield.',
          descRu: 'Управление и аренда. Доходность до 10% годовых.',
          detailsEn: ['Management company selected', 'Airbnb / Booking.com listing', '6–10% annual yield'],
          detailsRu: ['Управляющая компания', 'Airbnb / Booking.com', 'Доходность 6–10% годовых'],
          route: '/clients',
          pageLabelEn: 'Clients',
          pageLabelRu: 'Клиенты',
        },
      ],
    },
  ];

  navigate(route: string): void {
    void this.router.navigateByUrl(route);
  }

  t(en: string, ru: string): string {
    return this.ts.lang() === 'ru' ? ru : en;
  }
}
