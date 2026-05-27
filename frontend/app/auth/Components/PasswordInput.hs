{-# LANGUAGE OverloadedStrings #-}

-- |
-- Module      : Components.PasswordInput
-- Description : Password text input with an eye-icon visibility toggle.
--
-- The component is intentionally stateless — visibility is supplied by the
-- caller (typically a 'Bool' field on the parent's model) so the toggle can
-- be wired into the parent's existing update flow.
module Components.PasswordInput (passwordInput) where

import Miso
import Miso.Html.Element (button_, div_, input_, span_)
import Miso.Html.Event (onClick, onInput)
import Miso.Html.Property
  ( class_
  , id_
  , name_
  , required_
  , type_
  , value_
  )
import Miso.Property (prop, textProp)

-- | Render a password input wrapped with an eye-icon visibility toggle.
--
-- Visibility is controlled by the parent (the @visible@ flag), allowing
-- the toggle to be driven by whichever action the parent prefers.
passwordInput
  :: MisoString
  -- ^ field id\/name
  -> MisoString
  -- ^ @autocomplete@ value (e.g. @"current-password"@, @"new-password"@)
  -> MisoString
  -- ^ current value
  -> Bool
  -- ^ visible? (controls @type@ between @password@ and @text@)
  -> (MisoString -> action)
  -- ^ onInput
  -> action
  -- ^ onToggleVisibility
  -> View m action
passwordInput fieldId ac val visible onChange onToggle =
  div_
    [class_ "password-wrapper"]
    [ input_
        [ type_ (if visible then "text" else "password")
        , id_ fieldId
        , name_ fieldId
        , required_ True
        , textProp "autocomplete" ac
        , value_ val
        , onInput onChange
        ]
    , button_
        [ type_ "button"
        , class_ "password-toggle"
        , textProp "aria-label" "Toggle password visibility"
        , onClick onToggle
        ]
        [span_ [prop "innerHTML" (if visible then eyeOpen else eyeClosed)] []]
    ]

------------------------------------------------------------------------------
-- SVG icons (inline; injected via innerHTML so they restyle via currentColor)
------------------------------------------------------------------------------

eyeOpen, eyeClosed :: MisoString
eyeOpen =
  "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg>"
eyeClosed =
  "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24\"/><line x1=\"1\" y1=\"1\" x2=\"23\" y2=\"23\"/></svg>"
