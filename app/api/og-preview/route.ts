import { NextRequest, NextResponse } from 'next/server';

/**
 * OpenGraph metadata interface
 */
export interface OpenGraphData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  type?: string;
}

/**
 * Extracts OpenGraph metadata from HTML content
 */
function extractOpenGraphData(html: string, url: string): OpenGraphData {
  const data: OpenGraphData = { url };

  // Extract meta tags using regex (more reliable than JSDOM for server-side)
  const metaTags = html.match(/<meta[^>]*>/gi) || [];
  
  metaTags.forEach((tag) => {
    const propertyMatch = tag.match(/property=['"](og:[^'"]*)['"]/i);
    const contentMatch = tag.match(/content=['"](.*?)['"]/i);
    
    if (propertyMatch && contentMatch) {
      const property = propertyMatch[1].toLowerCase();
      const content = contentMatch[1];
      
      switch (property) {
        case 'og:title':
          data.title = content;
          break;
        case 'og:description':
          data.description = content;
          break;
        case 'og:image':
          // Handle relative URLs
          if (content.startsWith('http')) {
            data.image = content;
          } else if (content.startsWith('/')) {
            const urlObj = new URL(url);
            data.image = `${urlObj.protocol}//${urlObj.host}${content}`;
          }
          break;
        case 'og:site_name':
          data.siteName = content;
          break;
        case 'og:type':
          data.type = content;
          break;
      }
    }
  });

  // Fallback to title tag if no og:title
  if (!data.title) {
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch) {
      data.title = titleMatch[1];
    }
  }

  // Fallback to meta description if no og:description
  if (!data.description) {
    const descMatch = html.match(/<meta[^>]*name=['"](description)['"]*[^>]*content=['"](.*?)['"]/i);
    if (descMatch) {
      data.description = descMatch[2];
    }
  }

  return data;
}

/**
 * Validates if URL is safe to fetch
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * API route handler for OpenGraph metadata extraction
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    if (!isValidUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid URL provided' },
        { status: 400 }
      );
    }

    // Set a timeout for the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'HAOS-LinkPreview/1.0 (Matrix Client)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
          { status: response.status }
        );
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        return NextResponse.json(
          { error: 'URL does not return HTML content' },
          { status: 400 }
        );
      }

      const html = await response.text();
      
      // Limit HTML size to prevent DoS
      if (html.length > 1024 * 1024) { // 1MB limit
        return NextResponse.json(
          { error: 'Response too large' },
          { status: 413 }
        );
      }

      const ogData = extractOpenGraphData(html, url);

      return NextResponse.json(ogData, {
        headers: {
          'Cache-Control': 's-maxage=3600, stale-while-revalidate', // Cache for 1 hour
        }
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout' },
          { status: 408 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch URL content' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('OpenGraph preview error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}