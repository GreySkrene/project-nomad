import type { ZimFileWithMetadata } from '../../types/zim.js'
import type { StoredFileInfo } from '../../types/rag.js'

export type LibraryCategory =
  | 'Emergency'
  | 'Medical'
  | 'Repair'
  | 'Food & water'
  | 'Plants'
  | 'General reference'

export type BrowseProfile = {
  category: LibraryCategory
  description: string
  topics: string[]
  commonSearches: string[]
  formatNote?: string
  priority: number
}

export type ReaderDetails = {
  format: string
  visualCoverage: string
  presentation: string
  entryPath?: string
}

export type DocumentBrowseSet = {
  id: string
  title: string
  summary: string
  topics: string[]
  priority: number
  files: StoredFileInfo[]
}

type CatalogRule = BrowseProfile & { matches: string[] }

const CATALOG_RULES: CatalogRule[] = [
  {
    matches: ['www.ready.gov'],
    category: 'Emergency',
    description:
      'Official U.S. civilian preparedness guidance for hazards, family plans, supplies, alerts, and recovery.',
    topics: ['Disaster plans', 'Power outages', 'Floods', 'Wildfires', 'Radiation'],
    commonSearches: ['power outage', 'earthquake', 'radiation emergency', 'family emergency plan'],
    priority: 0,
  },
  {
    matches: ['wikipedia_en_medicine'],
    category: 'Medical',
    description:
      'A broad offline medical encyclopedia assembled from Wikipedia medical articles. Useful for background reference, not a substitute for emergency services.',
    topics: ['Conditions', 'First aid', 'Anatomy', 'Medicines', 'Public health'],
    commonSearches: ['choking', 'dehydration', 'burn', 'carbon monoxide poisoning'],
    priority: 1,
  },
  {
    matches: ['medlineplus.gov'],
    category: 'Medical',
    description:
      'Consumer health information from the U.S. National Library of Medicine, including symptoms, tests, treatments, and drug information.',
    topics: ['Symptoms', 'Treatments', 'Medical tests', 'Drugs', 'Wellness'],
    commonSearches: ['fever in children', 'wound care', 'medicine safety', 'dehydration'],
    priority: 2,
  },
  {
    matches: ['nhs.uk_medicines', 'nhs.uk-medicines'],
    category: 'Medical',
    description:
      'NHS patient guidance about common medicines: uses, dosing cautions, side effects, and interactions.',
    topics: ['Medicine uses', 'Side effects', 'Who can take it', 'Interactions'],
    commonSearches: ['paracetamol', 'ibuprofen', 'antibiotics', 'missed dose'],
    priority: 3,
  },
  {
    matches: ['wwwnc.cdc.gov'],
    category: 'Medical',
    description:
      'CDC infectious-disease and travel-health reference material. Best for disease prevention and exposure background.',
    topics: ['Infectious disease', 'Prevention', 'Travel health', 'Outbreak reference'],
    commonSearches: [
      'waterborne illness',
      'mosquito bites',
      'foodborne illness',
      'infection prevention',
    ],
    priority: 4,
  },
  {
    matches: ['librepathology'],
    category: 'Medical',
    description:
      'Pathology reference material intended mainly for learners and clinicians; useful for deeper background, not first-response instructions.',
    topics: ['Pathology', 'Microscopy', 'Disease mechanisms', 'Medical study'],
    commonSearches: ['inflammation', 'cell injury', 'infection pathology'],
    priority: 8,
  },
  {
    matches: ['irp.fas.org', 'military_medicine'],
    category: 'Medical',
    description:
      'Military medical reference documents. Some procedures may assume trained personnel or specialized equipment.',
    topics: ['Field medicine', 'Trauma', 'Operational health', 'Medical logistics'],
    commonSearches: ['field sanitation', 'bleeding control', 'heat injury', 'cold injury'],
    formatNote: 'Advanced reference; verify dates and civilian applicability.',
    priority: 9,
  },
  {
    matches: ['ifixit'],
    category: 'Repair',
    description:
      'Illustrated, step-by-step repair guides for electronics, appliances, vehicles, and household equipment.',
    topics: ['Electronics', 'Appliances', 'Tools', 'Parts', 'Troubleshooting'],
    commonSearches: ['battery replacement', 'charging port', 'flashlight repair', 'laptop repair'],
    priority: 1,
  },
  {
    matches: ['diy.stackexchange.com'],
    category: 'Repair',
    description:
      'Community questions and answers about home improvement, electrical, plumbing, heating, and building repair.',
    topics: ['Electrical', 'Plumbing', 'Heating', 'Building', 'Tools'],
    commonSearches: ['shut off water', 'frozen pipe', 'circuit breaker', 'toilet repair'],
    formatNote: 'Community Q&A; compare answers and follow safety codes.',
    priority: 3,
  },
  {
    matches: ['mechanics.stackexchange.com'],
    category: 'Repair',
    description:
      'Community troubleshooting for cars and other motor vehicles, with practical diagnosis and repair discussions.',
    topics: ['Vehicle diagnosis', 'Starting', 'Brakes', 'Electrical', 'Maintenance'],
    commonSearches: ['car will not start', 'dead battery', 'overheating engine', 'flat tire'],
    formatNote: 'Community Q&A; advice varies by vehicle and author.',
    priority: 4,
  },
  {
    matches: ['woodworking.stackexchange.com'],
    category: 'Repair',
    description:
      'Community questions and answers about woodworking tools, joints, materials, finishes, and shop practice.',
    topics: ['Hand tools', 'Joinery', 'Materials', 'Finishing', 'Safety'],
    commonSearches: ['repair broken wood', 'hand saw', 'wood joint', 'tool sharpening'],
    formatNote: 'Community Q&A rather than a structured manual.',
    priority: 7,
  },
  {
    matches: ['foss.cooking'],
    category: 'Food & water',
    description:
      'A recipe collection designed for offline use. Helpful for turning shelf-stable ingredients into meals.',
    topics: ['Recipes', 'Ingredients', 'Meal ideas', 'Cooking methods'],
    commonSearches: ['rice', 'beans', 'bread', 'soup'],
    priority: 2,
  },
  {
    matches: ['cooking.stackexchange.com'],
    category: 'Food & water',
    description:
      'Community questions and answers about cooking technique, food handling, substitutions, and kitchen troubleshooting.',
    topics: ['Cooking technique', 'Food handling', 'Substitutions', 'Storage'],
    commonSearches: [
      'food safety power outage',
      'cook beans',
      'preserve food',
      'substitute ingredient',
    ],
    formatNote: 'Community Q&A; use official sources for safety-critical limits.',
    priority: 4,
  },
  {
    matches: ['gardenology.org'],
    category: 'Plants',
    description:
      'A plant and gardening encyclopedia with species pages and cultivation reference material.',
    topics: ['Plant encyclopedia', 'Identification', 'Cultivation', 'Garden reference'],
    commonSearches: ['tomato', 'potato', 'apple tree', 'plant hardiness'],
    priority: 1,
  },
  {
    matches: ['gardening.stackexchange.com'],
    category: 'Plants',
    description:
      'Community questions and answers about gardening problems, plant care, soil, pests, and propagation.',
    topics: ['Plant problems', 'Soil', 'Pests', 'Propagation', 'Seasonal care'],
    commonSearches: ['yellow leaves', 'compost', 'seed starting', 'garden pests'],
    formatNote: 'Problem-solving Q&A, not a complete plant encyclopedia.',
    priority: 5,
  },
  {
    matches: ['wikipedia_en_top_maxi'],
    category: 'General reference',
    description:
      'A compact illustrated selection of widely read Wikipedia articles for quick general reference.',
    topics: ['Science', 'History', 'Geography', 'Technology', 'Culture'],
    commonSearches: ['cloud', 'weather', 'electricity', 'navigation'],
    priority: 1,
  },
  {
    matches: ['wikipedia_en_all_mini'],
    category: 'General reference',
    description:
      'Broad Wikipedia coverage in a compact text-focused edition. Best when breadth matters more than photographs.',
    topics: ['Encyclopedia', 'Science', 'Places', 'People', 'Concepts'],
    commonSearches: ['cumulonimbus cloud', 'earthquake', 'water purification', 'radio'],
    formatNote: 'Compact edition; images are reduced or omitted.',
    priority: 2,
  },
  {
    matches: ['wikibooks'],
    category: 'General reference',
    description:
      'Open textbooks and how-to books organized into chapters, covering practical skills as well as academic subjects.',
    topics: ['Textbooks', 'How-to guides', 'Languages', 'Computing', 'Practical skills'],
    commonSearches: ['first aid', 'cookbook', 'electronics', 'outdoor skills'],
    priority: 4,
  },
]

