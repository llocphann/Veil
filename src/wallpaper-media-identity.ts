export interface WallpaperMediaIdentity {
  path: string;
  url: string;
  modifiedAt: number;
  size: number;
  revision: number;
}

export function wallpaperMediaIdentityKey(identity: WallpaperMediaIdentity): string {
  return [
    identity.path,
    identity.url,
    identity.modifiedAt,
    identity.size,
    identity.revision,
  ].join("|");
}
