declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    STUDY_ADMIN_USER_ID?: string;
    STUDY_ADMIN_EMAIL?: string;
    BUCKET?: R2Bucket;
  }
}
