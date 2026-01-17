'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Car,
  Building2,
  Hash,
  Settings,
  Loader2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@finapp/ui';
import { Input } from '@finapp/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@finapp/ui';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const vehicleFormSchema = z.object({
  // Step 1: Basic info
  name: z.string().min(1, 'Názov je povinný').max(200),
  make: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional().or(z.literal('')),
  
  // Step 2: Technical
  bodyType: z.enum(['sedan', 'suv', 'hatchback', 'wagon', 'coupe', 'van', 'pickup', 'other']).optional().or(z.literal('')),
  fuelType: z.enum(['petrol', 'diesel', 'electric', 'hybrid', 'lpg', 'cng']).optional().or(z.literal('')),
  engineCapacity: z.coerce.number().int().positive().optional().or(z.literal('')),
  enginePower: z.coerce.number().int().positive().optional().or(z.literal('')),
  transmission: z.enum(['manual', 'automatic']).optional().or(z.literal('')),
  driveType: z.enum(['fwd', 'rwd', 'awd']).optional().or(z.literal('')),
  color: z.string().max(50).optional(),
  doors: z.coerce.number().int().min(1).max(10).optional().or(z.literal('')),
  seats: z.coerce.number().int().min(1).max(50).optional().or(z.literal('')),
  mileage: z.coerce.number().int().nonnegative().optional().or(z.literal('')),
  
  // Step 3: Financial
  acquisitionValue: z.coerce.number().positive('Nákupná cena musí byť kladná'),
  currentValue: z.coerce.number().positive('Aktuálna hodnota musí byť kladná'),
  acquisitionDate: z.string().min(1, 'Dátum nákupu je povinný'),
  
  // Step 4: Identification
  licensePlate: z.string().max(20).optional(),
  vin: z.string().max(17).optional(),
  registeredCompany: z.string().max(200).optional(),
});

type VehicleFormData = z.infer<typeof vehicleFormSchema>;

interface VehicleFormProps {
  householdId: string;
  initialData?: Partial<VehicleFormData> & { id?: string };
  mode: 'create' | 'edit';
}

const BODY_TYPE_OPTIONS = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'hatchback', label: 'Hatchback' },
  { value: 'wagon', label: 'Kombi' },
  { value: 'coupe', label: 'Kupé' },
  { value: 'van', label: 'Van' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'other', label: 'Iné' },
];

