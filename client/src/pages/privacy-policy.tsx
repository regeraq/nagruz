import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export default function PrivacyPolicy() {
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
            <CardTitle className="text-2xl md:text-3xl text-foreground">Политика конфиденциальности</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none text-foreground">
            <div className="space-y-6 text-foreground">
              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">1. Общие положения и идентификация оператора</h2>
                <p className="text-foreground leading-relaxed mb-3">
                  Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки и защиты персональных данных пользователей сайта (далее — «Сайт»), принадлежащего компании, осуществляющей деятельность по продаже нагрузочных устройств.
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
                  <strong>Адрес:</strong> {contactAddress || 'Москва, ул. Промышленная, д. 1'}
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  <strong>Ответственный за организацию обработки персональных данных:</strong> {responsiblePerson}
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  <strong>Контактные данные:</strong> Email: {contactEmail}, Телефон: {contactPhone}
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
                <h2 className="text-xl font-semibold mb-3 text-foreground">3. Сбор персональных данных</h2>
                <p className="text-foreground leading-relaxed mb-3">
                  Мы собираем следующие персональные данные:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground">
                  <li>Идентификационные данные: имя, фамилия, отчество</li>
                  <li>Контактная информация: адрес электронной почты, номер телефона, почтовый адрес</li>
                  <li>Информация о заказах и покупках: состав заказа, история заказов, сумма покупок</li>
                  <li>Технические данные: IP-адрес, cookies, информация о браузере и устройстве, данные о посещении Сайта</li>
                  <li>Информация о компании (для юридических лиц): наименование организации, ИНН, адрес</li>
                  <li>Данные, предоставленные при заполнении форм обратной связи: сообщения, прикрепленные файлы</li>
                </ul>
                <p className="text-foreground leading-relaxed mt-3">
                  Персональные данные собираются при регистрации на Сайте, оформлении заказа, заполнении форм обратной связи, подписке на рассылку, а также автоматически при использовании Сайта (технические данные).
                </p>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">4. Использование персональных данных</h2>
                <p className="text-foreground leading-relaxed mb-3">
                  Персональные данные используются для следующих целей:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground">
                  <li>Обработки и выполнения заказов</li>
                  <li>Связи с пользователями по вопросам заказов и запросов</li>
                  <li>Улучшения работы Сайта и качества обслуживания</li>
                  <li>Информирования о новых товарах, акциях и специальных предложениях (с согласия пользователя)</li>
                  <li>Проведения маркетинговых исследований и анализа</li>
                  <li>Соблюдения требований законодательства Российской Федерации</li>
                  <li>Предотвращения мошенничества и обеспечения безопасности</li>
                </ul>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">5. Защита персональных данных</h2>
                <p className="text-foreground leading-relaxed">
                  Мы принимаем необходимые технические и организационные меры для защиты персональных данных от неправомерного доступа, изменения, раскрытия или уничтожения. К таким мерам относятся:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground mt-3">
                  <li>Использование шифрования данных при передаче (SSL/TLS)</li>
                  <li>Ограничение доступа к персональным данным только уполномоченным сотрудникам</li>
                  <li>Регулярное резервное копирование данных</li>
                  <li>Мониторинг и анализ безопасности системы</li>
                  <li>Обучение сотрудников правилам работы с персональными данными</li>
                </ul>
                <p className="text-foreground leading-relaxed mt-3">
                  Персональные данные хранятся на защищенных серверах, расположенных на территории Российской Федерации, в соответствии с требованиями Федерального закона № 152-ФЗ «О персональных данных».
                </p>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">6. Передача персональных данных третьим лицам</h2>
                <p className="text-foreground leading-relaxed">
                  Мы не передаем персональные данные третьим лицам, за исключением следующих случаев:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground mt-3">
                  <li>Передача данных службам доставки для выполнения заказов</li>
                  <li>Передача данных платежным системам для обработки платежей</li>
                  <li>Передача данных по требованию уполномоченных государственных органов в случаях, предусмотренных законодательством</li>
                  <li>Передача данных с явного согласия пользователя</li>
                </ul>
                <p className="text-foreground leading-relaxed mt-3">
                  Все третьи лица, которым передаются персональные данные, обязаны соблюдать требования законодательства о защите персональных данных и использовать данные только в целях, для которых они были переданы.
                </p>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">7. Права пользователей и механизм их реализации</h2>
                <p className="text-foreground leading-relaxed mb-3">
                  В соответствии с Федеральным законом № 152-ФЗ «О персональных данных», пользователи имеют следующие права:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground">
                  <li>Получить информацию о своих персональных данных, обрабатываемых нами</li>
                  <li>Требовать исправления неточных или неполных персональных данных</li>
                  <li>Требовать удаления персональных данных в случаях, предусмотренных законом</li>
                  <li>Отозвать согласие на обработку персональных данных</li>
                  <li>Возражать против обработки персональных данных</li>
                  <li>Обжаловать действия или бездействие оператора в уполномоченном органе по защите прав субъектов персональных данных или в судебном порядке</li>
                </ul>
                <p className="text-foreground leading-relaxed mt-3 mb-3">
                  <strong>Механизм реализации прав:</strong>
                </p>
                <ol className="list-decimal pl-6 space-y-2 text-foreground">
                  <li><strong>Отзыв согласия на обработку персональных данных:</strong> Пользователь может отозвать согласие, направив письменный запрос на email {contactEmail} или через форму обратной связи на сайте. После получения запроса обработка персональных данных будет прекращена в течение 30 дней, за исключением случаев, когда обработка необходима для исполнения договора или требований законодательства.</li>
                  <li><strong>Удаление персональных данных:</strong> Пользователь может запросить удаление своих персональных данных, направив запрос на email {contactEmail}. Данные будут удалены в течение 30 дней, если их хранение не требуется законодательством (например, для налогового учета).</li>
                  <li><strong>Доступ к персональным данным:</strong> Пользователь может запросить информацию о том, какие персональные данные обрабатываются, направив запрос на email {contactEmail}. Ответ будет предоставлен в течение 30 дней.</li>
                  <li><strong>Исправление персональных данных:</strong> Пользователь может обновить свои персональные данные через личный кабинет на сайте или направив запрос на email {contactEmail}.</li>
                </ol>
                <p className="text-foreground leading-relaxed mt-3">
                  Все запросы должны содержать информацию, позволяющую идентифицировать пользователя (email, телефон, ФИО). Запросы обрабатываются в течение 30 дней с момента получения.
                </p>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">8. Cookies и аналогичные технологии</h2>
                <p className="text-foreground leading-relaxed">
                  Сайт использует cookies и аналогичные технологии для улучшения работы Сайта, персонализации контента и анализа использования Сайта. Пользователь может настроить свой браузер для отказа от cookies, однако это может повлиять на функциональность Сайта.
                </p>
                <p className="text-foreground leading-relaxed mt-3">
                  Мы используем следующие типы cookies:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground mt-3">
                  <li>Необходимые cookies — обеспечивают работу основных функций Сайта</li>
                  <li>Функциональные cookies — запоминают предпочтения пользователя</li>
                  <li>Аналитические cookies — помогают анализировать использование Сайта</li>
                </ul>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">9. Сроки хранения персональных данных</h2>
                <p className="text-foreground leading-relaxed">
                  Персональные данные хранятся в течение срока, необходимого для достижения целей обработки, или до отзыва согласия субъекта персональных данных, если иное не предусмотрено законодательством Российской Федерации. После истечения срока хранения персональные данные уничтожаются или обезличиваются.
                </p>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">10. Изменения в Политике конфиденциальности</h2>
                <p className="text-foreground leading-relaxed">
                  Мы оставляем за собой право вносить изменения в настоящую Политику конфиденциальности. Все изменения вступают в силу с момента их публикации на Сайте. Пользователям рекомендуется периодически знакомиться с актуальной версией Политики.
                </p>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">11. Контакты</h2>
                <p className="text-foreground leading-relaxed">
                  По всем вопросам, связанным с обработкой персональных данных, пользователи могут обращаться:
                </p>
                <ul className="list-none pl-0 space-y-2 text-foreground mt-3">
                  <li><strong>Email:</strong> {contactEmail}</li>
                  <li><strong>Телефон:</strong> {contactPhone}</li>
                </ul>
                <p className="text-foreground leading-relaxed mt-3">
                  Запросы на доступ к персональным данным, их исправление или удаление обрабатываются в течение 30 дней с момента получения запроса.
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
