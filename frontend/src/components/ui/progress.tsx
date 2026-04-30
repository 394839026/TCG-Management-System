import * as React from 'react'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value = 0, className, ...props }, ref) => {
    const safeValue = Math.max(0, Math.min(100, value))
    
    return (
      <div
        ref={ref}
        className={`relative w-full overflow-hidden rounded-full ${className}`}
        style={{ height: '12px', backgroundColor: '#d1d5db' }}
        {...props}
      >
        <div
          className="h-full transition-all"
          style={{ 
            width: `${safeValue}%`,
            backgroundColor: '#10b981',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}
        />
      </div>
    )
  }
)
Progress.displayName = 'Progress'

export { Progress }