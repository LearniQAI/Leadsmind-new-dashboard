import React, { useRef, useEffect, useState } from "react";

const BacktoTop = () => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("down");
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentPosition = window.pageYOffset;
      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = (currentPosition / totalHeight) * 100;

      setScrollProgress(progress);

      // Show or hide button based on scroll position
      if (currentPosition > 1) {
        setScrollDirection("up");
      } else {
        setScrollDirection("down");
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Calculate stroke-dashoffset for the circular progress
  const circleRadius = 49; // Radius of the SVG circle
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset =
    circumference - (scrollProgress / 100) * circumference;

  return (
    <>
      <div
        ref={elementRef}
        className={`progress-wrap ${
          scrollDirection === "up" ? "active-progress" : ""
        }`}
        onClick={scrollToTop}
        style={{
          display: scrollDirection === "up" ? "block" : "none",
        }}
      >
        <svg
          className="progress-circle svg-content"
          width="100%"
          height="100%"
          viewBox="-1 -1 102 102"
        >
          <path
            d="M50,1 a49,49 0 0,1 0,98 a49,49 0 0,1 0,-98"
            stroke="#00aaff"
            strokeWidth="4"
            fill="none"
            style={{
              transition: "stroke-dashoffset 50ms linear",
              strokeDasharray: `${circumference}, ${circumference}`,
              strokeDashoffset,
            }}
          />
        </svg>
      </div>
    </>
  );
};

export default BacktoTop;
