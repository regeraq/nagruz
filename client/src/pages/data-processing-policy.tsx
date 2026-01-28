import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export default function DataProcessingPolicy() {
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) return { success: true, settings: [] };
      return res.json();
    },
  });

  const settings = settingsData?.settings || [];
  const contactEmail = settings.find((s: any) => s.key === 'contact_email')?.value || 'rostext@gmail.com';
  const contactPhone = settings.find((s: any) => s.key === 'contact_phone')?.value || '+7 (495) 123-45-67';
  const contactAddress = settings.find((s: any) => s.key === 'contact_address')?.value || 'Москва, Россия';
  const operatorName = settings.find((s: any) => s.key === 'operator_name')?.value || '[УКАЗАТЬ ПОЛНОЕ НАИМЕНОВАНИЕ ЮРИДИЧЕСКОГО ЛИЦА ИЛИ ИП]';
  const operatorInn = settings.find((s: any) => s.key === 'operator_inn')?.value || '[УКАЗАТЬ ИНН]';
  const operatorOgrn = settings.find((s: any) => s.key === 'operator_ogrn')?.value || '[УКАЗАТЬ ОГРН/ОГРНИП]';
  const responsiblePerson = settings.find((s: any) => s.key === 'responsible_person')?.value || '[УКАЗАТЬ ФИО ОТВЕТСТВЕННОГО ЗА ОБРАБОТКУ ПД]';

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-12 pt-24">
        <Card className="bg-card text-foreground">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl text-foreground">Политика обработки персональных данных</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none text-foreground">
            <div className="space-y-6 text-foreground">
              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">1. Общие положения и идентификация оператора</h2>
                <p className="text-foreground leading-relaxed mb-3">
                  Настоящая Политика обработки персональных данных (далее — «Политика») определяет порядок обработки персональных данных пользователей сайта (далее — «Сайт») в соответствии с требованиями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных».
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  <strong>Оператор персональных данных:</strong> {operatorName}
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  <strong>ИНН:</strong> {operatorInn}
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  <strong>ОГРН/ОГРНИП:</strong> {operatorOgrn}
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  <strong>Адрес:</strong> {contactAddress}
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  <strong>Контактные данные:</strong> Email: {contactEmail}, Телефон: {contactPhone}
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  <strong>Ответственный за организацию обработки персональных данных:</strong> {responsiblePerson}
                </p>
                <p className="text-foreground leading-relaxed">
                  Использование Сайта означает безоговорочное согласие пользователя с настоящей Политикой и указанными в ней условиями обработки его персональной информации. В случае несогласия с условиями Политики пользователь должен прекратить использование Сайта.
                </p>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">2. Категории субъектов персональных данных</h2>
                <p className="text-foreground leading-relaxed mb-3">
                  Оператор обрабатывает персональные данные следующих категорий субъектов:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground">
                  <li>Пользователи Сайта (физические лица, посетители Сайта)</li>
                  <li>Покупатели (физические и юридические лица, оформляющие заказы)</li>
                  <li>Зарегистрированные пользователи (пользователи, создавшие учетную запись на Сайте)</li>
                  <li>Пользователи, заполнившие формы обратной связи</li>
                </ul>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">3. Цели обработки персональных данных</h2>
                <p className="text-foreground leading-relaxed mb-3">
                  Обработка персональных данных осуществляется в следующих целях:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground">
                  <li>Исполнение договоров купли-продажи и соглашений с пользователями</li>
                  <li>Обработка заказов, запросов и обращений пользователей</li>
                  <li>Информирование о товарах, услугах, акциях и специальных предложениях</li>
                  <li>Проведение маркетинговых исследований и анализа поведения пользователей</li>
                  <li>Улучшение качества обслуживания и работы Сайта</li>
                  <li>Соблюдение требований законодательства Российской Федерации</li>
                  <li>Предотвращение мошенничества и обеспечение безопасности</li>
                  <li>Ведение учета клиентов и статистики продаж</li>
                </ul>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">4. Правовые основания обработки</h2>
                <p className="text-foreground leading-relaxed mb-3">
                  Обработка персональных данных осуществляется на основании следующих правовых оснований, предусмотренных статьей 6 Федерального закона № 152-ФЗ «О персональных данных»:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground">
                  <li><strong>Согласие субъекта персональных данных</strong> (пункт 1 части 1 статьи 6) — для целей маркетинга, аналитики и информирования о товарах и услугах</li>
                  <li><strong>Исполнение договора, стороной которого является субъект персональных данных</strong> (пункт 5 части 1 статьи 6) — для исполнения договора купли-продажи, обработки заказов, доставки товаров</li>
                  <li><strong>Исполнение возложенных законодательством Российской Федерации на оператора обязанностей</strong> (пункт 2 части 1 статьи 6) — для ведения бухгалтерского и налогового учета, соблюдения требований законодательства</li>
                  <li><strong>Осуществление прав и законных интересов оператора или третьих лиц</strong> (пункт 6 части 1 статьи 6) — для обеспечения безопасности, предотвращения мошенничества, улучшения качества обслуживания</li>
                </ul>
                <p className="text-foreground leading-relaxed mt-3">
                  Согласие на обработку персональных данных предоставляется пользователем путем проставления соответствующей отметки в форме на Сайте. Согласие может быть отозвано пользователем в любое время путем направления соответствующего уведомления оператору на адрес электронной почты {contactEmail} или через форму обратной связи на сайте.
                </p>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">5. Состав обрабатываемых персональных данных</h2>
                <p className="text-foreground leading-relaxed mb-3">
                  Оператор обрабатывает следующие категории персональных данных:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground">
                  <li><strong>Идентификационные данные:</strong> имя, фамилия, отчество</li>
                  <li><strong>Контактные данные:</strong> адрес электронной почты, номер телефона, почтовый адрес</li>
                  <li><strong>Данные о заказах:</strong> информация о приобретенных товарах, история заказов</li>
                  <li><strong>Данные о компании:</strong> наименование организации, ИНН, адрес</li>
                  <li><strong>Технические данные:</strong> IP-адрес, информация о браузере и устройстве, cookies</li>
                  <li><strong>Данные обратной связи:</strong> сообщения, запросы, прикрепленные файлы</li>
                </ul>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">6. Сроки обработки персональных данных</h2>
                <p className="text-foreground leading-relaxed">
                  Персональные данные обрабатываются в течение срока, необходимого для достижения целей обработки, или до отзыва согласия субъекта персональных данных, если иное не предусмотрено законодательством Российской Федерации.
                </p>
                <p className="text-foreground leading-relaxed mt-3">
                  После истечения срока обработки персональные данные уничтожаются или обезличиваются, если иное не предусмотрено требованиями законодательства об архивном деле или иными нормативными правовыми актами.
                </p>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">7. Меры по обеспечению безопасности</h2>
                <p className="text-foreground leading-relaxed mb-3">
                  Принимаются следующие меры для обеспечения безопасности персональных данных:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground">
                  <li>Шифрование данных при передаче по сети Интернет (SSL/TLS)</li>
                  <li>Ограничение доступа к персональным данным только уполномоченным сотрудникам</li>
                  <li>Использование средств защиты информации от несанкционированного доступа</li>
                  <li>Регулярное резервное копирование данных</li>
                  <li>Мониторинг и анализ безопасности информационной системы</li>
                  <li>Обучение сотрудников правилам работы с персональными данными</li>
                  <li>Назначение ответственного за организацию обработки персональных данных</li>
                  <li>Проведение внутренних проверок соблюдения требований законодательства</li>
                </ul>
                <p className="text-foreground leading-relaxed mt-3">
                  Персональные данные обрабатываются на серверах, расположенных на территории Российской Федерации, в соответствии с требованиями Федерального закона № 152-ФЗ «О персональных данных».
                </p>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">8. Передача персональных данных третьим лицам</h2>
                <p className="text-foreground leading-relaxed">
                  Персональные данные не передаются третьим лицам, за исключением следующих случаев:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground mt-3">
                  <li>Передача данных службам доставки для выполнения заказов (только необходимые данные: имя, адрес, телефон)</li>
                  <li>Передача данных платежным системам для обработки платежей (в соответствии с требованиями платежных систем)</li>
                  <li>Передача данных по требованию уполномоченных государственных органов в случаях, предусмотренных законодательством</li>
                  <li>Передача данных с явного согласия субъекта персональных данных</li>
                </ul>
                <p className="text-foreground leading-relaxed mt-3">
                  Все третьи лица, которым передаются персональные данные, обязаны соблюдать требования Федерального закона № 152-ФЗ «О персональных данных» и использовать данные только в целях, для которых они были переданы.
                </p>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">9. Права субъектов персональных данных</h2>
                <p className="text-foreground leading-relaxed mb-3">
                  В соответствии с Федеральным законом № 152-ФЗ «О персональных данных», субъект персональных данных имеет право:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground">
                  <li>На получение информации, касающейся обработки его персональных данных</li>
                  <li>На доступ к своим персональным данным</li>
                  <li>На требование уточнения персональных данных, их блокирования или уничтожения</li>
                  <li>На отзыв согласия на обработку персональных данных</li>
                  <li>На возражение против обработки персональных данных</li>
                  <li>На обжалование действий или бездействия оператора в уполномоченном органе по защите прав субъектов персональных данных или в судебном порядке</li>
                  <li>На получение информации о сроках хранения персональных данных</li>
                </ul>
                <p className="text-foreground leading-relaxed mt-3 mb-3">
                  <strong>Механизм реализации прав:</strong>
                </p>
                <ol className="list-decimal pl-6 space-y-2 text-foreground">
                  <li><strong>Отзыв согласия на обработку персональных данных:</strong> Субъект персональных данных может отозвать согласие, направив письменный запрос на email {contactEmail} или через форму обратной связи на сайте. После получения запроса обработка персональных данных будет прекращена в течение 30 дней, за исключением случаев, когда обработка необходима для исполнения договора или требований законодательства.</li>
                  <li><strong>Удаление персональных данных:</strong> Субъект персональных данных может запросить удаление своих персональных данных, направив запрос на email {contactEmail}. Данные будут удалены в течение 30 дней, если их хранение не требуется законодательством (например, для налогового учета).</li>
                  <li><strong>Доступ к персональным данным:</strong> Субъект персональных данных может запросить информацию о том, какие персональные данные обрабатываются, направив запрос на email {contactEmail}. Ответ будет предоставлен в течение 30 дней.</li>
                  <li><strong>Исправление персональных данных:</strong> Субъект персональных данных может обновить свои персональные данные через личный кабинет на сайте или направив запрос на email {contactEmail}.</li>
                  <li><strong>Блокирование персональных данных:</strong> Субъект персональных данных может потребовать блокирования обработки своих персональных данных, направив запрос на email {contactEmail}.</li>
                </ol>
                <p className="text-foreground leading-relaxed mt-3">
                  Все запросы должны содержать информацию, позволяющую идентифицировать субъекта персональных данных (email, телефон, ФИО). Запросы обрабатываются в течение 30 дней с момента получения. В случае невозможности предоставления ответа в указанный срок оператор уведомляет субъекта персональных данных о продлении срока рассмотрения запроса.
                </p>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">10. Ответственность</h2>
                <p className="text-foreground leading-relaxed">
                  Оператор несет ответственность за нарушение требований законодательства о персональных данных в соответствии с законодательством Российской Федерации. В случае нарушения требований Федерального закона № 152-ФЗ «О персональных данных» оператор может быть привлечен к административной, уголовной или гражданско-правовой ответственности.
                </p>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">11. Контакты</h2>
                <p className="text-foreground leading-relaxed">
                  По всем вопросам, связанным с обработкой персональных данных, субъекты персональных данных могут обращаться:
                </p>
                <ul className="list-none pl-0 space-y-2 text-foreground mt-3">
                  <li><strong>Email:</strong> {contactEmail}</li>
                  <li><strong>Телефон:</strong> {contactPhone}</li>
                </ul>
                <p className="text-foreground leading-relaxed mt-3">
                  Запросы на доступ к персональным данным, их исправление, блокирование или удаление обрабатываются в течение 30 дней с момента получения запроса. В случае невозможности предоставления ответа в указанный срок оператор уведомляет субъекта персональных данных о продлении срока рассмотрения запроса.
                </p>
              </section>

              <p className="text-sm text-muted-foreground mt-8 pt-6 border-t border-border">
                Дата последнего обновления: {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
