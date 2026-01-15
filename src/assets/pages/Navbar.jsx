import { useEffect, useRef, useState } from 'react';

export default function Navbar({ items = [], activeIndex = 0, onSelect }) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [scrollNudge, setScrollNudge] = useState(0);
  const lastActiveIndex = useRef(activeIndex);
  const nudgeTimeoutRef = useRef(0);

  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.innerWidth <= 640);
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  useEffect(() => {
    const delta = activeIndex - lastActiveIndex.current;
    if (delta === 0) return;
    lastActiveIndex.current = activeIndex;
    const direction = delta > 0 ? 1 : -1;
    setScrollNudge(direction * 28);
    if (nudgeTimeoutRef.current) {
      clearTimeout(nudgeTimeoutRef.current);
    }
    nudgeTimeoutRef.current = window.setTimeout(() => {
      setScrollNudge(0);
      nudgeTimeoutRef.current = 0;
    }, 420);
  }, [activeIndex]);

  const panelWrapperStyle = {
    position: 'fixed',
    left: isMobile ? 0 : '20px',
    top: '50%',
    transform: `translateY(calc(-50% + ${scrollNudge}px))`,
    zIndex: 1000,
    transition: 'transform 0.7s ease-out',
  };

  const panelStyle = {
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.04))',
    borderRadius: isMobile ? '0 22px 22px 0' : '22px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
    border: '1px solid rgba(255, 255, 255, 0.28)',
    backdropFilter: 'blur(16px) saturate(140%)',
    WebkitBackdropFilter: 'blur(16px) saturate(140%)',
    overflow: 'hidden',
    width: open ? 'fit-content' : '44px',
    padding: open ? '20px 28px 20px 18px' : '10px 0',
    transition: 'width 0.2s ease, padding 0.2s ease',
  };

  const arrowStyle = {
    display: 'block',
    width: '14px',
    height: '14px',
    borderRight: '2px solid rgba(255, 255, 255, 0.85)',
    borderBottom: '2px solid rgba(255, 255, 255, 0.85)',
    borderRadius: '2px',
    transform: open ? 'rotate(135deg)' : 'rotate(-45deg)',
    filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35))',
  };

  return (
    <>
      <style>{`
        .nav-panel-bob {
          display: block;
          animation: navArrowBob 3.6s ease-in-out infinite;
        }
        @keyframes navArrowBob {
          0%,
          10%,
          18%,
          26%,
          100% {
            transform: translateY(0);
          }
          6% {
            transform: translateY(-12px);
          }
          14% {
            transform: translateY(-6px);
          }
          22% {
            transform: translateY(-3px);
          }
        }
      `}</style>
      <div style={panelWrapperStyle}>
        <div className={open ? '' : 'nav-panel-bob'} style={panelStyle}>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-label={open ? 'Hide navigation' : 'Show navigation'}
            style={{
              position: open ? 'absolute' : 'relative',
              right: open ? '4px' : 'auto',
              left: open ? 'auto' : '50%',
              top: open ? '50%' : '0',
              transform: open ? 'translateY(-50%)' : 'translateX(-50%)',
              background: 'transparent',
              borderRadius: 0,
              padding: 0,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span style={arrowStyle} />
          </button>

        {open && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {[...items].reverse().map((item, index) => {
              const actualIndex = items.length - 1 - index;
              return (
              <li key={item.title} style={{ marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => onSelect?.(actualIndex)}
                  style={{
                    textDecoration: 'none',
                    color:
                      actualIndex === activeIndex
                        ? 'rgba(255, 255, 255, 1)'
                        : 'rgba(255, 255, 255, 0.82)',
                    fontWeight: 600,
                    fontSize: actualIndex === activeIndex ? '16px' : '15px',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    transition: 'color 0.3s ease, text-shadow 0.3s ease',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--color-gray)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color =
                      actualIndex === activeIndex
                        ? 'rgba(255, 255, 255, 1)'
                        : 'rgba(255, 255, 255, 0.82)';
                  }}
                >
                  {item.title}
                </button>
              </li>
            )})}
          </ul>
        )}
        </div>
      </div>
    </>
  );
}
