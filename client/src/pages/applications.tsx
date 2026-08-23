import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Applications() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/#applications");
  }, [setLocation]);
  return null;
}
