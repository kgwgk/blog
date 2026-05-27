{-# LANGUAGE CPP #-}
{-# LANGUAGE OverloadedStrings #-}

-- | Auth WASM entry point. Reads @window.location.pathname@ to decide which
-- page-specific 'App' to mount.
module Main where

import qualified Auth.Pure.Routing as Page
import qualified FFI.Window as W
import Miso
import Miso.Html.Element (div_, h1_, p_)
import qualified Pages.Forgot as Forgot
import qualified Pages.Login as Login
import qualified Pages.Members as Members
import qualified Pages.Register as Register
import qualified Pages.Reset as Reset

#ifdef WASM
foreign export javascript "hs_start" main :: IO ()
#endif

main :: IO ()
main = do
  pathname <- W.getPathname
  case Page.pageFromPath (fromMisoString pathname) of
    Page.Login -> Login.app >>= startApp defaultEvents
    Page.Register -> Register.app >>= startApp defaultEvents
    Page.Forgot -> Forgot.app >>= startApp defaultEvents
    Page.Reset -> Reset.app >>= startApp defaultEvents
    Page.Members -> Members.app >>= startApp defaultEvents
    Page.Unknown -> startApp defaultEvents unknownApp

unknownApp :: App () ()
unknownApp =
  (component () (\_ -> pure ()) (\_ -> unknownView))
    { mountPoint = Just "auth-app"
    }

unknownView :: View () ()
unknownView =
  div_
    []
    [ h1_ [] [text "Unknown page"]
    , p_ [] [text "(this URL is not part of the auth flow)"]
    ]
