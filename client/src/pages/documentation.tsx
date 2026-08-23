import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Documentation() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/#documentation");
  }, [setLocation]);
  return null;
}
