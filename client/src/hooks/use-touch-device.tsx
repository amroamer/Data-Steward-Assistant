import { useState, useEffect } from "react";

export function useTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      const hasCoarsePointer = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
      if (hasCoarsePointer) return true;

      const ua = navigator.userAgent.toLowerCase();
      const isMobileUA = /android|iphone|ipad|ipod|mobile|tablet|silk|kindle|playbook|bb10|windows phone|webos/i.test(ua);
      if (isMobileUA && navigator.maxTouchPoints > 0) return true;

      return false;
    };
    setIsTouchDevice(checkTouch());
  }, []);

  return isTouchDevice;
}
