import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Save, X, Search, Shield, Tag, Mail, UserPlus, Image, Bell, Upload, Database, Download,
  FileText as FileTextIcon, Phone, Cookie
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale/ru";
import { apiRequest } from "@/lib/queryClient";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts";

export default function Admin() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("analytics");
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
  // Privacy policy settings
  const [operatorName, setOperatorName] = useState("");
  const [operatorInn, setOperatorInn] = useState("");
  const [operatorOgrn, setOperatorOgrn] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [orderSearchTerm, setOrderSearchTerm] = useState("");
  
  // Content management state
  const [contentKey, setContentKey] = useState("");
  const [contentValue, setContentValue] = useState("");
  const [contentPage, setContentPage] = useState("");
  const [contentSection, setContentSection] = useState("");
  
  // Site contacts state
  const [newContact, setNewContact] = useState({ type: "", value: "", label: "", order: 0 });
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  
  // Cookie settings state
  const [cookieSettings, setCookieSettings] = useState({ enabled: true, message: "", acceptButtonText: "", declineButtonText: "" });
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

  // Fetch contact submissions
  const { data: contactSubmissionsData = {} as any } = useQuery({
    queryKey: ["/api/admin/contacts"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/admin/contacts", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch contact submissions");
      return res.json();
    },
    enabled: !!userData && ["admin", "superadmin"].includes((userData as any)?.role),
  });

  // Fetch site content
  const { data: siteContentData = {} as any } = useQuery({
    queryKey: ["/api/admin/content"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/admin/content", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch site content");
      return res.json();
    },
    enabled: !!userData && ["admin", "superadmin"].includes((userData as any)?.role),
  });

  // Fetch site contacts
  const { data: siteContactsData = {} as any } = useQuery({
    queryKey: ["/api/admin/site-contacts"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/admin/site-contacts", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch site contacts");
      return res.json();
    },
    enabled: !!userData && ["admin", "superadmin"].includes((userData as any)?.role),
  });

  // Fetch cookie settings
  const { data: cookieSettingsData = {} as any } = useQuery({
    queryKey: ["/api/admin/cookie-settings"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/admin/cookie-settings", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch cookie settings");
      return res.json();
    },
    enabled: !!userData && ["admin", "superadmin"].includes((userData as any)?.role),
    onSuccess: (data) => {
      if (data.success && data.settings) {
        setCookieSettings(data.settings);
      }
    },
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

  // Fetch admin stats (including userActivityByDay)
  const { data: statsData = {} as any } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: !!userData && ["admin", "superadmin"].includes((userData as any)?.role),
  });

  const allUsers = usersData?.users || [];
  const allOrders = ordersData?.orders || [];
  const contactSubmissions = contactSubmissionsData?.contacts || [];
  const siteContentItems = siteContentData?.content || [];
  const siteContactsItems = siteContactsData?.contacts || [];
  const promoCodes = promoCodesData?.promoCodes || [];
  const stats = statsData?.stats || {};
  const userActivityByDay = stats.userActivityByDay || [];
  const totalRevenue = stats.totalRevenue || 0;

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
      const operatorNameSetting = settings.find((s: any) => s.key === "operator_name");
      const operatorInnSetting = settings.find((s: any) => s.key === "operator_inn");
      const operatorOgrnSetting = settings.find((s: any) => s.key === "operator_ogrn");
      const responsiblePersonSetting = settings.find((s: any) => s.key === "responsible_person");

      if (seoTitle) setSeoTitle(seoTitle.value || "");
      if (seoDesc) setSeoDescription(seoDesc.value || "");
      if (seoKeywords) setSeoKeywords(seoKeywords.value || "");
      if (contactEmailSetting) setContactEmail(contactEmailSetting.value || "");
      if (contactPhoneSetting) setContactPhone(contactPhoneSetting.value || "");
      if (contactAddressSetting) setContactAddress(contactAddressSetting.value || "");
      if (operatorNameSetting) setOperatorName(operatorNameSetting.value || "");
      if (operatorInnSetting) setOperatorInn(operatorInnSetting.value || "");
      if (operatorOgrnSetting) setOperatorOgrn(operatorOgrnSetting.value || "");
      if (responsiblePersonSetting) setResponsiblePerson(responsiblePersonSetting.value || "");
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
    mutationFn: async ({ productId, imageUrl, imageBase64 }: { productId: string; imageUrl?: string; imageBase64?: string }) => {
      const res = await apiRequest("POST", `/api/admin/products/${productId}/images`, { 
        imageUrl: imageUrl,
        imageBase64: imageBase64
      });
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
    mutationFn: async ({ productId, imageUrl, imageData }: { productId: string; imageUrl?: string; imageData?: string }) => {
      const res = await apiRequest("DELETE", `/api/admin/products/${productId}/images`, { 
        imageUrl: imageUrl,
        imageData: imageData
      });
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

  // Save privacy policy settings (operator data)
  const savePrivacyPolicySettings = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PUT", "/api/admin/settings/operator_name", { value: data.operatorName, type: "string", description: "Полное наименование оператора персональных данных" });
      await apiRequest("PUT", "/api/admin/settings/operator_inn", { value: data.operatorInn, type: "string", description: "ИНН оператора персональных данных" });
      if (data.operatorOgrn !== undefined) {
        await apiRequest("PUT", "/api/admin/settings/operator_ogrn", { value: data.operatorOgrn, type: "string", description: "ОГРН/ОГРНИП оператора персональных данных" });
      }
      if (data.responsiblePerson !== undefined) {
        await apiRequest("PUT", "/api/admin/settings/responsible_person", { value: data.responsiblePerson, type: "string", description: "ФИО ответственного за организацию обработки персональных данных" });
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Данные оператора сохранены" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: "Произошла ошибка. Попробуйте позже.", variant: "destructive" });
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

  const admins = allUsers.filter((u: any) => ["admin", "superadmin", "moderator"].includes(u.role));

  const navItems = [
    { id: "analytics", label: "Аналитика", icon: BarChart3 },
    { id: "products", label: "Товары", icon: Package },
    { id: "users", label: "Пользователи", icon: Users },
    { id: "admins", label: "Админы", icon: Shield },
    { id: "orders", label: "Заказы", icon: FileText },
    { id: "contacts", label: "Заявки", icon: Mail },
    { id: "promocodes", label: "Промокоды", icon: Tag },
    { id: "content", label: "Контент", icon: FileTextIcon },
    { id: "site-contacts", label: "Контакты", icon: Phone },
    { id: "compliance", label: "Compliance", icon: Cookie },
    { id: "privacy", label: "Политика", icon: Shield },
    { id: "notifications", label: "Уведомления", icon: Bell },
    { id: "settings", label: "Настройки", icon: Settings },
    { id: "database", label: "БД", icon: Database },
  ];

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 pt-20 sm:pt-24">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Админ-панель</h1>
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Badge variant="outline" className="text-xs sm:text-sm">{userData?.role}</Badge>
            <Button variant="outline" onClick={() => setLocation("/")} className="text-xs sm:text-sm h-9 sm:h-10 flex-1 sm:flex-none">
              На главную
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <nav className="bg-card border border-border rounded-lg p-2 space-y-1 sticky top-24">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">

            {/* Analytics Section */}
            {activeTab === "analytics" && (
              <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardHeader className="pb-2 p-3 sm:p-6">
                  <CardDescription className="text-xs sm:text-sm">Всего товаров</CardDescription>
                  <CardTitle className="text-xl sm:text-2xl md:text-3xl">{products.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2 p-3 sm:p-6">
                  <CardDescription className="text-xs sm:text-sm">Пользователи</CardDescription>
                  <CardTitle className="text-xl sm:text-2xl md:text-3xl">{allUsers.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2 p-3 sm:p-6">
                  <CardDescription className="text-xs sm:text-sm">Заказы</CardDescription>
                  <CardTitle className="text-xl sm:text-2xl md:text-3xl">{allOrders.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2 p-3 sm:p-6">
                  <CardDescription className="text-xs sm:text-sm">Выручка</CardDescription>
                  <CardTitle className="text-xl sm:text-2xl md:text-3xl">{totalRevenue.toFixed(0)} ₽</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* User Activity Chart */}
            {userActivityByDay && userActivityByDay.length > 0 && (
              <Card className="border-2 border-primary/20 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        📊 Активность пользователей
                      </CardTitle>
                      <CardDescription className="mt-2 text-base">
                        Анализ регистраций и входов за последние 30 дней
                      </CardDescription>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"></div>
                        <span className="font-medium">Регистрации</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-green-600"></div>
                        <span className="font-medium">Входы</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 bg-gradient-to-br from-background via-background to-muted/20">
                  <ChartContainer
                    config={{
                      registrations: { 
                        label: "Регистрации", 
                        color: "hsl(217, 91%, 60%)" // Blue
                      },
                      logins: { 
                        label: "Входы", 
                        color: "hsl(142, 76%, 36%)" // Green
                      },
                    }}
                    className="min-h-[400px] w-full"
                  >
                    <AreaChart 
                      data={userActivityByDay}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="colorRegistrations" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        vertical={false}
                        stroke="hsl(var(--border))"
                        opacity={0.3}
                      />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={12}
                        tickFormatter={(value) => format(new Date(value), "dd.MM", { locale: ru })}
                        style={{ fontSize: '12px', fontWeight: 500 }}
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        tickMargin={12}
                        style={{ fontSize: '12px', fontWeight: 500 }}
                      />
                      <ChartTooltip 
                        cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                        content={<ChartTooltipContent 
                          className="bg-background border-2 border-primary/20 shadow-xl rounded-lg"
                          labelFormatter={(value) => format(new Date(value), "dd MMMM yyyy", { locale: ru })}
                        />} 
                      />
                      <Area
                        dataKey="registrations"
                        type="monotone"
                        fill="url(#colorRegistrations)"
                        fillOpacity={1}
                        stroke="hsl(217, 91%, 60%)"
                        strokeWidth={3}
                        dot={{ fill: "hsl(217, 91%, 60%)", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, strokeWidth: 2 }}
                      />
                      <Area
                        dataKey="logins"
                        type="monotone"
                        fill="url(#colorLogins)"
                        fillOpacity={1}
                        stroke="hsl(142, 76%, 36%)"
                        strokeWidth={3}
                        dot={{ fill: "hsl(142, 76%, 36%)", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ChartContainer>
                  <div className="mt-6 grid grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {userActivityByDay.reduce((sum: number, day: any) => sum + (day.registrations || 0), 0)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Всего регистраций</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {userActivityByDay.reduce((sum: number, day: any) => sum + (day.logins || 0), 0)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Всего входов</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg md:text-xl">Последние заказы</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">ID</TableHead>
                          <TableHead className="text-xs sm:text-sm">Пользователь</TableHead>
                          <TableHead className="text-xs sm:text-sm">Сумма</TableHead>
                          <TableHead className="text-xs sm:text-sm">Статус</TableHead>
                          <TableHead className="text-xs sm:text-sm">Дата</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allOrders.slice(0, 5).map((order: any) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-xs sm:text-sm">{order.id.slice(0, 8)}</TableCell>
                            <TableCell className="text-xs sm:text-sm">{order.customerName || order.customerEmail}</TableCell>
                            <TableCell className="text-xs sm:text-sm">{order.finalAmount} ₽</TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              <Badge className="text-xs">{order.paymentStatus}</Badge>
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">{format(new Date(order.createdAt), "dd.MM.yyyy", { locale: ru })}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
              </div>
            )}

            {/* Products Section */}
            {activeTab === "products" && (
              <div className="mt-4 sm:mt-6">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                  <div>
                    <CardTitle className="text-base sm:text-lg md:text-xl">Управление товарами</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Создание, редактирование и удаление товаров</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
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
              <CardContent className="p-4 sm:p-6">
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8 sm:w-12">
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
                      <TableHead className="text-xs sm:text-sm">Название</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Артикул</TableHead>
                      <TableHead className="text-xs sm:text-sm">Цена</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden md:table-cell">Количество</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden md:table-cell">Статус</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Видимость</TableHead>
                      <TableHead className="text-xs sm:text-sm">Действия</TableHead>
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
                        <TableCell className="font-medium text-xs sm:text-sm">{product.name}</TableCell>
                        <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{product.sku}</TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {editingProductId === product.id ? (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                              <Input
                                type="number"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                className="w-20 sm:w-24 h-8 text-xs"
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
                                className="text-xs h-8"
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
                        <TableCell className="text-xs sm:text-sm hidden md:table-cell">
                          {editingProductId === product.id ? (
                            <Input
                              type="number"
                              value={editStock}
                              onChange={(e) => setEditStock(e.target.value)}
                              className="w-16 h-8 text-xs"
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
                        <TableCell className="text-xs sm:text-sm hidden md:table-cell">
                          <Badge variant={product.isActive ? "default" : "secondary"} className="text-xs">
                            {product.isActive ? "Активен" : "Неактивен"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm hidden lg:table-cell">
                          <Button
                            size="sm"
                            variant={product.isActive ? "default" : "outline"}
                            onClick={() => updateProductStatus.mutate({ id: product.id, isActive: !product.isActive })}
                            disabled={updateProductStatus.isPending}
                            data-testid={`button-toggle-product-${product.id}`}
                            className="text-xs h-7 sm:h-8"
                          >
                            {product.isActive ? "Скрыть" : "Показать"}
                          </Button>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedProductForImages(product.id)}
                            className="text-xs h-7 sm:h-8"
                          >
                            <Image className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            <span className="hidden sm:inline">Фото</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
              </div>
            )}

            {/* Users Section */}
            {activeTab === "users" && (
              <div className="mt-6">
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
              </div>
            )}

            {/* Admins Section */}
            {activeTab === "admins" && (
              <div className="mt-6">
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
              </div>
            )}

            {/* Orders Section */}
            {activeTab === "orders" && (
              <div className="mt-6">
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
              </div>
            )}

            {/* Contacts Section */}
            {activeTab === "contacts" && (
              <div className="mt-6">
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
                    {contactSubmissions.map((contact: any) => (
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
              </div>
            )}

            {/* Promocodes Section */}
            {activeTab === "promocodes" && (
              <div className="mt-6">
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
                            code: (formData.get("code") as string)?.trim().toUpperCase() || "",
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
              </div>
            )}

            {/* Content Section */}
            {activeTab === "content" && (
              <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Управление контентом сайта</CardTitle>
                <CardDescription>Редактирование текстов и описаний на сайте</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Ключ контента</Label>
                    <Input
                      value={contentKey}
                      onChange={(e) => setContentKey(e.target.value)}
                      placeholder="Например: main-description"
                    />
                  </div>
                  <div>
                    <Label>Страница</Label>
                    <Input
                      value={contentPage}
                      onChange={(e) => setContentPage(e.target.value)}
                      placeholder="Например: home"
                    />
                  </div>
                </div>
                <div>
                  <Label>Раздел</Label>
                  <Input
                    value={contentSection}
                    onChange={(e) => setContentSection(e.target.value)}
                    placeholder="Например: hero"
                  />
                </div>
                <div>
                  <Label>Содержимое</Label>
                  <Textarea
                    value={contentValue}
                    onChange={(e) => setContentValue(e.target.value)}
                    placeholder="Введите текст..."
                    rows={5}
                  />
                </div>
                <Button
                  onClick={async () => {
                    if (!contentKey || !contentValue) {
                      toast({ title: "Ошибка", description: "Заполните ключ и содержимое", variant: "destructive" });
                      return;
                    }
                    try {
                      const token = localStorage.getItem("accessToken");
                      const res = await fetch(`/api/admin/content/${contentKey}`, {
                        method: "PUT",
                        headers: {
                          Authorization: `Bearer ${token}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ value: contentValue, page: contentPage, section: contentSection }),
                      });
                      if (!res.ok) throw new Error("Failed to save content");
                      toast({ title: "Успешно", description: "Контент сохранен" });
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/content"] });
                      setContentKey("");
                      setContentValue("");
                      setContentPage("");
                      setContentSection("");
                    } catch (error: any) {
                      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
                    }
                  }}
                >
                  Сохранить контент
                </Button>

                <div className="mt-6">
                  <Label>Существующий контент</Label>
                  <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                    {siteContentItems.map((item: any) => (
                      <div key={item.key} className="p-3 border rounded-lg flex justify-between items-center">
                        <div>
                          <div className="font-semibold">{item.key}</div>
                          <div className="text-sm text-muted-foreground">{item.value?.substring(0, 50)}...</div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setContentKey(item.key);
                              setContentValue(item.value);
                              setContentPage(item.page || "");
                              setContentSection(item.section || "");
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              if (!confirm("Удалить контент?")) return;
                              try {
                                const token = localStorage.getItem("accessToken");
                                const res = await fetch(`/api/admin/content/${item.key}`, {
                                  method: "DELETE",
                                  headers: { Authorization: `Bearer ${token}` },
                                });
                                if (!res.ok) throw new Error("Failed to delete");
                                toast({ title: "Успешно", description: "Контент удален" });
                                queryClient.invalidateQueries({ queryKey: ["/api/admin/content"] });
                              } catch (error: any) {
                                toast({ title: "Ошибка", description: error.message, variant: "destructive" });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
              </div>
            )}

            {/* Site Contacts Section */}
            {activeTab === "site-contacts" && (
              <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Контакты сайта</CardTitle>
                <CardDescription>Управление контактной информацией (телефон, email, соцсети)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <Label>Тип</Label>
                    <Select
                      value={newContact.type}
                      onValueChange={(value) => setNewContact({ ...newContact, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phone">Телефон</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="telegram">Telegram</SelectItem>
                        <SelectItem value="address">Адрес</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Значение</Label>
                    <Input
                      value={newContact.value}
                      onChange={(e) => setNewContact({ ...newContact, value: e.target.value })}
                      placeholder="+7 (999) 123-45-67"
                    />
                  </div>
                  <div>
                    <Label>Подпись</Label>
                    <Input
                      value={newContact.label}
                      onChange={(e) => setNewContact({ ...newContact, label: e.target.value })}
                      placeholder="Основной телефон"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={async () => {
                        if (!newContact.type || !newContact.value) {
                          toast({ title: "Ошибка", description: "Заполните тип и значение", variant: "destructive" });
                          return;
                        }
                        try {
                          const token = localStorage.getItem("accessToken");
                          const res = await fetch("/api/admin/site-contacts", {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${token}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify(newContact),
                          });
                          if (!res.ok) throw new Error("Failed to create contact");
                          toast({ title: "Успешно", description: "Контакт добавлен" });
                          queryClient.invalidateQueries({ queryKey: ["/api/admin/site-contacts"] });
                          setNewContact({ type: "", value: "", label: "", order: 0 });
                        } catch (error: any) {
                          toast({ title: "Ошибка", description: error.message, variant: "destructive" });
                        }
                      }}
                      className="w-full"
                    >
                      Добавить
                    </Button>
                  </div>
                </div>

                <div className="mt-6">
                  <Label>Существующие контакты</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Тип</TableHead>
                        <TableHead>Значение</TableHead>
                        <TableHead>Подпись</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {siteContactsItems.map((contact: any) => (
                        <TableRow key={contact.id}>
                          <TableCell>{contact.type}</TableCell>
                          <TableCell>{contact.value}</TableCell>
                          <TableCell>{contact.label || "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingContactId(contact.id)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={async () => {
                                  if (!confirm("Удалить контакт?")) return;
                                  try {
                                    const token = localStorage.getItem("accessToken");
                                    const res = await fetch(`/api/admin/site-contacts/${contact.id}`, {
                                      method: "DELETE",
                                      headers: { Authorization: `Bearer ${token}` },
                                    });
                                    if (!res.ok) throw new Error("Failed to delete");
                                    toast({ title: "Успешно", description: "Контакт удален" });
                                    queryClient.invalidateQueries({ queryKey: ["/api/admin/site-contacts"] });
                                  } catch (error: any) {
                                    toast({ title: "Ошибка", description: error.message, variant: "destructive" });
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
              </div>
            )}

            {/* Compliance Section */}
            {activeTab === "compliance" && (
              <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Настройки соответствия РКН</CardTitle>
                <CardDescription>Управление Cookie баннером и политиками</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={cookieSettings.enabled}
                    onCheckedChange={(checked) => setCookieSettings({ ...cookieSettings, enabled: checked as boolean })}
                  />
                  <Label>Включить Cookie баннер</Label>
                </div>
                <div>
                  <Label>Текст сообщения</Label>
                  <Textarea
                    value={cookieSettings.message || ""}
                    onChange={(e) => setCookieSettings({ ...cookieSettings, message: e.target.value })}
                    placeholder="Мы используем cookies для улучшения работы сайта"
                    rows={3}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Текст кнопки "Принять"</Label>
                    <Input
                      value={cookieSettings.acceptButtonText || ""}
                      onChange={(e) => setCookieSettings({ ...cookieSettings, acceptButtonText: e.target.value })}
                      placeholder="Принять"
                    />
                  </div>
                  <div>
                    <Label>Текст кнопки "Отклонить"</Label>
                    <Input
                      value={cookieSettings.declineButtonText || ""}
                      onChange={(e) => setCookieSettings({ ...cookieSettings, declineButtonText: e.target.value })}
                      placeholder="Отклонить"
                    />
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem("accessToken");
                      const res = await fetch("/api/admin/cookie-settings", {
                        method: "PUT",
                        headers: {
                          Authorization: `Bearer ${token}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify(cookieSettings),
                      });
                      if (!res.ok) throw new Error("Failed to save settings");
                      toast({ title: "Успешно", description: "Настройки сохранены" });
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/cookie-settings"] });
                    } catch (error: any) {
                      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
                    }
                  }}
                >
                  Сохранить настройки
                </Button>
              </CardContent>
            </Card>
              </div>
            )}

            {/* Privacy Section */}
            {activeTab === "privacy" && (
              <div className="mt-6">
                <Card>
              <CardHeader>
                <CardTitle>Редактирование Политики конфиденциальности</CardTitle>
                <CardDescription>
                  Заполните данные оператора персональных данных для соответствия требованиям 152-ФЗ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertDescription>
                    <strong>Важно:</strong> Согласно Федеральному закону № 152-ФЗ «О персональных данных», 
                    в Политике конфиденциальности должна быть указана полная информация об операторе. 
                    Заполните все обязательные поля перед запуском сайта в production.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="operator-name">Полное наименование оператора *</Label>
                    <Input
                      id="operator-name"
                      placeholder="ООО 'Название компании' или ИП Иванов Иван Иванович"
                      value={operatorName}
                      onChange={(e) => setOperatorName(e.target.value)}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Укажите полное наименование юридического лица или ФИО индивидуального предпринимателя
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="operator-inn">ИНН оператора *</Label>
                    <Input
                      id="operator-inn"
                      placeholder="1234567890 или 123456789012"
                      value={operatorInn}
                      onChange={(e) => setOperatorInn(e.target.value.replace(/\D/g, ''))}
                      className="mt-2"
                      maxLength={12}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      ИНН юридического лица (10 цифр) или ИП (12 цифр)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="operator-ogrn">ОГРН/ОГРНИП оператора *</Label>
                    <Input
                      id="operator-ogrn"
                      placeholder="1234567890123 или 123456789012345"
                      value={operatorOgrn}
                      onChange={(e) => setOperatorOgrn(e.target.value.replace(/\D/g, ''))}
                      className="mt-2"
                      maxLength={15}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      ОГРН юридического лица (13 цифр) или ОГРНИП индивидуального предпринимателя (15 цифр)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="responsible-person">Ответственный за организацию обработки персональных данных *</Label>
                    <Input
                      id="responsible-person"
                      placeholder="Иванов Иван Иванович"
                      value={responsiblePerson}
                      onChange={(e) => setResponsiblePerson(e.target.value)}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Укажите ФИО ответственного за организацию обработки персональных данных согласно требованиям 152-ФЗ
                    </p>
                  </div>

                  <div>
                    <Label>Адрес оператора</Label>
                    <Input
                      placeholder="Москва, ул. Примерная, д. 1"
                      value={contactAddress}
                      onChange={(e) => setContactAddress(e.target.value)}
                      className="mt-2"
                      disabled
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Адрес берется из раздела "Настройки → Контактные данные"
                    </p>
                  </div>

                  <div>
                    <Label>Email для связи</Label>
                    <Input
                      type="email"
                      placeholder="info@example.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="mt-2"
                      disabled
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Email берется из раздела "Настройки → Контактные данные"
                    </p>
                  </div>

                  <div>
                    <Label>Телефон для связи</Label>
                    <Input
                      type="tel"
                      placeholder="+7 (999) 123-45-67"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="mt-2"
                      disabled
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Телефон берется из раздела "Настройки → Контактные данные"
                    </p>
                  </div>

                  <Button
                    onClick={() => savePrivacyPolicySettings.mutate({ operatorName, operatorInn, operatorOgrn, responsiblePerson })}
                    disabled={savePrivacyPolicySettings.isPending || !operatorName || !operatorInn || !operatorOgrn || !responsiblePerson}
                    className="w-full"
                  >
                    {savePrivacyPolicySettings.isPending ? "Сохранение..." : "Сохранить данные оператора"}
                  </Button>

                  <Alert>
                    <AlertDescription>
                      <strong>Где отображаются эти данные:</strong> Данные оператора автоматически 
                      подставляются в раздел "1. Общие положения и идентификация оператора" на страницах{" "}
                      <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Политика конфиденциальности
                      </a>{" "}
                      и{" "}
                      <a href="/data-processing-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Политика обработки персональных данных
                      </a>.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
              </div>
            )}

            {/* Notifications Section */}
            {activeTab === "notifications" && (
              <div className="mt-6">
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
              </div>
            )}

            {/* Settings Section */}
            {activeTab === "settings" && (
              <div className="mt-6">
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
              </div>
            )}

            {/* Database Section */}
            {activeTab === "database" && (
              <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Управление базой данных</CardTitle>
                <CardDescription>Выгрузка и управление базой данных</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Выгрузка базы данных создаст полный SQL-дамп всех таблиц и данных. 
                    Файл можно использовать для восстановления базы данных.
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem("accessToken");
                      const response = await fetch("/api/admin/database/export", {
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      });
                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.message || "Failed to export database");
                      }
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `database-backup-${new Date().toISOString().split('T')[0]}.sql`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                      toast({
                        title: "Успешно",
                        description: "База данных успешно выгружена",
                      });
                    } catch (error: any) {
                      toast({
                        title: "Ошибка",
                        description: error.message || "Не удалось выгрузить базу данных",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Выгрузить базу данных (SQL)
                </Button>
              </CardContent>
            </Card>
              </div>
            )}
          </main>
        </div>
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
