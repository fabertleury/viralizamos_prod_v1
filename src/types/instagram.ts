export interface InstagramPost {
  id: string;
  code: string;
  shortcode?: string;
  image_versions?: {
    url: string;
    width: number;
    height: number;
  }[];
  like_count: number;
  comment_count: number;
  views_count?: number;
  is_video?: boolean;
  is_reel?: boolean;
  product_type?: string;
  caption?: string | {
    text: string;
  };
  link: string;
  media_type?: number | string;
  video_url?: string;
  video_duration?: number;
  thumbnail_url?: string;
  image_url?: string;
  display_url?: string;
  permalink?: string;
  instagram_url?: string;
  selected?: boolean;
  displayName?: string;
}
