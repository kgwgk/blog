{- | The single source of truth for design values shared across the site CSS
(@Design.Css@) and the auth email templates (@Design.Email@).

This module is PURE DATA: no @Clay@ or @Lucid@ imports. Every value here is
a literal pulled directly from the original @static\/css\/default.css@.
-}
module Design.Tokens (
    Palette (..),
    lightPalette,
    darkPalette,
    Fonts (..),
    fonts,
    accentBorder,
    authErrorColor,
    authSuccessColor,
) where

import Relude

-- | Every theme-varying color. Hex strings exactly as in the original CSS.
data Palette = Palette
    { bgColor :: Text
    -- ^ @--bg-color@
    , textColor :: Text
    -- ^ @--text-color@
    , borderColor :: Text
    -- ^ @--border-color@
    , codeBg :: Text
    -- ^ @--code-bg@
    , codeText :: Text
    -- ^ @--code-text@
    , primaryColor :: Text
    -- ^ @--primary-color@
    , secondaryColor :: Text
    -- ^ @--secondary-color@
    , darkGreyColor :: Text
    -- ^ @--dark-grey-color@
    , mediumGreyColor :: Text
    -- ^ @--medium-grey-color@
    , lightGreyColor :: Text
    -- ^ @--light-grey-color@
    }
    deriving stock (Eq, Show)

-- | Light mode (default) palette.
lightPalette :: Palette
lightPalette =
    Palette
        { bgColor = "#ffffff"
        , textColor = "#000000"
        , borderColor = "#888"
        , codeBg = "#e0e0e0"
        , codeText = "#000000"
        , primaryColor = "#e25971"
        , secondaryColor = "#fadd4b"
        , darkGreyColor = "#434343"
        , mediumGreyColor = "#545454"
        , lightGreyColor = "#767676"
        }

-- | Dark mode palette.
darkPalette :: Palette
darkPalette =
    Palette
        { bgColor = "#2b2b2b"
        , textColor = "#e6e6e6"
        , borderColor = "#555"
        , codeBg = "#4b4b4b"
        , codeText = "#e0e0e0"
        , primaryColor = "#ff6f91"
        , secondaryColor = "#e8c84d"
        , darkGreyColor = "#e0e0e0"
        , mediumGreyColor = "#c0c0c0"
        , lightGreyColor = "#aaaaaa"
        }

-- | Font stacks used across the CSS and emails.
data Fonts = Fonts
    { bodyFontStack :: Text
    -- ^ @"Computer Modern", "Lora", serif@
    , bodyTextFont :: Text
    -- ^ @'Lora', serif@
    , headingFont :: Text
    -- ^ @"Dosis", sans-serif@
    }
    deriving stock (Eq, Show)

fonts :: Fonts
fonts =
    Fonts
        { bodyFontStack = "\"Computer Modern\", \"Lora\", serif"
        , bodyTextFont = "'Lora', serif"
        , headingFont = "\"Dosis\", sans-serif"
        }

-- | Theorem/definition left-border accent color (non-theme literal).
accentBorder :: Text
accentBorder = "#b84f62"

-- | Auth status error color (@.auth-error@).
authErrorColor :: Text
authErrorColor = "#c0392b"

-- | Auth status success color (@.auth-success@).
authSuccessColor :: Text
authSuccessColor = "#27ae60"
