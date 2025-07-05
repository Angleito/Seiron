import { ComponentType, lazy, Suspense } from 'react'

interface DynamicOptions {
  loading?: () => JSX.Element
}

export default function dynamic<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T } | T>,
  options?: DynamicOptions
): T {
  const Component = lazy(async () => {
    const module = await loader()
    return 'default' in module ? module : { default: module }
  }) as unknown as T

  const DynamicComponent = (props: any) => (
    <Suspense fallback={options?.loading?.() || null}>
      <Component {...props} />
    </Suspense>
  )

  return DynamicComponent as T
}