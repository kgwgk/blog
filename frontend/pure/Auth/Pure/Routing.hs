{-# LANGUAGE DerivingStrategies #-}
{-# LANGUAGE OverloadedStrings #-}

-- |
-- Module      : Auth.Pure.Routing
-- Description : URL-pathname → page enum. FFI-free; depends only on text.
--
-- Lives in the @auth-pure@ internal library so it can be exercised by the
-- native-GHC test-suite without pulling in miso or the WASM toolchain.
module Auth.Pure.Routing (Page (..), pageFromPath) where

import Data.Text (Text)

data Page
  = Login
  | Register
  | Forgot
  | Reset
  | Members
  | Unknown
  deriving stock (Show, Eq)

-- | Map a @window.location.pathname@ to the page it should render.
-- Anything unrecognised is 'Unknown'.
pageFromPath :: Text -> Page
pageFromPath p = case p of
  "/login" -> Login
  "/register" -> Register
  "/forgot-password" -> Forgot
  "/reset-password" -> Reset
  "/members" -> Members
  "/members/" -> Members
  _ -> Unknown
