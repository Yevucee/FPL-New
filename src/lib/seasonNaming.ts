export function seasonNameFromSlug(slug: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(slug);
  if (!match) return slug.replace(/-/g, "/");
  return `${match[1]}/${match[2]}`;
}

export function seasonSlugFromName(name: string): string {
  return name.replace("/", "-");
}
