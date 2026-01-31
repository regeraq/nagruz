import { useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Package, Users, BarChart3, FileText, Settings, Plus, Edit2, Trash2, 
  Save, X, Search, Shield, Tag, Mail, UserPlus, Image, Bell, Upload, Database, Download,
  FileText as FileTextIcon, Phone, Cookie, CheckCircle, TrendingUp, Activity,
  Crown, Zap, ChevronRight, Eye, Clock, AlertTriangle, Home, LogOut,
  DollarSign, ShoppingCart, UserCheck, Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
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
  const [enableFileUpload, setEnableFileUpload] = useState(true);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [orderSearchTerm, setOrderSearchTerm] = useState("");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  
  // Content management state
  const [contentKey, setContentKey] = useState("");
  const [contentValue, setContentValue] = useState("");
  const [contentPage, setContentPage] = useState("");
  const [contentSection, setContentSection] = useState("");
  
  // Site contacts state
  const [newContact, setNewContact] = useState({ type: "", value: "", label: "", order: 0 });
  
  // Cookie settings state
  const [cookieSettings, setCookieSettings] = useState({ enabled: true, message: "", acceptButtonText: "", declineButtonText: "" });
  const [selectedProductForImages, setSelectedProductForImages] = useState<string | null>(null);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<any>(null);
  const [newImageUrl, setNewImageUrl] = useState("");
  
  // Full product editing state
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [editingFullProduct, setEditingFullProduct] = useState<{
    id: string;
    name: string;
    description: string;
    price: string;
    currency: string;
    sku: string;
    specifications: string;
    stock: number;
    category: string;
    imageUrl: string;
    isActive: boolean;
  } | null>(null);
  const [editProductImages, setEditProductImages] = useState<string[]>([]);
  const [newEditImageUrl, setNewEditImageUrl] = useState("");
  const [uploadingEditImage, setUploadingEditImage] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    userId: "all",
    title: "",
    message: "",
    type: "info",
    link: "",
  });
  // State for create admin form
  const [newAdminRole, setNewAdminRole] = useState("admin");
  // State for editing site contact
  const [editingContact, setEditingContact] = useState<{ id: string; type: string; value: string; label: string; order: number } | null>(null);
  // State for viewing contact submission details
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [contactFiles, setContactFiles] = useState<any[]>([]);
  const [loadingContactDetails, setLoadingContactDetails] = useState(false);
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

  const allProducts = productsData?.products || productsData || [];
  
  // Filter products by search term
  const products = allProducts.filter((product: any) => {
    if (!productSearchTerm.trim()) return true;
    const search = productSearchTerm.toLowerCase();
    return (
      product.name?.toLowerCase().includes(search) ||
      product.sku?.toLowerCase().includes(search) ||
      product.id?.toLowerCase().includes(search) ||
      product.category?.toLowerCase().includes(search) ||
      product.description?.toLowerCase().includes(search)
    );
  });

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
  });
  
  // Update cookie settings when data is fetched
  useEffect(() => {
    if (cookieSettingsData?.success && cookieSettingsData?.settings) {
      setCookieSettings(cookieSettingsData.settings);
    }
  }, [cookieSettingsData]);

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

  // Fetch database size information
  const databaseSizeQuery = useQuery({
    queryKey: ["/api/admin/database/size"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/admin/database/size", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch database size information");
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to fetch database size");
      return data;
    },
    enabled: !!userData && ["admin", "superadmin"].includes((userData as any)?.role),
    refetchInterval: 60000, // Refresh every minute
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
      const enableFileUploadSetting = settings.find((s: any) => s.key === "enable_file_upload");

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
      if (enableFileUploadSetting) {
        setEnableFileUpload(enableFileUploadSetting.value === "true" || enableFileUploadSetting.value === true);
      } else {
        // По умолчанию включено, если настройка не установлена
        setEnableFileUpload(true);
      }
    }
  }, [settingsData]);

  // Create product mutation
  const createProduct = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/products", data);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate queries without await to make UI responsive immediately
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
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
      // Invalidate queries without await to make UI responsive immediately
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      setSelectedProducts(new Set());
      toast({ title: "Товары удалены" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось удалить товары", variant: "destructive" });
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
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось обновить роль", variant: "destructive" });
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
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось изменить статус пользователя", variant: "destructive" });
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
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось удалить пользователя", variant: "destructive" });
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
      setNewAdminRole("admin"); // Reset role to default
      toast({ title: "Администратор создан" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось создать администратора", variant: "destructive" });
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
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось обновить статус заказа", variant: "destructive" });
    },
  });

  // Delete all orders
  const deleteAllOrders = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/admin/orders/all");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ 
        title: "Успешно", 
        description: data.message || `Удалено заказов: ${data.deletedCount || 0}` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Ошибка", 
        description: error.message || "Не удалось удалить заказы", 
        variant: "destructive" 
      });
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
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось удалить заявку", variant: "destructive" });
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
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось создать промокод", variant: "destructive" });
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
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось удалить промокод", variant: "destructive" });
    },
  });

  // Toggle product active status
  const updateProductStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/products/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      // Invalidate queries without await to make UI responsive immediately
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Статус товара обновлен" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось обновить статус", variant: "destructive" });
    },
  });

  // Update product price and stock
  const updateProductPriceStock = useMutation({
    mutationFn: async ({ id, price, stock }: { id: string; price: string; stock: number }) => {
      const res = await apiRequest("PATCH", `/api/admin/products/${id}`, { price, stock });
      return res.json();
    },
    onSuccess: () => {
      // Invalidate queries without await to make UI responsive immediately
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setEditingProductId(null);
      toast({ title: "Товар обновлен" });
    },
    onError: () => {
      toast({ title: "Ошибка обновления товара", variant: "destructive" });
    },
  });

  // Toggle promo code active status
  const updatePromoCodeStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: number }) => {
      const res = await apiRequest("PATCH", `/api/admin/promocodes/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promocodes"] });
      toast({ title: "Статус промокода обновлен" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось обновить статус промокода", variant: "destructive" });
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

  // Save file upload setting
  const saveFileUploadSetting = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest("PUT", "/api/admin/settings/enable_file_upload", { 
        value: enabled ? "true" : "false", 
        type: "boolean",
        description: "Разрешить загрузку файлов в форме коммерческого предложения"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Настройка сохранена" });
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
      // Invalidate queries without await to make UI responsive immediately
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
      // Invalidate queries without await to make UI responsive immediately
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products", selectedProductForImages, "images"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Фотография удалена" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  // Full product update mutation
  const updateFullProduct = useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      description: string;
      price: string;
      currency: string;
      sku: string;
      specifications: string;
      stock: number;
      category: string;
      imageUrl: string;
      isActive: boolean;
      images: string[];
    }) => {
      const res = await apiRequest("PATCH", `/api/admin/products/${data.id}`, {
        name: data.name,
        description: data.description,
        price: data.price,
        currency: data.currency,
        sku: data.sku,
        specifications: data.specifications,
        stock: data.stock,
        category: data.category,
        imageUrl: data.imageUrl,
        isActive: data.isActive,
        images: JSON.stringify(data.images),
      });
      return res.json();
    },
    onSuccess: () => {
      // Invalidate queries without await to make UI responsive immediately
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setShowEditProduct(false);
      setEditingFullProduct(null);
      setEditProductImages([]);
      toast({ title: "Товар успешно обновлен" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  // Open product for full editing
  const openProductForEdit = (product: any) => {
    // Parse images from product
    let images: string[] = [];
    try {
      if (product.images) {
        if (typeof product.images === 'string') {
          images = JSON.parse(product.images);
        } else if (Array.isArray(product.images)) {
          images = product.images;
        }
      }
    } catch (e) {
      images = [];
    }
    
    setEditingFullProduct({
      id: product.id,
      name: product.name || "",
      description: product.description || "",
      price: String(product.price || "0"),
      currency: product.currency || "RUB",
      sku: product.sku || "",
      specifications: product.specifications || "",
      stock: product.stock || 0,
      category: product.category || "",
      imageUrl: product.imageUrl || "",
      isActive: product.isActive ?? true,
    });
    setEditProductImages(images);
    setShowEditProduct(true);
  };

  // Handle image upload for edit form
  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingEditImage(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setEditProductImages(prev => [...prev, base64]);
        setUploadingEditImage(false);
      };
      reader.onerror = () => {
        toast({ title: "Ошибка", description: "Не удалось загрузить файл", variant: "destructive" });
        setUploadingEditImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось загрузить изображение", variant: "destructive" });
      setUploadingEditImage(false);
    }
  };

  // Add image by URL for edit form
  const addEditImageByUrl = () => {
    if (newEditImageUrl.trim()) {
      setEditProductImages(prev => [...prev, newEditImageUrl.trim()]);
      setNewEditImageUrl("");
    }
  };

  // Remove image from edit form
  const removeEditImage = (index: number) => {
    setEditProductImages(prev => prev.filter((_, i) => i !== index));
  };

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
      setNotificationForm({ userId: "all", title: "", message: "", type: "info", link: "" });
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

  // Calculate stats
  const pendingOrders = useMemo(() => allOrders.filter((o: any) => o.paymentStatus === 'pending').length, [allOrders]);
  const newUsersThisWeek = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return allUsers.filter((u: any) => new Date(u.createdAt) > weekAgo).length;
  }, [allUsers]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50/20 to-orange-50/10 dark:from-slate-950 dark:via-red-950/10 dark:to-orange-950/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Доступ запрещён</h2>
            <p className="text-muted-foreground mb-6">У вас нет прав для доступа к админ-панели</p>
            <Button 
              onClick={() => setLocation("/")} 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Вернуться на главную
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const admins = allUsers.filter((u: any) => ["admin", "superadmin", "moderator"].includes(u.role));

  const navItems = [
    { id: "analytics", label: "Аналитика", icon: BarChart3, color: "from-blue-500 to-indigo-500" },
    { id: "products", label: "Товары", icon: Package, color: "from-violet-500 to-purple-500", badge: allProducts.length },
    { id: "users", label: "Пользователи", icon: Users, color: "from-cyan-500 to-blue-500", badge: allUsers.length },
    { id: "admins", label: "Администраторы", icon: Crown, color: "from-amber-500 to-orange-500", badge: admins.length },
    { id: "orders", label: "Заказы", icon: ShoppingCart, color: "from-emerald-500 to-teal-500", badge: allOrders.length },
    { id: "contacts", label: "Заявки", icon: Mail, color: "from-pink-500 to-rose-500", badge: contactSubmissions.length },
    { id: "promocodes", label: "Промокоды", icon: Tag, color: "from-lime-500 to-green-500" },
    { id: "content", label: "Контент", icon: FileTextIcon, color: "from-slate-500 to-gray-600" },
    { id: "site-contacts", label: "Контакты сайта", icon: Phone, color: "from-teal-500 to-cyan-500" },
    { id: "compliance", label: "Compliance", icon: Cookie, color: "from-orange-500 to-amber-500" },
    { id: "privacy", label: "Политика", icon: Shield, color: "from-red-500 to-rose-500" },
    { id: "notifications", label: "Уведомления", icon: Bell, color: "from-yellow-500 to-amber-500" },
    { id: "settings", label: "Настройки", icon: Settings, color: "from-gray-500 to-slate-600" },
    { id: "database", label: "База данных", icon: Database, color: "from-indigo-500 to-violet-500" },
  ];

  const getUserInitials = () => {
    if (userData?.firstName && userData?.lastName) {
      return `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase();
    }
    return userData?.email?.[0]?.toUpperCase() || 'A';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-indigo-950/10">
      {/* Hero Admin Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        {/* Animated background elements */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="relative container mx-auto px-4 py-6 pt-20">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              {/* Admin Info */}
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-full blur opacity-40 group-hover:opacity-60 transition duration-500" />
                  <Avatar className="relative w-16 h-16 lg:w-20 lg:h-20 border-4 border-white/20 shadow-2xl">
                    <AvatarImage src={userData?.avatar || undefined} className="object-cover" />
                    <AvatarFallback className="text-xl lg:text-2xl font-bold bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                    <Crown className="w-3 h-3 text-white" />
                  </div>
                </div>
                
                <div className="text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl lg:text-3xl font-bold">Панель управления</h1>
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 border-0 text-white text-xs">
                      {userData?.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                    </Badge>
                  </div>
                  <p className="text-white/60 text-sm">
                    {userData?.email}
                  </p>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                  <Package className="w-4 h-4 text-violet-400" />
                  <span className="text-white/80 text-sm">{allProducts.length} товаров</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span className="text-white/80 text-sm">{allUsers.length} пользователей</span>
                </div>
                {pendingOrders > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 backdrop-blur-sm border border-amber-500/30">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-300 text-sm">{pendingOrders} ожидают</span>
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setLocation("/")}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                >
                  <Home className="w-4 h-4 mr-2" />
                  На сайт
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLocation("/profile")}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Профиль
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path 
              d="M0 60V30C240 50 480 10 720 30C960 50 1200 10 1440 30V60H0Z" 
              className="fill-slate-50 dark:fill-slate-950"
            />
          </svg>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-4 relative z-10 pb-12">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Modern Sidebar Navigation */}
            <aside className="w-full lg:w-72 flex-shrink-0">
              <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-20 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Навигация
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <nav className="space-y-1">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group ${
                            isActive
                              ? `bg-gradient-to-r ${item.color} text-white shadow-lg`
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white/20' : 'bg-muted/50 group-hover:bg-muted'}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span>{item.label}</span>
                          </div>
                          {item.badge !== undefined && item.badge > 0 && (
                            <Badge 
                              variant={isActive ? "outline" : "secondary"} 
                              className={`text-xs ${isActive ? 'bg-white/20 border-white/30 text-white' : ''}`}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </CardContent>
                
                {/* System Status */}
                <div className="p-4 border-t border-border/50">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50">
                    <div className="relative">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-50" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Система работает</p>
                      <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70">Все сервисы активны</p>
                    </div>
                  </div>
                </div>
              </Card>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 space-y-6">

            {/* Analytics Section */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                {/* Welcome Card */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-900/80 dark:to-slate-900/60 backdrop-blur-xl overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
                  <CardContent className="p-6 relative">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold mb-1">
                          Добро пожаловать, {userData?.firstName || 'Администратор'}! 👋
                        </h2>
                        <p className="text-muted-foreground">
                          Сегодня {format(new Date(), "d MMMM yyyy", { locale: ru })} • Обзор вашей статистики
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => setShowNotificationDialog(true)}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                          <Bell className="w-4 h-4 mr-2" />
                          Уведомление
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
            
                {/* Modern Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Products Card */}
                  <Card className="group relative overflow-hidden border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl hover:shadow-2xl transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/20 to-transparent rounded-bl-[100px]" />
                    <CardContent className="p-6 relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg group-hover:scale-110 transition-transform">
                          <Package className="w-6 h-6 text-white" />
                        </div>
                        <Badge variant="outline" className="border-violet-300 text-violet-600 dark:text-violet-400">
                          <Activity className="w-3 h-3 mr-1" />
                          Live
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Товаров</p>
                      <p className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                        {allProducts.length}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {allProducts.filter((p: any) => p.isActive).length} активных
                      </p>
                    </CardContent>
                  </Card>

                  {/* Users Card */}
                  <Card className="group relative overflow-hidden border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl hover:shadow-2xl transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-bl-[100px]" />
                    <CardContent className="p-6 relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg group-hover:scale-110 transition-transform">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        {newUsersThisWeek > 0 && (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            +{newUsersThisWeek}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Пользователей</p>
                      <p className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                        {allUsers.length}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {admins.length} администраторов
                      </p>
                    </CardContent>
                  </Card>

                  {/* Orders Card */}
                  <Card className="group relative overflow-hidden border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl hover:shadow-2xl transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/20 to-transparent rounded-bl-[100px]" />
                    <CardContent className="p-6 relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg group-hover:scale-110 transition-transform">
                          <ShoppingCart className="w-6 h-6 text-white" />
                        </div>
                        {pendingOrders > 0 && (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 animate-pulse">
                            <Clock className="w-3 h-3 mr-1" />
                            {pendingOrders}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Заказов</p>
                      <p className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                        {allOrders.length}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {allOrders.filter((o: any) => o.paymentStatus === 'paid' || o.paymentStatus === 'delivered').length} оплаченных
                      </p>
                    </CardContent>
                  </Card>

                  {/* Revenue Card */}
                  <Card className="group relative overflow-hidden border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl hover:shadow-2xl transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-bl-[100px]" />
                    <CardContent className="p-6 relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg group-hover:scale-110 transition-transform">
                          <DollarSign className="w-6 h-6 text-white" />
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                          RUB
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Выручка</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        {Number(totalRevenue).toLocaleString('ru-RU')} ₽
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Всего за период
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* User Activity Chart - Modern Design */}
                {userActivityByDay && userActivityByDay.length > 0 && (
                  <Card className="border-0 shadow-xl overflow-hidden">
                    <div className="relative rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-800/95 border border-white/10">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500"></div>
                <div className="absolute top-20 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
                
                {/* Header */}
                <div className="relative px-6 sm:px-8 pt-8 pb-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-white/10">
                          <BarChart3 className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                            Активность пользователей
                          </h2>
                          <p className="text-sm text-slate-400 mt-0.5">
                            Динамика за последние 30 дней
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Legend */}
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                        <div className="relative">
                          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
                          <div className="absolute inset-0 w-3 h-3 rounded-full bg-blue-500 animate-ping opacity-20"></div>
                        </div>
                        <span className="text-sm font-medium text-slate-300">Регистрации</span>
                        <span className="text-lg font-bold text-blue-400">
                          {userActivityByDay.reduce((sum: number, day: any) => sum + (day.registrations || 0), 0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                        <div className="relative">
                          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600"></div>
                          <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-20"></div>
                        </div>
                        <span className="text-sm font-medium text-slate-300">Входы</span>
                        <span className="text-lg font-bold text-emerald-400">
                          {userActivityByDay.reduce((sum: number, day: any) => sum + (day.logins || 0), 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart */}
                <div className="relative px-4 sm:px-6 pb-8">
                  <ChartContainer
                    config={{
                      registrations: { 
                        label: "Регистрации", 
                        color: "#3B82F6"
                      },
                      logins: { 
                        label: "Входы", 
                        color: "#10B981"
                      },
                    }}
                    className="min-h-[350px] sm:min-h-[400px] w-full"
                  >
                    <AreaChart 
                      data={userActivityByDay}
                      margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="gradientRegistrations" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.5}/>
                          <stop offset="50%" stopColor="#3B82F6" stopOpacity={0.2}/>
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="gradientLogins" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity={0.5}/>
                          <stop offset="50%" stopColor="#10B981" stopOpacity={0.2}/>
                          <stop offset="100%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                        <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                        <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        vertical={false}
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth={1}
                      />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={16}
                        tickFormatter={(value) => format(new Date(value), "dd.MM", { locale: ru })}
                        style={{ fontSize: '12px', fontWeight: 500, fill: 'rgba(148, 163, 184, 0.8)' }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        tickMargin={12}
                        style={{ fontSize: '12px', fontWeight: 500, fill: 'rgba(148, 163, 184, 0.8)' }}
                        width={45}
                      />
                      <ChartTooltip 
                        cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 2 }}
                        content={<ChartTooltipContent 
                          className="bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-xl px-4 py-3"
                          labelFormatter={(value) => format(new Date(value), "dd MMMM yyyy", { locale: ru })}
                        />} 
                      />
                      <Area
                        dataKey="registrations"
                        type="monotone"
                        fill="url(#gradientRegistrations)"
                        fillOpacity={1}
                        stroke="#3B82F6"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ 
                          r: 6, 
                          strokeWidth: 3, 
                          fill: "#3B82F6", 
                          stroke: "#1E3A5F",
                          filter: "url(#glowBlue)"
                        }}
                        animationDuration={1200}
                        animationBegin={0}
                      />
                      <Area
                        dataKey="logins"
                        type="monotone"
                        fill="url(#gradientLogins)"
                        fillOpacity={1}
                        stroke="#10B981"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ 
                          r: 6, 
                          strokeWidth: 3, 
                          fill: "#10B981", 
                          stroke: "#064E3B",
                          filter: "url(#glowGreen)"
                        }}
                        animationDuration={1200}
                        animationBegin={200}
                      />
                    </AreaChart>
                  </ChartContainer>
                </div>

                {/* Bottom Stats */}
                <div className="relative px-6 sm:px-8 pb-8">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Сегодня</p>
                      <p className="text-2xl font-bold text-white">
                        {userActivityByDay[userActivityByDay.length - 1]?.registrations || 0}
                      </p>
                      <p className="text-xs text-blue-400 mt-1">регистраций</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Сегодня</p>
                      <p className="text-2xl font-bold text-white">
                        {userActivityByDay[userActivityByDay.length - 1]?.logins || 0}
                      </p>
                      <p className="text-xs text-emerald-400 mt-1">входов</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Среднее/день</p>
                      <p className="text-2xl font-bold text-white">
                        {Math.round(userActivityByDay.reduce((sum: number, day: any) => sum + (day.registrations || 0), 0) / userActivityByDay.length)}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">регистраций</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Среднее/день</p>
                      <p className="text-2xl font-bold text-white">
                        {Math.round(userActivityByDay.reduce((sum: number, day: any) => sum + (day.logins || 0), 0) / userActivityByDay.length)}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">входов</p>
                    </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Recent Orders - Modern Design */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
              
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg">
                      <ShoppingCart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Последние заказы</CardTitle>
                      <CardDescription>Показаны 5 последних</CardDescription>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setActiveTab("orders")}
                    className="bg-white/50 dark:bg-slate-800/50"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Все заказы
                  </Button>
                </div>
              </CardHeader>
              <CardContent>

                {allOrders.length > 0 ? (
                  <div className="space-y-3">
                    {allOrders.slice(0, 5).map((order: any, index: number) => (
                      <div 
                        key={order.id}
                        className="group relative flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-muted/30 to-transparent border border-border/50 hover:border-primary/30 hover:bg-muted/50 transition-all duration-300"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-bold text-primary border border-primary/20">
                          #{index + 1}
                        </div>
                        
                        <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Клиент</p>
                            <p className="text-sm font-medium truncate">{order.customerName || order.customerEmail || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Сумма</p>
                            <p className="text-sm font-bold text-emerald-500">{Number(order.finalAmount).toLocaleString('ru-RU')} ₽</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Статус</p>
                            <Badge 
                              variant={
                                order.paymentStatus === 'paid' || order.paymentStatus === 'delivered' 
                                  ? 'default' 
                                  : order.paymentStatus === 'pending' 
                                    ? 'secondary' 
                                    : order.paymentStatus === 'cancelled'
                                      ? 'destructive'
                                      : 'outline'
                              }
                              className="text-[10px] mt-0.5"
                            >
                              {order.paymentStatus === 'pending' && 'Ожидание'}
                              {order.paymentStatus === 'paid' && 'Оплачен'}
                              {order.paymentStatus === 'processing' && 'В обработке'}
                              {order.paymentStatus === 'shipped' && 'Отправлен'}
                              {order.paymentStatus === 'delivered' && 'Доставлен'}
                              {order.paymentStatus === 'cancelled' && 'Отменён'}
                              {!['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'].includes(order.paymentStatus) && order.paymentStatus}
                            </Badge>
                          </div>
                          <div className="hidden sm:block">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Дата</p>
                            <p className="text-sm text-muted-foreground">{format(new Date(order.createdAt), "dd.MM.yyyy", { locale: ru })}</p>
                          </div>
                        </div>

                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedOrderForDetails(order)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Заказов пока нет</p>
                  </div>
                )}
              </CardContent>
            </Card>
              </div>
            )}

            {/* Products Section */}
            {activeTab === "products" && (
              <div className="space-y-6">
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500" />
                  <CardHeader>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 shadow-lg">
                            <Package className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-xl">Управление товарами</CardTitle>
                            <CardDescription>
                              Всего: {allProducts.length} | Показано: {products.length} | Активных: {allProducts.filter((p: any) => p.isActive).length}
                            </CardDescription>
                          </div>
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
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Создать новый товар</DialogTitle>
                          <DialogDescription>
                            Заполните все обязательные поля для создания нового товара.
                          </DialogDescription>
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
                              category: formData.get("category") || "",
                              imageUrl: formData.get("imageUrl") || "",
                              isActive: true,
                              currency: formData.get("currency") || "RUB",
                            });
                          }}
                        >
                          <div className="space-y-6">
                            {/* Basic Info */}
                            <div className="space-y-4">
                              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Основная информация</h3>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>ID товара *</Label>
                                  <Input name="id" required placeholder="Уникальный идентификатор (напр. nu-100)" />
                                  <p className="text-xs text-muted-foreground mt-1">Латиница, цифры, дефисы</p>
                                </div>
                                <div>
                                  <Label>Артикул (SKU) *</Label>
                                  <Input name="sku" required placeholder="НУ-100-2024" />
                                </div>
                              </div>
                              <div>
                                <Label>Название товара *</Label>
                                <Input name="name" required placeholder="Например: Нагрузочное устройство НУ-100" />
                              </div>
                              <div>
                                <Label>Категория</Label>
                                <Input name="category" placeholder="Нагрузочные устройства" />
                              </div>
                              <div>
                                <Label>Описание *</Label>
                                <Textarea name="description" required rows={3} placeholder="Подробное описание товара..." />
                              </div>
                            </div>
                            
                            {/* Pricing */}
                            <div className="space-y-4">
                              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Цена и наличие</h3>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <Label>Цена *</Label>
                                  <Input name="price" type="number" step="0.01" min="0" required placeholder="0.00" />
                                </div>
                                <div>
                                  <Label>Валюта</Label>
                                  <select name="currency" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                    <option value="RUB">₽ RUB</option>
                                    <option value="USD">$ USD</option>
                                    <option value="EUR">€ EUR</option>
                                  </select>
                                </div>
                                <div>
                                  <Label>Количество *</Label>
                                  <Input name="stock" type="number" min="0" defaultValue="0" required />
                                </div>
                              </div>
                            </div>
                            
                            {/* Specifications */}
                            <div className="space-y-4">
                              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Характеристики</h3>
                              <div>
                                <Label>Технические характеристики *</Label>
                                <Textarea 
                                  name="specifications" 
                                  required 
                                  rows={5}
                                  placeholder="Мощность: 100 кВт&#10;Напряжение: 220-400 В&#10;Ступени: 20&#10;..."
                                  className="font-mono text-sm"
                                />
                                <p className="text-xs text-muted-foreground mt-1">Каждая характеристика с новой строки</p>
                              </div>
                            </div>
                            
                            {/* Image */}
                            <div className="space-y-4">
                              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Изображение</h3>
                              <div>
                                <Label>URL основного изображения</Label>
                                <Input name="imageUrl" placeholder="https://example.com/image.jpg" />
                                <p className="text-xs text-muted-foreground mt-1">Дополнительные изображения можно добавить после создания товара</p>
                              </div>
                            </div>
                          </div>
                          <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setShowCreateProduct(false)}>
                              Отмена
                            </Button>
                            <Button type="submit" disabled={createProduct.isPending}>
                              <Plus className="h-4 w-4 mr-2" />
                              {createProduct.isPending ? "Создание..." : "Создать товар"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                      </div>
                      {/* Search bar */}
                      <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Поиск по названию, артикулу, категории..."
                          value={productSearchTerm}
                          onChange={(e) => setProductSearchTerm(e.target.value)}
                          className="pl-10 w-full sm:w-80 bg-muted/50 border-0"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
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
                      <TableHead className="text-xs sm:text-sm">Товар</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Артикул</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Категория</TableHead>
                      <TableHead className="text-xs sm:text-sm">Цена</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden md:table-cell">Склад</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden md:table-cell">Статус</TableHead>
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
                        <TableCell className="font-medium text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            {product.imageUrl && (
                              <img 
                                src={product.imageUrl} 
                                alt={product.name} 
                                className="w-8 h-8 object-cover rounded hidden md:block"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            )}
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-xs text-muted-foreground hidden md:block">ID: {product.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{product.sku}</TableCell>
                        <TableCell className="text-xs sm:text-sm hidden lg:table-cell">
                          {product.category ? (
                            <Badge variant="outline" className="text-xs">{product.category}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
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
                                  const priceVal = parseFloat(editPrice);
                                  const stockVal = parseInt(editStock);
                                  if (isNaN(priceVal) || priceVal < 0) {
                                    toast({ title: "Ошибка", description: "Введите корректную цену", variant: "destructive" });
                                    return;
                                  }
                                  if (isNaN(stockVal) || stockVal < 0) {
                                    toast({ title: "Ошибка", description: "Введите корректное количество", variant: "destructive" });
                                    return;
                                  }
                                  updateProductPriceStock.mutate({
                                    id: product.id,
                                    price: editPrice,
                                    stock: stockVal,
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
                              {Number(product.price).toLocaleString('ru-RU')} {product.currency === 'USD' ? '$' : product.currency === 'EUR' ? '€' : '₽'}
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
                              <Badge 
                                variant={product.stock > 5 ? "default" : product.stock > 0 ? "secondary" : "destructive"}
                                className="text-xs"
                              >
                                {product.stock} шт.
                              </Badge>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <Badge variant={product.isActive ? "default" : "secondary"} className="text-xs">
                              {product.isActive ? "Активен" : "Скрыт"}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateProductStatus.mutate({ id: product.id, isActive: !product.isActive })}
                              disabled={updateProductStatus.isPending}
                              data-testid={`button-toggle-product-${product.id}`}
                              className="h-6 w-6 p-0"
                            >
                              {product.isActive ? <X className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openProductForEdit(product)}
                              className="text-xs h-7 sm:h-8"
                            >
                              <Edit2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              <span className="hidden sm:inline">Редактировать</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedProductForImages(product.id)}
                              className="text-xs h-7 sm:h-8"
                            >
                              <Image className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              <span className="hidden sm:inline">Фото</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Full Product Edit Dialog */}
            <Dialog open={showEditProduct} onOpenChange={(open) => {
              if (!open) {
                setShowEditProduct(false);
                setEditingFullProduct(null);
                setEditProductImages([]);
                setNewEditImageUrl("");
              }
            }}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl">Редактирование товара</DialogTitle>
                  <DialogDescription>
                    Измените информацию о товаре. Все поля обязательны, кроме категории и URL изображения.
                  </DialogDescription>
                </DialogHeader>
                {editingFullProduct && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateFullProduct.mutate({
                        ...editingFullProduct,
                        images: editProductImages,
                      });
                    }}
                    className="space-y-6"
                  >
                    {/* Basic Info Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold border-b pb-2">Основная информация</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit-id">ID товара</Label>
                          <Input
                            id="edit-id"
                            value={editingFullProduct.id}
                            disabled
                            className="bg-muted"
                          />
                          <p className="text-xs text-muted-foreground mt-1">ID нельзя изменить</p>
                        </div>
                        <div>
                          <Label htmlFor="edit-sku">Артикул (SKU) *</Label>
                          <Input
                            id="edit-sku"
                            value={editingFullProduct.sku}
                            onChange={(e) => setEditingFullProduct({ ...editingFullProduct, sku: e.target.value })}
                            required
                            placeholder="Например: NU-100-2024"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="edit-name">Название товара *</Label>
                        <Input
                          id="edit-name"
                          value={editingFullProduct.name}
                          onChange={(e) => setEditingFullProduct({ ...editingFullProduct, name: e.target.value })}
                          required
                          placeholder="Введите название товара"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="edit-description">Описание товара *</Label>
                        <Textarea
                          id="edit-description"
                          value={editingFullProduct.description}
                          onChange={(e) => setEditingFullProduct({ ...editingFullProduct, description: e.target.value })}
                          required
                          rows={4}
                          placeholder="Подробное описание товара..."
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="edit-category">Категория</Label>
                        <Input
                          id="edit-category"
                          value={editingFullProduct.category}
                          onChange={(e) => setEditingFullProduct({ ...editingFullProduct, category: e.target.value })}
                          placeholder="Например: Нагрузочные устройства"
                        />
                      </div>
                    </div>
                    
                    {/* Pricing Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold border-b pb-2">Цена и наличие</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="edit-price">Цена *</Label>
                          <Input
                            id="edit-price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={editingFullProduct.price}
                            onChange={(e) => setEditingFullProduct({ ...editingFullProduct, price: e.target.value })}
                            required
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-currency">Валюта</Label>
                          <Select
                            value={editingFullProduct.currency}
                            onValueChange={(value) => setEditingFullProduct({ ...editingFullProduct, currency: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите валюту" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="RUB">₽ Рубли (RUB)</SelectItem>
                              <SelectItem value="USD">$ Доллары (USD)</SelectItem>
                              <SelectItem value="EUR">€ Евро (EUR)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="edit-stock">Количество на складе *</Label>
                          <Input
                            id="edit-stock"
                            type="number"
                            min="0"
                            value={editingFullProduct.stock}
                            onChange={(e) => setEditingFullProduct({ ...editingFullProduct, stock: parseInt(e.target.value) || 0 })}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Checkbox
                          id="edit-isActive"
                          checked={editingFullProduct.isActive}
                          onCheckedChange={(checked) => setEditingFullProduct({ ...editingFullProduct, isActive: !!checked })}
                        />
                        <div>
                          <Label htmlFor="edit-isActive" className="cursor-pointer">Товар активен</Label>
                          <p className="text-xs text-muted-foreground">Если отключено, товар не будет отображаться на сайте</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Specifications Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold border-b pb-2">Технические характеристики</h3>
                      
                      <div>
                        <Label htmlFor="edit-specifications">Характеристики *</Label>
                        <Textarea
                          id="edit-specifications"
                          value={editingFullProduct.specifications}
                          onChange={(e) => setEditingFullProduct({ ...editingFullProduct, specifications: e.target.value })}
                          required
                          rows={6}
                          placeholder="Введите характеристики товара. Рекомендуется формат:&#10;Мощность: 100 кВт&#10;Напряжение: 220-400 В&#10;и т.д."
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Каждая характеристика с новой строки</p>
                      </div>
                    </div>
                    
                    {/* Images Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold border-b pb-2">Изображения товара</h3>
                      
                      <div>
                        <Label htmlFor="edit-imageUrl">Основной URL изображения</Label>
                        <Input
                          id="edit-imageUrl"
                          value={editingFullProduct.imageUrl}
                          onChange={(e) => setEditingFullProduct({ ...editingFullProduct, imageUrl: e.target.value })}
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                      
                      {/* Gallery Images */}
                      <div>
                        <Label>Галерея изображений ({editProductImages.length})</Label>
                        
                        {editProductImages.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-3">
                            {editProductImages.map((img, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={img.startsWith('data:') ? img : img}
                                  alt={`Изображение ${index + 1}`}
                                  className="w-full h-24 object-cover rounded-lg border"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/favicon.png';
                                  }}
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => removeEditImage(index)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                                  {index + 1}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Add new images */}
                        <div className="mt-4 space-y-3">
                          <div className="flex gap-2">
                            <Input
                              value={newEditImageUrl}
                              onChange={(e) => setNewEditImageUrl(e.target.value)}
                              placeholder="URL изображения"
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={addEditImageByUrl}
                              disabled={!newEditImageUrl.trim()}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Добавить
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">или</span>
                          </div>
                          
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleEditImageUpload}
                              className="hidden"
                              id="edit-image-upload"
                              disabled={uploadingEditImage}
                            />
                            <label htmlFor="edit-image-upload">
                              <Button
                                type="button"
                                variant="outline"
                                className="cursor-pointer"
                                disabled={uploadingEditImage}
                                asChild
                              >
                                <span>
                                  <Upload className="h-4 w-4 mr-2" />
                                  {uploadingEditImage ? "Загрузка..." : "Загрузить файл"}
                                </span>
                              </Button>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowEditProduct(false);
                          setEditingFullProduct(null);
                          setEditProductImages([]);
                        }}
                      >
                        Отмена
                      </Button>
                      <Button type="submit" disabled={updateFullProduct.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        {updateFullProduct.isPending ? "Сохранение..." : "Сохранить изменения"}
                      </Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
              </div>
            )}

            {/* Users Section */}
            {activeTab === "users" && (
              <div className="space-y-6">
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">Управление пользователями</CardTitle>
                          <CardDescription>
                            Всего: {allUsers.length} | Показано: {users.length}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Поиск по email, имени..."
                          className="pl-10 w-full sm:w-64 bg-muted/50 border-0"
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
              <div className="space-y-6">
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
                          <Crown className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">Управление администраторами</CardTitle>
                          <CardDescription>Создание и управление административными аккаунтами</CardDescription>
                        </div>
                      </div>
                      {isSuperAdmin && (
                        <Dialog open={showCreateAdmin} onOpenChange={setShowCreateAdmin}>
                          <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
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
                              role: newAdminRole,
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
                              <Select value={newAdminRole} onValueChange={setNewAdminRole}>
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
              <div className="space-y-6">
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg">
                          <ShoppingCart className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">Управление заказами</CardTitle>
                          <CardDescription>
                            Всего: {allOrders.length} | Показано: {orders.length} | Ожидают: {pendingOrders}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 flex-1 sm:flex-none">
                        <div className="relative flex-1 sm:flex-none">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Поиск по ID, клиенту..."
                            className="pl-10 w-full sm:w-64 bg-muted/50 border-0"
                            value={orderSearchTerm}
                            onChange={(e) => setOrderSearchTerm(e.target.value)}
                          />
                        </div>
                        {allOrders.length > 0 && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="destructive" 
                                className="whitespace-nowrap"
                                disabled={deleteAllOrders.isPending}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {deleteAllOrders.isPending ? "Удаление..." : "Удалить все заказы"}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Вы уверены, что хотите удалить все заказы? Это действие нельзя отменить.
                                  <br />
                                  <span className="font-semibold text-destructive mt-2 block">
                                    Будет удалено заказов: {allOrders.length}
                                  </span>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteAllOrders.mutate()}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  disabled={deleteAllOrders.isPending}
                                >
                                  {deleteAllOrders.isPending ? "Удаление..." : "Удалить все"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
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
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedOrderForDetails(order)}
                          >
                            Детали
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Order Details Dialog */}
            <Dialog open={!!selectedOrderForDetails} onOpenChange={(open) => !open && setSelectedOrderForDetails(null)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Детали заказа</DialogTitle>
                  <DialogDescription>
                    ID: {selectedOrderForDetails?.id}
                  </DialogDescription>
                </DialogHeader>
                {selectedOrderForDetails && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Информация о клиенте</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground mb-1 block">Клиент</Label>
                          <p className="font-medium">{selectedOrderForDetails.customerName || "—"}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground mb-1 block">Email</Label>
                          <p className="font-medium break-words" style={{ wordBreak: 'break-word' }}>{selectedOrderForDetails.customerEmail || "—"}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground mb-1 block">Телефон</Label>
                          <p className="font-medium">{selectedOrderForDetails.customerPhone || "—"}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground mb-1 block">Товар</Label>
                          <p className="font-medium">{selectedOrderForDetails.productId}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground mb-1 block">Количество</Label>
                          <p className="font-medium">{selectedOrderForDetails.quantity} шт.</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground mb-1 block">Способ оплаты</Label>
                          <p className="font-medium">{selectedOrderForDetails.paymentMethod || "—"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <h3 className="text-lg font-semibold mb-3">Финансовая информация</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground mb-1 block">Сумма заказа</Label>
                          <p className="font-medium">{selectedOrderForDetails.totalAmount} ₽</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground mb-1 block">Скидка</Label>
                          <p className="font-medium text-destructive">{selectedOrderForDetails.discountAmount || 0} ₽</p>
                        </div>
                        {selectedOrderForDetails.promoCode && (
                          <div>
                            <Label className="text-sm text-muted-foreground mb-1 block">Промокод</Label>
                            <Badge variant="outline" className="font-medium">{selectedOrderForDetails.promoCode}</Badge>
                          </div>
                        )}
                        <div>
                          <Label className="text-sm text-muted-foreground mb-1 block">Итого к оплате</Label>
                          <p className="font-bold text-lg text-primary">{selectedOrderForDetails.finalAmount} ₽</p>
                        </div>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground mb-2 block">Статус</Label>
                          <Badge variant={selectedOrderForDetails.paymentStatus === 'paid' || selectedOrderForDetails.paymentStatus === 'delivered' ? 'default' : 'secondary'}>
                            {selectedOrderForDetails.paymentStatus}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-muted-foreground mb-2 block">Дата создания</Label>
                          <p className="font-medium">{format(new Date(selectedOrderForDetails.createdAt), "dd.MM.yyyy HH:mm", { locale: ru })}</p>
                        </div>
                      </div>
                    </div>
                    {selectedOrderForDetails.paymentDetails && (
                      <div className="border-t pt-4">
                        <Label className="text-muted-foreground mb-2 block">Детали оплаты</Label>
                        <div className="p-3 bg-muted rounded-md border border-border/50">
                          {(() => {
                            try {
                              const details = typeof selectedOrderForDetails.paymentDetails === 'string' 
                                ? JSON.parse(selectedOrderForDetails.paymentDetails) 
                                : selectedOrderForDetails.paymentDetails;
                              
                              // Если это объект, отображаем как список ключ-значение
                              if (typeof details === 'object' && details !== null) {
                                const entries = Object.entries(details);
                                if (entries.length > 0) {
                                  return (
                                    <div className="space-y-2">
                                      {entries.map(([key, value]) => (
                                        <div key={key} className="flex items-start gap-2">
                                          <span className="text-sm font-medium text-muted-foreground min-w-[120px]">
                                            {key === 'method' ? 'Способ оплаты' : 
                                             key === 'card' ? 'Карта' :
                                             key === 'transaction_id' ? 'ID транзакции' :
                                             key === 'status' ? 'Статус' :
                                             key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}:
                                          </span>
                                          <span className="text-sm font-medium flex-1">
                                            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                              }
                              
                              // Если не объект или пустой, показываем как есть
                              return (
                                <p className="text-sm break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                  {typeof details === 'string' ? details : JSON.stringify(details, null, 2)}
                                </p>
                              );
                            } catch {
                              return (
                                <p className="text-sm break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                  {selectedOrderForDetails.paymentDetails}
                                </p>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedOrderForDetails(null)}>
                    Закрыть
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
              </div>
            )}

            {/* Contacts Section */}
            {activeTab === "contacts" && (
              <div className="space-y-6">
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-rose-500 to-red-500" />
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Заявки с сайта</CardTitle>
                        <CardDescription>Просмотр и управление контактными заявками ({contactSubmissions.length})</CardDescription>
                      </div>
                    </div>
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
                      <TableHead>Файлы</TableHead>
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
                        <TableCell>
                          {contact.fileCount > 0 ? (
                            <Badge variant="secondary">{contact.fileCount} файл(ов)</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Нет файлов</span>
                          )}
                        </TableCell>
                        <TableCell>{format(new Date(contact.createdAt), "dd.MM.yyyy", { locale: ru })}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                setLoadingContactDetails(true);
                                try {
                                  const token = localStorage.getItem("accessToken");
                                  const res = await fetch(`/api/admin/contacts/${contact.id}`, {
                                    headers: { Authorization: `Bearer ${token}` },
                                  });
                                  if (!res.ok) throw new Error("Failed to fetch contact details");
                                  const data = await res.json();
                                  setSelectedContact(data.proposal);
                                  setContactFiles(data.files || []);
                                } catch (error) {
                                  toast({ title: "Ошибка", description: "Не удалось загрузить детали заявки", variant: "destructive" });
                                } finally {
                                  setLoadingContactDetails(false);
                                }
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Просмотр
                            </Button>
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
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Contact Details Dialog */}
            <Dialog open={!!selectedContact} onOpenChange={(open) => !open && setSelectedContact(null)}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Детали коммерческого предложения</DialogTitle>
                  <DialogDescription>
                    ID: {selectedContact?.id}
                  </DialogDescription>
                </DialogHeader>
                {selectedContact && (
                  <div className="space-y-6">
                    {/* Contact Information */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Контактная информация</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">Имя</Label>
                          <p className="font-medium">{selectedContact.name}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Email</Label>
                          <p className="font-medium">{selectedContact.email}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Телефон</Label>
                          <p className="font-medium">{selectedContact.phone}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Компания</Label>
                          <p className="font-medium">{selectedContact.company}</p>
                        </div>
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <Label className="text-sm text-muted-foreground">Сообщение</Label>
                      <div className="mt-2 p-4 bg-muted rounded-md border border-border/50 max-w-full">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words max-h-64 overflow-y-auto pr-2" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                          {selectedContact.message}
                        </p>
                      </div>
                    </div>

                    {/* Files */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Прикрепленные файлы ({contactFiles.length})</h3>
                      {contactFiles.length > 0 ? (
                        <div className="space-y-2">
                          {contactFiles.map((file: any) => (
                            <div key={file.id} className="flex items-center justify-between p-3 border rounded-md">
                              <div className="flex items-center gap-3">
                                <FileTextIcon className="w-5 h-5 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{file.fileName}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {(file.fileSize / 1024).toFixed(2)} KB • {format(new Date(file.uploadedAt), "dd.MM.yyyy HH:mm", { locale: ru })}
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    const token = localStorage.getItem("accessToken");
                                    const res = await fetch(`/api/files/${file.id}/download`, {
                                      headers: { Authorization: `Bearer ${token}` },
                                    });
                                    if (!res.ok) throw new Error("Failed to download file");
                                    const blob = await res.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = file.fileName;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                    toast({ title: "Успешно", description: "Файл скачан" });
                                  } catch (error) {
                                    toast({ title: "Ошибка", description: "Не удалось скачать файл", variant: "destructive" });
                                  }
                                }}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Скачать
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">Файлы не прикреплены</p>
                      )}
                    </div>

                    {/* Date */}
                    <div>
                      <Label className="text-sm text-muted-foreground">Дата создания</Label>
                      <p className="font-medium">{format(new Date(selectedContact.createdAt), "dd.MM.yyyy HH:mm", { locale: ru })}</p>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedContact(null)}>Закрыть</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
              </div>
            )}

            {/* Promocodes Section */}
            {activeTab === "promocodes" && (
              <div className="space-y-6">
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-lime-500 via-green-500 to-emerald-500" />
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-lime-500 to-green-500 shadow-lg">
                          <Tag className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">Управление промокодами</CardTitle>
                          <CardDescription>Создание и управление промокодами ({promoCodes.length})</CardDescription>
                        </div>
                      </div>
                      <Dialog open={showCreatePromo} onOpenChange={setShowCreatePromo}>
                        <DialogTrigger asChild>
                          <Button className="bg-gradient-to-r from-lime-500 to-green-500 hover:from-lime-600 hover:to-green-600">
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
              <div className="space-y-6">
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-500 via-gray-500 to-zinc-500" />
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-500 to-gray-600 shadow-lg">
                        <FileTextIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Управление контентом сайта</CardTitle>
                        <CardDescription>Редактирование текстов и описаний на сайте</CardDescription>
                      </div>
                    </div>
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
              <div className="space-y-6">
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500" />
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg">
                        <Phone className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Контакты сайта</CardTitle>
                        <CardDescription>Управление контактной информацией (телефон, email, соцсети)</CardDescription>
                      </div>
                    </div>
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
                                onClick={() => setEditingContact({
                                  id: contact.id,
                                  type: contact.type,
                                  value: contact.value,
                                  label: contact.label || "",
                                  order: contact.order || 0
                                })}
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
              <div className="space-y-6">
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg">
                        <Cookie className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Настройки соответствия РКН</CardTitle>
                        <CardDescription>Управление Cookie баннером и политиками</CardDescription>
                      </div>
                    </div>
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
              <div className="space-y-6">
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-rose-500 to-pink-500" />
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 shadow-lg">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Редактирование Политики конфиденциальности</CardTitle>
                        <CardDescription>
                          Заполните данные оператора персональных данных для соответствия требованиям 152-ФЗ
                        </CardDescription>
                      </div>
                    </div>
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
              <div className="space-y-6">
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500" />
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 shadow-lg">
                          <Bell className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">Отправка уведомлений</CardTitle>
                          <CardDescription>Отправка уведомлений пользователям через сайт и email</CardDescription>
                        </div>
                      </div>
                      <Button 
                        onClick={() => setShowNotificationDialog(true)}
                        className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600"
                      >
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
              <div className="space-y-6">
                {/* Page Header */}
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-500 via-slate-500 to-zinc-500" />
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-gray-500 to-slate-600 shadow-lg">
                        <Settings className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Настройки сайта</h2>
                        <p className="text-muted-foreground text-sm">SEO и контактная информация</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Search className="w-5 h-5 text-blue-500" />
                        SEO настройки
                      </CardTitle>
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

              <Card>
                <CardHeader>
                  <CardTitle>Настройки формы</CardTitle>
                  <CardDescription>Управление возможностями формы коммерческого предложения</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="text-base">Загрузка файлов</Label>
                      <p className="text-sm text-muted-foreground">
                        Разрешить пользователям прикреплять файлы при отправке коммерческого предложения
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {enableFileUpload ? "Включено" : "Выключено"}
                      </span>
                      <Button
                        variant={enableFileUpload ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const newValue = !enableFileUpload;
                          setEnableFileUpload(newValue);
                          saveFileUploadSetting.mutate(newValue);
                        }}
                        disabled={saveFileUploadSetting.isPending}
                      >
                        {saveFileUploadSetting.isPending 
                          ? "Сохранение..." 
                          : enableFileUpload 
                            ? "Выключить" 
                            : "Включить"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
              </div>
            )}

            {/* Database Section */}
            {activeTab === "database" && (
              <div className="space-y-6">
                {/* Database Size Monitoring */}
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg">
                          <Database className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">Мониторинг базы данных</CardTitle>
                          <CardDescription>Информация о размере и использовании базы данных</CardDescription>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          databaseSizeQuery.refetch();
                        }}
                        disabled={databaseSizeQuery.isFetching}
                      >
                        <Activity className="w-4 h-4 mr-2" />
                        {databaseSizeQuery.isFetching ? "Обновление..." : "Обновить"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {databaseSizeQuery.isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                          <p className="text-sm text-muted-foreground">Загрузка информации о БД...</p>
                        </div>
                      </div>
                    ) : databaseSizeQuery.error ? (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Ошибка при загрузке информации о базе данных: {databaseSizeQuery.error instanceof Error ? databaseSizeQuery.error.message : "Неизвестная ошибка"}
                        </AlertDescription>
                      </Alert>
                    ) : databaseSizeQuery.data ? (
                      <>
                        {/* Total Database Size */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border-indigo-500/20">
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground mb-1">Общий размер БД</p>
                                  <p className="text-2xl font-bold">{databaseSizeQuery.data.database.total_size}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {((databaseSizeQuery.data.database.total_size_bytes / 1024 / 1024 / 1024) * 100).toFixed(2)}% от 1 ГБ
                                  </p>
                                </div>
                                <Database className="w-10 h-10 text-indigo-500 opacity-50" />
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground mb-1">Размер таблиц</p>
                                  <p className="text-2xl font-bold">{databaseSizeQuery.data.tables.total_size}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {databaseSizeQuery.data.tables.count} таблиц
                                  </p>
                                </div>
                                <FileText className="w-10 h-10 text-blue-500 opacity-50" />
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground mb-1">Размер индексов</p>
                                  <p className="text-2xl font-bold">{databaseSizeQuery.data.indexes.total_size}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {databaseSizeQuery.data.tables.list.filter((t: any) => t.indexes_size_bytes > 0).length} таблиц с индексами
                                  </p>
                                </div>
                                <TrendingUp className="w-10 h-10 text-purple-500 opacity-50" />
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Использование пространства</span>
                            <span className="text-muted-foreground">
                              {((databaseSizeQuery.data.database.total_size_bytes / 1024 / 1024 / 1024) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <Progress 
                            value={(databaseSizeQuery.data.database.total_size_bytes / 1024 / 1024 / 1024) * 100} 
                            className="h-2"
                          />
                          <p className="text-xs text-muted-foreground">
                            Рекомендуется поддерживать использование БД ниже 80% для оптимальной производительности
                          </p>
                        </div>

                        {/* Tables List */}
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Размер по таблицам</h3>
                          <div className="rounded-lg border overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Таблица</TableHead>
                                  <TableHead className="text-right">Строк</TableHead>
                                  <TableHead className="text-right">Размер данных</TableHead>
                                  <TableHead className="text-right">Размер индексов</TableHead>
                                  <TableHead className="text-right">Общий размер</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {databaseSizeQuery.data.tables.list.map((table: any) => (
                                  <TableRow key={table.name}>
                                    <TableCell className="font-medium">{table.name}</TableCell>
                                    <TableCell className="text-right">
                                      {table.row_count.toLocaleString('ru-RU')}
                                    </TableCell>
                                    <TableCell className="text-right">{table.table_size}</TableCell>
                                    <TableCell className="text-right">
                                      {table.indexes_size_bytes > 0 ? table.indexes_size : '—'}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">{table.total_size}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </>
                    ) : null}
                  </CardContent>
                </Card>

                {/* Database Export */}
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg">
                        <Download className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Выгрузка базы данных</CardTitle>
                        <CardDescription>Создание резервной копии базы данных</CardDescription>
                      </div>
                    </div>
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
    </div>

      {/* Dialog for managing product images */}
      <Dialog open={!!selectedProductForImages} onOpenChange={(open) => !open && setSelectedProductForImages(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Управление фотографиями</DialogTitle>
            <DialogDescription>
              {allProducts.find((p: any) => p.id === selectedProductForImages)?.name || "Товар"}
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
                  onClick={(e) => {
                    // Reset input value to allow re-selecting same file
                    (e.target as HTMLInputElement).value = '';
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

      {/* Dialog for editing site contact */}
      <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактирование контакта</DialogTitle>
            <DialogDescription>Измените информацию о контакте</DialogDescription>
          </DialogHeader>
          {editingContact && (
            <div className="space-y-4">
              <div>
                <Label>Тип</Label>
                <Select
                  value={editingContact.type}
                  onValueChange={(value) => setEditingContact({ ...editingContact, type: value })}
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
                  value={editingContact.value}
                  onChange={(e) => setEditingContact({ ...editingContact, value: e.target.value })}
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
              <div>
                <Label>Подпись</Label>
                <Input
                  value={editingContact.label}
                  onChange={(e) => setEditingContact({ ...editingContact, label: e.target.value })}
                  placeholder="Основной телефон"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingContact(null)}>
              Отмена
            </Button>
            <Button
              onClick={async () => {
                if (!editingContact) return;
                if (!editingContact.type || !editingContact.value) {
                  toast({ title: "Ошибка", description: "Заполните тип и значение", variant: "destructive" });
                  return;
                }
                try {
                  const token = localStorage.getItem("accessToken");
                  const res = await fetch(`/api/admin/site-contacts/${editingContact.id}`, {
                    method: "PUT",
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      type: editingContact.type,
                      value: editingContact.value,
                      label: editingContact.label,
                      order: editingContact.order,
                    }),
                  });
                  if (!res.ok) throw new Error("Не удалось обновить контакт");
                  toast({ title: "Успешно", description: "Контакт обновлен" });
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/site-contacts"] });
                  setEditingContact(null);
                } catch (error: any) {
                  toast({ title: "Ошибка", description: error.message, variant: "destructive" });
                }
              }}
            >
              Сохранить
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
                  <SelectItem value="all">Всем пользователям</SelectItem>
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
                  userId: notificationForm.userId && notificationForm.userId !== "all" ? notificationForm.userId : undefined,
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

