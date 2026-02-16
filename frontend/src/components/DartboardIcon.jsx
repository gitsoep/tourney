export default function DartboardIcon({ className = 'w-6 h-6' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer ring */}
      <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.5" />
      {/* Middle ring */}
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      {/* Inner ring */}
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
      {/* Bullseye */}
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      {/* Cross lines */}
      <line x1="12" y1="1" x2="12" y2="5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="1.2" />
      <line x1="1" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="1.2" />
      <line x1="19" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="1.2" />
      {/* Dart */}
      <line x1="18" y1="2" x2="12.5" y2="11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <polygon points="19,1 20.5,4 17,2.5" fill="currentColor" />
    </svg>
  );
}
