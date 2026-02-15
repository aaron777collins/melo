import axios from "axios";

// Tenor API types
export interface TenorGif {
  id: string;
  title: string;
  media_formats: {
    gif: { url: string; dims: number[]; size: number };
    tinygif: { url: string; dims: number[]; size: number };
    mediumgif: { url: string; dims: number[]; size: number };
    nanogif: { url: string; dims: number[]; size: number };
  };
  content_description: string;
  itemurl: string;
  hasaudio: boolean;
  tags: string[];
  url: string;
}

export interface TenorSearchResponse {
  results: TenorGif[];
  next: string;
}

export interface TenorTrendingResponse {
  results: TenorGif[];
  next: string;
}

/**
 * Tenor API client for searching and fetching GIFs
 */
export class TenorAPI {
  private readonly apiKey: string;
  private readonly baseUrl: string = "https://tenor.googleapis.com/v2";

  constructor(apiKey?: string) {
    // Use provided API key or fallback to environment variable
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_TENOR_API_KEY || "";
    
    if (!this.apiKey) {
      console.warn("Tenor API key not found. GIF search may not work.");
    }
  }

  /**
   * Search for GIFs based on a query
   */
  async searchGifs(
    query: string,
    limit: number = 20,
    pos?: string
  ): Promise<TenorSearchResponse> {
    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        q: query,
        limit: limit.toString(),
        media_filter: "gif,tinygif,mediumgif",
        contentfilter: "medium", // Safe content filtering
      });

      if (pos) {
        params.append("pos", pos);
      }

      const response = await axios.get<TenorSearchResponse>(
        `${this.baseUrl}/search?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      console.error("Failed to search GIFs:", error);
      throw new Error("Failed to search GIFs");
    }
  }

  /**
   * Get trending GIFs
   */
  async getTrendingGifs(
    limit: number = 20,
    pos?: string
  ): Promise<TenorTrendingResponse> {
    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        limit: limit.toString(),
        media_filter: "gif,tinygif,mediumgif",
        contentfilter: "medium",
      });

      if (pos) {
        params.append("pos", pos);
      }

      const response = await axios.get<TenorTrendingResponse>(
        `${this.baseUrl}/featured?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      console.error("Failed to get trending GIFs:", error);
      throw new Error("Failed to get trending GIFs");
    }
  }

  /**
   * Get categories for GIF discovery
   */
  async getCategories(): Promise<string[]> {
    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        type: "featured",
      });

      const response = await axios.get(
        `${this.baseUrl}/categories?${params.toString()}`
      );

      // Extract category names from response
      return response.data.tags?.map((tag: any) => tag.searchterm) || [];
    } catch (error) {
      console.error("Failed to get categories:", error);
      return []; // Return empty array on error
    }
  }

  /**
   * Get the optimal GIF URL for display
   * Prefers medium size, falls back to gif, then tinygif
   */
  getOptimalGifUrl(gif: TenorGif): string {
    const { media_formats } = gif;
    
    if (media_formats.mediumgif?.url) {
      return media_formats.mediumgif.url;
    }
    
    if (media_formats.gif?.url) {
      return media_formats.gif.url;
    }
    
    if (media_formats.tinygif?.url) {
      return media_formats.tinygif.url;
    }

    // Fallback to the main URL
    return gif.url;
  }

  /**
   * Get dimensions for a GIF
   */
  getGifDimensions(gif: TenorGif): { width: number; height: number } {
    const { media_formats } = gif;
    
    let dims = media_formats.mediumgif?.dims || 
               media_formats.gif?.dims || 
               media_formats.tinygif?.dims || 
               [300, 200]; // Default dimensions

    return {
      width: dims[0],
      height: dims[1]
    };
  }
}

// Default instance
export const tenorAPI = new TenorAPI();