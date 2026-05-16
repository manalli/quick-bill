"use client"

import { useEffect } from "react"

import { useCartStore } from "@/store/cart-store"

export function StoreHydration() {
  useEffect(() => {
    useCartStore.persist.rehydrate()
  }, [])

  return null
}