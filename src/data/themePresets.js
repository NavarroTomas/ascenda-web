export const THEME_PRESETS = [
  {
    id: 'standard',
    title: 'Sistema esencial',
    description: 'Interfaz tecnológica y equilibrada con acentos turquesa.',
    icon: '◈',
  },
  {
    id: 'medieval',
    title: 'Aventurero rúnico',
    description: 'Fantasía medieval original con tonos violetas y emblemas rúnicos.',
    icon: '✦',
  },
  {
    id: 'astral',
    title: 'Guerrero Astral',
    description: 'Energía de combate, auras celestes y ascensos de poder originales.',
    icon: '☄',
  },
  {
    id: 'focus',
    title: 'MODO FOCUS',
    description: 'Negro, disciplina, gimnasio, soledad y avance personal sin distracciones.',
    icon: '◼',
    featured: true,
  },
]

export function getThemePreset(id = 'standard') {
  return THEME_PRESETS.find((theme) => theme.id === id) || THEME_PRESETS[0]
}
