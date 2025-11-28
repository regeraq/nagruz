import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Package, Users, BarChart3, FileText, Settings, Plus, Edit2, Trash2, 
  Save, X, Search, Shield, Tag, Mail, UserPlus, Image, Bell, Upload
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale/ru";
import { apiRequest } from "@/lib/queryClient";

export default function Admin() {
  const [, setLocation] = useLocation();
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showCreatePromo, setShowCreatePromo] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [orderSearchTerm, setOrderSearchTerm] = useState("");
  const [selectedProductForImages, setSelectedProductForImages] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    userId: "",
    title: "",
    message: "",
    type: "info",
    link: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current user
  const { data: userData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch user");
      const data = await res.json();
      return data.user;
    },
  });

  // Fetch products (all products for admin including inactive)
  const { data: productsData = { products: [] } as any } = useQuery({
    queryKey: ["/api/admin/products"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/admin/products", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
    enabled: !!userData && ["admin", "superadmin"].includes((userData as any)?.role),
  });

  const products = productsData?.products || productsData || [];

  // Fetch users
  const { data: usersData = {} as any } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: !!userData && ["admin", "superadmin"].includes((userData as any)?.role),
  });

  // Fetch orders
  const { data: ordersData = {} as any } = useQuery({
    queryKey: ["/api/admin/orders"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/admin/orders", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    enabled: !!userData && ["admin", "superadmin"].includes((userData as any)?.role),
  });

  // Fetch contacts
  const { data: contactsData = {} as any } = useQuery({
    queryKey: ["/api/admin/contacts"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/admin/contacts", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch contacts");
      return res.json();
    },
    enabled: !!userData && ["admin", "superadmin"].includes((userData as any)?.role),
  });

  // Fetch promocodes
  const { data: promoCodesData = {} as any } = useQuery({
    queryKey: ["/api/admin/promocodes"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/admin/promocodes", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch promocodes");
      return res.json();
    },
    enabled: !!userData && ["admin", "superadmin"].includes((userData as any)?.role),
  });

  // Fetch settings
  const { data: settingsData = {} as any } = useQuery({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
    enabled: !!userData && ["admin", "superadmin"].includes((userData as any)?.role),
  });

  const allUsers = usersData?.users || [];
  const allOrders = ordersData?.orders || [];
  const contacts = contactsData?.contacts || [];
  const promoCodes = promoCodesData?.promoCodes || [];

  // Filter users by search term
  const users = allUsers.filter((u: any) => {
    if (!userSearchTerm) return true;
    const search = userSearchTerm.toLowerCase();
    return (
      u.email.toLowerCase().includes(search) ||
      (u.firstName && u.firstName.toLowerCase().includes(search)) ||
      (u.lastName && u.lastName.toLowerCase().includes(search)) ||
      (u.phone && u.phone.toLowerCase().includes(search))
    );
  });

  // Filter orders by search term
  const orders = allOrders.filter((o: any) => {
    if (!orderSearchTerm) return true;
    const search = orderSearchTerm.toLowerCase();
    return (
      o.id.toLowerCase().includes(search) ||
      (o.customerName && o.customerName.toLowerCase().includes(search)) ||
      (o.customerEmail && o.customerEmail.toLowerCase().includes(search)) ||
      (o.productId && o.productId.toLowerCase().includes(search))
    );
  });

  // Load settings into form when they arrive
  useEffect(() => {
    if (settingsData?.settings) {
      const settings = settingsData.settings as any[];
      const seoTitle = settings.find((s: any) => s.key === "seo_title");
      const seoDesc = settings.find((s: any) => s.key === "seo_description");
      const seoKeywords = settings.find((s: any) => s.key === "seo_keywords");
      const contactEmailSetting = settings.find((s: any) => s.key === "contact_email");
      const contactPhoneSetting = settings.find((s: any) => s.key === "contact_phone");
      const contactAddressSetting = settings.find((s: any) => s.key === "contact_address");

      if (seoTitle) setSeoTitle(seoTitle.value || "");
      if (seoDesc) setSeoDescription(seoDesc.value || "");
      if (seoKeywords) setSeoKeywords(seoKeywords.value || "");
      if (contactEmailSetting) setContactEmail(contactEmailSetting.value || "");
      if (contactPhoneSetting) setContactPhone(contactPhoneSetting.value || "");
      if (contactAddressSetting) setContactAddress(contactAddressSetting.value || "");
    }
  }, [settingsData]);

  // Create product mutation
  const createProduct = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/products", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setShowCreateProduct(false);
      toast({ title: "Товар создан" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  // Delete products mutation
  const deleteProducts = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await apiRequest("DELETE", "/api/admin/products", { ids });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setSelectedProducts(new Set());
      toast({ title: "Товары удалены" });
    },
  });

  // Update user role
  const updateUserRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Роль обновлена" });
    },
  });

  // Block user
  const blockUser = useMutation({
    mutationFn: async ({ id, blocked }: { id: string; blocked: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}/block`, { blocked });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Статус пользователя обновлен" });
    },
  });

  // Delete user
  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Пользователь удален" });
    },
  });

  // Create admin
  const createAdmin = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/admins", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowCreateAdmin(false);
      toast({ title: "Администратор создан" });
    },
  });

  // Update order status
  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/orders/${id}`, { paymentStatus: status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Статус заказа обновлен" });
    },
  });

  // Delete contact
  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/contacts/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contacts"] });
      toast({ title: "Заявка удалена" });
    },
  });

  // Create promo code
  const createPromoCode = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/promocodes", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promocodes"] });
      setShowCreatePromo(false);
      toast({ title: "Промокод создан" });
    },
  });

  // Delete promo code
  const deletePromoCode = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/promocodes/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promocodes"] });
      toast({ title: "Промокод удален" });
    },
  });

  // Toggle product active status
  const updateProductStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/products/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Статус товара обновлен" });
    },
  });

  // Update product price and stock
  const updateProductPriceStock = useMutation({
    mutationFn: async ({ id, price, stock }: { id: string; price: string; stock: number }) => {
      const res = await apiRequest("PATCH", `/api/admin/products/${id}`, { price, stock });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setEditingProductId(null);
      toast({ title: "Товар обновлен" });
    },
    onError: () => {
      toast({ title: "Ошибка обновления товара", variant: "destructive" });
    },
  });

  // Toggle product active status
  const updatePromoCodeStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: number }) => {
      const res = await apiRequest("PATCH", `/api/admin/promocodes/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promocodes"] });
      toast({ title: "Статус промокода обновлен" });
    },
  });

  // Save SEO settings
  const saveSeoSettings = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PUT", "/api/admin/settings/seo_title", { value: data.title, type: "string" });
      await apiRequest("PUT", "/api/admin/settings/seo_description", { value: data.description, type: "string" });
      await apiRequest("PUT", "/api/admin/settings/seo_keywords", { value: data.keywords, type: "string" });
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "SEO настройки сохранены" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  // Save contact settings
  const saveContactSettings = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PUT", "/api/admin/settings/contact_email", { value: data.email, type: "string" });
      await apiRequest("PUT", "/api/admin/settings/contact_phone", { value: data.phone, type: "string" });
      await apiRequest("PUT", "/api/admin/settings/contact_address", { value: data.address, type: "string" });
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Контактные данные сохранены" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  // Get product images
  const { data: productImages = [] } = useQuery({
    queryKey: ["/api/admin/products", selectedProductForImages, "images"],
    queryFn: async () => {
      if (!selectedProductForImages) return [];
      const token = localStorage.getItem("accessToken");
      if (!token) return [];
      const res = await fetch(`/api/admin/products/${selectedProductForImages}/images`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.images || [];
    },
    enabled: !!selectedProductForImages,
  });

  // Add product image
  const addProductImage = useMutation({
    mutationFn: async ({ productId, imageUrl }: { productId: string; imageUrl: string }) => {
      const res = await apiRequest("POST", `/api/admin/products/${productId}/images`, { imageUrl });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products", selectedProductForImages, "images"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setNewImageUrl("");
      toast({ title: "Фотография добавлена" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  // Remove product image
  const removeProductImage = useMutation({
    mutationFn: async ({ productId, imageUrl }: { productId: string; imageUrl: string }) => {
      const res = await apiRequest("DELETE", `/api/admin/products/${productId}/images`, { imageUrl });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products", selectedProductForImages, "images"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Фотография удалена" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  // Send notification
  const sendNotification = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/notifications/send", data);
      return res.json();
    },
    onSuccess: (data) => {
      setShowNotificationDialog(false);
      setNotificationForm({ userId: "", title: "", message: "", type: "info", link: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ 
        title: "Уведомление отправлено", 
        description: data.count ? `Отправлено ${data.count} пользователям` : "Уведомление отправлено" 
      });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const isAdmin = (userData as any)?.role === "admin" || (userData as any)?.role === "superadmin";
  const isSuperAdmin = (userData as any)?.role === "superadmin";

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <Alert>
          <AlertDescription>У вас нет доступа к админ-панели</AlertDescription>
        </Alert>
      </div>
    );
  }

  const totalRevenue = allOrders.reduce((sum: number, o: any) => sum + parseFloat(o.finalAmount || 0), 0);
  const admins = allUsers.filter((u: any) => ["admin", "superadmin", "moderator"].includes(u.role));

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Админ-панель</h1>
          <div className="flex items-center gap-4">
            <Badge variant="outline">{userData?.role}</Badge>
            <Button variant="outline" onClick={() => setLocation("/")}>
              На главную
            </Button>
          </div>
        </div>

        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-8 gap-1">
            <TabsTrigger value="analytics"><BarChart3 className="w-4 h-4 mr-1" />Аналитика</TabsTrigger>
            <TabsTrigger value="products"><Package className="w-4 h-4 mr-1" />Товары</TabsTrigger>
            <TabsTrigger value="users"><Users className="w-4 h-4 mr-1" />Пользователи</TabsTrigger>
            <TabsTrigger value="admins"><Shield className="w-4 h-4 mr-1" />Админы</TabsTrigger>
            <TabsTrigger value="orders"><FileText className="w-4 h-4 mr-1" />Заказы</TabsTrigger>
            <TabsTrigger value="contacts"><Mail className="w-4 h-4 mr-1" />Заявки</TabsTrigger>
            <TabsTrigger value="promocodes"><Tag className="w-4 h-4 mr-1" />Промокоды</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-1" />Настройки</TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6 space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Всего товаров</CardDescription>
                  <CardTitle className="text-3xl">{products.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Пользователи</CardDescription>
                  <CardTitle className="text-3xl">{allUsers.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Заказы</CardDescription>
                  <CardTitle className="text-3xl">{allOrders.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Выручка</CardDescription>
                  <CardTitle className="text-3xl">{totalRevenue.toFixed(0)} ₽</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Последние заказы</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Дата</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allOrders.slice(0, 5).map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}</TableCell>
                        <TableCell>{order.customerName || order.customerEmail}</TableCell>
                        <TableCell>{order.finalAmount} ₽</TableCell>
                        <TableCell>
                          <Badge>{order.paymentStatus}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(order.createdAt), "dd.MM.yyyy", { locale: ru })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Управление товарами</CardTitle>
                    <CardDescription>Создание, редактирование и удаление товаров</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {selectedProducts.size > 0 && (
                      <Button variant="destructive" onClick={() => deleteProducts.mutate(Array.from(selectedProducts))}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Удалить ({selectedProducts.size})
                      </Button>
                    )}
                    <Dialog open={showCreateProduct} onOpenChange={setShowCreateProduct}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Добавить товар
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Создать товар</DialogTitle>
                        </DialogHeader>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            createProduct.mutate({
                              id: formData.get("id"),
                              name: formData.get("name"),
                              description: formData.get("description"),
                              price: parseFloat(formData.get("price") as string),
                              sku: formData.get("sku"),
                              specifications: formData.get("specifications"),
                              stock: parseInt(formData.get("stock") as string),
                              isActive: true,
                              currency: "RUB",
                            });
                          }}
                        >
                          <div className="space-y-4">
                            <div>
                              <Label>ID</Label>
                              <Input name="id" required />
                            </div>
                            <div>
                              <Label>Название</Label>
                              <Input name="name" required />
                            </div>
                            <div>
                              <Label>Описание</Label>
                              <Textarea name="description" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Цена (₽)</Label>
                                <Input name="price" type="number" required />
                              </div>
                              <div>
                                <Label>Количество</Label>
                                <Input name="stock" type="number" defaultValue="0" required />
                              </div>
                            </div>
                            <div>
                              <Label>Артикул</Label>
                              <Input name="sku" required />
                            </div>
                            <div>
                              <Label>Характеристики</Label>
                              <Textarea name="specifications" required />
                            </div>
                          </div>
                          <DialogFooter className="mt-4">
                            <Button type="submit" disabled={createProduct.isPending}>
                              {createProduct.isPending ? "Создание..." : "Создать"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedProducts.size === products.length && products.length > 0}
                          onCheckedChange={() => {
                            if (selectedProducts.size === products.length) {
                              setSelectedProducts(new Set());
                            } else {
                              setSelectedProducts(new Set(products.map((p: any) => p.id)));
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Название</TableHead>
                      <TableHead>Артикул</TableHead>
                      <TableHead>Цена</TableHead>
                      <TableHead>Количество</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Видимость</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product: any) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedProducts.has(product.id)}
                            onCheckedChange={() => {
                              const newSet = new Set(selectedProducts);
                              if (newSet.has(product.id)) {
                                newSet.delete(product.id);
                              } else {
                                newSet.add(product.id);
                              }
                              setSelectedProducts(newSet);
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell>
                          {editingProductId === product.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                className="w-24"
                                data-testid={`input-price-${product.id}`}
                              />
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  updateProductPriceStock.mutate({
                                    id: product.id,
                                    price: editPrice,
                                    stock: parseInt(editStock),
                                  });
                                }}
                                disabled={updateProductPriceStock.isPending}
                                data-testid={`button-save-${product.id}`}
                              >
                                Сохранить
                              </Button>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setEditingProductId(product.id);
                                setEditPrice(product.price);
                                setEditStock(product.stock);
                              }}
                              className="cursor-pointer hover:opacity-60"
                              data-testid={`cell-price-${product.id}`}
                            >
                              {product.price} ₽
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingProductId === product.id ? (
                            <Input
                              type="number"
                              value={editStock}
                              onChange={(e) => setEditStock(e.target.value)}
                              className="w-16"
                              data-testid={`input-stock-${product.id}`}
                            />
                          ) : (
                            <div
                              onClick={() => {
                                setEditingProductId(product.id);
                                setEditPrice(product.price);
                                setEditStock(product.stock);
                              }}
                              className="cursor-pointer hover:opacity-60"
                              data-testid={`cell-stock-${product.id}`}
                            >
                              {product.stock}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.isActive ? "default" : "secondary"}>
                            {product.isActive ? "Активен" : "Неактивен"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={product.isActive ? "default" : "outline"}
                            onClick={() => updateProductStatus.mutate({ id: product.id, isActive: !product.isActive })}
                            disabled={updateProductStatus.isPending}
                            data-testid={`button-toggle-product-${product.id}`}
                          >
                            {product.isActive ? "Скрыть" : "Показать"}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedProductForImages(product.id)}
                          >
                            <Image className="w-4 h-4 mr-1" />
                            Фото
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Управление пользователями</CardTitle>
                    <CardDescription>Просмотр и управление пользователями</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Поиск по email, имени..."
                      className="w-64"
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Имя</TableHead>
                      <TableHead>Роль</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Дата регистрации</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.firstName || user.lastName ? `${user.firstName || ""} ${user.lastName || ""}` : "-"}</TableCell>
                        <TableCell>
                          {isSuperAdmin ? (
                            <Select
                              value={user.role}
                              onValueChange={(role) => updateUserRole.mutate({ id: user.id, role })}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="moderator">Moderator</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="superadmin">Superadmin</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge>{user.role}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.isBlocked ? (
                            <Badge variant="destructive">Заблокирован</Badge>
                          ) : (
                            <Badge variant="default">Активен</Badge>
                          )}
                        </TableCell>
                        <TableCell>{format(new Date(user.createdAt), "dd.MM.yyyy", { locale: ru })}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => blockUser.mutate({ id: user.id, blocked: !user.isBlocked })}
                            >
                              {user.isBlocked ? "Разблокировать" : "Заблокировать"}
                            </Button>
                            {isSuperAdmin && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm("Удалить пользователя?")) {
                                    deleteUser.mutate(user.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admins Tab */}
          <TabsContent value="admins" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Управление администраторами</CardTitle>
                    <CardDescription>Создание и управление административными аккаунтами</CardDescription>
                  </div>
                  {isSuperAdmin && (
                    <Dialog open={showCreateAdmin} onOpenChange={setShowCreateAdmin}>
                      <DialogTrigger asChild>
                        <Button>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Создать администратора
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Создать администратора</DialogTitle>
                        </DialogHeader>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            createAdmin.mutate({
                              email: formData.get("email"),
                              password: formData.get("password"),
                              role: formData.get("role"),
                              firstName: formData.get("firstName"),
                              lastName: formData.get("lastName"),
                            });
                          }}
                        >
                          <div className="space-y-4">
                            <div>
                              <Label>Email</Label>
                              <Input name="email" type="email" required />
                            </div>
                            <div>
                              <Label>Пароль</Label>
                              <Input name="password" type="password" required />
                            </div>
                            <div>
                              <Label>Роль</Label>
                              <Select name="role" defaultValue="admin">
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="moderator">Moderator</SelectItem>
                                  <SelectItem value="superadmin">Superadmin</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Имя</Label>
                                <Input name="firstName" />
                              </div>
                              <div>
                                <Label>Фамилия</Label>
                                <Input name="lastName" />
                              </div>
                            </div>
                          </div>
                          <DialogFooter className="mt-4">
                            <Button type="submit" disabled={createAdmin.isPending}>
                              {createAdmin.isPending ? "Создание..." : "Создать"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Имя</TableHead>
                      <TableHead>Роль</TableHead>
                      <TableHead>Дата создания</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.map((admin: any) => (
                      <TableRow key={admin.id}>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>{admin.firstName || admin.lastName ? `${admin.firstName || ""} ${admin.lastName || ""}` : "-"}</TableCell>
                        <TableCell>
                          <Badge variant={admin.role === "superadmin" ? "default" : "secondary"}>
                            {admin.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(admin.createdAt), "dd.MM.yyyy HH:mm", { locale: ru })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Управление заказами</CardTitle>
                    <CardDescription>Просмотр и управление заказами</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Поиск по ID, клиенту..."
                      className="w-64"
                      value={orderSearchTerm}
                      onChange={(e) => setOrderSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Клиент</TableHead>
                      <TableHead>Товар</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Дата</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}</TableCell>
                        <TableCell>{order.customerName || order.customerEmail}</TableCell>
                        <TableCell>{order.productId}</TableCell>
                        <TableCell>{order.finalAmount} ₽</TableCell>
                        <TableCell>
                          <Select
                            value={order.paymentStatus}
                            onValueChange={(status) => updateOrderStatus.mutate({ id: order.id, status })}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Ожидание</SelectItem>
                              <SelectItem value="paid">Оплачен</SelectItem>
                              <SelectItem value="processing">В обработке</SelectItem>
                              <SelectItem value="shipped">Отправлен</SelectItem>
                              <SelectItem value="delivered">Доставлен</SelectItem>
                              <SelectItem value="cancelled">Отменен</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{format(new Date(order.createdAt), "dd.MM.yyyy", { locale: ru })}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            Детали
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Заявки с сайта</CardTitle>
                <CardDescription>Просмотр и управление контактными заявками</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Имя</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Телефон</TableHead>
                      <TableHead>Компания</TableHead>
                      <TableHead>Сообщение</TableHead>
                      <TableHead>Дата</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact: any) => (
                      <TableRow key={contact.id}>
                        <TableCell>{contact.name}</TableCell>
                        <TableCell>{contact.email}</TableCell>
                        <TableCell>{contact.phone}</TableCell>
                        <TableCell>{contact.company}</TableCell>
                        <TableCell className="max-w-xs truncate">{contact.message}</TableCell>
                        <TableCell>{format(new Date(contact.createdAt), "dd.MM.yyyy", { locale: ru })}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm("Удалить заявку?")) {
                                deleteContact.mutate(contact.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Promo Codes Tab */}
          <TabsContent value="promocodes" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Управление промокодами</CardTitle>
                    <CardDescription>Создание и управление промокодами</CardDescription>
                  </div>
                  <Dialog open={showCreatePromo} onOpenChange={setShowCreatePromo}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Создать промокод
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Создать промокод</DialogTitle>
                      </DialogHeader>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          createPromoCode.mutate({
                            code: formData.get("code"),
                            discountPercent: parseInt(formData.get("discountPercent") as string),
                            expiresAt: formData.get("expiresAt") ? new Date(formData.get("expiresAt") as string) : null,
                            isActive: 1,
                          });
                        }}
                      >
                        <div className="space-y-4">
                          <div>
                            <Label>Код промокода</Label>
                            <Input name="code" required placeholder="SALE2024" />
                          </div>
                          <div>
                            <Label>Скидка (%)</Label>
                            <Input name="discountPercent" type="number" min="1" max="100" required />
                          </div>
                          <div>
                            <Label>Дата истечения (необязательно)</Label>
                            <Input name="expiresAt" type="datetime-local" />
                          </div>
                        </div>
                        <DialogFooter className="mt-4">
                          <Button type="submit" disabled={createPromoCode.isPending}>
                            {createPromoCode.isPending ? "Создание..." : "Создать"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Код</TableHead>
                      <TableHead>Скидка</TableHead>
                      <TableHead>Истекает</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Дата создания</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promoCodes.map((promo: any) => (
                      <TableRow key={promo.id}>
                        <TableCell className="font-mono font-semibold">{promo.code}</TableCell>
                        <TableCell>{promo.discountPercent}%</TableCell>
                        <TableCell>
                          {promo.expiresAt ? format(new Date(promo.expiresAt), "dd.MM.yyyy", { locale: ru }) : "Без срока"}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={promo.isActive ? "default" : "secondary"}
                            onClick={() => {
                              updatePromoCodeStatus.mutate({ id: promo.id, isActive: promo.isActive ? 0 : 1 });
                            }}
                          >
                            {promo.isActive ? "Активен" : "Неактивен"}
                          </Button>
                        </TableCell>
                        <TableCell>{format(new Date(promo.createdAt), "dd.MM.yyyy", { locale: ru })}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm("Удалить промокод?")) {
                                deletePromoCode.mutate(promo.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Отправка уведомлений</CardTitle>
                    <CardDescription>Отправка уведомлений пользователям через сайт и email</CardDescription>
                  </div>
                  <Button onClick={() => setShowNotificationDialog(true)}>
                    <Bell className="w-4 h-4 mr-2" />
                    Отправить уведомление
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertDescription>
                    Уведомления будут отправлены пользователям на сайте и на их email адреса.
                    Вы можете отправить уведомление конкретному пользователю или всем пользователям сразу.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>SEO настройки</CardTitle>
                  <CardDescription>Метаданные для поисковых систем</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Заголовок сайта</Label>
                    <Input 
                      placeholder="Нагрузочные устройства" 
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Описание</Label>
                    <Textarea 
                      placeholder="Производство и продажа нагрузочных устройств"
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Ключевые слова</Label>
                    <Input 
                      placeholder="нагрузочные устройства, ну-100, ну-30"
                      value={seoKeywords}
                      onChange={(e) => setSeoKeywords(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={() => saveSeoSettings.mutate({ title: seoTitle, description: seoDescription, keywords: seoKeywords })}
                    disabled={saveSeoSettings.isPending}
                  >
                    {saveSeoSettings.isPending ? "Сохранение..." : "Сохранить SEO"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Контактные данные</CardTitle>
                  <CardDescription>Информация для клиентов</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Email</Label>
                    <Input 
                      type="email" 
                      placeholder="info@example.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Телефон</Label>
                    <Input 
                      type="tel" 
                      placeholder="+7 (999) 123-45-67"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Адрес</Label>
                    <Input 
                      placeholder="Москва, ул. Примерная, д. 1"
                      value={contactAddress}
                      onChange={(e) => setContactAddress(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={() => saveContactSettings.mutate({ email: contactEmail, phone: contactPhone, address: contactAddress })}
                    disabled={saveContactSettings.isPending}
                  >
                    {saveContactSettings.isPending ? "Сохранение..." : "Сохранить контакты"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog for managing product images */}
      <Dialog open={!!selectedProductForImages} onOpenChange={(open) => !open && setSelectedProductForImages(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Управление фотографиями</DialogTitle>
            <DialogDescription>
              {products.find((p: any) => p.id === selectedProductForImages)?.name || "Товар"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Добавить фотографию</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const base64 = event.target?.result as string;
                        setNewImageUrl(base64);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  data-testid="input-product-image"
                />
                <Button
                  onClick={() => {
                    if (newImageUrl && selectedProductForImages) {
                      addProductImage.mutate({ productId: selectedProductForImages, imageBase64: newImageUrl });
                    }
                  }}
                  disabled={!newImageUrl || addProductImage.isPending}
                  data-testid="button-upload-image"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {addProductImage.isPending ? "Загрузка..." : "Добавить"}
                </Button>
              </div>
            </div>

            {productImages.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {productImages.map((imageData: string, idx: number) => (
                  <div key={idx} className="relative group" data-testid={`admin-gallery-image-${idx}`}>
                    <img
                      src={imageData}
                      alt={`Фото ${idx + 1}`}
                      className="w-full h-48 object-cover rounded-lg border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23ddd' width='400' height='300'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='18' dy='10.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3EИзображение не найдено%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        if (selectedProductForImages) {
                          removeProductImage.mutate({ productId: selectedProductForImages, imageData });
                        }
                      }}
                      disabled={removeProductImage.isPending}
                      data-testid="button-delete-image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Нет фотографий</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProductForImages(null)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for sending notifications */}
      <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отправить уведомление</DialogTitle>
            <DialogDescription>
              Уведомление будет отправлено на сайт и на email пользователя
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Получатель</Label>
              <Select
                value={notificationForm.userId}
                onValueChange={(value) => setNotificationForm({ ...notificationForm, userId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите получателя" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Всем пользователям</SelectItem>
                  {allUsers.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email} {user.firstName ? `(${user.firstName} ${user.lastName || ""})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Тип уведомления</Label>
              <Select
                value={notificationForm.type}
                onValueChange={(value) => setNotificationForm({ ...notificationForm, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Информация</SelectItem>
                  <SelectItem value="success">Успех</SelectItem>
                  <SelectItem value="warning">Предупреждение</SelectItem>
                  <SelectItem value="error">Ошибка</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Заголовок *</Label>
              <Input
                placeholder="Заголовок уведомления"
                value={notificationForm.title}
                onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
              />
            </div>

            <div>
              <Label>Сообщение *</Label>
              <Textarea
                placeholder="Текст уведомления"
                value={notificationForm.message}
                onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                rows={4}
              />
            </div>

            <div>
              <Label>Ссылка (необязательно)</Label>
              <Input
                placeholder="/profile или https://example.com"
                value={notificationForm.link}
                onChange={(e) => setNotificationForm({ ...notificationForm, link: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotificationDialog(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (!notificationForm.title || !notificationForm.message) {
                  toast({ title: "Ошибка", description: "Заполните все обязательные поля", variant: "destructive" });
                  return;
                }
                sendNotification.mutate({
                  userId: notificationForm.userId || undefined,
                  title: notificationForm.title,
                  message: notificationForm.message,
                  type: notificationForm.type,
                  link: notificationForm.link || undefined,
                });
              }}
              disabled={sendNotification.isPending || !notificationForm.title || !notificationForm.message}
            >
              {sendNotification.isPending ? "Отправка..." : "Отправить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
