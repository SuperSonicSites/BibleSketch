
import React from 'react';

export const WatermarkOverlay: React.FC = () => {
  return (
    <div 
      className="absolute inset-0 z-[50] w-full h-full pointer-events-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='300' height='300' viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='150' y='150' font-family='sans-serif' font-weight='900' font-size='40' fill='rgba(0,0,0,0.15)' transform='rotate(-45 150 150)' text-anchor='middle' dominant-baseline='middle'%3EBible Sketch%3C/text%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundPosition: 'center',
        mixBlendMode: 'multiply' // Helps it sit "into" the white page better
      }}
    />
  );
};
