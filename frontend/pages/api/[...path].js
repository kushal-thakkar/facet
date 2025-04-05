// pages/api/[...path].js
import { createProxyMiddleware } from 'http-proxy-middleware';
import { NextApiRequest, NextApiResponse } from 'next';

// Create proxy instance outside of the handler to reuse it
const apiUrl =
  process.env.NODE_ENV === 'production'
    ? 'http://backend:8000' // Docker service name in production
    : 'http://localhost:8000'; // Local development

console.log(`API proxy targeting: ${apiUrl}`);

const proxy = createProxyMiddleware({
  target: apiUrl,
  pathRewrite: {
    '^/api': '/api', // Keep the /api prefix
  },
  changeOrigin: true,
  secure: false, // Don't verify SSL certificate
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying ${req.method} ${req.url} to ${apiUrl}${req.url}`);
  },
  onError: (err, req, res) => {
    console.error(`Proxy error for ${req.method} ${req.url}:`, err);
    res.status(500).json({
      error: 'Proxy error',
      details: err.message,
      url: `${apiUrl}${req.url}`,
    });
  },
});

export default function handler(req, res) {
  // Don't pass req/res to avoid modifying the native objects
  return new Promise((resolve, reject) => {
    try {
      // Forward the request to the API server
      proxy(req, res, (result) => {
        if (result instanceof Error) {
          console.error(`Error in API proxy: ${result.message}`);
          return reject(result);
        }
        return resolve(result);
      });
    } catch (error) {
      console.error('Error in API proxy handler:', error);
      res.status(500).json({ error: 'Internal Server Error' });
      resolve();
    }
  });
}

// Disable Next.js body parsing as it can interfere with the proxy
export const config = {
  api: {
    bodyParser: false,
  },
};
