import { TradeItem } from './types.js';

// Comprehensive trade items organized by logical categories
export const TRADE_ITEMS: TradeItem[] = [
  // ========================================
  // SPECIAL STATION ITEMS (always available)
  // ========================================
  {
    id: 'fuel',
    name: 'Fuel',
    category: 'fuel',
    basePrice: 10,
    weight: 0,
    rarity: 'common'
  },
  {
    id: 'probe',
    name: 'Probe',
    category: 'technology',
    basePrice: 10,
    weight: 0,
    rarity: 'common'
  },

  // ========================================
  // RAW MATERIALS (Mineable Resources)
  // ========================================
  {
    id: 'iron_ore',
    name: 'Iron Ore',
    category: 'raw_materials',
    basePrice: 25,
    weight: 5,
    rarity: 'common'
  },
  {
    id: 'gold_ore',
    name: 'Gold Ore',
    category: 'raw_materials',
    basePrice: 150,
    weight: 3,
    rarity: 'common'
  },
  {
    id: 'platinum_ore',
    name: 'Platinum Ore',
    category: 'raw_materials',
    basePrice: 300,
    weight: 2,
    rarity: 'uncommon'
  },
  {
    id: 'copper_ore',
    name: 'Copper Ore',
    category: 'raw_materials',
    basePrice: 20,
    weight: 4,
    rarity: 'common'
  },
  {
    id: 'titanium_ore',
    name: 'Titanium Ore',
    category: 'raw_materials',
    basePrice: 180,
    weight: 3,
    rarity: 'uncommon'
  },
  {
    id: 'uranium_ore',
    name: 'Uranium Ore',
    category: 'raw_materials',
    basePrice: 500,
    weight: 4,
    rarity: 'rare'
  },
  {
    id: 'lithium_ore',
    name: 'Lithium Ore',
    category: 'raw_materials',
    basePrice: 80,
    weight: 2,
    rarity: 'common'
  },
  {
    id: 'rare_earth_metals',
    name: 'Rare Earth Metals',
    category: 'raw_materials',
    basePrice: 400,
    weight: 2,
    rarity: 'uncommon'
  },
  {
    id: 'crystalline_carbon',
    name: 'Crystalline Carbon',
    category: 'raw_materials',
    basePrice: 250,
    weight: 1,
    rarity: 'uncommon'
  },
  {
    id: 'xenonite_crystals',
    name: 'Xenonite Crystals',
    category: 'raw_materials',
    basePrice: 800,
    weight: 1,
    rarity: 'rare'
  },
  {
    id: 'neutronium_alloy',
    name: 'Neutronium Alloy',
    category: 'raw_materials',
    basePrice: 1500,
    weight: 1,
    rarity: 'legendary'
  },

  // ========================================
  // RESOURCES (Food, Drink, Life Support)
  // ========================================
  {
    id: 'water',
    name: 'Purified Water',
    category: 'resources',
    basePrice: 15,
    weight: 4,
    rarity: 'common'
  },
  {
    id: 'oxygen',
    name: 'Oxygen Canisters',
    category: 'resources',
    basePrice: 30,
    weight: 3,
    rarity: 'common'
  },
  {
    id: 'food_rations',
    name: 'Emergency Food Rations',
    category: 'resources',
    basePrice: 50,
    weight: 3,
    rarity: 'common'
  },
  {
    id: 'hydroponic_vegetables',
    name: 'Fresh Hydroponic Vegetables',
    category: 'resources',
    basePrice: 75,
    weight: 2,
    rarity: 'common'
  },
  {
    id: 'synthetic_meat',
    name: 'Synthetic Protein',
    category: 'resources',
    basePrice: 100,
    weight: 2,
    rarity: 'uncommon'
  },
  {
    id: 'wine',
    name: 'Aged Space Wine',
    category: 'resources',
    basePrice: 200,
    weight: 1,
    rarity: 'uncommon'
  },
  {
    id: 'beer',
    name: 'Craft Zero-G Beer',
    category: 'resources',
    basePrice: 80,
    weight: 2,
    rarity: 'common'
  },
  {
    id: 'coffee',
    name: 'Premium Coffee Beans',
    category: 'resources',
    basePrice: 120,
    weight: 1,
    rarity: 'uncommon'
  },
  {
    id: 'medicine',
    name: 'Medical Supplies',
    category: 'resources',
    basePrice: 150,
    weight: 2,
    rarity: 'common'
  },
  {
    id: 'vitamins',
    name: 'Vitamin Supplements',
    category: 'resources',
    basePrice: 60,
    weight: 1,
    rarity: 'common'
  },
  {
    id: 'luxury_spices',
    name: 'Exotic Spices',
    category: 'resources',
    basePrice: 300,
    weight: 1,
    rarity: 'rare'
  },

  // ========================================
  // TECHNOLOGY (Electronics, Computing)
  // ========================================
  {
    id: 'scrap_electronics',
    name: 'Salvaged Electronics',
    category: 'technology',
    basePrice: 40,
    weight: 2,
    rarity: 'common'
  },
  {
    id: 'basic_circuits',
    name: 'Basic Circuit Boards',
    category: 'technology',
    basePrice: 80,
    weight: 1,
    rarity: 'common'
  },
  {
    id: 'computer_cores',
    name: 'Computer Processing Cores',
    category: 'technology',
    basePrice: 200,
    weight: 2,
    rarity: 'uncommon'
  },
  {
    id: 'quantum_chips',
    name: 'Quantum Computer Chips',
    category: 'technology',
    basePrice: 400,
    weight: 1,
    rarity: 'uncommon'
  },
  {
    id: 'advanced_processors',
    name: 'Advanced Neural Processors',
    category: 'technology',
    basePrice: 600,
    weight: 1,
    rarity: 'rare'
  },
  {
    id: 'ai_cores',
    name: 'AI Processing Cores',
    category: 'technology',
    basePrice: 1200,
    weight: 2,
    rarity: 'rare'
  },
  {
    id: 'holographic_storage',
    name: 'Holographic Storage Matrices',
    category: 'technology',
    basePrice: 350,
    weight: 1,
    rarity: 'uncommon'
  },
  {
    id: 'nano_fabricators',
    name: 'Nano-Fabrication Units',
    category: 'technology',
    basePrice: 800,
    weight: 3,
    rarity: 'rare'
  },
  {
    id: 'sensor_arrays',
    name: 'Advanced Sensor Arrays',
    category: 'technology',
    basePrice: 500,
    weight: 4,
    rarity: 'uncommon'
  },
  {
    id: 'communication_relays',
    name: 'Quantum Communication Relays',
    category: 'technology',
    basePrice: 700,
    weight: 3,
    rarity: 'rare'
  },
  {
    id: 'power_cells',
    name: 'High-Capacity Power Cells',
    category: 'technology',
    basePrice: 180,
    weight: 2,
    rarity: 'common'
  },

  // ========================================
  // MILITARY (Weapons, Defense, Equipment)
  // ========================================
  {
    id: 'missiles',
    name: 'Plasma Missiles',
    category: 'military',
    basePrice: 300,
    weight: 3,
    rarity: 'uncommon'
  },
  {
    id: 'torpedo_warheads',
    name: 'Antimatter Torpedo Warheads',
    category: 'military',
    basePrice: 800,
    weight: 4,
    rarity: 'rare'
  },
  {
    id: 'fusion_reactors',
    name: 'Military Fusion Reactors',
    category: 'military',
    basePrice: 1500,
    weight: 8,
    rarity: 'rare'
  },
  {
    id: 'armor_plating',
    name: 'Reactive Armor Plating',
    category: 'military',
    basePrice: 400,
    weight: 6,
    rarity: 'uncommon'
  },
  {
    id: 'shield_generators',
    name: 'Energy Shield Generators',
    category: 'military',
    basePrice: 600,
    weight: 5,
    rarity: 'uncommon'
  },
  {
    id: 'laser_cannons',
    name: 'Pulse Laser Cannon Arrays',
    category: 'military',
    basePrice: 900,
    weight: 7,
    rarity: 'rare'
  },
  {
    id: 'plasma_weapons',
    name: 'Plasma Weapon Systems',
    category: 'military',
    basePrice: 1100,
    weight: 6,
    rarity: 'rare'
  },
  {
    id: 'targeting_systems',
    name: 'Advanced Targeting Systems',
    category: 'military',
    basePrice: 500,
    weight: 2,
    rarity: 'uncommon'
  },
  {
    id: 'countermeasures',
    name: 'Electronic Countermeasures',
    category: 'military',
    basePrice: 350,
    weight: 3,
    rarity: 'uncommon'
  },
  {
    id: 'military_supplies',
    name: 'Military Supply Caches',
    category: 'military',
    basePrice: 250,
    weight: 4,
    rarity: 'common'
  },
  {
    id: 'battle_armor',
    name: 'Personal Battle Armor',
    category: 'military',
    basePrice: 700,
    weight: 3,
    rarity: 'rare'
  },

  // ========================================
  // LUXURY GOODS & CONTRABAND
  // ========================================
  {
    id: 'luxury_textiles',
    name: 'Luxury Textiles',
    category: 'luxury',
    basePrice: 200,
    weight: 1,
    rarity: 'uncommon'
  },
  {
    id: 'artwork',
    name: 'Rare Galactic Artwork',
    category: 'luxury',
    basePrice: 1500,
    weight: 2,
    rarity: 'legendary'
  },
  {
    id: 'exotic_pets',
    name: 'Exotic Alien Pets',
    category: 'luxury',
    basePrice: 800,
    weight: 1,
    rarity: 'rare'
  },
  {
    id: 'illegal_stims',
    name: 'Illegal Combat Stimulants',
    category: 'contraband',
    basePrice: 600,
    weight: 1,
    rarity: 'uncommon'
  },
  {
    id: 'black_market_tech',
    name: 'Black Market Technology',
    category: 'contraband',
    basePrice: 900,
    weight: 2,
    rarity: 'rare'
  },
  {
    id: 'stolen_data',
    name: 'Stolen Corporate Data',
    category: 'contraband',
    basePrice: 1200,
    weight: 1,
    rarity: 'rare'
  }
];

