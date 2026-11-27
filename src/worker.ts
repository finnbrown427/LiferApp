type Env = {
  ASSETS: {
    fetch(request: Request): Promise<Response>
  }
  EBIRD_API_TOKEN?: string
}

const EBIRD_API_ORIGIN = 'https://api.ebird.org'
const EBIRD_API_PREFIX = '/api/ebird/'
const REGION_CODE_PATTERN = /^[A-Z0-9]{1,3}(?:-[A-Z0-9]{1,3})*$/
const HOTSPOT_ID_PATTERN = /^L[0-9]{1,10}$/
const SPECIES_CODE_PATTERN = /^[a-z0-9-]{2,20}$/

function isRegionOrHotspotCode(value: string): boolean {
  return REGION_CODE_PATTERN.test(value) || HOTSPOT_ID_PATTERN.test(value)
}

function hasOnlyParams(searchParams: URLSearchParams, allowed: string[]): boolean {
  const keys = [...searchParams.keys()]
  return keys.every((key) =>
    allowed.includes(key) && searchParams.getAll(key).length === 1,
  )
}

function hasIntegerParam(
  searchParams: URLSearchParams,
  name: string,
  minimum: number,
  maximum: number,
): boolean {
  const value = Number(searchParams.get(name))
  return searchParams.has(name)
    && Number.isInteger(value)
    && value >= minimum
    && value <= maximum
}

function hasNumberParam(
  searchParams: URLSearchParams,
  name: string,
  minimum: number,
  maximum: number,
): boolean {
  const value = Number(searchParams.get(name))
  return searchParams.has(name)
    && Number.isFinite(value)
    && value >= minimum
    && value <= maximum
}

function isAllowedRequest(path: string[], searchParams: URLSearchParams): boolean {
  if (path.length === 3 && path.join('/') === 'ref/taxonomy/ebird') {
    return hasOnlyParams(searchParams, ['fmt', 'cat'])
      && searchParams.get('fmt') === 'json'
      && searchParams.get('cat') === 'species'
  }

  if (
    path.length === 3
    && path[0] === 'product'
    && path[1] === 'spplist'
    && REGION_CODE_PATTERN.test(path[2])
  ) {
    return searchParams.size === 0
  }

  if (
    path.length === 4
    && path[0] === 'data'
    && path[1] === 'obs'
    && isRegionOrHotspotCode(path[2])
    && path[3] === 'recent'
  ) {
    return hasOnlyParams(searchParams, ['back'])
      && hasIntegerParam(searchParams, 'back', 1, 30)
  }

  if (
    path.length === 5
    && path[0] === 'data'
    && path[1] === 'obs'
    && REGION_CODE_PATTERN.test(path[2])
    && path[3] === 'recent'
    && SPECIES_CODE_PATTERN.test(path[4])
  ) {
    return hasOnlyParams(searchParams, ['back', 'hotspot'])
      && hasIntegerParam(searchParams, 'back', 1, 30)
      && searchParams.get('hotspot') === 'true'
  }

  if (path.length === 3 && path.join('/') === 'ref/hotspot/geo') {
    return hasOnlyParams(searchParams, ['lat', 'lng', 'dist', 'fmt', 'cap'])
      && hasNumberParam(searchParams, 'lat', -90, 90)
      && hasNumberParam(searchParams, 'lng', -180, 180)
      && hasNumberParam(searchParams, 'dist', 0, 50)
      && searchParams.get('fmt') === 'json'
      && searchParams.get('cap') === '500'
  }

  return false
}

async function handleEbirdRequest(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response('Method not allowed.', {
      status: 405,
      headers: { Allow: 'GET' },
    })
  }

  const requestUrl = new URL(request.url)
  let path: string[]
  try {
    path = requestUrl.pathname
      .slice(EBIRD_API_PREFIX.length)
      .split('/')
      .map((segment) => decodeURIComponent(segment))
  } catch {
    return new Response('Invalid eBird request path.', { status: 400 })
  }

  if (!path.length || !isAllowedRequest(path, requestUrl.searchParams)) {
    return new Response('Unsupported eBird request.', { status: 400 })
  }

  const token = env.EBIRD_API_TOKEN
  if (!token) {
    return new Response('The eBird API token is not configured.', { status: 500 })
  }

  const upstreamUrl = new URL(
    `/v2/${path.map((segment) => encodeURIComponent(segment)).join('/')}`,
    EBIRD_API_ORIGIN,
  )
  upstreamUrl.search = requestUrl.search

  const upstreamResponse = await fetch(upstreamUrl, {
    headers: { 'X-eBirdApiToken': token },
    signal: request.signal,
  })

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: {
      'Content-Type': upstreamResponse.headers.get('Content-Type') ?? 'application/json',
    },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)
    if (pathname === '/api/ebird' || pathname.startsWith(EBIRD_API_PREFIX)) {
      return handleEbirdRequest(request, env)
    }

    return env.ASSETS.fetch(request)
  },
}
