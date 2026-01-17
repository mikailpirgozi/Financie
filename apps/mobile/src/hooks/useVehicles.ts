import { useState, useCallback, useEffect } from 'react';
import {
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  linkToVehicle,
  type Vehicle,
  type VehicleStats,
  type VehicleDetailResponse,
  type CreateVehicleData,
  type LinkToVehicleData,
} from '@/lib/api';

export function useVehicles(householdId: string | null) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState<VehicleStats | null>(null);
  const [filters, setFilters] = useState<{ companies: string[]; makes: string[]; years: number[] }>({
    companies: [],
    makes: [],
    years: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!householdId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getVehicles(householdId);
      setVehicles(response.data);
      setStats(response.stats);
      setFilters(response.filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vehicles');
    } finally {
      setIsLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const create = useCallback(async (data: CreateVehicleData) => {
    const response = await createVehicle(data);
    setVehicles(prev => [response.data, ...prev]);
    return response.data;
  }, []);

  const update = useCallback(async (id: string, data: Partial<CreateVehicleData>) => {
    const response = await updateVehicle(id, data);
    setVehicles(prev => prev.map(v => v.id === id ? response.data : v));
    return response.data;
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteVehicle(id);
    setVehicles(prev => prev.filter(v => v.id !== id));
  }, []);

  return {
    vehicles,
    stats,
    filters,
    isLoading,
    error,
    refetch: fetch,
    create,
    update,
    remove,
  };
}

export function useVehicle(vehicleId: string | null) {
  const [vehicle, setVehicle] = useState<VehicleDetailResponse['data'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!vehicleId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getVehicle(vehicleId);
      setVehicle(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vehicle');
    } finally {
      setIsLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const update = useCallback(async (data: Partial<CreateVehicleData>) => {
    if (!vehicleId) throw new Error('No vehicle ID');
    const response = await updateVehicle(vehicleId, data);
    setVehicle(prev => prev ? { ...prev, ...response.data } : null);
    return response.data;
  }, [vehicleId]);

  const link = useCallback(async (data: LinkToVehicleData) => {
    if (!vehicleId) throw new Error('No vehicle ID');
    const response = await linkToVehicle(vehicleId, data);
    // Refetch to get updated linked items
    fetch();
    return response;
  }, [vehicleId, fetch]);

  return {
    vehicle,
    isLoading,
    error,
    refetch: fetch,
    update,
    link,
  };
}
