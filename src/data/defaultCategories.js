export const DEFAULT_CATEGORIES = [
  { key: 'default:Personal', id: null, name: 'Personal', color: '#38d9c6', icon: '◇', isDefault: true },
  { key: 'default:Trabajo', id: null, name: 'Trabajo', color: '#65a8ff', icon: '▣', isDefault: true },
  { key: 'default:Estudio', id: null, name: 'Estudio', color: '#b99cff', icon: '◈', isDefault: true },
  { key: 'default:Salud', id: null, name: 'Salud', color: '#59dd91', icon: '✚', isDefault: true },
  { key: 'default:Finanzas', id: null, name: 'Finanzas', color: '#f0bd65', icon: '$', isDefault: true },
  { key: 'default:Bienestar', id: null, name: 'Bienestar', color: '#ff91b6', icon: '☼', isDefault: true },
  { key: 'default:Social', id: null, name: 'Social', color: '#f58b68', icon: '◎', isDefault: true },
]

export function mergeCategories(customCategories = []) {
  return [
    ...DEFAULT_CATEGORIES,
    ...customCategories.map((category) => ({
      ...category,
      key: `custom:${category.id}`,
      isDefault: false,
    })),
  ]
}

export function findCategory(categories, keyOrName) {
  return categories.find((category) => category.key === keyOrName)
    || categories.find((category) => category.name === keyOrName)
    || DEFAULT_CATEGORIES[0]
}
