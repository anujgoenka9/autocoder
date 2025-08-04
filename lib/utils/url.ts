export const getURL = () => {
  const url = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
  
  if (!url) {
    throw new Error('NEXT_PUBLIC_BASE_URL environment variable is not set')
  }
  
  // Make sure to include https:// and trailing /
  let finalUrl = url
  if (!finalUrl.startsWith('http')) {
    finalUrl = `https://${finalUrl}`
  }
  if (!finalUrl.endsWith('/')) {
    finalUrl = `${finalUrl}/`
  }
  
  return finalUrl
}

export const getAuthCallbackURL = (redirect?: string, priceId?: string) => {
  const baseURL = getURL().replace(/\/$/, '') // Remove trailing slash
  let callbackURL = `${baseURL}/auth/callback`
  
  if (redirect) {
    callbackURL += `?redirect=${redirect}`
  }
  
  if (priceId) {
    callbackURL += `${redirect ? '&' : '?'}priceId=${priceId}`
  }
  
  return callbackURL
} 