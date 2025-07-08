import { DragonOptimizationExample } from '@/components/examples/DragonOptimizationExample'
import Head from 'next/head'

export default function DragonTestPage() {
  return (
    <>
      <Head>
        <title>Dragon Optimization Test | Seiron</title>
        <meta name="description" content="Test dragon rendering performance and optimizations" />
      </Head>
      <DragonOptimizationExample />
    </>
  )
}