const FALLBACK: BrowseProfile = {
  category: 'General reference',
  description:
    'An installed offline reference collection. Open it to browse its table of contents or search within it.',
  topics: ['Offline reference'],
  commonSearches: [],
  priority: 20,
}

export const LIBRARY_CATEGORIES: Array<'All' | LibraryCategory> = [
  'All',
  'Emergency',
  'Medical',
  'Repair',
  'Food & water',
  'Plants',
  'General reference',
]

export function browseProfile(file: ZimFileWithMetadata): BrowseProfile {
  const normalized = file.name.toLowerCase()
  const rule = CATALOG_RULES.find((candidate) =>
    candidate.matches.some((match) => normalized.includes(match))
  )
  if (!rule) return { ...FALLBACK, description: file.summary || FALLBACK.description }
  return {
    ...rule,
    // Prefer our plain-language explanation; raw ZIM descriptions are often
    // promotional fragments and do not explain emergency usefulness.
    description: rule.description,
  }
}

export function displayTitle(file: ZimFileWithMetadata): string {
  if (file.name.includes('wikipedia_en_top_maxi')) return 'Best of Wikipedia — illustrated'
  if (file.name.includes('wikipedia_en_all_mini')) return 'Complete Wikipedia — compact'
  if (file.name.includes('wikipedia_en_medicine')) return 'Wikipedia Medicine'
  if (file.name.includes('gardenology.org_en_all')) return 'Gardenology plant encyclopedia'
  return file.title || file.name.replace(/\.zim$/i, '').replaceAll('_', ' ')
}

