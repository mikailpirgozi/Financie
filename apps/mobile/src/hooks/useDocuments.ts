import { useState, useCallback, useEffect } from 'react';
import {
  getInsurances,
  getVehicleDocuments,
  getServiceRecords,
  getFines,
  getInsurers,
  createInsurance,
  createVehicleDocument,
  createServiceRecord,
  createFine,
  createInsurer,
  deleteInsurance,
  deleteVehicleDocument,
  deleteServiceRecord,
  deleteFine,
  type Insurance,
  type InsuranceStats,
  type VehicleDocument,
  type DocumentStats,
  type ServiceRecord,
  type Fine,
  type FineStats,
  type Insurer,
} from '@/lib/api';

export function useInsurances(householdId: string | null) {
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [stats, setStats] = useState<InsuranceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!householdId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getInsurances(householdId);
      setInsurances(response.data);
      setStats(response.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insurances');
    } finally {
      setIsLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const remove = useCallback(async (id: string) => {
    await deleteInsurance(id);
    setInsurances(prev => prev.filter(i => i.id !== id));
  }, []);

  const create = useCallback(async (data: Partial<Insurance>) => {
    const response = await createInsurance({ ...data, householdId: householdId! });
    setInsurances(prev => [response.data, ...prev]);
    return response.data;
  }, [householdId]);

  return { insurances, stats, isLoading, error, refetch: fetch, remove, create };
}

export function useVehicleDocuments(householdId: string | null, documentType?: string) {
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!householdId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getVehicleDocuments(householdId, documentType);
      setDocuments(response.data);
      setStats(response.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, [householdId, documentType]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const remove = useCallback(async (id: string) => {
    await deleteVehicleDocument(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, []);

  const create = useCallback(async (data: Partial<VehicleDocument>) => {
    const response = await createVehicleDocument({ ...data, householdId: householdId! });
    setDocuments(prev => [response.data, ...prev]);
    return response.data;
  }, [householdId]);

  return { documents, stats, isLoading, error, refetch: fetch, remove, create };
}

export function useServiceRecords(householdId: string | null, assetId?: string) {
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!householdId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getServiceRecords(householdId, assetId);
      setRecords(response.data);
      setTotalCost(response.stats.totalCost);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load service records');
    } finally {
      setIsLoading(false);
    }
  }, [householdId, assetId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const remove = useCallback(async (id: string) => {
    await deleteServiceRecord(id);
    setRecords(prev => prev.filter(r => r.id !== id));
  }, []);

  const create = useCallback(async (data: Partial<ServiceRecord>) => {
    const response = await createServiceRecord({ ...data, householdId: householdId! });
    setRecords(prev => [response.data, ...prev]);
    return response.data;
  }, [householdId]);

  return { records, totalCost, isLoading, error, refetch: fetch, remove, create };
}

export function useFines(householdId: string | null) {
  const [fines, setFines] = useState<Fine[]>([]);
  const [stats, setStats] = useState<FineStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!householdId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getFines(householdId);
      setFines(response.data);
      setStats(response.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fines');
    } finally {
      setIsLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const remove = useCallback(async (id: string) => {
    await deleteFine(id);
    setFines(prev => prev.filter(f => f.id !== id));
  }, []);

  const create = useCallback(async (data: Partial<Fine>) => {
    const response = await createFine({ ...data, householdId: householdId! });
    setFines(prev => [response.data, ...prev]);
    return response.data;
  }, [householdId]);

  return { fines, stats, isLoading, error, refetch: fetch, remove, create };
}

export function useInsurers(householdId: string | null) {
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!householdId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getInsurers(householdId);
      setInsurers(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insurers');
    } finally {
      setIsLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const create = useCallback(async (name: string) => {
    const response = await createInsurer({ householdId: householdId!, name });
    setInsurers(prev => [...prev, response.data]);
    return response.data;
  }, [householdId]);

  return { insurers, isLoading, error, refetch: fetch, create };
}

// Combined hook for documents page
export function useAllDocuments(householdId: string | null) {
  const insurancesHook = useInsurances(householdId);
  const stkHook = useVehicleDocuments(householdId, 'stk');
  const ekHook = useVehicleDocuments(householdId, 'ek');
  const vignettesHook = useVehicleDocuments(householdId, 'vignette');
  const serviceHook = useServiceRecords(householdId);
  const finesHook = useFines(householdId);

  const isLoading = insurancesHook.isLoading || stkHook.isLoading || ekHook.isLoading || 
                    vignettesHook.isLoading || serviceHook.isLoading || finesHook.isLoading;

  const refetchAll = useCallback(async () => {
    await Promise.all([
      insurancesHook.refetch(),
      stkHook.refetch(),
      ekHook.refetch(),
      vignettesHook.refetch(),
      serviceHook.refetch(),
      finesHook.refetch(),
    ]);
  }, [insurancesHook, stkHook, ekHook, vignettesHook, serviceHook, finesHook]);

  return {
    insurances: insurancesHook,
    stk: stkHook,
    ek: ekHook,
    vignettes: vignettesHook,
    service: serviceHook,
    fines: finesHook,
    isLoading,
    refetchAll,
  };
}