const FUEL_TYPE_OPTIONS = [
  { value: 'petrol', label: 'Benzín' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Elektro' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'lpg', label: 'LPG' },
  { value: 'cng', label: 'CNG' },
];

const TRANSMISSION_OPTIONS = [
  { value: 'manual', label: 'Manuálna' },
  { value: 'automatic', label: 'Automatická' },
];

const DRIVE_TYPE_OPTIONS = [
  { value: 'fwd', label: 'Predný pohon (FWD)' },
  { value: 'rwd', label: 'Zadný pohon (RWD)' },
  { value: 'awd', label: '4x4 (AWD)' },
];

const STEPS = [
  { id: 1, title: 'Základné info', icon: Car },
  { id: 2, title: 'Technické údaje', icon: Settings },
  { id: 3, title: 'Financie', icon: Building2 },
  { id: 4, title: 'Identifikácia', icon: Hash },
];

export function VehicleForm({ householdId, initialData, mode }: VehicleFormProps): React.JSX.Element {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      make: initialData?.make || '',
      model: initialData?.model || '',
      year: initialData?.year || '',
      bodyType: initialData?.bodyType || '',
      fuelType: initialData?.fuelType || '',
      engineCapacity: initialData?.engineCapacity || '',
      enginePower: initialData?.enginePower || '',
      transmission: initialData?.transmission || '',
      driveType: initialData?.driveType || '',
      color: initialData?.color || '',
      doors: initialData?.doors || '',
      seats: initialData?.seats || '',
      mileage: initialData?.mileage || '',
      acquisitionValue: initialData?.acquisitionValue || 0,
      currentValue: initialData?.currentValue || 0,
      acquisitionDate: initialData?.acquisitionDate || new Date().toISOString().split('T')[0],
      licensePlate: initialData?.licensePlate || '',
      vin: initialData?.vin || '',
      registeredCompany: initialData?.registeredCompany || '',
    },
  });

  const handleNext = async () => {
    // Validate current step fields
    const fieldsToValidate = getFieldsForStep(step);
    const isValid = await form.trigger(fieldsToValidate as Array<keyof VehicleFormData>);
    
    if (isValid && step < 4) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const getFieldsForStep = (stepNum: number): string[] => {
    switch (stepNum) {
      case 1:
        return ['name', 'make', 'model', 'year'];
      case 2:
        return ['bodyType', 'fuelType', 'engineCapacity', 'enginePower', 'transmission', 'driveType', 'color', 'doors', 'seats', 'mileage'];
      case 3:
        return ['acquisitionValue', 'currentValue', 'acquisitionDate'];
      case 4:
        return ['licensePlate', 'vin', 'registeredCompany'];
      default:
        return [];
    }
  };

  const onSubmit = async (data: VehicleFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Clean up empty string values
      const cleanedData = {
        ...data,
        householdId,
        year: data.year || undefined,
        bodyType: data.bodyType || undefined,
        fuelType: data.fuelType || undefined,
        engineCapacity: data.engineCapacity || undefined,
        enginePower: data.enginePower || undefined,
        transmission: data.transmission || undefined,
        driveType: data.driveType || undefined,
        doors: data.doors || undefined,
        seats: data.seats || undefined,
        mileage: data.mileage || undefined,
        licensePlate: data.licensePlate || undefined,
        vin: data.vin || undefined,
        registeredCompany: data.registeredCompany || undefined,
        color: data.color || undefined,
        make: data.make || undefined,
        model: data.model || undefined,
      };

      const url = mode === 'edit' && initialData?.id 
        ? `/api/vehicles/${initialData.id}`
        : '/api/vehicles';
      
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Nepodarilo sa uložiť vozidlo');
      }

      const result = await response.json();
      
      router.push(`/dashboard/vehicles/${result.data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala chyba');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((s, index) => (
          <div key={s.id} className="flex items-center">
            <button
              type="button"
              onClick={() => step > s.id && setStep(s.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                step === s.id
                  ? 'bg-primary text-primary-foreground'
                  : step > s.id
                  ? 'bg-primary/20 text-primary cursor-pointer hover:bg-primary/30'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <s.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{s.title}</span>
              <span className="sm:hidden">{s.id}</span>
            </button>
            {index < STEPS.length - 1 && (
              <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Základné informácie
                </CardTitle>
                <CardDescription>
                  Zadajte základné údaje o vozidle
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Názov vozidla *</FormLabel>
                      <FormControl>
                        <Input placeholder="napr. Firemné auto, Rodinné SUV" {...field} />
                      </FormControl>
                      <FormDescription>
                        Vlastný názov pre ľahšiu identifikáciu
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="make"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Značka</FormLabel>
                        <FormControl>
                          <Input placeholder="napr. Škoda, VW, BMW" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <FormControl>
                          <Input placeholder="napr. Octavia, Golf, X5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rok výroby</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="napr. 2020" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Technical */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Technické údaje
                </CardTitle>
                <CardDescription>
                  Voliteľné technické parametre vozidla
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="bodyType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Typ karosérie</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Vyberte typ" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BODY_TYPE_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fuelType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Palivo</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Vyberte palivo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FUEL_TYPE_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="engineCapacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Objem motora (cm³)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="napr. 1984" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enginePower"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Výkon (kW)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="napr. 110" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="transmission"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prevodovka</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Vyberte typ" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TRANSMISSION_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="driveType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pohon</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Vyberte pohon" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DRIVE_TYPE_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Farba</FormLabel>
                        <FormControl>
                          <Input placeholder="napr. Čierna metalíza" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="doors"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Počet dverí</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="napr. 5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="seats"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Počet miest</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="napr. 5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="mileage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Najazdené km</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="napr. 85000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 3: Financial */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Finančné údaje
                </CardTitle>
                <CardDescription>
                  Cena a hodnota vozidla
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="acquisitionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dátum nákupu *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="acquisitionValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nákupná cena (€) *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="napr. 25000" {...field} />
                        </FormControl>
                        <FormDescription>
                          Cena za ktorú ste vozidlo kúpili
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currentValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aktuálna trhová hodnota (€) *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="napr. 20000" {...field} />
                        </FormControl>
                        <FormDescription>
                          Odhadovaná súčasná hodnota
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Identification */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  Identifikácia
                </CardTitle>
                <CardDescription>
                  ŠPZ, VIN a registrácia
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="licensePlate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ŠPZ (EČV)</FormLabel>
                      <FormControl>
                        <Input placeholder="napr. BA 123 AB" {...field} className="font-mono uppercase" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VIN (Vehicle Identification Number)</FormLabel>
                      <FormControl>
                        <Input placeholder="17-miestny kód" {...field} maxLength={17} className="font-mono uppercase" />
                      </FormControl>
                      <FormDescription>
                        Unikátny identifikátor vozidla (v technickom preukaze)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="registeredCompany"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registrované na firmu</FormLabel>
                      <FormControl>
                        <Input placeholder="napr. MojaFirma s.r.o." {...field} />
                      </FormControl>
                      <FormDescription>
                        Názov firmy ak je vozidlo firemné
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Error display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={step === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Späť
            </Button>

            {step < 4 ? (
              <Button type="button" onClick={handleNext}>
                Ďalej
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mode === 'edit' ? 'Uložiť zmeny' : 'Vytvoriť vozidlo'}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
