import { useCallback, useEffect, useRef, useState } from 'react'

const HOME_WHITE = '#F0F2F8'

function Imposter({ onFlashComplete }) {
  const [flashSeed, setFlashSeed] = useState(0)
  const flashLockRef = useRef(0)
  const flashCompleteRef = useRef(false)
  const [flowSpot, setFlowSpot] = useState({ x: 50, y: 50 })
  const touchStartRef = useRef(null)
  const touchTriggeredRef = useRef(false)

  const triggerFlash = useCallback(() => {
    const now = Date.now()
    if (now - flashLockRef.current < 700) return
    flashLockRef.current = now
    setFlashSeed((seed) => seed + 1)
  }, [])

  useEffect(() => {
    const handleWheel = (event) => {
      if (Math.abs(event.deltaY) < 5) return
      triggerFlash()
    }

    window.addEventListener('wheel', handleWheel, { passive: true })
    return () => {
      window.removeEventListener('wheel', handleWheel)
    }
  }, [triggerFlash])

  const hasFlash = flashSeed > 0
  const handleFlashComplete = useCallback(() => {
    if (flashCompleteRef.current) return
    flashCompleteRef.current = true
    if (onFlashComplete) onFlashComplete()
  }, [onFlashComplete])
  const handleTouchStart = useCallback((event) => {
    const touch = event.touches[0]
    if (!touch) return
    touchStartRef.current = touch.clientY
    touchTriggeredRef.current = false
  }, [])
  const handleTouchMove = useCallback(
    (event) => {
      if (touchStartRef.current == null) return
      const touch = event.touches[0]
      if (!touch) return
      const deltaY = touchStartRef.current - touch.clientY
      if (!touchTriggeredRef.current && Math.abs(deltaY) > 60) {
        touchTriggeredRef.current = true
        triggerFlash()
      }
    },
    [triggerFlash]
  )
  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null
    touchTriggeredRef.current = false
  }, [])
  const handleFlowMove = useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    setFlowSpot({ x, y })
  }, [])
  const handleFlowLeave = useCallback(() => {
    setFlowSpot({ x: 50, y: 50 })
  }, [])

  return (
    <>
      <style>{`
        @keyframes phoneRevealFlash {
          0% {
            opacity: 1;
            transform: translate(0, 0) rotate(-90deg) scale(4.2);
            border-radius: 0;
          }
          65% {
            opacity: 1;
            transform: translate(0, 0) rotate(0deg) scale(1);
            border-radius: 56px;
          }
          100% {
            opacity: 0;
            transform: translate(0, 0) rotate(0deg) scale(1);
            border-radius: 56px;
          }
        }
        @keyframes cameraFlashPulse {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.35);
          }
          12% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          40% {
            opacity: 0.2;
            transform: translate(-50%, -50%) scale(1.9);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(2.6);
          }
        }
        @keyframes screenFlashPulse {
          0% {
            opacity: 0;
          }
          25% {
            opacity: 0;
          }
          40% {
            opacity: 1;
          }
          55% {
            opacity: 0.92;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes dataFlowPulse {
          0% {
            opacity: 0.35;
            transform: scale(0.85);
          }
          45% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
        }
        @keyframes dataStream {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 200% 50%;
          }
        }
        @media (max-width: 820px) {
          body {
            overflow: hidden;
          }
          .imposter-page {
            touch-action: none;
            overscroll-behavior: none;
          }
          .imposter-phone {
            display: none !important;
          }
          .imposter-left {
            position: relative !important;
            top: auto !important;
            bottom: auto !important;
            left: auto !important;
            right: auto !important;
            width: min(520px, 92vw) !important;
            margin: 0 auto;
            min-height: 100vh;
            justify-content: space-evenly !important;
            gap: 18px !important;
            padding: clamp(20px, 6vw, 36px) 0 !important;
          }
        }
      `}</style>
      <main
        className="imposter-page"
        style={{
          minHeight: '100vh',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '48px',
          padding: '0 clamp(24px, 6vw, 96px)',
          background:
            'radial-gradient(900px 420px at 12% 8%, rgba(255,114,76,0.22), transparent 60%), radial-gradient(900px 520px at 88% 12%, rgba(255,176,104,0.18), transparent 60%), radial-gradient(700px 520px at 50% 90%, rgba(120,36,24,0.35), transparent 65%), linear-gradient(160deg, #050607 0%, #0b0d12 55%, #120707 100%)',
          backgroundAttachment: 'fixed',
          backgroundSize: 'cover',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div
          key={`screen-flash-${flashSeed}`}
          style={{
            position: 'fixed',
            inset: 0,
            background: HOME_WHITE,
            animation: hasFlash ? 'screenFlashPulse 1s ease forwards' : 'none',
            animationDelay: hasFlash ? '0.28s' : '0s',
            opacity: 0,
            zIndex: 999,
            pointerEvents: 'none',
          }}
          onAnimationEnd={hasFlash ? handleFlashComplete : undefined}
        />
        <div
          className="imposter-left"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 'clamp(24px, 6vw, 96px)',
            width: 'min(460px, 92vw)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-evenly',
            padding: 'clamp(24px, 6vw, 56px) 0',
          }}
        >
          <div
            style={{
              padding: '18px 20px',
              borderRadius: '18px',
              background:
                'linear-gradient(180deg, rgba(20,16,16,0.85), rgba(9,7,8,0.7))',
              border: '1px solid rgba(255,150,108,0.25)',
              boxShadow:
                '0 20px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
              color: 'rgba(246,214,186,0.85)',
              fontFamily:
                '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(28px, 3.6vw, 38px)',
                letterSpacing: '-0.02em',
                fontFamily:
                  '"Cinzel", "Cormorant Garamond", "Times New Roman", serif',
                backgroundImage:
                  'linear-gradient(120deg, rgba(255,242,214,1), rgba(255,168,112,0.98), rgba(255,98,98,0.98))',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
                textShadow: '0 20px 44px rgba(4,6,12,0.65)',
              }}
            >
              Imposter
            </h1>
            <p
              style={{
                margin: '10px 0 0',
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'rgba(246,214,186,0.78)',
              }}
            >
              Imposter is a fast-paced multiplayer word-deduction game where one
              player doesn't know the secret word. Blend in, ask smart
              questions, and figure out who's faking it before time runs out.
            </p>
          </div>
          <div
            style={{
              padding: '16px 18px',
              borderRadius: '16px',
              background:
                'linear-gradient(135deg, rgba(255,248,236,0.98), rgba(255,214,180,0.92))',
              border: '1px solid rgba(120,70,50,0.22)',
              color: '#0b0d12',
              boxShadow:
                '0 18px 28px rgba(6,8,12,0.55), inset 0 1px 0 rgba(255,255,255,0.7)',
              fontFamily:
                '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px',
                borderRadius: '999px',
                background: 'rgba(255,150,90,0.2)',
                border: '1px solid rgba(255,150,90,0.35)',
                fontSize: '11px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              2025
            </div>
            <h2
              style={{
                margin: '10px 0 6px',
                fontSize: '18px',
                letterSpacing: '-0.01em',
              }}
            >
              imposter.davisbisbee.com
            </h2>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5 }}>
              Crafted using React, Vite, Three.js, and Socket.io in order to
              create an immersive and synchronised online experience to the
              traditionally offline game!
            </p>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                marginTop: '10px',
              }}
            >
              {['React', 'Vite', 'Three.js'].map((item) => (
                <span
                  key={item}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(120,70,50,0.18)',
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div
            onMouseMove={handleFlowMove}
            onMouseLeave={handleFlowLeave}
            style={{
              padding: '16px 18px',
              borderRadius: '18px',
              background: `radial-gradient(240px 140px at ${flowSpot.x}% ${flowSpot.y}%, rgba(255,170,110,0.22), transparent 60%), linear-gradient(180deg, rgba(20,16,16,0.86), rgba(9,7,8,0.72))`,
              border: '1px solid rgba(255,150,108,0.25)',
              boxShadow:
                '0 20px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
              color: 'rgba(246,214,186,0.85)',
              fontFamily:
                '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(255,204,164,0.7)',
              }}
            >
              Backend Sync Flow
            </div>
            <h3 style={{ margin: '8px 0 10px', fontSize: '16px' }}>
              Socket relay to live game state
            </h3>
            <div
              style={{
                display: 'grid',
                gap: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                {['Client', 'Socket.io', 'Lobby Hub', 'Word Engine'].map(
                  (item) => (
                    <div
                      key={item}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        background:
                          'linear-gradient(135deg, rgba(255,248,236,0.96), rgba(255,214,180,0.92))',
                        color: '#0b0d12',
                        border: '1px solid rgba(120,70,50,0.22)',
                        boxShadow: '0 10px 18px rgba(5,7,12,0.4)',
                      }}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '999px',
                          background: '#ff9a5c',
                          boxShadow: '0 0 0 3px rgba(255,154,92,0.25)',
                          animation: 'dataFlowPulse 1.8s ease infinite',
                        }}
                      />
                      {item}
                    </div>
                  )
                )}
              </div>
              <div
                style={{
                  height: '6px',
                  borderRadius: '999px',
                  background:
                    'linear-gradient(90deg, rgba(255,170,120,0.15), rgba(255,170,120,0.7), rgba(255,170,120,0.15))',
                  backgroundSize: '200% 100%',
                  animation: 'dataStream 2.6s linear infinite',
                }}
              />
              <div style={{ fontSize: '12px', lineHeight: 1.5 }}>
                Events route through the lobby hub, sync state, and feed the
                word engine so every player sees the same moment.
              </div>
            </div>
          </div>
        </div>
        <div
          className="imposter-phone"
          style={{
            position: 'relative',
            marginLeft: 'auto',
            height: '84vh',
            width: 'min(370px, 40vw)',
            aspectRatio: '1284 / 2778',
          }}
        >
          <img
            src="/sprites/Tryme1.png"
            alt="Try me"
            style={{
              position: 'absolute',
              right: 'calc(100% + 20px)',
              top: '12%',
              width: 'min(260px, 28vw)',
              height: 'auto',
              filter: 'drop-shadow(0 18px 28px rgba(0, 0, 0, 0.45))',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                `linear-gradient(160deg, ${HOME_WHITE} 0%, ${HOME_WHITE} 48%, ${HOME_WHITE} 100%)`,
              borderRadius: '56px',
              border: '2px solid #d6d9de',
              boxShadow:
                '0 18px 46px rgba(15, 17, 21, 0.18), inset 0 0 0 1px rgba(255, 255, 255, 0.65)',
              zIndex: 3,
              animation: 'phoneRevealFlash 1.4s ease forwards',
              transformOrigin: 'center',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                height: '100%',
                width: '100%',
                borderRadius: '56px',
                padding: '18px 12px 22px',
                boxSizing: 'border-box',
                position: 'relative',
                background: HOME_WHITE,
                boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.8)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '14px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '58%',
                  height: '26px',
                  borderRadius: '16px',
                  background: HOME_WHITE,
                  boxShadow: 'inset 0 -1px 0 rgba(255, 255, 255, 0.65)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: '52px 12px 18px',
                  borderRadius: '40px',
                  background: HOME_WHITE,
                  border: '1px solid #e1e4ea',
                  boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.7)',
                }}
              />
            </div>
          </div>
          <div
            style={{
              height: '100%',
              width: '100%',
              borderRadius: '56px',
              border: '2px solid #181b20',
              background: '#0f1115',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
              position: 'relative',
              padding: '18px 12px 22px',
              boxSizing: 'border-box',
              zIndex: 2,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '14px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '58%',
                height: '26px',
                borderRadius: '16px',
                background: '#0b0d10',
              }}
            >
              <div
                key={`camera-flash-${flashSeed}`}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '78%',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${HOME_WHITE} 0%, ${HOME_WHITE} 40%, rgba(255, 255, 255, 0.2) 70%, rgba(255, 255, 255, 0) 100%)`,
                  boxShadow:
                    '0 0 12px rgba(255, 255, 255, 0.85), 0 0 28px rgba(198, 255, 239, 0.65)',
                  animation: hasFlash
                    ? 'cameraFlashPulse 0.65s ease forwards'
                    : 'none',
                  animationDelay: hasFlash ? '0.12s' : '0s',
                  transform: 'translate(-50%, -50%)',
                  opacity: 0,
                }}
              />
            </div>
            <div
              style={{
                position: 'absolute',
                inset: '52px 12px 18px',
                borderRadius: '40px',
                overflow: 'hidden',
                background: '#0b0d10',
              }}
            >
              <iframe
                title="imposter-davisbisbee"
                src="https://imposter.davisbisbee.com"
                style={{
                  width: '100%',
                  height: '100%',
                  border: '0',
                  display: 'block',
                  background: '#0b0d10',
                }}
                loading="eager"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export default Imposter
