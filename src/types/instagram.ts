export interface InstagramPost {
  id: string;
  code: string;
  image_versions?: {
    url: string;
    width: number;
    height: number;
  }[];
  like_count: number;
  comment_count: number;
  views_count?: number;
  is_video?: boolean;
  caption?: {
    text: string;
  };
  link: string;
  media_type?: number;
  video_url?: string;
  video_duration?: number;
}
