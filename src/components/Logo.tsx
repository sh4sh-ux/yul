export function Logo({ compact = false }: { compact?: boolean }) {
  return <img className={compact ? 'brand-logo compact' : 'brand-logo'} src={`${import.meta.env.BASE_URL}logo-placeholder.svg`} alt="YULI by NARO" />
}
