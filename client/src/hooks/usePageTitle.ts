import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

/**
 * Hook для динамического обновления title страницы из настроек
 * Не перезаписывает title на главной странице, где он устанавливается динамически
 */
export function usePageTitle() {
  const [location] = useLocation();
  const { data: settingsData } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/settings");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // Кэш на 5 минут
  });

  useEffect(() => {
    // Не устанавливаем title на главной странице - там он устанавливается динамически в зависимости от устройства
    if (location === "/") {
      return;
    }
    
    if (settingsData?.settings) {
      const settings = settingsData.settings as any[];
      const siteTitleSetting = settings.find((s: any) => s.key === "site_title");
      
      if (siteTitleSetting?.value) {
        document.title = siteTitleSetting.value;
      } else {
        // Fallback на дефолтный title
        document.title = "Нагрузочные устройства";
      }
    }
  }, [settingsData, location]);
}

