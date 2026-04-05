import { Injectable, signal } from '@angular/core';

export type Lang = 'en' | 'ru';

type Translations = Record<string, string>;

const EN: Translations = {
  // App shell
  'app.title': 'Real Estate',
  'app.subtitle': 'Client & Lead Management',
  // Nav
  'nav.dashboard': 'Dashboard',
  'nav.clients': 'Clients',
  'nav.leads': 'Leads',
  'nav.properties': 'Properties',
  // Buttons
  'btn.add': '+ Add',
  'btn.xlsx': '↓ XLSX',
  'btn.edit': 'Edit',
  'btn.save': 'Save',
  'btn.saveChanges': 'Save Changes',
  'btn.saving': 'Saving…',
  'btn.cancel': 'Cancel',
  'btn.delete': 'Delete',
  'btn.confirmDelete': 'Delete',
  'btn.cancelDelete': 'Cancel',
  // Table columns
  'col.name': 'Name',
  'col.phone': 'Phone',
  'col.propertyType': 'Property Type',
  'col.status': 'Status',
  'col.dealValue': 'Deal Value',
  'col.realtor': 'Realtor',
  'col.budgetRange': 'Budget Range',
  'col.interestedIn': 'Interested In',
  'col.followUp': 'Follow-up',
  'col.unit': 'Unit',
  'col.client': 'Client',
  'col.type': 'Type',
  'col.actions': '',
  // Field labels (row-detail)
  'field.fullName': 'Full Name',
  'field.phone': 'Phone',
  'field.email': 'Email',
  'field.building': 'Building / Project',
  'field.apartmentNumber': 'Apartment / Unit',
  'field.propertyType': 'Property Type',
  'field.status': 'Status',
  'field.purchaseDate': 'Purchase Date',
  'field.dealValue': 'Deal Value',
  'field.realtorName': 'Realtor',
  'field.realtorAgency': 'Agency',
  'field.notes': 'Notes',
  'field.interestedIn': 'Interested In',
  'field.budgetMin': 'Budget Min',
  'field.budgetMax': 'Budget Max',
  'field.followUpDate': 'Follow-up Date',
  'field.firstContact': 'First Contact',
  // Empty states
  'empty.clients': 'No clients match your search.',
  'empty.leads': 'No leads match your search.',
  'empty.activity': 'No activity yet.',
  'empty.properties': 'No properties yet — click "+ New Property" or add clients with a building name.',
  'empty.units': 'No units yet — click "+ Add Unit" to add the first one.',
  // Search
  'search.placeholder': 'Search by any field…',
  // Results
  'results.one': '1 result',
  'results.many': '{n} results',
  // Delete confirm
  'delete.title': 'Delete {name}?',
  // Dashboard KPIs
  'dash.totalClients': 'Total Clients',
  'dash.totalLeads': 'Total Leads',
  'dash.portfolioValue': 'Portfolio Value',
  'dash.avgDeal': 'Avg Deal Value',
  'dash.winRate': 'Win Rate',
  'dash.active': '{n} active',
  'dash.inPipeline': 'in pipeline',
  'dash.needAttention': '{n} need attention',
  'dash.totalClosed': 'total closed',
  'dash.perClient': 'per client',
  'dash.clientsVsLost': 'clients vs lost leads',
  // Dashboard sections
  'dash.leadPipeline': 'Lead Pipeline',
  'dash.clientStatus': 'Client Status',
  'dash.followUps': 'Follow-ups',
  'dash.overdue': 'Overdue',
  'dash.dueToday': 'Due today',
  'dash.propertyMix': 'Property Mix',
  'dash.topRealtors': 'Top Realtors',
  'dash.recentActivity': 'Recent Activity',
  'dash.deals': 'Deals',
  'dash.revenue': 'Revenue',
  'dash.total': '{n} total',
  'dash.clientsCount': '{n} clients',
  // Property catalogue
  'prop.buildings': 'Buildings',
  'prop.unitsTracked': 'Units tracked',
  'prop.portfolioValue': 'Portfolio value',
  'prop.newProperty': '+ New Property',
  'prop.create': 'Create',
  'prop.saving': 'Saving…',
  'prop.namePlaceholder': 'Property / building name',
  'prop.addUnit': '+ Add Unit',
  'prop.unassigned': 'Unassigned unit',
  'prop.clients.one': '{n} client',
  'prop.clients.many': '{n} clients',
  'prop.units.one': '{n} unit',
  'prop.units.many': '{n} units',
  // Property types
  'proptype.apartment': 'Apartment',
  'proptype.house': 'House',
  'proptype.villa': 'Villa',
  'proptype.commercial': 'Commercial',
  'proptype.land': 'Land',
  // Statuses
  'status.active': 'active',
  'status.inactive': 'inactive',
  'status.closed': 'closed',
  'status.new': 'new',
  'status.contacted': 'contacted',
  'status.negotiating': 'negotiating',
  'status.lost': 'lost',
  // Activity
  'act.createdClient': 'New client added',
  'act.createdLead': 'New lead added',
  'act.updatedClient': 'Client updated',
  'act.updatedLead': 'Lead updated',
  'act.deletedClient': 'Client deleted',
  'act.deletedLead': 'Lead deleted',
  'act.converted': 'Lead converted to client',
  // Modal titles
  'modal.addClient': 'Add Client',
  'modal.editClient': 'Edit Client',
  'modal.addLead': 'Add Lead',
  'modal.editLead': 'Edit Lead',
  'modal.convertLead': 'Convert Lead to Client',
  'modal.addUnit': 'Add Unit',
  // Form sections
  'form.sectionProperty': 'Property',
  'form.sectionRealtor': 'Realtor',
  'form.sectionInterest': 'Interest',
  'form.sectionSource': 'Source',
  'form.sectionUnitDetails': 'Unit Details',
  'form.sectionClient': 'Client',
  // Form labels
  'form.fullName': 'Full Name *',
  'form.phone': 'Phone',
  'form.email': 'Email',
  'form.building': 'Building / Project',
  'form.selectBuilding': '— Select building —',
  'form.addNewBuilding': '＋ Add new building',
  'form.newBuildingPlaceholder': 'New building name',
  'form.apartment': 'Apartment / Unit',
  'form.unitNo': 'Unit / Apartment No.',
  'form.propertyType': 'Property Type',
  'form.status': 'Status',
  'form.purchaseDate': 'Purchase Date',
  'form.dealValue': 'Deal Value (€)',
  'form.realtorName': 'Realtor Name',
  'form.agency': 'Agency',
  'form.selectAgency': '— Select agency —',
  'form.addNewAgency': '＋ Add new agency',
  'form.newAgencyPlaceholder': 'New agency name',
  'form.notes': 'Notes',
  'form.notesPlaceholder': 'Any additional notes…',
  'form.interestedIn': 'Interested In',
  'form.interestedInPlaceholder': 'e.g. 2-bedroom apartment near downtown',
  'form.firstContact': 'First Contact',
  'form.budgetMin': 'Budget Min (€)',
  'form.budgetMax': 'Budget Max (€)',
  'form.followUpDate': 'Follow-up Date',
  // Add unit
  'addUnit.addBtn': 'Add Unit',
  'addUnit.unassignedHint': 'This creates a standalone unit. You can link a client to it later by using the same building and unit number.',
};

