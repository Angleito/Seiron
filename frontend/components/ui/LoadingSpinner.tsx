export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-dragon-gold/20 border-t-dragon-gold rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 bg-dragon-gold/20 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  )
}