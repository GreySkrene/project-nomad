import vine from '@vinejs/vine'

const routeLocation = vine.object({
  latitude: vine.number().min(-90).max(90),
  longitude: vine.number().min(-180).max(180),
})

export const offlineRouteValidator = vine.compile(
  vine.object({
    locations: vine.array(routeLocation).minLength(2).maxLength(5),
    mode: vine.enum(['driving', 'walking', 'cycling'] as const),
    priority: vine.enum(['fastest', 'shorter'] as const),
    highwayPreference: vine.enum(['neutral', 'avoid', 'prefer'] as const),
    avoidTolls: vine.boolean(),
    avoidFerries: vine.boolean(),
    avoidUnpaved: vine.boolean(),
    avoidTracks: vine.boolean(),
  })
)