const RU: Translations = {
  // App shell
  'app.title': 'Недвижимость',
  'app.subtitle': 'Управление клиентами и лидами',
  // Nav
  'nav.dashboard': 'Обзор',
  'nav.clients': 'Клиенты',
  'nav.leads': 'Лиды',
  'nav.properties': 'Объекты',
  // Buttons
  'btn.add': '+ Добавить',
  'btn.xlsx': '↓ XLSX',
  'btn.edit': 'Изменить',
  'btn.save': 'Сохранить',
  'btn.saveChanges': 'Сохранить изменения',
  'btn.saving': 'Сохранение…',
  'btn.cancel': 'Отмена',
  'btn.delete': 'Удалить',
  'btn.confirmDelete': 'Удалить',
  'btn.cancelDelete': 'Отмена',
  // Table columns
  'col.name': 'Имя',
  'col.phone': 'Телефон',
  'col.propertyType': 'Тип объекта',
  'col.status': 'Статус',
  'col.dealValue': 'Сумма сделки',
  'col.realtor': 'Риелтор',
  'col.budgetRange': 'Бюджет',
  'col.interestedIn': 'Интерес',
  'col.followUp': 'Контакт',
  'col.unit': 'Юнит',
  'col.client': 'Клиент',
  'col.type': 'Тип',
  'col.actions': '',
  // Field labels (row-detail)
  'field.fullName': 'Полное имя',
  'field.phone': 'Телефон',
  'field.email': 'Email',
  'field.building': 'Здание / Проект',
  'field.apartmentNumber': 'Квартира / Юнит',
  'field.propertyType': 'Тип объекта',
  'field.status': 'Статус',
  'field.purchaseDate': 'Дата покупки',
  'field.dealValue': 'Сумма сделки',
  'field.realtorName': 'Риелтор',
  'field.realtorAgency': 'Агентство',
  'field.notes': 'Заметки',
  'field.interestedIn': 'Интерес',
  'field.budgetMin': 'Мин. бюджет',
  'field.budgetMax': 'Макс. бюджет',
  'field.followUpDate': 'Дата контакта',
  'field.firstContact': 'Первый контакт',
  // Empty states
  'empty.clients': 'Клиенты не найдены.',
  'empty.leads': 'Лиды не найдены.',
  'empty.activity': 'Активности пока нет.',
  'empty.properties': 'Объектов пока нет — нажмите «+ Новый объект» или добавьте клиента с названием здания.',
  'empty.units': 'Юнитов пока нет — нажмите «+ Добавить юнит».',
  // Search
  'search.placeholder': 'Поиск по любому полю…',
  // Results
  'results.one': '1 результат',
  'results.many': '{n} результатов',
  // Delete confirm
  'delete.title': 'Удалить {name}?',
  // Dashboard KPIs
  'dash.totalClients': 'Клиентов',
  'dash.totalLeads': 'Лидов',
  'dash.portfolioValue': 'Стоимость портфеля',
  'dash.avgDeal': 'Средняя сделка',
  'dash.winRate': 'Конверсия',
  'dash.active': '{n} активных',
  'dash.inPipeline': 'в воронке',
  'dash.needAttention': '{n} требуют внимания',
  'dash.totalClosed': 'всего закрыто',
  'dash.perClient': 'на клиента',
  'dash.clientsVsLost': 'клиентов vs потерянных лидов',
  // Dashboard sections
  'dash.leadPipeline': 'Воронка лидов',
  'dash.clientStatus': 'Статус клиентов',
  'dash.followUps': 'Контакты',
  'dash.overdue': 'Просрочено',
  'dash.dueToday': 'Сегодня',
  'dash.propertyMix': 'Структура объектов',
  'dash.topRealtors': 'Лучшие риелторы',
  'dash.recentActivity': 'Последние действия',
  'dash.deals': 'Сделки',
  'dash.revenue': 'Выручка',
  'dash.total': '{n} всего',
  'dash.clientsCount': '{n} клиентов',
  // Property catalogue
  'prop.buildings': 'Зданий',
  'prop.unitsTracked': 'Юнитов',
  'prop.portfolioValue': 'Стоимость портфеля',
  'prop.newProperty': '+ Новый объект',
  'prop.create': 'Создать',
  'prop.saving': 'Сохранение…',
  'prop.namePlaceholder': 'Название объекта / здания',
  'prop.addUnit': '+ Добавить юнит',
  'prop.unassigned': 'Юнит без клиента',
  'prop.clients.one': '{n} клиент',
  'prop.clients.many': '{n} клиентов',
  'prop.units.one': '{n} юнит',
  'prop.units.many': '{n} юнитов',
  // Property types
  'proptype.apartment': 'Квартира',
  'proptype.house': 'Дом',
  'proptype.villa': 'Вилла',
  'proptype.commercial': 'Коммерческая',
  'proptype.land': 'Земля',
  // Statuses
  'status.active': 'активный',
  'status.inactive': 'неактивный',
  'status.closed': 'закрыт',
  'status.new': 'новый',
  'status.contacted': 'контакт',
  'status.negotiating': 'переговоры',
  'status.lost': 'потерян',
  // Activity
  'act.createdClient': 'Добавлен клиент',
  'act.createdLead': 'Добавлен лид',
  'act.updatedClient': 'Клиент обновлён',
  'act.updatedLead': 'Лид обновлён',
  'act.deletedClient': 'Клиент удалён',
  'act.deletedLead': 'Лид удалён',
  'act.converted': 'Лид конвертирован в клиента',
  // Modal titles
  'modal.addClient': 'Добавить клиента',
  'modal.editClient': 'Редактировать клиента',
  'modal.addLead': 'Добавить лид',
  'modal.editLead': 'Редактировать лид',
  'modal.convertLead': 'Конвертировать лид в клиента',
  'modal.addUnit': 'Добавить юнит',
  // Form sections
  'form.sectionProperty': 'Объект',
  'form.sectionRealtor': 'Риелтор',
  'form.sectionInterest': 'Интерес',
  'form.sectionSource': 'Источник',
  'form.sectionUnitDetails': 'Детали юнита',
  'form.sectionClient': 'Клиент',
  // Form labels
  'form.fullName': 'Полное имя *',
  'form.phone': 'Телефон',
  'form.email': 'Email',
  'form.building': 'Здание / Проект',
  'form.selectBuilding': '— Выберите здание —',
  'form.addNewBuilding': '＋ Добавить здание',
  'form.newBuildingPlaceholder': 'Название нового здания',
  'form.apartment': 'Квартира / Юнит',
  'form.unitNo': 'Номер квартиры / юнита',
  'form.propertyType': 'Тип объекта',
  'form.status': 'Статус',
  'form.purchaseDate': 'Дата покупки',
  'form.dealValue': 'Сумма сделки (€)',
  'form.realtorName': 'Имя риелтора',
  'form.agency': 'Агентство',
  'form.selectAgency': '— Выберите агентство —',
  'form.addNewAgency': '＋ Добавить агентство',
  'form.newAgencyPlaceholder': 'Название нового агентства',
  'form.notes': 'Заметки',
  'form.notesPlaceholder': 'Дополнительные заметки…',
  'form.interestedIn': 'Что интересует',
  'form.interestedInPlaceholder': 'например, 2-комн. квартира в центре',
  'form.firstContact': 'Первый контакт',
  'form.budgetMin': 'Мин. бюджет (€)',
  'form.budgetMax': 'Макс. бюджет (€)',
  'form.followUpDate': 'Дата следующего контакта',
  // Add unit
  'addUnit.addBtn': 'Добавить юнит',
  'addUnit.unassignedHint': 'Это создаст отдельный юнит. Позже можно связать его с клиентом, указав то же здание и номер юнита.',
};

const DICTS: Record<Lang, Translations> = { en: EN, ru: RU };

@Injectable({ providedIn: 'root' })
export class TranslationService {
  readonly lang = signal<Lang>(
    (localStorage.getItem('lang') as Lang) ?? 'en'
  );

  t(key: string, params?: Record<string, string | number>): string {
    let str = DICTS[this.lang()][key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  }

  setLang(lang: Lang) {
    this.lang.set(lang);
    localStorage.setItem('lang', lang);
  }

  toggle() {
    this.setLang(this.lang() === 'en' ? 'ru' : 'en');
  }

  /** Pluralise a count using two forms (singular, plural).
   *  For Russian we use a simplified rule. */
  plural(n: number, oneKey: string, manyKey: string): string {
    if (this.lang() === 'ru') {
      const mod10 = n % 10;
      const mod100 = n % 100;
      const useOne = mod10 === 1 && mod100 !== 11;
      return this.t(useOne ? oneKey : manyKey, { n });
    }
    return this.t(n === 1 ? oneKey : manyKey, { n });
  }

  results(n: number): string {
    return this.plural(n, 'results.one', 'results.many');
  }
}
