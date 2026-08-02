import { ImageResponse } from 'next/og';

/**
 * Icono de app para iOS (180×180). Mismo lenguaje visual que el favicon, con
 * mayor tamaño para verse nítido al añadir el sitio a la pantalla de inicio.
 */

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 40,
          background: 'linear-gradient(135deg, #22d3ee 0%, #3b82f6 50%, #8b5cf6 100%)',
        }}
      >
        <div
          style={{
            width: 70,
            height: 70,
            borderRadius: 12,
            background: '#070b16',
          }}
        />
      </div>
    ),
    size,
  );
}
