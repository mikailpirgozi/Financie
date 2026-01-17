'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Car,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@finapp/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Vehicle {
  id: string;
  name: string;
  make?: string;
  model?: string;
  licensePlate?: string;
}

interface LinkToVehicleModalProps {
  householdId: string;
  entityType: 'loan' | 'insurance' | 'fine';
  entityId: string;
  entityName: string;
  currentVehicleId?: string;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export function LinkToVehicleModal({
  householdId,
  entityType,
  entityId,
  entityName,
  currentVehicleId,
  trigger,
  onSuccess,
}: LinkToVehicleModalProps): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(currentVehicleId || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch vehicles when modal opens
  useEffect(() => {
    if (open) {
      fetchVehicles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchVehicles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/vehicles?householdId=${householdId}`);
      if (!response.ok) throw new Error('Failed to fetch vehicles');
      const data = await response.json();
      setVehicles(data.data || []);
    } catch (err) {
      setError('Nepodarilo sa načítať vozidlá');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedVehicleId) {
      setError('Vyberte vozidlo');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Determine the correct API endpoint and field based on entity type
      let apiUrl: string;
      let body: Record<string, unknown>;

      if (entityType === 'loan') {
        apiUrl = `/api/vehicles/${selectedVehicleId}/link`;
        body = { loanIds: [entityId] };
      } else if (entityType === 'insurance') {
        apiUrl = `/api/vehicles/${selectedVehicleId}/link`;
        body = { insuranceIds: [entityId] };
      } else if (entityType === 'fine') {
        apiUrl = `/api/vehicles/${selectedVehicleId}/link`;
        body = { fineIds: [entityId] };
      } else {
        throw new Error('Unknown entity type');
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Nepodarilo sa priradiť k vozidlu');
      }

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        router.refresh();
        onSuccess?.();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlink = async () => {
    if (!currentVehicleId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      let apiUrl: string;
      let body: Record<string, unknown>;

      if (entityType === 'loan') {
        apiUrl = `/api/vehicles/${currentVehicleId}/link`;
        body = { loanIds: [entityId] };
      } else if (entityType === 'insurance') {
        apiUrl = `/api/vehicles/${currentVehicleId}/link`;
        body = { insuranceIds: [entityId] };
      } else if (entityType === 'fine') {
        apiUrl = `/api/vehicles/${currentVehicleId}/link`;
        body = { fineIds: [entityId] };
      } else {
        throw new Error('Unknown entity type');
      }

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Nepodarilo sa odpojiť od vozidla');
      }

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setSelectedVehicleId('');
        router.refresh();
        onSuccess?.();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVehicleLabel = (vehicle: Vehicle) => {
    if (vehicle.make && vehicle.model) {
      return `${vehicle.make} ${vehicle.model}${vehicle.licensePlate ? ` (${vehicle.licensePlate})` : ''}`;
    }
    return vehicle.name;
  };

  const getEntityTypeLabel = () => {
    switch (entityType) {
      case 'loan': return 'úver';
      case 'insurance': return 'poistku';
      case 'fine': return 'pokutu';
      default: return 'záznam';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Priradiť k vozidlu
          </DialogTitle>
          <DialogDescription>
            Priraďte {getEntityTypeLabel()} "{entityName}" k vozidlu
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-green-600 font-medium">Úspešne priradené!</p>
          </div>
        ) : (
          <>
            <div className="py-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : vehicles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Car className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nemáte žiadne vozidlá</p>
                  <p className="text-sm">Najprv pridajte vozidlo</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Select
                    value={selectedVehicleId}
                    onValueChange={setSelectedVehicleId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte vozidlo" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {getVehicleLabel(vehicle)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {currentVehicleId && (
                    <div className="text-sm text-muted-foreground">
                      <p>Aktuálne priradené k: {
                        getVehicleLabel(vehicles.find(v => v.id === currentVehicleId) || { id: '', name: 'Neznáme' })
                      }</p>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm mt-4">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              {currentVehicleId && (
                <Button
                  variant="outline"
                  onClick={handleUnlink}
                  disabled={isSubmitting}
                >
                  Odpojiť od vozidla
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedVehicleId || vehicles.length === 0}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Priradiť
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
