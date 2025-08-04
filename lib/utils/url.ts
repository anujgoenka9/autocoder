export const getURL = () => {
  const url = process.env.BASE_URL!
  
  // Make sure to include a trailing `/`.
  return url.endsWith('/') ? url : `${url}/`
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