import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  children: ReactNode
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, CSSProperties> = {
  primary: { background: '#17202a', color: '#fff' },
  secondary: { background: '#f4f6f7', color: '#17202a', border: '1px solid #d0d5d8' },
}

export function Button({ variant = 'primary', style, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      style={{
        padding: '0.5rem 1rem',
        borderRadius: '0.375rem',
        border: 'none',
        fontSize: '1rem',
        cursor: 'pointer',
        ...variantStyles[variant],
        ...style,
      }}
    />
  )
}