// Helper functions for working with trade items
export const getItemById = (itemId: string): TradeItem | undefined =>
  TRADE_ITEMS.find(item => item.id === itemId);

export const getItemsByCategory = (category: TradeItem['category']): TradeItem[] =>
  TRADE_ITEMS.filter(item => item.category === category);

export const getItemsByRarity = (rarity: TradeItem['rarity']): TradeItem[] =>
  TRADE_ITEMS.filter(item => item.rarity === rarity);

// Station type definitions with specializations
export const STATION_TYPES = {
  'Military': {
    name: 'Military Station',
    class: 'A',
    categories: ['military', 'technology', 'resources'],
    description: 'High-security military outpost trading weapons and military equipment'
  },
  'Mining': {
    name: 'Mining Station',
    class: 'B',
    categories: ['raw_materials', 'resources', 'technology'],
    description: 'Industrial mining facility processing raw materials'
  },
  'Trading': {
    name: 'Trading Hub',
    class: 'C',
    categories: ['resources', 'technology', 'luxury'],
    description: 'Commercial trading hub with diverse goods'
  },
  'Research': {
    name: 'Research Station',
    class: 'D',
    categories: ['technology', 'raw_materials'],
    description: 'Scientific research facility developing new technologies'
  },
  'Outpost': {
    name: 'Frontier Outpost',
    class: 'E',
    categories: ['resources', 'raw_materials'],
    description: 'Basic frontier outpost with essential supplies'
  }
};

