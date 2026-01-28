import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export default function PublicOffer() {
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
  const contactAddress = settings.find((s: any) => s.key === 'contact_address')?.value || 'Москва, ул. Промышленная, д. 1';
  const sellerName = settings.find((s: any) => s.key === 'operator_name')?.value || '[УКАЗАТЬ ПОЛНОЕ НАИМЕНОВАНИЕ ЮРИДИЧЕСКОГО ЛИЦА ИЛИ ИП]';
  const sellerInn = settings.find((s: any) => s.key === 'operator_inn')?.value || '[УКАЗАТЬ ИНН]';
  const sellerOgrn = settings.find((s: any) => s.key === 'operator_ogrn')?.value || '[УКАЗАТЬ ОГРН/ОГРНИП]';

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
            <CardTitle className="text-2xl md:text-3xl text-foreground">Публичная оферта</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none text-foreground">
            <div className="space-y-6 text-foreground">
              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">1. Общие положения</h2>
                <p className="text-foreground leading-relaxed mb-3">
                  Настоящий документ является публичной офертой (далее — «Оферта») о заключении договора купли-продажи товаров дистанционным способом на условиях, изложенных ниже.
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  <strong>Продавец:</strong> {sellerName}
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  <strong>ИНН:</strong> {sellerInn}
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  <strong>ОГРН/ОГРНИП:</strong> {sellerOgrn}
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  <strong>Адрес:</strong> {contactAddress}
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  <strong>Контактные данные:</strong> Email: {contactEmail}, Телефон: {contactPhone}
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  В соответствии с пунктом 2 статьи 437 Гражданского кодекса Российской Федерации, в случае принятия изложенных ниже условий и совершения действий, указанных в пункте 3.1 настоящей Оферты, физическое или юридическое лицо, производящее акцепт настоящей Оферты, становится Покупателем (акцепт Оферты равносилен заключению договора на условиях, изложенных в Оферте).
                </p>
                <p className="text-foreground leading-relaxed mt-3">
                  Продавец оставляет за собой право вносить изменения в настоящую Оферту без уведомления Покупателя. Действующая редакция Оферты всегда находится на Сайте по адресу, указанному в разделе «Контакты». Изменения вступают в силу с момента их публикации на Сайте. Покупателям рекомендуется периодически знакомиться с актуальной версией Оферты.
                </p>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">2. Товары и цены</h2>
                <p className="text-foreground leading-relaxed mb-3">
                  Все товары, представленные на Сайте, имеют описание, содержащее основные характеристики товара, цену в рублях Российской Федерации, включая НДС (если применимо).
                </p>
                <p className="text-foreground leading-relaxed">
                  Продавец оставляет за собой право изменять цены на товары без предварительного уведомления Покупателя. Цена товара, указанная на Сайте на момент оформления заказа, является окончательной, если иное не указано при оформлении заказа.
                </p>
                <p className="text-foreground leading-relaxed mt-3">
                  Изображения товаров на Сайте являются иллюстративными и могут отличаться от фактического внешнего вида товара. Продавец не несет ответственности за незначительные отличия изображения товара от его фактического внешнего вида, не влияющие на потребительские свойства товара.
                </p>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">3. Порядок оформления заказа и акцепт Оферты</h2>
                <p className="text-foreground leading-relaxed mb-3">
                  <strong>3.1. Акцепт Оферты</strong>
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  Акцептом настоящей Оферты является совершение Покупателем следующих действий:
                </p>
                <ol className="list-decimal pl-6 space-y-2 text-foreground mb-3">
                  <li>Заполнение формы заказа на Сайте с указанием всех необходимых данных</li>
                  <li>Проставление отметки о согласии с условиями настоящей Оферты</li>
                  <li>Проставление отметки о согласии на обработку персональных данных</li>
                  <li>Подтверждение заказа путем нажатия кнопки «Оформить заказ» или аналогичной</li>
                </ol>
                <p className="text-foreground leading-relaxed mb-3">
                  Моментом акцепта Оферты считается момент подтверждения заказа Покупателем. С момента акцепта Оферты между Продавцом и Покупателем считается заключенным договор купли-продажи на условиях, изложенных в настоящей Оферте.
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  <strong>3.2. Оформление заказа</strong>
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  Заказ оформляется путем заполнения формы на Сайте. Покупатель обязуется предоставить достоверную информацию о себе и своих контактных данных. В случае указания недостоверных данных Продавец не несет ответственности за невозможность доставки товара или иные последствия.
                </p>
                <p className="text-foreground leading-relaxed">
                  После оформления заказа Покупателю на указанный адрес электронной почты отправляется подтверждение заказа с указанием номера заказа, состава заказа и общей стоимости.
                </p>
                <p className="text-foreground leading-relaxed mt-3">
                  Продавец оставляет за собой право отказать в оформлении заказа без объяснения причин, в том числе в случае указания Покупателем недостоверных данных, отсутствия товара на складе, нарушения Покупателем условий настоящей Оферты.
                </p>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">4. Оплата</h2>
                <p className="text-foreground leading-relaxed mb-3">
                  Оплата товаров осуществляется следующими способами:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground">
                  <li>Банковской картой через платежную систему (Visa, MasterCard, МИР)</li>
                  <li>СБП (Система быстрых платежей) через QR-код</li>
                  <li>Банковским переводом по реквизитам Продавца (для юридических лиц)</li>
                </ul>
                <p className="text-foreground leading-relaxed mt-3">
                  Моментом оплаты считается поступление денежных средств на счет Продавца. В случае оплаты банковской картой или через СБП оплата считается совершенной в момент подтверждения платежа платежной системой.
                </p>
                <p className="text-foreground leading-relaxed mt-3">
                  В случае непоступления оплаты в течение 3 (трех) рабочих дней с момента оформления заказа, заказ может быть аннулирован Продавцом без уведомления Покупателя.
                </p>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">5. Доставка</h2>
                <p className="text-foreground leading-relaxed">
                  Доставка товаров осуществляется в соответствии с условиями, указанными при оформлении заказа. Стоимость доставки рассчитывается индивидуально в зависимости от веса, габаритов товара, адреса доставки и выбранного способа доставки.
                </p>
                <p className="text-foreground leading-relaxed mt-3">
                  Сроки доставки товара указываются при оформлении заказа и зависят от наличия товара на складе, адреса доставки и выбранного способа доставки. Продавец не несет ответственности за задержку доставки товара, произошедшую по вине службы доставки или по независящим от Продавца обстоятельствам.
                </p>
                <p className="text-foreground leading-relaxed mt-3">
                  При получении товара Покупатель обязан проверить его на соответствие заказу, комплектность, отсутствие дефектов. В случае обнаружения несоответствий или дефектов Покупатель обязан незамедлительно уведомить об этом Продавца.
                </p>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">6. Возврат товаров</h2>
                <p className="text-foreground leading-relaxed mb-3">
                  Возврат товаров осуществляется в соответствии с законодательством о защите прав потребителей (Закон РФ от 07.02.1992 № 2300-1 «О защите прав потребителей»).
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  <strong>6.1. Возврат товара надлежащего качества</strong>
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  Покупатель вправе отказаться от товара в течение 14 (четырнадцати) дней с момента передачи товара, если товар не был в употреблении, сохранены его товарный вид, потребительские свойства, пломбы, фабричные ярлыки.
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  Возврат товара надлежащего качества возможен только в случае, если сохранены его товарный вид, потребительские свойства, а также документ, подтверждающий факт и условия покупки указанного товара.
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  Для возврата товара надлежащего качества Покупатель должен направить заявление на возврат на адрес электронной почты {contactEmail} или через форму обратной связи на сайте с указанием номера заказа и причины возврата.
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  <strong>6.2. Возврат товара ненадлежащего качества</strong>
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  В случае обнаружения недостатков товара Покупатель вправе потребовать замены товара, соразмерного уменьшения цены, устранения недостатков или возврата уплаченной суммы в соответствии с требованиями законодательства о защите прав потребителей.
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  <strong>6.3. Возврат денежных средств</strong>
                </p>
                <p className="text-foreground leading-relaxed">
                  Возврат денежных средств осуществляется тем же способом, которым была произведена оплата, в течение 10 (десяти) дней с момента получения Продавцом возвращенного товара и заявления на возврат. Расходы на доставку товара при возврате товара надлежащего качества несет Покупатель, если иное не предусмотрено договором.
                </p>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">7. Гарантийные обязательства</h2>
                <p className="text-foreground leading-relaxed">
                  На все товары, реализуемые Продавцом, распространяются гарантийные обязательства производителя. Срок гарантии указывается в документации к товару или на упаковке товара.
                </p>
                <p className="text-foreground leading-relaxed mt-3">
                  Гарантийные обязательства не распространяются на дефекты, возникшие вследствие неправильной эксплуатации, хранения или транспортировки товара Покупателем, а также на дефекты, возникшие по вине третьих лиц или вследствие непреодолимой силы.
                </p>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">8. Ответственность</h2>
                <p className="text-foreground leading-relaxed">
                  Продавец не несет ответственности за ущерб, причиненный в результате неправильного использования товаров, не соответствующего их назначению или инструкциям по эксплуатации.
                </p>
                <p className="text-foreground leading-relaxed mt-3">
                  Продавец не несет ответственности за ущерб, причиненный в результате действий третьих лиц, стихийных бедствий, военных действий, террористических актов и иных обстоятельств непреодолимой силы.
                </p>
                <p className="text-foreground leading-relaxed mt-3">
                  Ответственность Продавца ограничивается стоимостью товара, указанной в заказе. Продавец не несет ответственности за косвенный ущерб, упущенную выгоду или иные неполученные доходы Покупателя.
                </p>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">9. Разрешение споров</h2>
                <p className="text-foreground leading-relaxed mb-3">
                  Все споры и разногласия, возникающие между Продавцом и Покупателем, решаются путем переговоров. В случае невозможности достижения соглашения споры подлежат разрешению в судебном порядке в соответствии с законодательством Российской Федерации.
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  Претензии Покупателя по качеству товара принимаются Продавцом в течение гарантийного срока товара. Претензии рассматриваются в течение 10 (десяти) рабочих дней с момента их получения Продавцом.
                </p>
                <p className="text-foreground leading-relaxed">
                  Претензии направляются на адрес электронной почты {contactEmail} или по адресу: {contactAddress}. Претензия должна содержать описание обстоятельств, послуживших основанием для предъявления претензии, требования Покупателя, а также документы, подтверждающие обстоятельства, на которые ссылается Покупатель.
                </p>
              </section>

              <section className="text-foreground">
                <h2 className="text-xl font-semibold mb-3 text-foreground">10. Контакты</h2>
                <p className="text-foreground leading-relaxed">
                  По всем вопросам, связанным с оформлением заказа, доставкой, возвратом товаров и иным вопросам, Покупатели могут обращаться:
                </p>
                <ul className="list-none pl-0 space-y-2 text-foreground mt-3">
                  <li><strong>Email:</strong> {contactEmail}</li>
                  <li><strong>Телефон:</strong> {contactPhone}</li>
                  <li><strong>Адрес:</strong> {contactAddress}</li>
                </ul>
                <p className="text-foreground leading-relaxed mt-3">
                  Время работы: Понедельник — Пятница, с 9:00 до 18:00 по московскому времени.
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
