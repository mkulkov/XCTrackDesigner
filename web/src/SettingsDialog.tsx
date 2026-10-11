import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export function SettingsDialog({
  open,
  title,
  description,
  close,
  children,
}: {
  open: boolean
  title: string
  description: string
  close: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className="designer-dialog"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className="dialog-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <button aria-label="Закрыть настройки" onClick={close}>
          <X size={18} />
        </button>
      </div>
      <div className="dialog-body">{open ? children : null}</div>
    </dialog>
  )
}
