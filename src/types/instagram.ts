export interface InstagramPost {
  id: string;
  code: string;
  image_versions: {
    items: Array<{
      url: string;
      width: number;
      height: number;
    }>;
  };
  like_count: number;
  comment_count: number;
  caption?: {
    text: string;
  };
  taken_at: number;
  link: string;
  display_url?: string;
}
