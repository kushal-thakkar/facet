// utils/apiClient.js

// Determine the API base URL based on the environment
const getApiBaseUrl = () => {
  // Check for environment variable (will be available in Node.js environment)
  if (process.env.API_URL) {
    return process.env.API_URL;
  }

  // Running in browser
  if (typeof window !== 'undefined' && window.location) {
    // Use the same origin as the frontend, but change port to 8000
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:8000`;
  }

  // Default fallback
  return 'http://backend:8000';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Makes a fetch request to the API
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} options - Fetch options
 * @returns {Promise} - Fetch promise
 */
export const fetchApi = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  console.log(`Making API request to: ${url}`);

  // Set default headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      mode: 'cors',
      credentials: 'same-origin',
    });

    // Handle non-2xx responses
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}): ${errorText}`);
      throw new Error(`API Error: ${response.statusText}`);
    }

    // Parse JSON response
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Request Failed:', error);
    throw error;
  }
};

// Common API methods
export const api = {
  // GET request
  get: (endpoint, options = {}) => fetchApi(endpoint, { ...options, method: 'GET' }),

  // POST request
  post: (endpoint, data, options = {}) =>
    fetchApi(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // PUT request
  put: (endpoint, data, options = {}) =>
    fetchApi(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // DELETE request
  delete: (endpoint, options = {}) => fetchApi(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
