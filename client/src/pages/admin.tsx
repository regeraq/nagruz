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
import { Package, Users, BarChart3, FileText, Settings, Plus, Edit2, Trash2, Save, X, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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

export default function Admin() {
  const [, setLocation] = useLocation();
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editingStock, setEditingStock] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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

  const deleteProducts = useMutation({
    mutationFn: async (ids: string[]) => {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/admin/products/bulk-delete", {
        method: "POST",
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

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Админ-панель</h1>
          <Badge variant="outline" className="text-sm">
        <Button variant="ghost" onClick={() => setLocation("/")}>
          На главную
        </Button>
            {userData?.role}
          </Badge>
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
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Аналитика
            </TabsTrigger>
            <TabsTrigger value="content">
              <FileText className="w-4 h-4 mr-2" />
              Контент
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
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Удалить ({selectedProducts.size})
                      </Button>
                    )}
                    <Button>
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
                          <TableRow key={product.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedProducts.has(product.id)}
                                onCheckedChange={() => toggleProductSelection(product.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>{product.sku}</TableCell>
                            <TableCell>{product.price} ₽</TableCell>
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
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleStockSave(product.id)}
                                    disabled={updateProductStock.isPending}
                                  >
                                    <Save className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleStockCancel}
                                    disabled={updateProductStock.isPending}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span>{product.stock}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleStockEdit(product)}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={product.isActive ? "default" : "secondary"}>
                                {product.isActive ? "Активен" : "Неактивен"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost">
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost">
                                  <Trash2 className="w-4 h-4" />
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
            <Card>
              <CardHeader>
                <CardTitle>Управление пользователями</CardTitle>
                <CardDescription>Просмотр и управление пользователями</CardDescription>
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
                          <TableHead>Статус</TableHead>
                          <TableHead>Дата регистрации</TableHead>
                          <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user: any) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.email}</TableCell>
                            <TableCell>
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{user.role}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.isBlocked ? "destructive" : "default"}>
                                {user.isBlocked ? "Заблокирован" : "Активен"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(user.createdAt), "d MMM yyyy", { locale: ru })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost">
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
                <CardDescription>Дашборд с метриками и графиками</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{products.length}</div>
                      <p className="text-xs text-muted-foreground">Всего товаров</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{users.length}</div>
                      <p className="text-xs text-muted-foreground">Всего пользователей</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">0</div>
                      <p className="text-xs text-muted-foreground">Заказов за месяц</p>
                    </CardContent>
                  </Card>
                </div>
                <Alert>
                  <BarChart3 className="h-4 w-4" />
                  <AlertDescription>
                    Графики и детальная аналитика будут отображаться здесь
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Управление контентом</CardTitle>
                <CardDescription>Страницы, статьи, баннеры</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    Управление контентом будет реализовано здесь
                  </AlertDescription>
                </Alert>
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
        <DialogContent>
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
            <Button variant="destructive" onClick={confirmBulkDelete} disabled={deleteProducts.isPending}>
              {deleteProducts.isPending ? "Удаление..." : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
