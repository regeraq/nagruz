import { useLocation } from "wouter";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Users, BarChart3, FileText, Settings, Plus, Edit2, Trash2, Save, X, CheckCircle2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale/ru";

interface Product {
  id: string;
  name: string;
  price: string;
  stock: number;
  sku: string;
  isActive: boolean;
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  createdAt: string;
}

interface Order {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  totalAmount: string;
  finalAmount: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editingStock, setEditingStock] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [searchUserId, setSearchUserId] = useState("");
  const [selectedUserDetail, setSelectedUserDetail] = useState<any>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any>(null);
  const [orderStatusDialog, setOrderStatusDialog] = useState(false);
  const [newOrderStatus, setNewOrderStatus] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return [];

      const res = await fetch("/api/products", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return [];

      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: orders = [], isLoading: isLoadingOrders } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return [];

      const res = await fetch("/api/admin/orders", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (!res.ok) return [];
      return res.json();
    },
  });

  const updateProductStock = useMutation({
    mutationFn: async ({ id, stock }: { id: string; stock: number }) => {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`/api/admin/products/${id}/stock`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ stock }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Ошибка при обновлении");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setEditingProduct(null);
      setEditingStock(null);
      toast({
        title: "Успешно",
        description: "Количество обновлено",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ paymentStatus: status }),
      });

      if (!res.ok) throw new Error("Ошибка при обновлении");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      setOrderStatusDialog(false);
      setNewOrderStatus("");
      toast({
        title: "Успешно",
        description: "Статус заказа обновлен",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProducts = useMutation({
    mutationFn: async (ids: string[]) => {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ ids }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Ошибка при удалении");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setSelectedProducts(new Set());
      setShowDeleteDialog(false);
      toast({
        title: "Успешно",
        description: "Товары удалены",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStockEdit = (product: Product) => {
    setEditingProduct(product.id);
    setEditingStock(product.stock);
  };

  const handleStockSave = (id: string) => {
    if (editingStock !== null && editingStock >= 0) {
      updateProductStock.mutate({ id, stock: editingStock });
    }
  };

  const handleStockCancel = () => {
    setEditingProduct(null);
    setEditingStock(null);
  };

  const toggleProductSelection = (id: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProducts(newSelected);
  };

  const toggleAllProducts = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedProducts.size === 0) return;
    setShowDeleteDialog(true);
  };

  const confirmBulkDelete = () => {
    deleteProducts.mutate(Array.from(selectedProducts));
  };

  const handleSearchUser = (userId: string) => {
    if (!userId.trim()) {
      setSelectedUserDetail(null);
      return;
    }
    const found = users.find((u: any) => u.id === userId);
    if (found) {
      const userOrders = orders.filter((o: any) => o.userId === userId);
      setSelectedUserDetail({ ...found, orders: userOrders });
    } else {
      toast({
        title: "Не найдено",
        description: "Пользователь с таким ID не найден",
        variant: "destructive",
      });
      setSelectedUserDetail(null);
    }
  };

  const handleOrderStatusChange = (order: Order) => {
    setSelectedOrderDetail(order);
    setNewOrderStatus(order.paymentStatus);
    setOrderStatusDialog(true);
  };

  const confirmOrderStatusChange = () => {
    if (selectedOrderDetail && newOrderStatus) {
      updateOrderStatus.mutate({
        id: selectedOrderDetail.id,
        status: newOrderStatus,
      });
    }
  };

  const isAdmin = userData?.role === "admin" || userData?.role === "superadmin" || userData?.role === "moderator";

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <Card>
          <CardContent className="pt-6">
            <Alert>
              <AlertDescription>У вас нет доступа к админ-панели</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.finalAmount), 0);
  const deliveredOrders = orders.filter(o => o.paymentStatus === "delivered").length;
  const processingOrders = orders.filter(o => o.paymentStatus === "processing").length;

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Админ-панель</h1>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-sm">
              {userData?.role}
            </Badge>
            <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-go-home">
              На главную
            </Button>
          </div>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="products">
              <Package className="w-4 h-4 mr-2" />
              Товары
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Пользователи
            </TabsTrigger>
            <TabsTrigger value="orders">
              <Package className="w-4 h-4 mr-2" />
              Заказы
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Аналитика
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Настройки
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Управление товарами</CardTitle>
                    <CardDescription>CRUD операции для товаров</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {selectedProducts.size > 0 && (
                      <Button
                        variant="destructive"
                        onClick={handleBulkDelete}
                        disabled={deleteProducts.isPending}
                        data-testid="button-delete-selected"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Удалить ({selectedProducts.size})
                      </Button>
                    )}
                    <Button data-testid="button-add-product">
                      <Plus className="w-4 h-4 mr-2" />
                      Добавить товар
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingProducts ? (
                  <div className="text-center py-12">
                    <div className="animate-pulse">Загрузка...</div>
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Товары не найдены</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedProducts.size === products.length && products.length > 0}
                              onCheckedChange={toggleAllProducts}
                              data-testid="checkbox-select-all"
                            />
                          </TableHead>
                          <TableHead>Название</TableHead>
                          <TableHead>Артикул</TableHead>
                          <TableHead>Цена</TableHead>
                          <TableHead>Количество</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product) => (
                          <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                            <TableCell>
                              <Checkbox
                                checked={selectedProducts.has(product.id)}
                                onCheckedChange={() => toggleProductSelection(product.id)}
                                data-testid={`checkbox-product-${product.id}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium" data-testid={`cell-name-${product.id}`}>{product.name}</TableCell>
                            <TableCell data-testid={`cell-sku-${product.id}`}>{product.sku}</TableCell>
                            <TableCell data-testid={`cell-price-${product.id}`}>{product.price} ₽</TableCell>
                            <TableCell>
                              {editingProduct === product.id ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={editingStock ?? 0}
                                    onChange={(e) => setEditingStock(parseInt(e.target.value) || 0)}
                                    className="w-20"
                                    min="0"
                                    autoFocus
                                    data-testid={`input-stock-${product.id}`}
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleStockSave(product.id)}
                                    disabled={updateProductStock.isPending}
                                    data-testid={`button-save-stock-${product.id}`}
                                  >
                                    <Save className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleStockCancel}
                                    disabled={updateProductStock.isPending}
                                    data-testid={`button-cancel-stock-${product.id}`}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span data-testid={`text-stock-${product.id}`}>{product.stock}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleStockEdit(product)}
                                    data-testid={`button-edit-stock-${product.id}`}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={product.isActive ? "default" : "secondary"} data-testid={`badge-status-${product.id}`}>
                                {product.isActive ? "Активен" : "Неактивен"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" data-testid={`button-edit-${product.id}`}>
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Поиск пользователя по ID</CardTitle>
                  <CardDescription>Введите ID пользователя для просмотра деталей и заказов</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Введите ID пользователя..."
                      value={searchUserId}
                      onChange={(e) => setSearchUserId(e.target.value)}
                      data-testid="input-search-user"
                    />
                    <Button
                      onClick={() => handleSearchUser(searchUserId)}
                      data-testid="button-search-user"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Поиск
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {selectedUserDetail && (
                <Card>
                  <CardHeader>
                    <CardTitle>Профиль пользователя</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-muted-foreground text-sm">ID</p>
                        <p className="font-semibold" data-testid="text-user-id">{selectedUserDetail.id}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">Email</p>
                        <p className="font-semibold" data-testid="text-user-email">{selectedUserDetail.email}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">Имя</p>
                        <p className="font-semibold" data-testid="text-user-name">
                          {selectedUserDetail.firstName && selectedUserDetail.lastName
                            ? `${selectedUserDetail.firstName} ${selectedUserDetail.lastName}`
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">Роль</p>
                        <Badge variant="outline" data-testid="badge-user-role">{selectedUserDetail.role}</Badge>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground text-sm">Дата регистрации</p>
                        <p className="font-semibold" data-testid="text-user-created">
                          {format(new Date(selectedUserDetail.createdAt), "d MMMM yyyy, HH:mm", { locale: ru })}
                        </p>
                      </div>
                    </div>

                    {selectedUserDetail.orders && selectedUserDetail.orders.length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-semibold mb-4">Заказы пользователя ({selectedUserDetail.orders.length})</h3>
                        <div className="space-y-2">
                          {selectedUserDetail.orders.map((order: Order) => (
                            <Card key={order.id} data-testid={`card-user-order-${order.id}`}>
                              <CardContent className="pt-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-semibold text-sm"># {order.id.slice(0, 8)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(order.createdAt), "d MMM yyyy", { locale: ru })}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold">{order.finalAmount} ₽</p>
                                    <Badge
                                      variant={order.paymentStatus === "delivered" ? "default" : "secondary"}
                                      className="text-xs"
                                      data-testid={`badge-order-status-${order.id}`}
                                    >
                                      {order.paymentStatus}
                                    </Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Все пользователи</CardTitle>
                  <CardDescription>Список всех зарегистрированных пользователей</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingUsers ? (
                    <div className="text-center py-12">
                      <div className="animate-pulse">Загрузка...</div>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Пользователи не найдены</p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Имя</TableHead>
                            <TableHead>Роль</TableHead>
                            <TableHead>Дата регистрации</TableHead>
                            <TableHead className="text-right">Действия</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((user: any) => (
                            <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                              <TableCell className="font-medium" data-testid={`cell-email-${user.id}`}>{user.email}</TableCell>
                              <TableCell data-testid={`cell-name-${user.id}`}>
                                {user.firstName && user.lastName
                                  ? `${user.firstName} ${user.lastName}`
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" data-testid={`badge-role-${user.id}`}>{user.role}</Badge>
                              </TableCell>
                              <TableCell data-testid={`cell-created-${user.id}`}>
                                {format(new Date(user.createdAt), "d MMM yyyy", { locale: ru })}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSearchUserId(user.id);
                                    handleSearchUser(user.id);
                                  }}
                                  data-testid={`button-view-user-${user.id}`}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Управление заказами</CardTitle>
                <CardDescription>Просмотр и управление всеми заказами</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingOrders ? (
                  <div className="text-center py-12">
                    <div className="animate-pulse">Загрузка...</div>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Заказы не найдены</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID заказа</TableHead>
                          <TableHead>Товар</TableHead>
                          <TableHead>Количество</TableHead>
                          <TableHead>Сумма</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead>Дата</TableHead>
                          <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order: Order) => (
                          <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                            <TableCell className="font-mono text-sm" data-testid={`cell-order-id-${order.id}`}>
                              {order.id.slice(0, 8)}
                            </TableCell>
                            <TableCell data-testid={`cell-product-id-${order.id}`}>{order.productId}</TableCell>
                            <TableCell data-testid={`cell-quantity-${order.id}`}>{order.quantity}</TableCell>
                            <TableCell className="font-semibold" data-testid={`cell-amount-${order.id}`}>
                              {order.finalAmount} ₽
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  order.paymentStatus === "delivered"
                                    ? "default"
                                    : order.paymentStatus === "cancelled"
                                    ? "destructive"
                                    : "secondary"
                                }
                                data-testid={`badge-status-${order.id}`}
                              >
                                {order.paymentStatus}
                              </Badge>
                            </TableCell>
                            <TableCell data-testid={`cell-date-${order.id}`}>
                              {format(new Date(order.createdAt), "d MMM yyyy", { locale: ru })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOrderStatusChange(order)}
                                data-testid={`button-edit-order-${order.id}`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Аналитика</CardTitle>
                <CardDescription>Полный дашборд с метриками и графиками</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold" data-testid="text-total-products">{products.length}</div>
                      <p className="text-xs text-muted-foreground">Всего товаров</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold" data-testid="text-total-users">{users.length}</div>
                      <p className="text-xs text-muted-foreground">Всего пользователей</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold" data-testid="text-total-orders">{orders.length}</div>
                      <p className="text-xs text-muted-foreground">Всего заказов</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold" data-testid="text-total-revenue">
                        {(totalRevenue / 1000).toFixed(0)}K
                      </div>
                      <p className="text-xs text-muted-foreground">Выручка (₽)</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Статусы заказов</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Доставлено</span>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-green-200 rounded" style={{ width: `${deliveredOrders * 20}px` }}></div>
                          <span className="text-sm font-semibold" data-testid="text-delivered">{deliveredOrders}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">В обработке</span>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-blue-200 rounded" style={{ width: `${processingOrders * 20}px` }}></div>
                          <span className="text-sm font-semibold" data-testid="text-processing">{processingOrders}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Ожидание</span>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-yellow-200 rounded" style={{ width: `${(orders.length - deliveredOrders - processingOrders) * 20}px` }}></div>
                          <span className="text-sm font-semibold" data-testid="text-pending">
                            {orders.length - deliveredOrders - processingOrders}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Статусы товаров</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm">Активные</span>
                        </div>
                        <span className="font-semibold" data-testid="text-active-products">
                          {products.filter((p: any) => p.isActive).length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                          <span className="text-sm">Неактивные</span>
                        </div>
                        <span className="font-semibold" data-testid="text-inactive-products">
                          {products.filter((p: any) => !p.isActive).length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <span className="text-sm text-muted-foreground">Низкий запас (&lt;10)</span>
                        <span className="font-semibold text-orange-600" data-testid="text-low-stock">
                          {products.filter((p: any) => p.stock < 10).length}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Последние заказы</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orders.length === 0 ? (
                      <p className="text-muted-foreground text-sm">Нет заказов</p>
                    ) : (
                      <div className="space-y-2">
                        {orders.slice(-5).reverse().map((order: Order) => (
                          <div key={order.id} className="flex justify-between items-center p-2 hover:bg-muted rounded">
                            <span className="text-sm font-mono">#{order.id.slice(0, 8)}</span>
                            <span className="text-sm">{order.finalAmount} ₽</span>
                            <Badge variant="outline" className="text-xs">{order.paymentStatus}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Настройки сайта</CardTitle>
                <CardDescription>Общие настройки и конфигурация</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    Настройки сайта будут отображаться здесь
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent data-testid="dialog-delete-products">
          <DialogHeader>
            <DialogTitle>Подтверждение удаления</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить {selectedProducts.size} товар(ов)? Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={confirmBulkDelete} disabled={deleteProducts.isPending} data-testid="button-confirm-delete">
              {deleteProducts.isPending ? "Удаление..." : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={orderStatusDialog} onOpenChange={setOrderStatusDialog}>
        <DialogContent data-testid="dialog-order-status">
          <DialogHeader>
            <DialogTitle>Изменить статус заказа</DialogTitle>
            <DialogDescription>
              Заказ #{selectedOrderDetail?.id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          {selectedOrderDetail && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded text-sm">
                <p className="text-muted-foreground">Текущий статус: <span className="font-semibold">{selectedOrderDetail.paymentStatus}</span></p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Новый статус</Label>
                <Select value={newOrderStatus} onValueChange={setNewOrderStatus}>
                  <SelectTrigger data-testid="select-order-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Ожидание оплаты</SelectItem>
                    <SelectItem value="paid">Оплачен</SelectItem>
                    <SelectItem value="processing">В обработке</SelectItem>
                    <SelectItem value="shipped">Отправлен</SelectItem>
                    <SelectItem value="delivered">Доставлен</SelectItem>
                    <SelectItem value="cancelled">Отменен</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderStatusDialog(false)}>
              Отмена
            </Button>
            <Button onClick={confirmOrderStatusChange} disabled={updateOrderStatus.isPending} data-testid="button-confirm-order-status">
              {updateOrderStatus.isPending ? "Обновление..." : "Обновить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