// Get random items based on station type and categories
export const getStationInventory = (stationType: keyof typeof STATION_TYPES, itemCount: number = 8): TradeItem[] => {
  const stationConfig = STATION_TYPES[stationType];
  const availableItems = TRADE_ITEMS.filter(item =>
    stationConfig.categories.includes(item.category) ||
    item.category === 'fuel' // All stations have fuel and probes
  );

  return getWeightedRandomSelection(availableItems, itemCount, stationConfig.class as 'A' | 'B' | 'C' | 'D' | 'E');
};

// Generate weighted random selection based on rarity and station class
export const getWeightedRandomSelection = (items: TradeItem[], count: number, stationClass: 'A' | 'B' | 'C' | 'D' | 'E'): TradeItem[] => {
  const rarityWeights = {
    'A': { common: 0.2, uncommon: 0.3, rare: 0.3, legendary: 0.2 },
    'B': { common: 0.3, uncommon: 0.4, rare: 0.25, legendary: 0.05 },
    'C': { common: 0.5, uncommon: 0.3, rare: 0.15, legendary: 0.05 },
    'D': { common: 0.6, uncommon: 0.25, rare: 0.1, legendary: 0.05 },
    'E': { common: 0.8, uncommon: 0.15, rare: 0.05, legendary: 0.0 }
  };

  const weights = rarityWeights[stationClass];
  const selectedItems: TradeItem[] = [];
  const usedItems = new Set<string>();

  for (let i = 0; i < count; i++) {
    const random = Math.random();
    let targetRarity: TradeItem['rarity'];

    if (random < weights.common) targetRarity = 'common';
    else if (random < weights.common + weights.uncommon) targetRarity = 'uncommon';
    else if (random < weights.common + weights.uncommon + weights.rare) targetRarity = 'rare';
    else targetRarity = 'legendary';

    const rarityItems = items.filter(item =>
      item.rarity === targetRarity && !usedItems.has(item.id) && item.category !== 'contraband'
    );

    if (rarityItems.length > 0) {
      const randomItem = rarityItems[Math.floor(Math.random() * rarityItems.length)];
      selectedItems.push(randomItem);
      usedItems.add(randomItem.id);
    } else {
      // Fallback to any available item if no items of target rarity
      const fallbackItems = items.filter(item => !usedItems.has(item.id) && item.category !== 'contraband');
      if (fallbackItems.length > 0) {
        const randomItem = fallbackItems[Math.floor(Math.random() * fallbackItems.length)];
        selectedItems.push(randomItem);
        usedItems.add(randomItem.id);
      }
    }
  }

  return selectedItems;
};

// Legacy functions for backward compatibility
export const getRandomItems = (count: number, excludeContraband: boolean = true): TradeItem[] => {
  const availableItems = excludeContraband
    ? TRADE_ITEMS.filter(item => item.category !== 'contraband')
    : TRADE_ITEMS;

  const shuffled = [...availableItems].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
};

export const getWeightedRandomItems = (count: number, stationClass: 'A' | 'B' | 'C' | 'D' | 'E'): TradeItem[] => {
  return getWeightedRandomSelection(TRADE_ITEMS, count, stationClass);
};