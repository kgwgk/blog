{-# LANGUAGE DerivingStrategies #-}
{-# LANGUAGE OverloadedStrings #-}

-- |
-- Module      : Components.ThemeToggle
-- Description : Dark\/light theme toggle, parented under the page's nav.
--
-- State machine:
--
-- * @Auto@ — no @theme@ key in localStorage; we follow @prefers-color-scheme@.
-- * @Light@ \/ @Dark@ — user-selected, persisted in localStorage.
--
-- The HTML element with @data-theme@ is mutated via 'FFI.Window.setDataTheme'
-- so site CSS variables (which key off @[data-theme=\"dark\"]@) flip immediately.
module Components.ThemeToggle
  ( Theme (..)
  , initialise
  , viewToggle
  , toggle
  ) where

import qualified FFI.Window as W
import Miso
import Miso.Html.Element (button_)
import Miso.Html.Event (onClick)
import Miso.Html.Property (class_, id_)
import Miso.Property (textProp)

data Theme = Auto | Light | Dark
  deriving stock (Show, Eq)

-- | Read the persisted theme + system preference, apply it to the DOM,
-- and return what we resolved. Run once on app mount.
initialise :: IO Theme
initialise = do
  stored <- W.localStorageGet "theme"
  dark <- W.prefersDark
  let resolved = case stored of
        Just "dark" -> Dark
        Just "light" -> Light
        _ -> if dark then Dark else Light
  applyTheme resolved
  pure resolved

-- | Render the toggle button. The label always names the *opposite* of
-- the current theme (clicking flips to it).
viewToggle :: Theme -> (Theme -> action) -> View m action
viewToggle current onToggle =
  button_
    [ id_ "theme-toggle"
    , class_ "theme-toggle"
    , textProp "aria-label" "Toggle dark mode"
    , onClick (onToggle (flipTheme current))
    ]
    [text (label current)]
  where
    label Dark = "Light"
    label _ = "Dark"

-- | Flip the theme, persist to localStorage, apply to the DOM.
toggle :: Theme -> IO Theme
toggle current = do
  let next = flipTheme current
  W.localStorageSet "theme" (themeName next)
  applyTheme next
  pure next

------------------------------------------------------------------------------
-- Internal
------------------------------------------------------------------------------

flipTheme :: Theme -> Theme
flipTheme Dark = Light
flipTheme _ = Dark

themeName :: Theme -> MisoString
themeName Dark = "dark"
themeName Light = "light"
themeName Auto = "auto"

-- | Mirror the chosen theme onto @\<html data-theme=\"...\"\>@.
applyTheme :: Theme -> IO ()
applyTheme Auto = W.removeDataTheme
applyTheme t = W.setDataTheme (themeName t)
