export function cn(...classes: Array<string | number | boolean | null | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}
