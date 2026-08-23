import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Specifications() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/#specifications");
  }, [setLocation]);
  return null;
}
