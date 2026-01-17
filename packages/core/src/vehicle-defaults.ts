/**
 * Default vehicle makes and models for quick selection
 * Sorted alphabetically, includes popular models for each make
 */

export const VEHICLE_MAKES: Record<string, string[]> = {
  'Alfa Romeo': ['Giulia', 'Giulietta', 'Stelvio', 'Tonale', '159', '147', 'MiTo', '4C', 'Brera'],
  'Audi': ['A1', 'A3', 'A4', 'A4 Allroad', 'A5', 'A6', 'A6 Allroad', 'A7', 'A8', 'Q2', 'Q3', 'Q4 e-tron', 'Q5', 'Q7', 'Q8', 'e-tron', 'e-tron GT', 'RS3', 'RS4', 'RS5', 'RS6', 'RS7', 'S3', 'S4', 'S5', 'TT'],
  'BMW': ['1', '2', '2 Active Tourer', '3', '4', '5', '6', '7', '8', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'Z4', 'i3', 'i4', 'i7', 'iX', 'iX1', 'iX3', 'M2', 'M3', 'M4', 'M5', 'M8'],
  'Citroën': ['C1', 'C3', 'C3 Aircross', 'C4', 'C4 Cactus', 'C5', 'C5 Aircross', 'C5 X', 'Berlingo', 'SpaceTourer', 'ë-C4'],
  'Cupra': ['Born', 'Formentor', 'Leon', 'Ateca', 'Tavascan'],
  'Dacia': ['Duster', 'Sandero', 'Sandero Stepway', 'Logan', 'Jogger', 'Spring'],
  'DS': ['DS 3', 'DS 4', 'DS 7', 'DS 9'],
  'Fiat': ['500', '500e', '500L', '500X', 'Panda', 'Tipo', 'Punto', 'Doblo', 'Ducato'],
  'Ford': ['Fiesta', 'Focus', 'Mondeo', 'Mustang', 'Mustang Mach-E', 'Puma', 'Kuga', 'Explorer', 'Ranger', 'Transit', 'Transit Custom', 'S-MAX', 'Galaxy', 'EcoSport'],
  'Honda': ['Civic', 'CR-V', 'HR-V', 'Jazz', 'e:Ny1', 'ZR-V', 'Accord', 'CR-Z'],
  'Hyundai': ['i10', 'i20', 'i30', 'i40', 'Kona', 'Tucson', 'Santa Fe', 'Ioniq', 'Ioniq 5', 'Ioniq 6', 'Bayon', 'Nexo'],
  'Jaguar': ['E-Pace', 'F-Pace', 'I-Pace', 'XE', 'XF', 'F-Type', 'XJ'],
  'Jeep': ['Renegade', 'Compass', 'Cherokee', 'Grand Cherokee', 'Wrangler', 'Avenger'],
  'Kia': ['Picanto', 'Rio', 'Ceed', 'ProCeed', 'XCeed', 'Stonic', 'Niro', 'Sportage', 'Sorento', 'EV6', 'EV9', 'Stinger'],
  'Land Rover': ['Defender', 'Discovery', 'Discovery Sport', 'Range Rover', 'Range Rover Evoque', 'Range Rover Sport', 'Range Rover Velar'],
  'Lexus': ['CT', 'ES', 'IS', 'LS', 'NX', 'RX', 'UX', 'LC', 'RC', 'RZ'],
  'Mazda': ['2', '3', '6', 'CX-3', 'CX-30', 'CX-5', 'CX-60', 'MX-5', 'MX-30'],
  'Mercedes-Benz': ['A', 'B', 'C', 'CLA', 'CLS', 'E', 'EQA', 'EQB', 'EQC', 'EQE', 'EQS', 'G', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'S', 'AMG GT', 'Sprinter', 'V', 'Vito'],
  'Mini': ['Cooper', 'Cooper S', 'Clubman', 'Countryman', 'Electric'],
  'Mitsubishi': ['ASX', 'Eclipse Cross', 'Outlander', 'Space Star', 'L200', 'Pajero'],
  'Nissan': ['Micra', 'Note', 'Pulsar', 'Leaf', 'Qashqai', 'X-Trail', 'Juke', 'Ariya', 'Navara', 'GT-R', '370Z'],
  'Opel': ['Corsa', 'Corsa-e', 'Astra', 'Insignia', 'Mokka', 'Mokka-e', 'Crossland', 'Grandland', 'Combo', 'Vivaro', 'Zafira'],
  'Peugeot': ['108', '208', '2008', '308', '3008', '408', '508', '5008', 'Partner', 'Rifter', 'Traveller', 'e-208', 'e-2008'],
  'Porsche': ['911', '718 Boxster', '718 Cayman', 'Cayenne', 'Macan', 'Panamera', 'Taycan'],
  'Renault': ['Twingo', 'Clio', 'Captur', 'Megane', 'Megane E-Tech', 'Scenic', 'Kadjar', 'Arkana', 'Austral', 'Koleos', 'Talisman', 'Kangoo', 'Trafic', 'Master', 'Zoe'],
  'Seat': ['Ibiza', 'Leon', 'Arona', 'Ateca', 'Tarraco', 'Alhambra', 'Mii'],
  'Škoda': ['Fabia', 'Scala', 'Octavia', 'Superb', 'Kamiq', 'Karoq', 'Kodiaq', 'Enyaq', 'Enyaq Coupé', 'Citigo', 'Rapid'],
  'Smart': ['ForTwo', 'ForFour', '#1'],
  'Subaru': ['Impreza', 'XV', 'Outback', 'Forester', 'Levorg', 'BRZ', 'Solterra'],
  'Suzuki': ['Swift', 'Ignis', 'Baleno', 'Vitara', 'S-Cross', 'Jimny', 'Across', 'Swace'],
  'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck'],
  'Toyota': ['Aygo', 'Aygo X', 'Yaris', 'Yaris Cross', 'Corolla', 'Camry', 'Prius', 'C-HR', 'RAV4', 'Highlander', 'Land Cruiser', 'Supra', 'GR86', 'bZ4X', 'Proace', 'Hilux'],
  'Volkswagen': ['up!', 'Polo', 'Golf', 'Golf Variant', 'ID.3', 'ID.4', 'ID.5', 'ID.7', 'ID.Buzz', 'T-Cross', 'T-Roc', 'Tiguan', 'Tiguan Allspace', 'Touareg', 'Passat', 'Arteon', 'Caddy', 'Multivan', 'Transporter', 'Touran', 'Sharan'],
  'Volvo': ['XC40', 'XC60', 'XC90', 'C40', 'S60', 'S90', 'V60', 'V60 Cross Country', 'V90', 'V90 Cross Country', 'EX30', 'EX90'],
};

/** Get all makes sorted alphabetically */
export function getVehicleMakes(): string[] {
  return Object.keys(VEHICLE_MAKES).sort((a, b) => a.localeCompare(b, 'sk'));
}

/** Get models for a specific make, sorted alphabetically */
export function getVehicleModels(make: string): string[] {
  const models = VEHICLE_MAKES[make];
  if (!models) return [];
  return [...models].sort((a, b) => a.localeCompare(b, 'sk'));
}

/** Check if a make exists in the predefined list */
export function isKnownMake(make: string): boolean {
  return make in VEHICLE_MAKES;
}

/** Check if a model exists for a given make */
export function isKnownModel(make: string, model: string): boolean {
  const models = VEHICLE_MAKES[make];
  if (!models) return false;
  return models.includes(model);
}

/** Fuel type options */
export const FUEL_TYPES = [
  { value: 'petrol', label: 'Benzín' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Elektro' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'plugin_hybrid', label: 'Plug-in Hybrid' },
  { value: 'lpg', label: 'LPG' },
  { value: 'cng', label: 'CNG' },
] as const;

export type FuelType = typeof FUEL_TYPES[number]['value'];
