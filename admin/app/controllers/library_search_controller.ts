import { SystemService } from '#services/system_service'
import { getSpellingSuggestion } from '#services/spelling_service'
import { SERVICE_NAMES } from '../../constants/service_names.js'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class LibrarySearchController {
  constructor(private systemService: SystemService) {}

  async index({ inertia }: HttpContext) {
    const services = await this.systemService.getServices({ installedOnly: true })
    return inertia.render('library-search', {
      kiwixService:
        services.find((service) => service.service_name === SERVICE_NAMES.KIWIX) ?? null,
    })
  }

  async reader({ inertia }: HttpContext) {
    const services = await this.systemService.getServices({ installedOnly: true })
    return inertia.render('library-reader', {
      kiwixService:
        services.find((service) => service.service_name === SERVICE_NAMES.KIWIX) ?? null,
    })
  }

  async document({ inertia }: HttpContext) {
    return inertia.render('library-document')
  }

  async spelling({ request, response }: HttpContext) {
    const query = String(request.input('q', '')).trim()
    if (!query || query.length > 120) {
      return response.badRequest({ message: 'Search text must be between 1 and 120 characters.' })
    }
    return { query, suggestion: await getSpellingSuggestion(query) }
  }
}