/**
 * Explain what opens after leaving NOMAD's curated library surface. Kiwix serves
 * the original archived HTML and CSS, so naming that reader is more honest than
 * making every collection look as though it has one uniform NOMAD document view.
 */
export function readerDetails(file: ZimFileWithMetadata): ReaderDetails {
  const name = file.name.toLowerCase()
  let format = 'Archived reference site'
  let presentation = 'Original archived site layout'
  let entryPath: string | undefined

  if (name.includes('stackexchange.com')) {
    format = 'Community Q&A archive'
  } else if (name.includes('ifixit')) {
    format = 'Step-by-step repair manuals'
  } else if (name.includes('wikipedia_en_all_mini')) {
    format = 'Compact encyclopedia'
    presentation = 'Original Wikipedia article layout'
    // The archive metadata currently points at an obscure user page. The real
    // Main Page is present and is a substantially better browse entry point.
    entryPath = 'Main_Page'
  } else if (name.includes('wikipedia') || name.includes('gardenology')) {
    format = 'Illustrated encyclopedia'
    presentation = 'Original wiki article layout'
  } else if (name.includes('wikibooks')) {
    format = 'Chapter-based open textbooks'
    presentation = 'Original Wikibooks chapter layout'
  } else if (name.includes('foss.cooking')) {
    format = 'Recipe collection'
  } else if (name.includes('medlineplus') || name.includes('nhs.uk')) {
    format = 'Consumer health reference'
  } else if (name.includes('ready.gov') || name.includes('cdc.gov')) {
    format = 'Official guidance archive'
  } else if (name.includes('librepathology')) {
    format = 'Clinical study reference'
    presentation = 'Original wiki article layout'
  } else if (name.includes('irp.fas.org')) {
    format = 'Military medical document index'
  }

  let visualCoverage = 'Text-first collection'
  if (name.includes('_mini_')) {
    visualCoverage = 'Limited images to save space'
  } else if ((file.media_count ?? 0) > 0) {
    visualCoverage = 'Offline images or media included'
  }

  return { format, visualCoverage, presentation, entryPath }
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return 'Size unavailable'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`
}

type DocumentSetRule = Omit<DocumentBrowseSet, 'files'> & {
  matches: (fileName: string) => boolean
}

const DOCUMENT_SET_RULES: DocumentSetRule[] = [
  {
    id: 'clinical-emergency-care',
    title: 'Emergency care & first aid',
    summary:
      'WHO emergency-care manuals and quick cards plus the saved CPR and choking reference. Use quick cards under pressure and full manuals for context.',
    topics: ['CPR', 'Choking', 'Bleeding', 'Triage', 'Emergency care'],
    priority: 0,
    matches: (name) =>
      /who-basic-emergency|postpartum-haemorrhage|aha-2025-cpr-choking/i.test(name),
  },
  {
    id: 'where-there-is-no-doctor',
    title: 'Where There Is No Doctor',
    summary:
      'The complete Hesperian community-health book split into readable chapters, with front matter, glossary, index, contents, and resources.',
    topics: ['Community health', 'Common illness', 'First aid', 'Medicines', 'Prevention'],
    priority: 1,
    matches: (name) => /^en_wtnd_/i.test(name),
  },
  {
    id: 'radiological-weather-preparedness',
    title: 'Radiological & severe-weather preparedness',
    summary:
      'CDC radiological-response briefing material and National Weather Service preparedness guidance for protective actions and planning.',
    topics: ['Radiation', 'Protective actions', 'Severe weather', 'Preparedness'],
    priority: 1.5,
    matches: (name) => /radiation-response|weather-preparedness/i.test(name),
  },
  {
    id: 'midwifery-maternal-health',
    title: 'Midwifery & maternal health',
    summary:
      'The complete Hesperian midwifery book plus WHO guidance on pregnancy and childbirth complications. Supplemental austere-care guidance; current clinical advice takes priority.',
    topics: ['Pregnancy', 'Childbirth', 'Newborn care', 'Complications', 'Postpartum'],
    priority: 2,
    matches: (name) => /^en_midw_|managing-complications-pregnancy/i.test(name),
  },
  {
    id: 'dentistry',
    title: 'Where There Is No Dentist',
    summary:
      'The complete Hesperian oral-health and emergency-dentistry book split into chapters, including its front matter and reference sections.',
    topics: ['Dental pain', 'Oral health', 'Infection', 'Dental emergencies'],
    priority: 3,
    matches: (name) => /^en_dent_/i.test(name),
  },
  {
    id: 'anatomy-physiology',
    title: 'Anatomy & Physiology 2e',
    summary:
      'Oregon State’s complete 2025 anatomy and physiology textbook, retained as an original illustrated PDF for offline study and reference.',
    topics: ['Anatomy', 'Cells', 'Tissues', 'Body systems', 'Physiology'],
    priority: 4,
    matches: (name) => /oregon-state-anatomy-physiology/i.test(name),
  },
  {
    id: 'regional-hazards',
    title: 'Utah & Idaho regional hazards',
    summary:
      'County and state mitigation plans, Utah geological hazard guides, Rexburg-area maps, and Yellowstone reporting for the family’s target regions.',
    topics: ['Earthquakes', 'Liquefaction', 'Floods', 'Wildfire', 'Landslides'],
    priority: 5,
    matches: (name) =>
      /county|utah|idaho|rexburg|ugs-|yellowstone|six-county|putting-down-roots/i.test(name),
  },
  {
    id: 'water-safety',
    title: 'Emergency water safety',
    summary:
      'CDC and EPA instructions for treating, disinfecting, and storing drinking water when normal supplies are unsafe.',
    topics: ['Disinfection', 'Boiling', 'Filters', 'Storage', 'Contamination'],
    priority: 6,
    matches: (name) => /water-treatment|make-water-safe|disinfection-drinking-water/i.test(name),
  },
  {
    id: 'power-home-safety',
    title: 'Power outage, cooking & home safety',
    summary:
      'Official food-safety, generator, battery, fuel, butane, and carbon-monoxide guidance for operating safely during outages.',
    topics: ['Generators', 'Batteries', 'Carbon monoxide', 'Butane', 'Food safety'],
    priority: 7,
    matches: (name) => /cpsc-|power-outage|portable-generator|food-safety-during-power/i.test(name),
  },
  {
    id: 'jackery-explorer-600-v2',
    title: 'Jackery Explorer 600 v2',
    summary:
      'The official JE-600A manual, product guide, and emergency quick reference for charging, solar input, storage, controls, and troubleshooting.',
    topics: ['Charging', 'Solar input', 'Battery storage', 'AC/DC output', 'Troubleshooting'],
    priority: 8,
    matches: (name) => /jackery|explorer-600-v2/i.test(name),
  },
  {
    id: 'legion-go',
    title: 'Lenovo Legion Go',
    summary:
      'The complete 40-page user guide, Lenovo specification reference, and a sourced offline low-power operating card.',
    topics: ['Charging', 'Quiet mode', 'Battery life', 'Controls', 'Troubleshooting'],
    priority: 9,
    matches: (name) => /legion-go/i.test(name),
  },
  {
    id: 'radio-communications',
    title: 'Weather radio & family communications',
    summary:
      'Midland ER10VP manuals, NOAA Weather Radio guidance, FRS coordination, and FEMA family communication planning.',
    topics: ['NOAA radio', 'ER10VP', 'FRS', 'Family plan', 'Alerting'],
    priority: 10,
    matches: (name) => /midland|er10|noaa|frs-|family-communication/i.test(name),
  },
  {
    id: 'maintenance-checklists',
    title: 'Equipment maintenance checklists',
    summary:
      'Locally prepared inspection and maintenance checklists for keeping emergency equipment ready between outages.',
    topics: ['Inspection', 'Batteries', 'Fuel', 'Readiness'],
    priority: 11,
    matches: (name) => /equipment-maintenance|index\.md/i.test(name),
  },
]

export function groupDocumentsForBrowse(files: StoredFileInfo[]): DocumentBrowseSet[] {
  const groups = new Map<string, DocumentBrowseSet>()
  for (const file of files.filter((candidate) => candidate.isUserUpload)) {
    const rule = DOCUMENT_SET_RULES.find((candidate) => candidate.matches(file.fileName))
    const fallbackTitle = file.collection || 'Other saved documents'
    const profile = rule ?? {
      id: `collection:${fallbackTitle}`,
      title: fallbackTitle,
      summary:
        'Saved original source documents for exact wording, diagrams, and page-level reference.',
      topics: ['Offline documents'],
      priority: 20,
    }
    const existing = groups.get(profile.id)
    if (existing) existing.files.push(file)
    else groups.set(profile.id, { ...profile, files: [file] })
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      files: [...group.files].sort((a, b) => a.fileName.localeCompare(b.fileName)),
    }))
    .sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title))
}
