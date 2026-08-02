import { ImageResponse } from 'next/og';

/**
 * Favicon generado dinámicamente por Next.js.
 * Diseño coherente con el `BrandMark`: gradiente cyan → azul → violeta con un
 * cuadrado central en el color de la superficie base. Cuadrado por definición
 * y liviano: se sirve como PNG optimizado por el runtime de Next.
 */

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        background: 'linear-gradient(135deg, #22d3ee 0%, #3b82f6 50%, #8b5cf6 100%)',
      }}
    >
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: 2,
          background: '#070b16',
        }}
      />
    </div>,
    size,
  );
}
