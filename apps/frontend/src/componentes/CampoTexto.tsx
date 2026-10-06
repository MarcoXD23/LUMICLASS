import { Eye, EyeOff } from 'lucide-react';
import { useId, useState, type InputHTMLAttributes } from 'react';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  etiqueta: string;
  error?: string;
  ayuda?: string;
}

/** Campo con etiqueta, ayuda y error accesibles. Las contraseñas tienen botón "Mostrar". */
export function CampoTexto({ etiqueta, error, ayuda, type = 'text', ...resto }: Props) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const esContrasena = type === 'password';
  const descripcion = error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </label>
      <div className="relative">
        <input
          id={id}
          type={esContrasena && visible ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={descripcion}
          className={`w-full rounded-lg border bg-superficie px-3 py-2 ${
            esContrasena ? 'pr-11' : ''
          } ${error ? 'border-error' : 'border-borde'}`}
          {...resto}
        />
        {esContrasena && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-texto-suave"
          >
            {visible ? (
              <EyeOff aria-hidden="true" className="size-5" />
            ) : (
              <Eye aria-hidden="true" className="size-5" />
            )}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-error">
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={`${id}-ayuda`} className="text-sm text-texto-suave">
            {ayuda}
          </p>
        )
      )}
    </div>
  );
}
