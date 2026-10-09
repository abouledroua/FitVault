export function BrandLogo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="vaultGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id="laserGradient" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#10B981" stopOpacity="1" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      
      {/* Outer Vault Shield */}
      <path 
        d="M50 5 L90 20 L90 60 C90 80 70 95 50 95 C30 95 10 80 10 60 L10 20 Z" 
        stroke="url(#vaultGradient)" 
        strokeWidth="4" 
        fill="#0B0F17" 
      />
      
      {/* Inner Vault Shield Pattern */}
      <path 
        d="M50 12 L82 24 L82 58 C82 74 65 87 50 87 C35 87 18 74 18 58 L18 24 Z" 
        stroke="#1E293B" 
        strokeWidth="1" 
        fill="transparent" 
      />
      
      {/* Laser Scan Barcode Lines */}
      <rect x="35" y="30" width="4" height="40" fill="url(#laserGradient)" rx="2" />
      <rect x="43" y="35" width="4" height="30" fill="url(#laserGradient)" rx="2" />
      <rect x="51" y="25" width="4" height="50" fill="url(#laserGradient)" rx="2" />
      <rect x="59" y="38" width="4" height="24" fill="url(#laserGradient)" rx="2" />
      
      {/* Laser horizontal scanner line glowing effect */}
      <line x1="25" y1="50" x2="75" y2="50" stroke="#06B6D4" strokeWidth="2" strokeOpacity="0.7" />
      <circle cx="50" cy="50" r="2" fill="#fff" />
    </svg>
  );
}
