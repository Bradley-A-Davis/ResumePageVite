import { useCallback, useEffect, useRef, useState } from "react"

function Egg() {
  const [svgMarkup, setSvgMarkup] = useState("")
  const [isFeeding, setIsFeeding] = useState(false)
  const [isDraggingBasket, setIsDraggingBasket] = useState(false)
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 })
  const [eggsEaten, setEggsEaten] = useState(0)
  const [showPopup, setShowPopup] = useState(false)
  const [popupText, setPopupText] = useState("")
  const [orderText, setOrderText] = useState("")
  const [eggPackCount, setEggPackCount] = useState(null)
  const [showEggCountPopup, setShowEggCountPopup] = useState(false)
  const [eggCountPopupText, setEggCountPopupText] = useState("")
  const dragPosRef = useRef({ x: 0, y: 0 })
  const eggmanRef = useRef(null)
  const feedingTimeoutRef = useRef(null)
  const popupTimeoutRef = useRef(null)
  const eggCountSwapTimeoutRef = useRef(null)

  const isOverEggman = useCallback((x, y) => {
    const target = document.elementFromPoint(x, y)
    return Boolean(eggmanRef.current && target && eggmanRef.current.contains(target))
  }, [])

  const triggerFeeding = useCallback(() => {
    setIsFeeding(true)
    setEggsEaten((count) => {
      const nextCount = count + 1
      if (nextCount === 10 || nextCount === 15 || nextCount === 19 || nextCount === 26) {
        if (nextCount === 10) setPopupText("6 EGGS")
        if (nextCount === 15) setPopupText("3 EGGS")
        if (nextCount === 19) setPopupText("2 EGGS")
        if (nextCount === 26) {
          setPopupText(
            'Dude, you ran out of eggs. Would you like to buy a 80 pack of eggs?'
          )
        }
        setShowPopup(true)
        if (popupTimeoutRef.current) {
          window.clearTimeout(popupTimeoutRef.current)
        }
        if (nextCount !== 26) {
          popupTimeoutRef.current = window.setTimeout(() => {
            setShowPopup(false)
          }, 3000)
        }
      }
      return nextCount
    })
    setEggPackCount((count) => {
      if (count === 80) {
        setEggCountPopupText("You now have 40 eggs.")
        setShowEggCountPopup(true)
        if (popupTimeoutRef.current) {
          window.clearTimeout(popupTimeoutRef.current)
        }
        popupTimeoutRef.current = window.setTimeout(() => {
          setShowEggCountPopup(false)
        }, 3000)
        return 40
      }
      if (typeof count === "number") {
        const nextCount = Math.max(0, count - 1)
        if (nextCount === 39) {
          setEggCountPopupText("41 EGGS")
          setShowEggCountPopup(true)
          if (popupTimeoutRef.current) {
            window.clearTimeout(popupTimeoutRef.current)
          }
          if (eggCountSwapTimeoutRef.current) {
            window.clearTimeout(eggCountSwapTimeoutRef.current)
          }
          popupTimeoutRef.current = window.setTimeout(() => {
            setShowEggCountPopup(false)
          }, 4000)
          eggCountSwapTimeoutRef.current = window.setTimeout(() => {
            setEggCountPopupText("Congrats big boy")
          }, 2000)
        }
        return nextCount
      }
      return count
    })
    if (feedingTimeoutRef.current) {
      window.clearTimeout(feedingTimeoutRef.current)
    }
    feedingTimeoutRef.current = window.setTimeout(() => {
      setIsFeeding(false)
    }, 600)
  }, [])

  useEffect(() => {
    let isMounted = true
    fetch("/sprites/egggame/eggman.svg")
      .then((res) => res.text())
      .then((text) => {
        if (isMounted) setSvgMarkup(text)
      })
    return () => {
      isMounted = false
    }
  }, [])
  useEffect(() => {
    if (!isDraggingBasket) return
    const handleMouseUp = (event) => {
      setIsDraggingBasket(false)
      const x = event?.clientX ?? dragPosRef.current.x
      const y = event?.clientY ?? dragPosRef.current.y
      if (isOverEggman(x, y)) triggerFeeding()
    }
    const handleMouseMove = (event) => {
      setDragPos({ x: event.clientX, y: event.clientY })
      dragPosRef.current = { x: event.clientX, y: event.clientY }
    }
    window.addEventListener("mouseup", handleMouseUp)
    window.addEventListener("dragend", handleMouseUp)
    window.addEventListener("mousemove", handleMouseMove)
    return () => {
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("dragend", handleMouseUp)
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [isDraggingBasket, isOverEggman, triggerFeeding])
  useEffect(() => {
    return () => {
      if (feedingTimeoutRef.current) {
        window.clearTimeout(feedingTimeoutRef.current)
      }
      if (popupTimeoutRef.current) {
        window.clearTimeout(popupTimeoutRef.current)
      }
      if (eggCountSwapTimeoutRef.current) {
        window.clearTimeout(eggCountSwapTimeoutRef.current)
      }
    }
  }, [])
  useEffect(() => {
    const className = "egg-cursor"
    if (isDraggingBasket) {
      document.body.classList.add(className)
    } else {
      document.body.classList.remove(className)
    }
  }, [isDraggingBasket])

  return (
    <main style={{ backgroundColor: "#fff", minHeight: "100vh" }}>
        <div
          style={{
            backgroundColor: "#CCCACA",
            border: "4px solid #000",
            boxSizing: "border-box",
            minHeight: "calc(100vh - 80px)",
            margin: "40px",
            position: "relative",
          }}
        >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 48,
            borderTop: "4px solid #000",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 48,
            backgroundColor: "#fff",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 70,
              transform: "translateX(-50%)",
              fontFamily: '"Press Start 2P", monospace',
              fontSize: 36,
              color: "#000",
            }}
          >
            FEED EGGS
          </div>
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              style={{
                position: "absolute",
                left: 10,
                right: 10,
                top: 6 + index * 10,
                borderTop: "2px solid #000",
              }}
            />
          ))}
        </div>
        {showPopup ? (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: "780px",
              height: "360px",
              backgroundColor: "#fff",
              border: "4px solid #000",
              transform: "translate(-50%, -50%)",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 24,
                right: 24,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 36,
                fontFamily: '"Press Start 2P", monospace',
                color: "#000",
                textAlign: "center",
                lineHeight: 1.4,
                zIndex: 2,
              }}
            >
              {popupText}
              {popupText.includes("Dude, you ran out of eggs") ? (
                <input
                  type="text"
                  aria-label="Egg order quantity"
                  style={{
                    marginTop: 16,
                    width: "100%",
                    padding: "8px 10px",
                    border: "2px solid #000",
                    backgroundColor: "#fff",
                    color: "#000",
                    fontFamily: '"Press Start 2P", monospace',
                    fontSize: 16,
                    boxSizing: "border-box",
                    display: "block",
                    position: "relative",
                    zIndex: 3,
                  }}
                  value={orderText}
                  onChange={(event) => {
                    const nextValue = event.target.value
                    setOrderText(nextValue)
                    if (nextValue.trim().toLowerCase() === "yes") {
                      setShowPopup(false)
                      setEggPackCount(80)
                    }
                  }}
                />
              ) : null}
            </div>
            <div
              style={{
                position: "absolute",
                left: 8,
                right: 8,
                top: 8,
                bottom: 8,
                border: "1px solid #000",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: 48,
                backgroundColor: "#fff",
                pointerEvents: "none",
                zIndex: 1,
              }}
            >
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  style={{
                    position: "absolute",
                    left: 10,
                    right: 10,
                    top: 6 + index * 10,
                    borderTop: "2px solid #000",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 48,
                borderTop: "4px solid #000",
                pointerEvents: "none",
                zIndex: 1,
              }}
            />
          </div>
        ) : null}
        {showEggCountPopup ? (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: "780px",
              height: "360px",
              backgroundColor: "#fff",
              border: "4px solid #000",
              transform: "translate(-50%, -50%)",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 8,
                right: 8,
                top: 8,
                bottom: 8,
                border: "1px solid #000",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: 48,
                backgroundColor: "#fff",
                pointerEvents: "none",
                zIndex: 1,
              }}
            >
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  style={{
                    position: "absolute",
                    left: 10,
                    right: 10,
                    top: 6 + index * 10,
                    borderTop: "2px solid #000",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 48,
                borderTop: "4px solid #000",
                pointerEvents: "none",
                zIndex: 1,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 24,
                right: 24,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 36,
                fontFamily: '"Press Start 2P", monospace',
                color: "#000",
                textAlign: "center",
                lineHeight: 1.4,
                zIndex: 2,
              }}
            >
              {eggCountPopupText}
            </div>
          </div>
        ) : null}
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap");

        .eggman svg {
          display: block;
          width: 266.67px;
          height: auto;
        }
        body {
          overflow: hidden;
        }
        .eggman.is-open svg #path7,
        .eggman.is-open svg #path8,
        .eggman.is-open svg #path9,
        .eggman.is-open svg #path11,
        .eggman.is-open svg #path12 {
          display: none !important;
        }
        .eggman.is-open svg #path2,
        .eggman.is-open svg #ellipse2,
        .eggman.is-open svg #path3,
        .eggman.is-open svg #ellipse3 {
          display: inline !important;
        }
        .eggman.is-open svg #path4 {
          display: inline !important;
        }
        .eggman.is-feeding svg #path7,
        .eggman.is-feeding svg #path8,
        .eggman.is-feeding svg #path9,
        .eggman.is-feeding svg #path11,
        .eggman.is-feeding svg #path12 {
          display: inline !important;
        }
        .eggman.is-feeding svg #path2,
        .eggman.is-feeding svg #ellipse2,
        .eggman.is-feeding svg #path3,
        .eggman.is-feeding svg #ellipse3 {
          display: none !important;
        }
        .eggman.is-feeding svg #path4 {
          display: none !important;
        }
        .eggman.is-feeding svg #path9,
        .eggman.is-feeding svg #path11,
        .eggman.is-feeding svg #path12 {
          display: inline !important;
          transform-box: fill-box;
          transform-origin: center;
          animation: mouth-pulse 0.3s ease-in-out infinite;
        }
        .eggman.is-feeding svg #path11 {
          animation: mouth-corner-left 0.3s ease-in-out infinite;
        }
        .eggman.is-feeding svg #path12 {
          animation: mouth-corner-right 0.3s ease-in-out infinite;
        }
        @keyframes mouth-pulse {
          0%,
          100% {
            transform: scaleX(1);
          }
          50% {
            transform: scaleX(0.5);
          }
        }
        @keyframes mouth-corner-left {
          0%,
          100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(37.1231px);
          }
        }
        @keyframes mouth-corner-right {
          0%,
          100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(-37.1231px);
          }
        }
        body.egg-cursor {
          cursor: grabbing;
        }
      `}</style>
        <div
        ref={eggmanRef}
        className={`eggman ${isFeeding ? "is-feeding" : "is-open"}`}
        style={{ position: "fixed", left: 80, bottom: 80 }}
        aria-label="Eggman"
        role="img"
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
      <img
        src="/sprites/egggame/eggbasket.png"
        alt="Egg basket"
        style={{ position: "fixed", right: 80, bottom: 80, cursor: "grab" }}
        onMouseDown={(event) => {
          setDragPos({ x: event.clientX, y: event.clientY })
          dragPosRef.current = { x: event.clientX, y: event.clientY }
          setIsDraggingBasket(true)
        }}
        onDragStart={(event) => event.preventDefault()}
      />
      {eggPackCount !== null ? (
        <div
          style={{
            position: "fixed",
            right: 120,
            bottom: 50,
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 18,
            color: "#000",
          }}
        >
          EGGS: {eggPackCount}
        </div>
      ) : null}
        {isDraggingBasket ? (
          <svg
            width="72"
            height="90"
            viewBox="0 0 32 40"
            aria-hidden="true"
            style={{
              position: "fixed",
              left: dragPos.x,
              top: dragPos.y,
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
            }}
          >
            <ellipse
              cx="16"
              cy="20"
              rx="12"
              ry="16"
              fill="#fff"
              stroke="#000"
              strokeWidth="1"
            />
          </svg>
        ) : null}
      </div>
    </main>
  )
}

export default Egg
