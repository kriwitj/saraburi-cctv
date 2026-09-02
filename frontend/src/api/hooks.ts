import { useCallback, useEffect, useState } from 'react';
import { apiClient } from './client';

function useApiList<T>(path: string, enabled: boolean = true) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await apiClient.get<T[]>(path);
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [path, enabled]);

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled]);

  return { data, setData, loading, error, refetch };
}

export function useDashboardSummary(localGovId?: string) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any>('/dashboard/province', {
        params: localGovId ? { local_gov_id: localGovId } : {},
      });
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [localGovId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

export function useCameras() {
  return useApiList<any>('/cameras?limit=1000');
}

export function useUsers(enabled: boolean = true) {
  return useApiList<any>('/admin/users', enabled);
}

export function useTickets() {
  return useApiList<any>('/tickets');
}

export function useAuditLogs(enabled: boolean = true) {
  return useApiList<any>('/admin/audit-logs', enabled);
}

export function useProjects() {
  return useApiList<any>('/admin/projects');
}

export function useDistricts() {
  return useApiList<any>('/admin/districts');
}

export function useSubdistricts(districtId?: string) {
  return useApiList<any>(districtId ? `/admin/subdistricts?district_id=${districtId}` : '/admin/subdistricts');
}

export function useLocalGovTypes() {
  return useApiList<any>('/admin/local-gov-types');
}

export function useLocalGovernments() {
  return useApiList<any>('/admin/local-governments');
}

export function useDeviceBrands() {
  return useApiList<any>('/admin/device-brands');
}

export function useDeviceCategories() {
  return useApiList<any>('/admin/device-categories');
}

export function useInstallationSites() {
  return useApiList<any>('/admin/installation-sites');
}

export function useInstallPointTypes() {
  return useApiList<any>('/admin/install-point-types');
}

export function useCameraFunctionTypes() {
  return useApiList<any>('/admin/camera-function-types');
}

export function useDeviceCatalog() {
  return useApiList<any>('/admin/catalogs');
}

export function useNvrVmsSystems(localGovId?: string) {
  return useApiList<any>(localGovId ? `/admin/nvr-vms?local_gov_id=${localGovId}` : '/admin/nvr-vms');
}

export function useVideoRequests() {
  return useApiList<any>('/video-requests');
}

export function useHealthChecks(cameraId?: string) {
  return useApiList<any>(cameraId ? `/health-checks?camera_id=${cameraId}` : '/health-checks');
}

export function useUptimeStats(cameraId?: string) {
  return useApiList<any>(cameraId ? `/uptime-stats?camera_id=${cameraId}` : '/uptime-stats');
}
